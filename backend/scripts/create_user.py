import argparse
import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.user import User


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an application user")
    parser.add_argument("username")
    parser.add_argument("--role", choices=("admin", "user"), default="user")
    args = parser.parse_args()
    password = getpass.getpass("Password: ")
    confirmation = getpass.getpass("Confirm password: ")
    if len(password) < 8:
        raise SystemExit("Password must contain at least 8 characters")
    if password != confirmation:
        raise SystemExit("Passwords do not match")

    with SessionLocal() as db:
        if db.scalar(select(User).where(User.username == args.username.strip())):
            raise SystemExit("Username already exists")
        db.add(
            User(
                username=args.username.strip(),
                password_hash=hash_password(password),
                role=args.role,
            )
        )
        db.commit()
    print(f"Created {args.role}: {args.username}")


if __name__ == "__main__":
    main()
