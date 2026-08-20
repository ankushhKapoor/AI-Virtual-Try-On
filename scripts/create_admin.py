"""
One-time script to create the first admin account.
Run from the project root with the venv activated:

    python scripts/create_admin.py

This script will never expose a public registration endpoint.
"""
import getpass
import sys
import os

# Allow imports from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal, create_all_tables
from app.database.models.admin import Admin
from app.database.core.security import hash_password


def main():
    print("=== AI Virtual Try-On — Create Admin ===\n")

    name = input("Admin name: ").strip()
    if not name:
        print("Error: Name cannot be empty.")
        sys.exit(1)

    email = input("Admin email: ").strip().lower()
    if not email:
        print("Error: Email cannot be empty.")
        sys.exit(1)

    password = getpass.getpass("Admin password: ")
    if len(password) < 8:
        print("Error: Password must be at least 8 characters.")
        sys.exit(1)

    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Error: Passwords do not match.")
        sys.exit(1)

    # Ensure tables exist before inserting
    create_all_tables()

    db = SessionLocal()
    try:
        existing = db.query(Admin).filter(Admin.email == email).first()
        if existing:
            print(f"\nError: An admin with email '{email}' already exists.")
            sys.exit(1)

        admin = Admin(
            name=name,
            email=email,
            password_hash=hash_password(password),
            is_active=True,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(f"\n✅ Admin created successfully!")
        print(f"   ID    : {admin.id}")
        print(f"   Name  : {admin.name}")
        print(f"   Email : {admin.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
