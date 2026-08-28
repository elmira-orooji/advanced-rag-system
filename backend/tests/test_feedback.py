import unittest
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.api.routes.feedback import upsert_feedback
from app.models.answer_feedback import AnswerFeedback, AnswerRecord
from app.models.evaluation_case import EvaluationCase
from app.models.user import User
from app.schemas.feedback import FeedbackUpsert


class FeedbackAuthorizationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        for model in (User, AnswerRecord, EvaluationCase, AnswerFeedback):
            model.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        organization_id = uuid4()
        self.admin = User(id=uuid4(), organization_id=organization_id,
                          username="admin", password_hash="unused", role="admin")
        self.owner = User(id=uuid4(), organization_id=organization_id,
                          username="owner", password_hash="unused", role="user")
        self.outsider = User(id=uuid4(), organization_id=uuid4(),
                             username="outsider", password_hash="unused", role="user")
        self.db.add_all([self.admin, self.owner, self.outsider])
        self.answer = AnswerRecord(id=uuid4(), user_id=self.owner.id,
                                   question="Question", answer="Answer", grounded=True)
        self.db.add(self.answer)
        self.db.commit()

    def submit(self, user, rating=1):
        return upsert_feedback(self.answer.id, FeedbackUpsert(
            rating=rating, reason="incorrect" if rating == -1 else None,
        ), self.db, user)

    def assert_denied_without_writes(self, user, rating=1):
        with self.assertRaises(HTTPException) as raised:
            self.submit(user, rating)
        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(list(self.db.scalars(select(AnswerFeedback))), [])
        self.assertEqual(list(self.db.scalars(select(EvaluationCase))), [])

    def test_admin_cannot_create_feedback_or_evaluation_for_another_organization(self):
        self.answer.user_id = self.outsider.id
        self.answer.document_set_id = uuid4()
        self.db.commit()
        for rating in (1, -1):
            with self.subTest(rating=rating):
                self.assert_denied_without_writes(self.admin, rating)

    def test_admin_cannot_update_existing_feedback_for_another_organization(self):
        result = self.submit(self.admin)
        self.answer.user_id = self.outsider.id
        self.db.commit()
        with self.assertRaises(HTTPException) as raised:
            self.submit(self.admin, -1)
        self.assertEqual(raised.exception.status_code, 404)
        self.db.expire_all()
        self.assertEqual(self.db.get(AnswerFeedback, result.id).rating, 1)

    def test_admin_can_create_and_update_feedback_in_own_organization(self):
        first = self.submit(self.admin)
        updated = self.submit(self.admin, -1)
        self.assertEqual(first.id, updated.id)
        self.assertEqual(updated.rating, -1)

    def test_owner_can_submit_feedback(self):
        self.assertEqual(self.submit(self.owner).rating, 1)

    def test_regular_user_cannot_submit_for_another_user(self):
        self.admin.role = "user"
        self.db.commit()
        self.assert_denied_without_writes(self.admin)

    def test_missing_answer_is_not_found(self):
        self.db.delete(self.answer)
        self.db.commit()
        self.assert_denied_without_writes(self.admin)
