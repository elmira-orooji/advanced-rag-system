import argparse
import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.user import User
from app.models.organization import Organization


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an application user")
    parser.add_argument("username")
    parser.add_argument("--role", choices=("admin", "user"), default="user")
    parser.add_argument("--organization", default="default")
    args = parser.parse_args()
    password = getpass.getpass("Password: ")
    confirmation = getpass.getpass("Confirm password: ")
    if len(password) < 8:
        raise SystemExit("Password must contain at least 8 characters")
    if password != confirmation:
        raise SystemExit("Passwords do not match")

    with SessionLocal() as db:
        organization = db.scalar(select(Organization).where(Organization.slug == args.organization.strip().lower()))
        if organization is None:
            raise SystemExit("Organization does not exist. Create it first.")
        if db.scalar(select(User).where(User.username == args.username.strip(), User.organization_id == organization.id)):
            raise SystemExit("Username already exists")
        db.add(
            User(
                username=args.username.strip(),
                password_hash=hash_password(password),
                role=args.role,
                organization_id=organization.id,
            )
        )
        db.commit()
    print(f"Created {args.role}: {args.username}")


if __name__ == "__main__":
    main()
