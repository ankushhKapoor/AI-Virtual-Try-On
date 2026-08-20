from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models.admin import Admin
from app.database.models.user import User
from app.database.models.vton_job import VTONJob
from app.database.core.security import verify_password, create_admin_token
from app.database.core.dependencies import get_current_admin


router = APIRouter(prefix="/admin", tags=["Admin"])


# ──────────────────────────────────────────
# POST /admin/login
# ──────────────────────────────────────────
@router.post("/login")
def admin_login(
    email: str,
    password: str,
    db: Session = Depends(get_db)
):
    admin = db.query(Admin).filter(Admin.email == email).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=403,
            detail="Admin account is inactive"
        )

    if not verify_password(password, admin.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    admin.last_login_at = datetime.now(timezone.utc)
    db.commit()

    access_token = create_admin_token(admin.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ──────────────────────────────────────────
# GET /admin/statistics
# ──────────────────────────────────────────
@router.get("/statistics")
def get_statistics(
    _: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(func.count(User.id)).scalar()
    total_try_ons = db.query(func.count(VTONJob.id)).scalar()

    successful_try_ons = (
        db.query(func.count(VTONJob.id))
        .filter(VTONJob.status == "COMPLETED")
        .scalar()
    )

    failed_try_ons = (
        db.query(func.count(VTONJob.id))
        .filter(VTONJob.status == "FAILED")
        .scalar()
    )

    today = datetime.now(timezone.utc).date()
    try_ons_today = (
        db.query(func.count(VTONJob.id))
        .filter(cast(VTONJob.created_at, Date) == today)
        .scalar()
    )

    return {
        "total_users": total_users,
        "total_try_ons": total_try_ons,
        "successful_try_ons": successful_try_ons,
        "failed_try_ons": failed_try_ons,
        "try_ons_today": try_ons_today,
    }


# ──────────────────────────────────────────
# GET /admin/users
# ──────────────────────────────────────────
@router.get("/users")
def list_users(
    _: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()

    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "try_on_count": u.try_on_count,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "last_login_at": u.last_login_at,
        }
        for u in users
    ]


# ──────────────────────────────────────────
# GET /admin/users/{user_id}/try-ons
# ──────────────────────────────────────────
@router.get("/users/{user_id}/try-ons")
def get_user_try_ons(
    user_id: int,
    _: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    jobs = (
        db.query(VTONJob)
        .filter(VTONJob.user_id == user_id)
        .order_by(VTONJob.created_at.desc())
        .all()
    )

    return [
        {
            "id": j.id,
            "product_id": j.product_id,
            "status": j.status,
            "created_at": j.created_at,
            "completed_at": j.completed_at,
            "processing_time": j.processing_time,
        }
        for j in jobs
    ]
