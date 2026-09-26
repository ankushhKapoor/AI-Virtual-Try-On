"""
DWM Data Mining & OLAP Layer: Time-Series Rollups
Pre-aggregates try-on events into daily and monthly tables (agg_tryon_daily, agg_tryon_monthly)
for fast, responsive admin dashboard queries and trend visualization.
"""
import sys
import os
import logging
from decimal import Decimal
from datetime import datetime
from sqlalchemy import func, cast, Date, case

# Allow execution from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dwm.connection import DWHSessionLocal
from dwm.models import (
    FactTryonEvent,
    DimOutcome,
    DimTime,
    AggTryonDaily,
    AggTryonMonthly,
)

logger = logging.getLogger("dwm.mining.rollups")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def refresh_daily_rollups() -> int:
    """Computes daily rollups from facts and updates agg_tryon_daily."""
    logger.info("Refreshing agg_tryon_daily rollup table...")
    dwh_session = DWHSessionLocal()

    try:
        # Aggregate by DATE(dim_time.full_timestamp)
        date_expr = cast(DimTime.full_timestamp, Date).label("tryon_date")

        query = (
            dwh_session.query(
                date_expr,
                func.count(FactTryonEvent.tryon_id).label("total_tryons"),
                func.sum(
                    case((DimOutcome.success_or_fail == "SUCCESS", 1), else_=0)
                ).label("successful_tryons"),
                func.sum(
                    case((DimOutcome.success_or_fail == "FAILURE", 1), else_=0)
                ).label("failed_tryons"),
                func.avg(FactTryonEvent.processing_time_ms).label("avg_processing_time_ms"),
                func.avg(FactTryonEvent.quality_score).label("avg_quality_score"),
                func.count(func.distinct(FactTryonEvent.user_key)).label("unique_active_users"),
            )
            .join(DimTime, FactTryonEvent.time_key == DimTime.time_key)
            .join(DimOutcome, FactTryonEvent.outcome_key == DimOutcome.outcome_key)
            .group_by(date_expr)
            .order_by(date_expr.asc())
        )

        rows = query.all()
        logger.info("Found %d daily aggregate dates to sync.", len(rows))

        for r in rows:
            existing = dwh_session.query(AggTryonDaily).filter(AggTryonDaily.date == r.tryon_date).first()
            avg_proc = int(r.avg_processing_time_ms) if r.avg_processing_time_ms is not None else None
            avg_qual = Decimal(str(round(r.avg_quality_score, 2))) if r.avg_quality_score is not None else None

            if existing:
                existing.total_tryons = int(r.total_tryons or 0)
                existing.successful_tryons = int(r.successful_tryons or 0)
                existing.failed_tryons = int(r.failed_tryons or 0)
                existing.avg_processing_time_ms = avg_proc
                existing.avg_quality_score = avg_qual
                existing.unique_active_users = int(r.unique_active_users or 0)
                existing.updated_at = datetime.utcnow()
            else:
                new_daily = AggTryonDaily(
                    date=r.tryon_date,
                    total_tryons=int(r.total_tryons or 0),
                    successful_tryons=int(r.successful_tryons or 0),
                    failed_tryons=int(r.failed_tryons or 0),
                    avg_processing_time_ms=avg_proc,
                    avg_quality_score=avg_qual,
                    unique_active_users=int(r.unique_active_users or 0),
                )
                dwh_session.add(new_daily)

        dwh_session.commit()
        logger.info("Successfully refreshed %d rows in agg_tryon_daily.", len(rows))
        return len(rows)

    finally:
        dwh_session.close()


def refresh_monthly_rollups() -> int:
    """Computes monthly rollups from facts and updates agg_tryon_monthly."""
    logger.info("Refreshing agg_tryon_monthly rollup table...")
    dwh_session = DWHSessionLocal()

    try:
        # Group by YYYY-MM
        month_expr = func.concat(
            DimTime.year,
            "-",
            func.lpad(DimTime.month, 2, "0")
        ).label("year_month")

        query = (
            dwh_session.query(
                month_expr,
                func.count(FactTryonEvent.tryon_id).label("total_tryons"),
                func.sum(
                    case((DimOutcome.success_or_fail == "SUCCESS", 1), else_=0)
                ).label("successful_tryons"),
                func.sum(
                    case((DimOutcome.success_or_fail == "FAILURE", 1), else_=0)
                ).label("failed_tryons"),
                func.avg(FactTryonEvent.processing_time_ms).label("avg_processing_time_ms"),
                func.avg(FactTryonEvent.quality_score).label("avg_quality_score"),
                func.count(func.distinct(FactTryonEvent.user_key)).label("unique_active_users"),
            )
            .join(DimTime, FactTryonEvent.time_key == DimTime.time_key)
            .join(DimOutcome, FactTryonEvent.outcome_key == DimOutcome.outcome_key)
            .group_by(month_expr)
            .order_by(month_expr.asc())
        )

        rows = query.all()
        logger.info("Found %d monthly aggregate periods to sync.", len(rows))

        for r in rows:
            existing = dwh_session.query(AggTryonMonthly).filter(AggTryonMonthly.year_month == r.year_month).first()
            avg_proc = int(r.avg_processing_time_ms) if r.avg_processing_time_ms is not None else None
            avg_qual = Decimal(str(round(r.avg_quality_score, 2))) if r.avg_quality_score is not None else None

            if existing:
                existing.total_tryons = int(r.total_tryons or 0)
                existing.successful_tryons = int(r.successful_tryons or 0)
                existing.failed_tryons = int(r.failed_tryons or 0)
                existing.avg_processing_time_ms = avg_proc
                existing.avg_quality_score = avg_qual
                existing.unique_active_users = int(r.unique_active_users or 0)
                existing.updated_at = datetime.utcnow()
            else:
                new_monthly = AggTryonMonthly(
                    year_month=r.year_month,
                    total_tryons=int(r.total_tryons or 0),
                    successful_tryons=int(r.successful_tryons or 0),
                    failed_tryons=int(r.failed_tryons or 0),
                    avg_processing_time_ms=avg_proc,
                    avg_quality_score=avg_qual,
                    unique_active_users=int(r.unique_active_users or 0),
                )
                dwh_session.add(new_monthly)

        dwh_session.commit()
        logger.info("Successfully refreshed %d rows in agg_tryon_monthly.", len(rows))
        return len(rows)

    finally:
        dwh_session.close()


def refresh_all_rollups():
    """Refreshes both daily and monthly rollups."""
    d_count = refresh_daily_rollups()
    m_count = refresh_monthly_rollups()
    return {"daily_count": d_count, "monthly_count": m_count}


if __name__ == "__main__":
    refresh_all_rollups()
