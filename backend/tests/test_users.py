import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes.users import admin_only, delete_user, update_user
from app.models.user import User
from app.schemas.user_management import UserAdminUpdate


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



class UpdateMemberTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        User.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        org = uuid4()
        self.admin = User(id=uuid4(), organization_id=org, username="admin", password_hash="unused", role="admin")
        self.member = User(id=uuid4(), organization_id=org, username="member", password_hash="unused", role="user", is_active=True)
        self.db.add_all([self.admin, self.member])
        self.db.commit()

    def test_deactivate_revokes_sessions(self):
        with patch("app.api.routes.users.revoke_user_sessions") as revoke:
            result = update_user(self.member.id, UserAdminUpdate(is_active=False), self.db, self.admin)
        revoke.assert_called_once_with(self.db, self.member.id)
        self.assertFalse(result.is_active)
        self.assertFalse(self.db.get(User, self.member.id).is_active)

    def test_reactivate_does_not_revoke(self):
        with patch("app.api.routes.users.revoke_user_sessions") as revoke:
            update_user(self.member.id, UserAdminUpdate(is_active=True), self.db, self.admin)
        revoke.assert_not_called()
        self.assertTrue(self.db.get(User, self.member.id).is_active)

    def test_cannot_deactivate_own_account(self):
        with self.assertRaises(HTTPException) as error:
            update_user(self.admin.id, UserAdminUpdate(is_active=False), self.db, self.admin)
        self.assertEqual(error.exception.status_code, 403)
        self.assertTrue(self.db.get(User, self.admin.id).is_active)

    def test_missing_user(self):
        with self.assertRaises(HTTPException) as error:
            update_user(uuid4(), UserAdminUpdate(is_active=False), self.db, self.admin)
        self.assertEqual(error.exception.status_code, 404)
