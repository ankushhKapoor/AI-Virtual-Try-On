"""
POST /api/tryon/record  — Records a completed (or failed) try-on into the live DWH.

Called automatically by the frontend immediately after the AI model returns a result.
Inserts / upserts all relevant star-schema dimension rows and a new fact row so the
'Live Store Records' view in the admin analytics hub shows real customer data.

Design notes
────────────
• This endpoint is intentionally lightweight: it does NOT block the user-facing result
  page. The frontend fires it as a fire-and-forget call (but we still return a status).
• We create or reuse dimension records by natural key (user_id, product_id, etc.) so
  repeated try-ons from the same user/product don't create duplicates.
• The endpoint does NOT require the user to be authenticated via our JWT — it accepts an
  optional Bearer token to identify the user, but also works for anonymous guests (user_key
  will be set to a special "guest" dim_user row).
• cloth_type, category, price_bracket come from the frontend product data.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.connection import get_db
from dwm.connection import get_dwh_db, DWHSessionLocal, dwh_engine
from dwm.models import (
    DimUser,
    DimProduct,
    DimDevice,
    DimOutcome,
    DimTime,
    FactTryonEvent,
)

logger = logging.getLogger("app.routes.tryon_record")
router = APIRouter(prefix="/api/tryon", tags=["Try-On Recording"])


# ─────────────────────────────────────────────────────────────
# Request schema
# ─────────────────────────────────────────────────────────────
class TryOnRecordRequest(BaseModel):
    # Outcome
    success: bool = Field(..., description="True if the AI returned a result image")
    failure_reason: Optional[str] = Field(default="None", description="Short failure reason if success=False")

    # Product info (from the frontend product object)
    product_id: Optional[str] = Field(default=None, description="Internal or Amazon product ID")
    product_category: Optional[str] = Field(default="Unknown", description="e.g. Jackets, T-Shirts")
    product_price_bracket: Optional[str] = Field(default="Mid (₹1000–₹2999)", description="Price bracket string")

    # Device / upload context (detected by frontend)
    device_type: Optional[str] = Field(default="Web Browser", description="Desktop/Mobile/Tablet")
    upload_method: Optional[str] = Field(default="File Upload", description="File Upload / Studio URL / Camera")

    # Performance
    processing_time_ms: Optional[int] = Field(default=None, description="Wall-clock ms from submit to result")
    quality_score: Optional[float] = Field(default=None, ge=0, le=1, description="0-1 quality score if available")

    # Authenticated user id (filled by backend from JWT, not trusted from body)
    # user_id is injected server-side via the optional auth dependency


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _ensure_dim_user(dwh_db: Session, user_id: int, signup_date: datetime) -> int:
    """Upsert a dim_user row, return user_key."""
    row = dwh_db.query(DimUser).filter(DimUser.user_id == user_id).first()
    if row:
        # Increment total_tryons counter
        row.total_tryons = (row.total_tryons or 0) + 1
        # Derive engagement level
        row.engagement_level = _engagement_level(row.total_tryons)
        dwh_db.flush()
        return row.user_key

    new_row = DimUser(
        user_id=user_id,
        signup_date=signup_date.date(),
        total_tryons=1,
        engagement_level="Low",
    )
    dwh_db.add(new_row)
    dwh_db.flush()
    return new_row.user_key


def _engagement_level(total: int) -> str:
    if total >= 20:
        return "Power User"
    if total >= 10:
        return "High"
    if total >= 5:
        return "Medium"
    return "Low"


def _ensure_dim_product(dwh_db: Session, product_id: str, category: str, price_bracket: str) -> int:
    """Upsert a dim_product row, return product_key."""
    # Normalise product_id to a numeric value for the schema (hash if string)
    try:
        pid_int = int(product_id)
    except (TypeError, ValueError):
        pid_int = abs(hash(str(product_id))) % (10 ** 9)

    row = dwh_db.query(DimProduct).filter(DimProduct.product_id == pid_int).first()
    if row:
        return row.product_key

    new_row = DimProduct(
        product_id=pid_int,
        amazon_product_id=str(product_id) if product_id else "UNKNOWN",
        category=category or "Unknown",
        color="Unknown/Unspecified",
        pattern="Solid/Standard",
        price_bracket=price_bracket or "Mid (₹1000–₹2999)",
    )
    dwh_db.add(new_row)
    dwh_db.flush()
    return new_row.product_key


def _ensure_dim_device(dwh_db: Session, device_type: str, upload_method: str) -> int:
    """Get or create a dim_device row, return device_key."""
    row = dwh_db.query(DimDevice).filter(
        DimDevice.device_type == device_type,
        DimDevice.upload_method == upload_method,
    ).first()
    if row:
        return row.device_key

    new_row = DimDevice(device_type=device_type, upload_method=upload_method)
    dwh_db.add(new_row)
    dwh_db.flush()
    return new_row.device_key


def _ensure_dim_outcome(dwh_db: Session, success: bool, failure_reason: str) -> int:
    """Get or create a dim_outcome row, return outcome_key."""
    result_str = "Success" if success else "Failure"
    reason_str = "None" if success else (failure_reason or "Unknown")
    row = dwh_db.query(DimOutcome).filter(
        DimOutcome.success_or_fail == result_str,
        DimOutcome.failure_reason == reason_str,
    ).first()
    if row:
        return row.outcome_key

    new_row = DimOutcome(success_or_fail=result_str, failure_reason=reason_str)
    dwh_db.add(new_row)
    dwh_db.flush()
    return new_row.outcome_key


def _ensure_dim_time(dwh_db: Session, ts: datetime) -> int:
    """Get or create a dim_time row keyed by YYYYMMDDHHXX, return time_key."""
    # Key: YYYYMMDDHH (10-digit)
    time_key = int(ts.strftime("%Y%m%d%H"))
    row = dwh_db.query(DimTime).filter(DimTime.time_key == time_key).first()
    if row:
        return row.time_key

    weekday = ts.weekday()  # 0=Mon … 6=Sun
    new_row = DimTime(
        time_key=time_key,
        full_timestamp=ts,
        hour=ts.hour,
        day=ts.day,
        week=int(ts.strftime("%W")),
        month=ts.month,
        year=ts.year,
        weekday_or_weekend="Weekend" if weekday >= 5 else "Weekday",
    )
    dwh_db.add(new_row)
    dwh_db.flush()
    return new_row.time_key


# ─────────────────────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────────────────────

@router.post("/record", status_code=200)
async def record_tryon(
    payload: TryOnRecordRequest,
    request: Request,
    oltp_db: Session = Depends(get_db),
):
    """
    Records a real frontend try-on result into the live DWH.
    Accepts optional JWT — unauthenticated requests use a shared guest user_key.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # ── 1. Identify user from Bearer token (optional) ──────────
    user_id: Optional[int] = None
    user_signup_date = now

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            from app.database.core.security import decode_token
            payload_jwt = decode_token(token)
            uid = payload_jwt.get("sub")
            if uid:
                user_id = int(uid)
                # fetch actual signup date
                from app.database.models.user import User
                u = oltp_db.query(User).filter(User.id == user_id).first()
                if u and u.created_at:
                    user_signup_date = u.created_at
        except Exception:
            pass  # treat as guest

    # Guest fallback: use user_id = 0
    if user_id is None:
        user_id = 0
        user_signup_date = now

    # ── 2. Write to DWH in a single transaction ─────────────────
    dwh_db = DWHSessionLocal()
    try:
        user_key = _ensure_dim_user(dwh_db, user_id, user_signup_date)
        product_key = _ensure_dim_product(
            dwh_db,
            payload.product_id or "unknown",
            payload.product_category or "Unknown",
            payload.product_price_bracket or "Mid (₹1000–₹2999)",
        )
        device_key = _ensure_dim_device(
            dwh_db,
            payload.device_type or "Web Browser",
            payload.upload_method or "File Upload",
        )
        outcome_key = _ensure_dim_outcome(
            dwh_db,
            payload.success,
            payload.failure_reason or "None",
        )
        time_key = _ensure_dim_time(dwh_db, now)

        # Generate a unique job_id (timestamp-based, avoids collision)
        import time as _time
        job_id = int(_time.time() * 1000) % (10 ** 15)

        fact = FactTryonEvent(
            job_id=job_id,
            user_key=user_key,
            product_key=product_key,
            time_key=time_key,
            device_key=device_key,
            outcome_key=outcome_key,
            processing_time_ms=payload.processing_time_ms,
            quality_score=round(payload.quality_score, 2) if payload.quality_score is not None else None,
            user_rating=None,
            retry_count=0,
            saved_after_tryon=False,
        )
        dwh_db.add(fact)
        dwh_db.commit()
        logger.info(
            "Live try-on recorded: user_id=%s product=%s success=%s ms=%s",
            user_id, payload.product_id, payload.success, payload.processing_time_ms,
        )
        return {"status": "recorded", "job_id": job_id}

    except Exception as e:
        dwh_db.rollback()
        logger.warning("Failed to record live try-on to DWH: %s", e)
        # Return 200 anyway — never block the user result page
        return {"status": "skipped", "reason": str(e)}
    finally:
        dwh_db.close()
