import uuid
from datetime import date, datetime
from pydantic import BaseModel


class DailyMetric(BaseModel):
    date: date
    queries: int
    grounded: int
    negative_feedback: int


class RankedMetric(BaseModel):
    id: uuid.UUID | None
    name: str
    queries: int
    grounded_rate: float
    positive_rate: float | None


class FeedbackBreakdown(BaseModel):
    reason: str
    count: int


class IssueItem(BaseModel):
    kind: str
    name: str
    detail: str
    occurred_at: datetime


class NegativeFeedbackItem(BaseModel):
    feedback_id: uuid.UUID
    answer_id: uuid.UUID
    document_set_id: uuid.UUID | None
    document_set_name: str | None
    question: str
    answer: str
    reason: str | None
    comment: str | None
    evaluation_case_id: uuid.UUID | None
    created_at: datetime


class AnalyticsOverview(BaseModel):
    period_days: int
    total_queries: int
    active_users: int
    grounded_rate: float
    positive_feedback_rate: float | None
    feedback_coverage: float
    unanswered_queries: int
    average_citations: float
    indexed_documents: int
    failed_documents: int
    daily: list[DailyMetric]
    assistants: list[RankedMetric]
    knowledge_sets: list[RankedMetric]
    negative_reasons: list[FeedbackBreakdown]
    recent_issues: list[IssueItem]
