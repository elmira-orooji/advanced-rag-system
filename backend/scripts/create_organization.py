import argparse
import re

from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.organization import Organization


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an isolated organization workspace")
    parser.add_argument("name")
    parser.add_argument("--slug")
    args = parser.parse_args()
    slug = (args.slug or re.sub(r"[^a-z0-9]+", "-", args.name.lower())).strip("-")
    if len(slug) < 2:
        raise SystemExit("Organization slug must contain at least 2 characters")
    with SessionLocal() as db:
        if db.scalar(select(Organization).where(Organization.slug == slug)):
            raise SystemExit("Organization slug already exists")
        db.add(Organization(name=args.name.strip(), slug=slug))
        db.commit()
    print(f"Created organization: {slug}")


if __name__ == "__main__":
    main()
