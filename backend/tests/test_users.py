import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes.users import admin_only, delete_user
from app.models.user import User


class DeleteMemberTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        User.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        org = uuid4()
        self.admin = User(id=uuid4(), organization_id=org, username="admin", password_hash="unused", role="admin")
        self.member = User(id=uuid4(), organization_id=org, username="member", password_hash="unused", role="user")
        self.outsider = User(id=uuid4(), organization_id=uuid4(), username="outsider", password_hash="unused", role="user")
        self.db.add_all([self.admin, self.member, self.outsider])
        self.db.commit()

    def test_delete_member(self):
        member_id = self.member.id
        self.assertEqual(delete_user(member_id, self.db, self.admin).status_code, 204)
        self.assertIsNone(self.db.get(User, member_id))

    def test_admin_and_other_organization_are_protected(self):
        for target, code in ((self.admin, 403), (self.outsider, 404)):
            with self.subTest(code=code):
                with self.assertRaises(HTTPException) as error:
                    delete_user(target.id, self.db, self.admin)
                self.assertEqual(error.exception.status_code, code)
                self.assertIsNotNone(self.db.get(User, target.id))

    def test_missing_member(self):
        with self.assertRaises(HTTPException) as error:
            delete_user(uuid4(), self.db, self.admin)
        self.assertEqual(error.exception.status_code, 404)

    def test_non_admin_is_denied(self):
        with self.assertRaises(HTTPException) as error:
            admin_only(self.member)
        self.assertEqual(error.exception.status_code, 403)

    def test_constraint_failure_rolls_back(self):
        member_id = self.member.id
        with patch.object(self.db, "commit", side_effect=IntegrityError("delete", {}, Exception("constraint"))):
            with self.assertRaises(HTTPException) as error:
                delete_user(member_id, self.db, self.admin)
        self.assertEqual(error.exception.status_code, 409)
        self.assertIsNotNone(self.db.get(User, member_id))
