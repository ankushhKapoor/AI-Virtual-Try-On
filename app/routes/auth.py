from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models.user import User
from app.database.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ──────────────────────────────────────────
# POST /auth/register
# ──────────────────────────────────────────
@router.post("/register", status_code=201)
def register(
    name: str,
    email: str,
    password: str,
    db: Session = Depends(get_db)
):
    # Check email uniqueness
    existing = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    # Hash password — never store plaintext
    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        try_on_count=0,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "try_on_count": user.try_on_count,
    }


# ──────────────────────────────────────────
# POST /auth/login
# ──────────────────────────────────────────
@router.post("/login")
def login(
    email: str,
    password: str,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )

    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    user.last_login_at = datetime.utcnow()
    db.commit()

    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }