import logging
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

from dwm.connection import DWHSessionLocal
from dwm.models import (
    DimUser,
    DimProduct,
    DimTime,
    DimDevice,
    DimOutcome,
    FactTryonEvent,
    ETLWatermark,
)

logger = logging.getLogger("dwm.etl.load")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def load_dimensions(dwh_db: Session, transformed: Dict[str, Any]) -> Dict[str, Any]:
    """
    Upserts dimension records (SCD Type 1) and builds in-memory lookup maps
    for resolving dimension foreign keys into surrogate keys for the fact table.
    """
    logger.info("Loading Dimension tables (SCD Type 1)...")

    # 1. DimUser: Key lookup by natural user_id
    user_key_map = {}
    for u in transformed["dim_users"]:
        existing = dwh_db.query(DimUser).filter(DimUser.user_id == u["user_id"]).first()
        if existing:
            existing.signup_date = u["signup_date"]
            existing.total_tryons = u["total_tryons"]
            existing.engagement_level = u["engagement_level"]
            user_key_map[u["user_id"]] = existing.user_key
        else:
            new_dim_user = DimUser(
                user_id=u["user_id"],
                signup_date=u["signup_date"],
                total_tryons=u["total_tryons"],
                engagement_level=u["engagement_level"],
            )
            dwh_db.add(new_dim_user)
            dwh_db.flush()
            user_key_map[u["user_id"]] = new_dim_user.user_key

    # 2. DimProduct: Key lookup by natural product_id
    product_key_map = {}
    for p in transformed["dim_products"]:
        existing = dwh_db.query(DimProduct).filter(DimProduct.product_id == p["product_id"]).first()
        if existing:
            existing.amazon_product_id = p["amazon_product_id"]
            existing.category = p["category"]
            existing.color = p["color"]
            existing.pattern = p["pattern"]
            existing.price_bracket = p["price_bracket"]
            product_key_map[p["product_id"]] = existing.product_key
        else:
            new_dim_prod = DimProduct(
                product_id=p["product_id"],
                amazon_product_id=p["amazon_product_id"],
                category=p["category"],
                color=p["color"],
                pattern=p["pattern"],
                price_bracket=p["price_bracket"],
            )
            dwh_db.add(new_dim_prod)
            dwh_db.flush()
            product_key_map[p["product_id"]] = new_dim_prod.product_key

    # 3. DimTime: Key lookup by time_key
    for t in transformed["dim_times"]:
        existing = dwh_db.query(DimTime).filter(DimTime.time_key == t["time_key"]).first()
        if not existing:
            new_time = DimTime(
                time_key=t["time_key"],
                full_timestamp=t["full_timestamp"],
                hour=t["hour"],
                day=t["day"],
                week=t["week"],
                month=t["month"],
                year=t["year"],
                weekday_or_weekend=t["weekday_or_weekend"],
            )
            dwh_db.add(new_time)

    # 4. DimDevice: Key lookup by (device_type, upload_method)
    device_key_map = {}
    for d in transformed["dim_devices"]:
        key_tuple = (d["device_type"], d["upload_method"])
        existing = dwh_db.query(DimDevice).filter(
            DimDevice.device_type == d["device_type"],
            DimDevice.upload_method == d["upload_method"]
        ).first()
        if existing:
            device_key_map[key_tuple] = existing.device_key
        else:
            new_dev = DimDevice(
                device_type=d["device_type"],
                upload_method=d["upload_method"],
            )
            dwh_db.add(new_dev)
            dwh_db.flush()
            device_key_map[key_tuple] = new_dev.device_key

    # 5. DimOutcome: Key lookup by (success_or_fail, failure_reason)
    outcome_key_map = {}
    for o in transformed["dim_outcomes"]:
        key_tuple = (o["success_or_fail"], o["failure_reason"])
        existing = dwh_db.query(DimOutcome).filter(
            DimOutcome.success_or_fail == o["success_or_fail"],
            DimOutcome.failure_reason == o["failure_reason"]
        ).first()
        if existing:
            outcome_key_map[key_tuple] = existing.outcome_key
        else:
            new_outcome = DimOutcome(
                success_or_fail=o["success_or_fail"],
                failure_reason=o["failure_reason"],
            )
            dwh_db.add(new_outcome)
            dwh_db.flush()
            outcome_key_map[key_tuple] = new_outcome.outcome_key

    dwh_db.commit()
    logger.info("Dimension tables loaded and surrogate keys resolved.")

    return {
        "user_key_map": user_key_map,
        "product_key_map": product_key_map,
        "device_key_map": device_key_map,
        "outcome_key_map": outcome_key_map,
    }


def load_fact_events(
    dwh_db: Session,
    transformed: Dict[str, Any],
    key_maps: Dict[str, Any]
) -> int:
    """
    Inserts or updates rows in fact_tryon_event using the resolved dimension keys.
    Guarantees idempotency by matching on natural job_id.
    """
    logger.info("Loading Fact table (fact_tryon_event)...")
    inserted_count = 0
    updated_count = 0

    user_keys = key_maps["user_key_map"]
    product_keys = key_maps["product_key_map"]
    device_keys = key_maps["device_key_map"]
    outcome_keys = key_maps["outcome_key_map"]

    for fact in transformed["fact_events"]:
        job_id = fact["job_id"]
        user_key = user_keys.get(fact["user_id"])
        product_key = product_keys.get(fact["product_id"])
        device_key = device_keys.get(fact["device_tuple"])
        outcome_key = outcome_keys.get(fact["outcome_tuple"])

        if not all([user_key, product_key, device_key, outcome_key]):
            logger.warning("Skipping fact event for job_id=%d due to unresolved dimension key.", job_id)
            continue

        existing = dwh_db.query(FactTryonEvent).filter(FactTryonEvent.job_id == job_id).first()
        if existing:
            existing.user_key = user_key
            existing.product_key = product_key
            existing.time_key = fact["time_key"]
            existing.device_key = device_key
            existing.outcome_key = outcome_key
            existing.processing_time_ms = fact["processing_time_ms"]
            existing.quality_score = fact["quality_score"]
            existing.user_rating = fact["user_rating"]
            existing.retry_count = fact["retry_count"]
            existing.saved_after_tryon = fact["saved_after_tryon"]
            updated_count += 1
        else:
            new_fact = FactTryonEvent(
                job_id=job_id,
                user_key=user_key,
                product_key=product_key,
                time_key=fact["time_key"],
                device_key=device_key,
                outcome_key=outcome_key,
                processing_time_ms=fact["processing_time_ms"],
                quality_score=fact["quality_score"],
                user_rating=fact["user_rating"],
                retry_count=fact["retry_count"],
                saved_after_tryon=fact["saved_after_tryon"],
                created_at=fact["created_at"],
            )
            dwh_db.add(new_fact)
            inserted_count += 1

    dwh_db.commit()
    logger.info("Fact load finished: %d inserted, %d updated.", inserted_count, updated_count)
    return inserted_count + updated_count


def update_watermark(dwh_db: Session, max_job_id: int):
    """Updates the high-watermark job_id in etl_watermark."""
    if max_job_id <= 0:
        return
    watermark = dwh_db.query(ETLWatermark).filter(ETLWatermark.id == 1).first()
    if watermark:
        if max_job_id > watermark.last_extracted_job_id:
            watermark.last_extracted_job_id = max_job_id
            watermark.last_extracted_at = datetime.utcnow()
            dwh_db.commit()
            logger.info("Updated ETL watermark to job_id=%d.", max_job_id)
    else:
        new_wm = ETLWatermark(
            id=1,
            pipeline_name="vton_etl",
            last_extracted_job_id=max_job_id,
            last_extracted_at=datetime.utcnow()
        )
        dwh_db.add(new_wm)
        dwh_db.commit()
        logger.info("Initialized ETL watermark to job_id=%d.", max_job_id)


def load_data(transformed: Dict[str, Any]) -> Dict[str, Any]:
    """
    Orchestrates Load phase: dimensions -> fact table -> watermark update.
    """
    dwh_db = DWHSessionLocal()
    try:
        key_maps = load_dimensions(dwh_db, transformed)
        total_facts = load_fact_events(dwh_db, transformed, key_maps)
        update_watermark(dwh_db, transformed.get("max_job_id", 0))
        return {
            "status": "success",
            "total_facts_processed": total_facts,
            "max_job_id": transformed.get("max_job_id", 0),
        }
    finally:
        dwh_db.close()
