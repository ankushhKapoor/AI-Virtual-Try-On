import logging
from typing import Dict, Any, List
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger("dwm.etl.transform")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Known common color terms to infer from product titles if available
COLOR_KEYWORDS = [
    "black", "white", "blue", "red", "green", "yellow", "pink", "navy", 
    "grey", "gray", "brown", "beige", "maroon", "purple", "orange"
]

PATTERN_KEYWORDS = [
    "striped", "stripes", "checked", "check", "printed", "floral", 
    "solid", "polka", "denim", "graphic", "embroidered"
]


def derive_price_bracket(price: Any) -> str:
    """Classifies garment price into business brackets."""
    if price is None:
        return "Unpriced"
    try:
        val = float(price)
        if val < 500:
            return "Budget (<500)"
        elif val <= 2000:
            return "Mid-Range (500-2000)"
        else:
            return "Premium (>2000)"
    except (ValueError, TypeError):
        return "Unpriced"


def derive_engagement_level(try_on_count: int) -> str:
    """Classifies user engagement based on total try-on volume."""
    if try_on_count <= 0:
        return "Inactive (0)"
    elif try_on_count <= 2:
        return "Low (1-2)"
    elif try_on_count <= 10:
        return "Medium (3-10)"
    elif try_on_count <= 25:
        return "High (11-25)"
    else:
        return "Power User (>25)"


def infer_color(title: str) -> str:
    """Attempts to extract apparel color from product title."""
    if not title:
        return "Unknown/Unspecified"
    lower_title = title.lower()
    for c in COLOR_KEYWORDS:
        if c in lower_title:
            return c.capitalize()
    return "Unknown/Unspecified"


def infer_pattern(title: str) -> str:
    """Attempts to extract apparel pattern from product title."""
    if not title:
        return "Solid/Standard"
    lower_title = title.lower()
    for p in PATTERN_KEYWORDS:
        if p in lower_title:
            return p.capitalize()
    return "Solid/Standard"


def generate_time_attributes(ts: datetime) -> Dict[str, Any]:
    """
    Transforms a datetime timestamp into granular calendar attributes for dim_time.
    time_key format: YYYYMMDDHH (e.g. 2026091817)
    """
    time_key = int(ts.strftime("%Y%m%d%H"))
    is_weekend = ts.weekday() >= 5  # Saturday=5, Sunday=6
    return {
        "time_key": time_key,
        "full_timestamp": ts,
        "hour": ts.hour,
        "day": ts.day,
        "week": int(ts.strftime("%U")),
        "month": ts.month,
        "year": ts.year,
        "weekday_or_weekend": "Weekend" if is_weekend else "Weekday",
    }


def transform_data(extracted: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes transformation and business logic on extracted OLTP entities.
    Generates structured dimension objects and normalized fact candidates.
    """
    logger.info("Starting transformation on %d users, %d products, %d jobs...",
                len(extracted["users"]), len(extracted["products"]), len(extracted["jobs"]))

    # 1. Transform Users -> DimUser candidates
    transformed_users = []
    for u in extracted["users"]:
        signup_date = (u["created_at"] or datetime.utcnow()).date()
        try_ons = u.get("try_on_count") or 0
        transformed_users.append({
            "user_id": u["id"],
            "signup_date": signup_date,
            "total_tryons": try_ons,
            "engagement_level": derive_engagement_level(try_ons),
        })

    # 2. Transform Products -> DimProduct candidates
    transformed_products = []
    for p in extracted["products"]:
        title = (p.get("title") or "").strip()
        category = (p.get("category") or "Uncategorized").strip()
        price = p.get("price")
        transformed_products.append({
            "product_id": p["id"],
            "amazon_product_id": p["amazon_product_id"],
            "category": category,
            "color": infer_color(title),
            "pattern": infer_pattern(title),
            "price_bracket": derive_price_bracket(price),
        })

    # 3. Transform Jobs -> FactTryonEvent + Dimensions candidates
    transformed_times = {}
    transformed_devices = {}
    transformed_outcomes = {}
    fact_candidates = []

    for j in extracted["jobs"]:
        job_created_at = j.get("created_at") or datetime.utcnow()
        time_attrs = generate_time_attributes(job_created_at)
        time_key = time_attrs["time_key"]
        transformed_times[time_key] = time_attrs

        # Determine Outcome
        raw_status = (j.get("status") or "PENDING").upper()
        if raw_status in ("COMPLETED", "SUCCESS"):
            success_or_fail = "SUCCESS"
            failure_reason = "None"
        elif raw_status == "FAILED":
            success_or_fail = "FAILURE"
            failure_reason = "Model Inference Error"
        else:
            success_or_fail = "PENDING"
            failure_reason = "Job Queued / In-Progress"

        outcome_tuple = (success_or_fail, failure_reason)
        transformed_outcomes[outcome_tuple] = {
            "success_or_fail": success_or_fail,
            "failure_reason": failure_reason,
        }

        # Device & Upload method (Proxy defaults per Section 6)
        # Upstream OLTP does not yet track device/upload_method; we provide robust defaults
        device_type = "Mobile"  # Primary virtual try-on consumer channel
        upload_method = "Camera"
        device_tuple = (device_type, upload_method)
        transformed_devices[device_tuple] = {
            "device_type": device_type,
            "upload_method": upload_method,
        }

        # Compute or proxy metrics
        proc_time_sec = j.get("processing_time")
        proc_time_ms = int(proc_time_sec * 1000) if proc_time_sec is not None else None

        # Proxy quality score: if SUCCESS, default to high score (0.85-0.95); if FAILURE, 0.00
        if success_or_fail == "SUCCESS":
            quality_score = Decimal("0.90")
        elif success_or_fail == "FAILURE":
            quality_score = Decimal("0.00")
        else:
            quality_score = None

        fact_candidates.append({
            "job_id": j["id"],
            "user_id": j["user_id"],
            "product_id": j["product_id"],
            "time_key": time_key,
            "device_tuple": device_tuple,
            "outcome_tuple": outcome_tuple,
            "processing_time_ms": proc_time_ms,
            "quality_score": quality_score,
            "user_rating": None,         # Not yet captured by upstream OLTP
            "retry_count": 0,            # Default 0
            "saved_after_tryon": False,  # Not yet persisted in backend DB
            "created_at": job_created_at,
        })

    logger.info("Transformation complete. Prepared %d user dims, %d product dims, %d time slots, %d fact records.",
                len(transformed_users), len(transformed_products), len(transformed_times), len(fact_candidates))

    return {
        "dim_users": transformed_users,
        "dim_products": transformed_products,
        "dim_times": list(transformed_times.values()),
        "dim_devices": list(transformed_devices.values()),
        "dim_outcomes": list(transformed_outcomes.values()),
        "fact_events": fact_candidates,
        "max_job_id": extracted.get("max_job_id", 0),
    }
