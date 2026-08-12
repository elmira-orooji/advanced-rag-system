from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.users import admin_only
from app.db.database import get_db
from app.models.answer_feedback import AnswerFeedback, AnswerRecord
from app.models.assistant import Assistant
from app.models.connector import Connector
from app.models.document import Document
from app.models.document_set import DocumentSet
from app.models.user import User
from app.schemas.analytics import AnalyticsOverview, DailyMetric, FeedbackBreakdown, IssueItem, RankedMetric

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _rate(numerator: int, denominator: int) -> float:
    return round(numerator * 100 / denominator, 1) if denominator else 0.0


@router.get("/overview", response_model=AnalyticsOverview)
def overview(days: int = Query(default=30, ge=7, le=90), db: Session = Depends(get_db), _: User = Depends(admin_only)):
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=days - 1)
    start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    answers = list(db.scalars(select(AnswerRecord).where(AnswerRecord.created_at >= start).order_by(AnswerRecord.created_at)).all())
    answer_ids = [item.id for item in answers]
    feedback = list(db.scalars(select(AnswerFeedback).where(AnswerFeedback.answer_id.in_(answer_ids))).all()) if answer_ids else []
    feedback_by_answer = {item.answer_id: item for item in feedback}
    daily = {start_date + timedelta(days=index): {"queries": 0, "grounded": 0, "negative": 0} for index in range(days)}
    assistant_groups: dict[object, list[AnswerRecord]] = defaultdict(list)
    set_groups: dict[object, list[AnswerRecord]] = defaultdict(list)
    for answer in answers:
        bucket = daily[answer.created_at.date()]
        bucket["queries"] += 1; bucket["grounded"] += int(answer.grounded)
        bucket["negative"] += int(feedback_by_answer.get(answer.id) is not None and feedback_by_answer[answer.id].rating == -1)
        if answer.assistant_id: assistant_groups[answer.assistant_id].append(answer)
        if answer.document_set_id: set_groups[answer.document_set_id].append(answer)
    assistant_names = dict(db.execute(select(Assistant.id, Assistant.name)).all())
    set_names = dict(db.execute(select(DocumentSet.id, DocumentSet.name)).all())

    def ranked(groups, names):
        result = []
        for entity_id, rows in groups.items():
            related = [feedback_by_answer[row.id] for row in rows if row.id in feedback_by_answer]
            positives = sum(item.rating == 1 for item in related)
            result.append(RankedMetric(id=entity_id, name=names.get(entity_id, "Deleted resource"), queries=len(rows), grounded_rate=_rate(sum(row.grounded for row in rows), len(rows)), positive_rate=_rate(positives, len(related)) if related else None))
        return sorted(result, key=lambda item: item.queries, reverse=True)[:5]

    issues: list[IssueItem] = []
    for document in db.scalars(select(Document).where(Document.status == "failed").order_by(Document.updated_at.desc()).limit(5)).all():
        issues.append(IssueItem(kind="document", name=document.filename, detail=document.processing_error or "Document processing failed", occurred_at=document.updated_at))
    for connector in db.scalars(select(Connector).where(Connector.status == "failed").order_by(Connector.created_at.desc()).limit(5)).all():
        issues.append(IssueItem(kind="connector", name=connector.name, detail=connector.last_error or "Connector synchronization failed", occurred_at=connector.last_synced_at or connector.created_at))
    issues.sort(key=lambda item: item.occurred_at, reverse=True)
    positive_count = sum(item.rating == 1 for item in feedback)
    reasons = Counter(item.reason for item in feedback if item.rating == -1 and item.reason)
    indexed = db.query(Document).filter(Document.status == "indexed").count()
    failed = db.query(Document).filter(Document.status == "failed").count()
    return AnalyticsOverview(
        period_days=days, total_queries=len(answers), active_users=len({item.user_id for item in answers}),
        grounded_rate=_rate(sum(item.grounded for item in answers), len(answers)),
        positive_feedback_rate=_rate(positive_count, len(feedback)) if feedback else None,
        feedback_coverage=_rate(len(feedback), len(answers)), unanswered_queries=sum(not item.grounded for item in answers),
        average_citations=round(sum(item.citation_count for item in answers) / len(answers), 1) if answers else 0,
        indexed_documents=indexed, failed_documents=failed,
        daily=[DailyMetric(date=value, queries=data["queries"], grounded=data["grounded"], negative_feedback=data["negative"]) for value, data in daily.items()],
        assistants=ranked(assistant_groups, assistant_names), knowledge_sets=ranked(set_groups, set_names),
        negative_reasons=[FeedbackBreakdown(reason=reason, count=count) for reason, count in reasons.most_common()], recent_issues=issues[:8],
    )
