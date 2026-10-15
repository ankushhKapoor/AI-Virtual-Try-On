"""
DWM OLAP Operations Engine (Drill-Down, Roll-Up, Slice & Dice)
Implements multidimensional online analytical processing on the virtual try-on data warehouse.
Supports both the benchmark 10k analytical dataset and live Star Schema database queries.
"""
import os
import csv
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from collections import defaultdict

logger = logging.getLogger("dwm.mining.olap_cube")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BENCHMARK_CSV_PATH = os.path.join(
    PROJECT_ROOT, "dwm_exports", "benchmark_10k", "csv", "vton_dw_unified_analytical_10k.csv"
)

# In-memory cache for benchmark rows
_BENCHMARK_CACHE: Optional[List[Dict[str, Any]]] = None


def load_benchmark_unified() -> List[Dict[str, Any]]:
    global _BENCHMARK_CACHE
    if _BENCHMARK_CACHE is not None:
        return _BENCHMARK_CACHE

    if not os.path.exists(BENCHMARK_CSV_PATH):
        logger.warning("Benchmark CSV not found at: %s", BENCHMARK_CSV_PATH)
        return []

    rows = []
    with open(BENCHMARK_CSV_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            try:
                proc_ms = int(r.get("processing_time_ms") or 0)
            except (ValueError, TypeError):
                proc_ms = 0
            try:
                qual = float(r.get("quality_score") or 0.0)
            except (ValueError, TypeError):
                qual = 0.0

            row_dict = {
                "tryon_id": r.get("tryon_id", ""),
                "job_id": r.get("job_id", ""),
                "timestamp": r.get("timestamp", ""),
                "user_id": r.get("user_id", ""),
                "user_name": r.get("user_name", ""),
                "user_email": r.get("user_email", ""),
                "product_id": r.get("product_id", ""),
                "asin": r.get("asin", ""),
                "product_title": r.get("product_title", ""),
                "category": r.get("category", "General"),
                "color": r.get("color", "Standard"),
                "pattern": r.get("pattern", "Solid"),
                "price_bracket": r.get("price_bracket", "Mid-Range (500-2000)"),
                "device_type": r.get("device_type", "Mobile"),
                "upload_method": r.get("upload_method", "Gallery"),
                "outcome": r.get("outcome", "SUCCESS").upper(),
                "failure_reason": r.get("failure_reason", "None"),
                "processing_time_ms": proc_ms,
                "quality_score": qual,
                "user_rating": r.get("user_rating", "Unrated"),
                "saved_to_wishlist": r.get("saved_to_wishlist", "No"),
                "hour": str(r.get("hour", "0")).zfill(2),
                "day": str(r.get("day", "1")).zfill(2),
                "month": str(r.get("month", "1")).zfill(2),
                "year": str(r.get("year", "2026")),
                "day_type": r.get("day_type", "Weekday"),
                "user_segment": r.get("user_segment", "Shopper"),
            }
            rows.append(row_dict)

    _BENCHMARK_CACHE = rows
    logger.info("Loaded and cached %d unified benchmark rows for OLAP.", len(rows))
    return _BENCHMARK_CACHE


def get_olap_filter_options(source: str = "benchmark_10k") -> Dict[str, Any]:
    """Returns available distinct dimension values for slice & dice controls."""
    rows = load_benchmark_unified()

    categories = set()
    colors = set()
    devices = set()
    upload_methods = set()
    price_brackets = set()
    outcomes = set()
    years = set()
    months = set()

    for r in rows:
        if r["category"]:
            categories.add(r["category"])
        if r["color"]:
            colors.add(r["color"])
        if r["device_type"]:
            devices.add(r["device_type"])
        if r["upload_method"]:
            upload_methods.add(r["upload_method"])
        if r["price_bracket"]:
            price_brackets.add(r["price_bracket"])
        if r["outcome"]:
            outcomes.add(r["outcome"])
        if r["year"]:
            years.add(r["year"])
        if r["year"] and r["month"]:
            months.add(f"{r['year']}-{r['month']}")

    return {
        "categories": sorted(list(categories)),
        "colors": sorted(list(colors)),
        "devices": sorted(list(devices)),
        "upload_methods": sorted(list(upload_methods)),
        "price_brackets": sorted(list(price_brackets)),
        "outcomes": sorted(list(outcomes)),
        "years": sorted(list(years)),
        "months": sorted(list(months)),
        "hierarchy_levels": [
            {"id": "year", "label": "Yearly Summary", "order": 1},
            {"id": "month", "label": "Monthly Trend", "order": 2},
            {"id": "day", "label": "Daily Activity", "order": 3},
            {"id": "hour", "label": "Hourly Fitting Traffic", "order": 4},
        ],
    }


def load_live_dwh_unified() -> List[Dict[str, Any]]:
    """Loads unified analytical rows from live Star Schema database."""
    try:
        from dwm.connection import DWHSessionLocal
        from dwm.models import FactTryonEvent, DimProduct, DimDevice, DimOutcome, DimTime, DimUser

        session = DWHSessionLocal()
        try:
            results = (
                session.query(
                    FactTryonEvent.tryon_id,
                    FactTryonEvent.job_id,
                    DimTime.full_timestamp,
                    DimTime.hour,
                    DimTime.day,
                    DimTime.month,
                    DimTime.year,
                    DimTime.weekday_or_weekend,
                    DimUser.user_id,
                    DimProduct.product_id,
                    DimProduct.amazon_product_id,
                    DimProduct.category,
                    DimProduct.color,
                    DimProduct.pattern,
                    DimProduct.price_bracket,
                    DimDevice.device_type,
                    DimDevice.upload_method,
                    DimOutcome.success_or_fail,
                    DimOutcome.failure_reason,
                    FactTryonEvent.processing_time_ms,
                    FactTryonEvent.quality_score,
                    FactTryonEvent.user_rating,
                    FactTryonEvent.saved_after_tryon,
                )
                .join(DimTime, FactTryonEvent.time_key == DimTime.time_key)
                .join(DimProduct, FactTryonEvent.product_key == DimProduct.product_key)
                .join(DimDevice, FactTryonEvent.device_key == DimDevice.device_key)
                .join(DimOutcome, FactTryonEvent.outcome_key == DimOutcome.outcome_key)
                .outerjoin(DimUser, FactTryonEvent.user_key == DimUser.user_key)
                .all()
            )
            rows = []
            for r in results:
                ts_str = str(r.full_timestamp) if r.full_timestamp else "2026-01-01 12:00:00"
                rows.append({
                    "tryon_id": str(r.tryon_id),
                    "job_id": str(r.job_id),
                    "timestamp": ts_str,
                    "user_id": str(r.user_id or ""),
                    "user_name": f"User {r.user_id or ''}",
                    "user_email": f"user{r.user_id or ''}@example.com",
                    "product_id": str(r.product_id or ""),
                    "asin": str(r.amazon_product_id or ""),
                    "product_title": f"{r.color or ''} {r.category or ''}".strip(),
                    "category": str(r.category or "General"),
                    "color": str(r.color or "Standard"),
                    "pattern": str(r.pattern or "Solid"),
                    "price_bracket": str(r.price_bracket or "Mid-Range (500-2000)"),
                    "device_type": str(r.device_type or "Mobile"),
                    "upload_method": str(r.upload_method or "Gallery"),
                    "outcome": str(r.success_or_fail or "SUCCESS").upper(),
                    "failure_reason": str(r.failure_reason or "None"),
                    "processing_time_ms": int(r.processing_time_ms or 0),
                    "quality_score": float(r.quality_score or 0.0),
                    "user_rating": str(r.user_rating or "Unrated"),
                    "saved_to_wishlist": "Yes" if r.saved_after_tryon else "No",
                    "hour": str(r.hour or "0").zfill(2),
                    "day": str(r.day or "1").zfill(2),
                    "month": str(r.month or "1").zfill(2),
                    "year": str(r.year or "2026"),
                    "day_type": str(r.weekday_or_weekend or "Weekday"),
                    "user_segment": "Shopper",
                })
            return rows
        finally:
            session.close()
    except Exception as e:
        logger.warning("Could not query live DWH for OLAP: %s", e)
        return []


def execute_olap_cube_query(
    source: str = "benchmark_10k",
    level: str = "month",
    year: Optional[str] = None,
    month: Optional[str] = None,
    day: Optional[str] = None,
    category: Optional[str] = None,
    color: Optional[str] = None,
    device_type: Optional[str] = None,
    upload_method: Optional[str] = None,
    outcome: Optional[str] = None,
    price_bracket: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    limit_records: int = 40,
) -> Dict[str, Any]:
    """
    Executes OLAP query supporting:
    - Drill-Down: Year -> Month -> Day -> Hour
    - Roll-Up: Hour -> Day -> Month -> Year
    - Slice: Single-dimension isolation
    - Dice: Multi-dimensional constraints
    """
    norm_level = level.lower().strip() if level else "month"
    if norm_level not in ("year", "month", "day", "hour"):
        norm_level = "month"

    # Normalize parent hierarchy parameters
    clean_year = str(year).strip() if year else None
    clean_month = str(month).strip().zfill(2) if month and len(str(month).strip()) <= 2 else month
    if clean_month and "-" in clean_month:
        parts = clean_month.split("-")
        clean_year = parts[0]
        clean_month = parts[1].zfill(2)

    clean_day = str(day).strip() if day else None
    if clean_day and len(clean_day) <= 2:
        clean_day = clean_day.zfill(2)

    is_live = str(source).strip().lower() in ("live", "live_dwh", "mysql")
    if is_live:
        rows = load_live_dwh_unified()
        if not rows:
            return {
                "status": "empty",
                "source": "live",
                "message": "Live Data Warehouse has 0 records. Run dwm/etl/run_pipeline.py first.",
                "level": norm_level,
                "active_operation": {
                    "type": "EMPTY",
                    "title": "Live Warehouse Empty",
                    "description": "Run the ETL pipeline to sync OLTP transactions into virtual_tryon_dwh.",
                    "badge_color": "amber",
                },
                "breadcrumbs": [{"level": "all", "label": "All Time", "params": {"level": "year"}}],
                "active_filters": {},
                "total_records_matched": 0,
                "kpis": {
                    "total_tryons": 0,
                    "successful_tryons": 0,
                    "failed_tryons": 0,
                    "success_rate_pct": 0.0,
                    "failure_rate_pct": 0.0,
                    "avg_processing_time_ms": 0,
                    "avg_quality_score": 0.0,
                    "unique_users": 0,
                    "warehouse_total": 0,
                    "pct_of_warehouse": 0.0,
                },
                "time_series": [],
                "by_category": [],
                "by_device": [],
                "by_outcome": {"SUCCESS": 0, "FAILURE": 0, "success_rate_pct": 0.0, "failure_rate_pct": 0.0},
                "sliced_records": [],
            }
    else:
        rows = load_benchmark_unified()

    # 1. Apply Slice & Dice filtering
    filtered_rows = []
    active_filters = {}

    if category:
        active_filters["category"] = category
    if color:
        active_filters["color"] = color
    if device_type:
        active_filters["device_type"] = device_type
    if upload_method:
        active_filters["upload_method"] = upload_method
    if outcome:
        active_filters["outcome"] = outcome.upper()
    if price_bracket:
        active_filters["price_bracket"] = price_bracket
    if date_from:
        active_filters["date_from"] = date_from
    if date_to:
        active_filters["date_to"] = date_to
    if search:
        active_filters["search"] = search

    search_lower = search.lower().strip() if search else None

    for r in rows:
        # Hierarchical temporal scoping if drilling down
        if clean_year and r["year"] != clean_year:
            continue
        if clean_month and r["month"] != clean_month:
            continue
        if clean_day:
            if len(clean_day) == 10:  # e.g. '2026-01-12'
                if r["timestamp"][:10] != clean_day:
                    continue
            elif r["day"] != clean_day:
                continue

        # Slice / Dice dimension filters
        if category and r["category"].lower() != category.lower():
            continue
        if color and r["color"].lower() != color.lower():
            continue
        if device_type and r["device_type"].lower() != device_type.lower():
            continue
        if upload_method and r["upload_method"].lower() != upload_method.lower():
            continue
        if outcome and r["outcome"].upper() != outcome.upper():
            continue
        if price_bracket and r["price_bracket"].lower() != price_bracket.lower():
            continue

        ts_date = r["timestamp"][:10]
        if date_from and ts_date < date_from:
            continue
        if date_to and ts_date > date_to:
            continue

        if search_lower:
            text_match = (
                search_lower in r["product_title"].lower()
                or search_lower in r["user_name"].lower()
                or search_lower in r["category"].lower()
                or search_lower in r["asin"].lower()
            )
            if not text_match:
                continue

        filtered_rows.append(r)

    total_matched = len(filtered_rows)
    total_warehouse_facts = len(rows) if rows else 10000

    # 2. Determine Active OLAP Operation classification
    filter_count = len(active_filters)
    if filter_count > 1:
        active_operation = {
            "type": "DICE",
            "title": f"Dice ({filter_count} Dimensions Constrained)",
            "description": "Multidimensional subcube filtering across multiple dimensions simultaneously.",
            "badge_color": "indigo",
        }
    elif filter_count == 1:
        dim_k, dim_v = list(active_filters.items())[0]
        active_operation = {
            "type": "SLICE",
            "title": f"Slice: {dim_k.replace('_', ' ').title()} = {dim_v}",
            "description": f"Isolating a 2D slice along the '{dim_k}' dimension.",
            "badge_color": "emerald",
        }
    elif norm_level in ("day", "hour") and (clean_year or clean_month or clean_day):
        active_operation = {
            "type": "DRILL_DOWN",
            "title": f"Drill-Down ({norm_level.title()} View)",
            "description": f"Navigating to lower granularity under parent: {clean_year or ''} {clean_month or ''} {clean_day or ''}".strip(),
            "badge_color": "accent",
        }
    else:
        active_operation = {
            "type": "ROLL_UP",
            "title": f"Roll-Up ({norm_level.title()} Aggregation)",
            "description": f"Aggregating granular try-on events into macroscopic {norm_level}-level summaries.",
            "badge_color": "purple",
        }

    # 3. Construct Breadcrumbs Hierarchy
    breadcrumbs = [{"level": "all", "label": "All Time", "params": {"level": "year"}}]
    if clean_year:
        breadcrumbs.append({
            "level": "year",
            "label": f"Year {clean_year}",
            "params": {"level": "month", "year": clean_year}
        })
    if clean_year and clean_month:
        month_names = {
            "01": "January", "02": "February", "03": "March", "04": "April",
            "05": "May", "06": "June", "07": "July", "08": "August",
            "09": "September", "10": "October", "11": "November", "12": "December"
        }
        m_name = month_names.get(clean_month, clean_month)
        breadcrumbs.append({
            "level": "month",
            "label": f"{m_name} {clean_year}",
            "params": {"level": "day", "year": clean_year, "month": clean_month}
        })
    if clean_day:
        d_label = clean_day if len(clean_day) == 10 else f"{clean_year or ''}-{clean_month or ''}-{clean_day}"
        breadcrumbs.append({
            "level": "day",
            "label": f"Day {d_label}",
            "params": {"level": "hour", "year": clean_year, "month": clean_month, "day": clean_day}
        })

    # 4. Compute Aggregate KPIs
    successful_count = sum(1 for r in filtered_rows if r["outcome"] == "SUCCESS")
    failed_count = total_matched - successful_count
    success_rate = round((successful_count / total_matched) * 100, 2) if total_matched > 0 else 0.0
    failure_rate = round((failed_count / total_matched) * 100, 2) if total_matched > 0 else 0.0

    avg_latency = int(sum(r["processing_time_ms"] for r in filtered_rows) / total_matched) if total_matched > 0 else 0
    avg_quality = round(sum(r["quality_score"] for r in filtered_rows) / total_matched, 2) if total_matched > 0 else 0.0
    unique_users = len(set(r["user_id"] for r in filtered_rows))

    kpis = {
        "total_tryons": total_matched,
        "successful_tryons": successful_count,
        "failed_tryons": failed_count,
        "success_rate_pct": success_rate,
        "failure_rate_pct": failure_rate,
        "avg_processing_time_ms": avg_latency,
        "avg_quality_score": avg_quality,
        "unique_users": unique_users,
        "warehouse_total": total_warehouse_facts,
        "pct_of_warehouse": round((total_matched / total_warehouse_facts) * 100, 1) if total_warehouse_facts > 0 else 100.0,
    }

    # 5. Build Time-Series Aggregations for Current Level
    buckets = defaultdict(lambda: {"total": 0, "success": 0, "latency_sum": 0, "quality_sum": 0.0, "raw_key": "", "drill_params": {}})

    for r in filtered_rows:
        if norm_level == "year":
            b_key = r["year"]
            b_label = f"Year {b_key}"
            d_params = {"level": "month", "year": b_key}
            can_drill = True
        elif norm_level == "month":
            b_key = f"{r['year']}-{r['month']}"
            m_num = r['month']
            month_abbrs = {
                "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
                "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
            }
            b_label = f"{month_abbrs.get(m_num, m_num)} '{r['year'][-2:]}"
            d_params = {"level": "day", "year": r["year"], "month": r["month"]}
            can_drill = True
        elif norm_level == "day":
            b_key = r["timestamp"][:10]  # YYYY-MM-DD
            b_label = b_key[5:]          # MM-DD
            d_params = {"level": "hour", "year": r["year"], "month": r["month"], "day": b_key}
            can_drill = True
        else:  # hour
            hr_str = r["hour"]
            hr_int = int(hr_str)
            am_pm = "AM" if hr_int < 12 else "PM"
            disp_hr = hr_int if hr_int in (0, 12) else hr_int % 12
            b_key = hr_str
            b_label = f"{disp_hr} {am_pm}"
            d_params = {}
            can_drill = False

        b = buckets[b_key]
        b["total"] += 1
        if r["outcome"] == "SUCCESS":
            b["success"] += 1
        b["latency_sum"] += r["processing_time_ms"]
        b["quality_sum"] += r["quality_score"]
        b["raw_key"] = b_key
        b["label"] = b_label
        b["can_drill"] = can_drill
        b["drill_params"] = d_params

    # Sort buckets chronologically
    sorted_keys = sorted(buckets.keys())
    time_series = []
    for k in sorted_keys:
        b = buckets[k]
        tot = b["total"]
        succ = b["success"]
        fail = tot - succ
        s_rate = round((succ / tot) * 100, 2) if tot > 0 else 0.0
        lat = int(b["latency_sum"] / tot) if tot > 0 else 0
        qual = round(b["quality_sum"] / tot, 2) if tot > 0 else 0.0

        time_series.append({
            "key": b["raw_key"],
            "label": b["label"],
            "total_tryons": tot,
            "successful_tryons": succ,
            "failed_tryons": fail,
            "success_rate_pct": s_rate,
            "avg_processing_time_ms": lat,
            "avg_quality_score": qual,
            "can_drill_down": b["can_drill"],
            "drill_params": b["drill_params"],
        })

    # 6. Category Breakdown Distribution
    cat_buckets = defaultdict(lambda: {"total": 0, "success": 0, "latency_sum": 0, "quality_sum": 0.0})
    for r in filtered_rows:
        c = r["category"]
        cb = cat_buckets[c]
        cb["total"] += 1
        if r["outcome"] == "SUCCESS":
            cb["success"] += 1
        cb["latency_sum"] += r["processing_time_ms"]
        cb["quality_sum"] += r["quality_score"]

    by_category = []
    for cat_name, cb in sorted(cat_buckets.items(), key=lambda x: x[1]["total"], reverse=True):
        tot = cb["total"]
        succ = cb["success"]
        by_category.append({
            "category": cat_name,
            "total_tryons": tot,
            "successful_tryons": succ,
            "failed_tryons": tot - succ,
            "success_rate_pct": round((succ / tot) * 100, 2) if tot > 0 else 0.0,
            "avg_processing_time_ms": int(cb["latency_sum"] / tot) if tot > 0 else 0,
            "avg_quality_score": round(cb["quality_sum"] / tot, 2) if tot > 0 else 0.0,
        })

    # 7. Device Breakdown Distribution
    dev_buckets = defaultdict(lambda: {"total": 0, "success": 0, "camera_count": 0, "gallery_count": 0})
    for r in filtered_rows:
        d = r["device_type"]
        db = dev_buckets[d]
        db["total"] += 1
        if r["outcome"] == "SUCCESS":
            db["success"] += 1
        if r["upload_method"].lower() == "camera":
            db["camera_count"] += 1
        else:
            db["gallery_count"] += 1

    by_device = []
    for dev_name, db in sorted(dev_buckets.items(), key=lambda x: x[1]["total"], reverse=True):
        tot = db["total"]
        succ = db["success"]
        by_device.append({
            "device_type": dev_name,
            "total_tryons": tot,
            "successful_tryons": succ,
            "failed_tryons": tot - succ,
            "success_rate_pct": round((succ / tot) * 100, 2) if tot > 0 else 0.0,
            "camera_count": db["camera_count"],
            "gallery_count": db["gallery_count"],
        })

    # 8. Outcome Breakdown
    by_outcome = {
        "SUCCESS": successful_count,
        "FAILURE": failed_count,
        "success_rate_pct": success_rate,
        "failure_rate_pct": failure_rate,
    }

    # 9. Sliced Records Sample
    # Take latest limit_records rows sorted by timestamp desc
    sorted_records = sorted(filtered_rows, key=lambda x: x["timestamp"], reverse=True)
    sliced_records = sorted_records[:limit_records]

    return {
        "status": "success",
        "source": source,
        "level": norm_level,
        "active_operation": active_operation,
        "breadcrumbs": breadcrumbs,
        "active_filters": active_filters,
        "total_records_matched": total_matched,
        "kpis": kpis,
        "time_series": time_series,
        "by_category": by_category,
        "by_device": by_device,
        "by_outcome": by_outcome,
        "sliced_records": sliced_records,
    }
