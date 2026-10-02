"""
DWM Data Mining Layer: Correlation Analysis
Analyzes and explains AI Virtual Try-On model failures and quality degradations
across dimension attributes (device, product category, price bracket, time grain).
Computes signed point-biserial / phi correlation, relative risk, chi-square, p-value,
and empirical failure reasons.
"""
import sys
import os
import math
import logging
from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import datetime
from collections import defaultdict, Counter

# Allow execution from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dwm.connection import DWHSessionLocal
from dwm.models import (
    FactTryonEvent,
    DimProduct,
    DimDevice,
    DimOutcome,
    DimTime,
    MiningQualityCorrelation,
)

logger = logging.getLogger("dwm.mining.correlation")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def compute_phi_and_stats(
    n1: int,
    f1: int,
    total_n: int,
    total_f: int
) -> Dict[str, Any]:
    """
    Computes signed Point-Biserial / Phi correlation, Relative Risk,
    Chi-Square statistic, p-value, and Cramer's V for a binary contingency table.
    """
    if total_n <= 0 or n1 <= 0:
        return {
            "failure_rate": 0.0,
            "relative_risk": 1.0,
            "correlation_with_failure": 0.0,
            "chi_square": 0.0,
            "p_value": 1.0,
            "is_significant": False,
            "cramers_v": 0.0,
        }

    overall_fail_rate = total_f / total_n
    group_fail_rate = f1 / n1
    rr = round(group_fail_rate / overall_fail_rate, 2) if overall_fail_rate > 0 else 1.0

    # If all events or no variance
    if n1 >= total_n or overall_fail_rate <= 0 or overall_fail_rate >= 1.0:
        return {
            "failure_rate": round(group_fail_rate, 4),
            "relative_risk": rr,
            "correlation_with_failure": 0.0,
            "chi_square": 0.0,
            "p_value": 1.0,
            "is_significant": False,
            "cramers_v": 0.0,
        }

    # Signed Point-Biserial / Phi correlation: r = Cov(X, Y) / sqrt(Var(X) * Var(Y))
    cov = (n1 / total_n) * (group_fail_rate - overall_fail_rate)
    var_x = (n1 / total_n) * (1.0 - (n1 / total_n))
    var_y = overall_fail_rate * (1.0 - overall_fail_rate)
    denom = math.sqrt(var_x * var_y)
    r_phi = cov / denom if denom > 0 else 0.0

    # Chi-Square statistic = N * r_phi^2
    chi2 = total_n * (r_phi ** 2)

    # Exact p-value for df=1 using complementary error function erfc
    try:
        p_val = math.erfc(math.sqrt(chi2 / 2.0))
    except (ValueError, OverflowError):
        p_val = 0.0 if chi2 > 30 else 1.0

    cramers_v = abs(r_phi)
    is_sig = bool(p_val < 0.05 and chi2 >= 3.841)

    return {
        "failure_rate": round(group_fail_rate, 4),
        "relative_risk": rr,
        "correlation_with_failure": round(r_phi, 4),
        "chi_square": round(chi2, 2),
        "p_value": float(f"{p_val:.4e}"),
        "is_significant": is_sig,
        "cramers_v": round(cramers_v, 4),
    }


def analyze_correlation_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Computes statistical failure & quality correlations across dimension attributes
    from normalized records list (each record containing category, price_bracket,
    device_type, upload_method, weekday_or_weekend, hour, outcome, failure_reason,
    quality_score, processing_time_ms).
    """
    total_events = len(records)
    if total_events == 0:
        return []

    def check_is_failure(r: Dict[str, Any]) -> int:
        outcome = r.get("outcome") or r.get("success_or_fail")
        if outcome is not None and str(outcome).strip() != "":
            return 1 if str(outcome).strip().upper() == "FAILURE" else 0
        outcome_key = r.get("outcome_key")
        if outcome_key is not None and str(outcome_key).strip() != "":
            return 1 if str(outcome_key).strip() not in ("1", "SUCCESS") else 0
        return 0

    failures_mask = [check_is_failure(r) for r in records]
    total_failures = sum(failures_mask)

    attributes_to_check = [
        ("Device & Method", lambda r: f"{r.get('device_type', 'Unknown')} ({r.get('upload_method', 'Unknown')})"),
        ("Product Category", lambda r: str(r.get("category", "Unknown"))),
        ("Price Bracket", lambda r: str(r.get("price_bracket", "Unknown"))),
        ("Temporal Period", lambda r: f"{r.get('weekday_or_weekend', 'Weekday')} ({'Peak Evening' if 18 <= int(r.get('hour', 12) or 12) <= 22 else 'Daytime' if 8 <= int(r.get('hour', 12) or 12) < 18 else 'Off-Peak'})"),
    ]

    results = []

    for dim_name, extractor in attributes_to_check:
        groups = defaultdict(list)
        for idx, r in enumerate(records):
            val = extractor(r)
            if val and val != "Unknown" and val != "Unknown (Unknown)":
                groups[val].append(idx)

        for val, indices in groups.items():
            count = len(indices)
            if count == 0:
                continue

            sub_failures = sum(failures_mask[i] for i in indices)
            stats = compute_phi_and_stats(count, sub_failures, total_events, total_failures)

            success_rate = round(1.0 - stats["failure_rate"], 4)

            # Quality and processing time
            qual_vals = [
                float(records[i]["quality_score"])
                for i in indices
                if records[i].get("quality_score") is not None and str(records[i].get("quality_score")).strip() != ""
            ]
            avg_qual = round(sum(qual_vals) / len(qual_vals), 4) if qual_vals else 0.85

            proc_times = [
                int(records[i]["processing_time_ms"])
                for i in indices
                if records[i].get("processing_time_ms") is not None and str(records[i].get("processing_time_ms")).strip() != ""
            ]
            avg_proc = int(sum(proc_times) / len(proc_times)) if proc_times else 9000

            # Derive real top failure reasons for this specific group
            fail_reasons = []
            for i in indices:
                if failures_mask[i] == 1:
                    reason = records[i].get("failure_reason") or "Model Inference Error"
                    if reason not in ("None", "SUCCESS", ""):
                        fail_reasons.append(reason)

            top_reasons_counter = Counter(fail_reasons).most_common(2)
            top_reasons_summary = ", ".join(f"{r} ({cnt})" for r, cnt in top_reasons_counter) if top_reasons_counter else "None"

            results.append({
                "dimension_name": dim_name,
                "dimension_value": val,
                "total_events": count,
                "success_rate": success_rate,
                "failure_rate": stats["failure_rate"],
                "relative_risk": stats["relative_risk"],
                "correlation_with_failure": stats["correlation_with_failure"],
                "chi_square": stats["chi_square"],
                "p_value": stats["p_value"],
                "is_significant": stats["is_significant"],
                "cramers_v": stats["cramers_v"],
                "avg_quality_score": avg_qual,
                "avg_processing_time_ms": avg_proc,
                "top_failure_reasons": top_reasons_summary,
            })

    return results


def run_correlation_analysis() -> List[Dict[str, Any]]:
    """Runs correlation analysis against the live DWH MySQL instance."""
    logger.info("Starting correlation analysis on live DWH MySQL facts...")
    dwh_session = DWHSessionLocal()

    try:
        query = (
            dwh_session.query(
                FactTryonEvent.tryon_id,
                FactTryonEvent.processing_time_ms,
                FactTryonEvent.quality_score,
                DimOutcome.success_or_fail,
                DimOutcome.failure_reason,
                DimProduct.category,
                DimProduct.price_bracket,
                DimDevice.device_type,
                DimDevice.upload_method,
                DimTime.weekday_or_weekend,
                DimTime.hour,
            )
            .join(DimOutcome, FactTryonEvent.outcome_key == DimOutcome.outcome_key)
            .join(DimProduct, FactTryonEvent.product_key == DimProduct.product_key)
            .join(DimDevice, FactTryonEvent.device_key == DimDevice.device_key)
            .join(DimTime, FactTryonEvent.time_key == DimTime.time_key)
        )
        rows = query.all()
        if not rows:
            logger.warning("No try-on fact records found in live DWH.")
            return []

        records = [
            {
                "outcome": r.success_or_fail,
                "failure_reason": r.failure_reason,
                "category": r.category,
                "price_bracket": r.price_bracket,
                "device_type": r.device_type,
                "upload_method": r.upload_method,
                "weekday_or_weekend": r.weekday_or_weekend,
                "hour": r.hour,
                "quality_score": float(r.quality_score) if r.quality_score is not None else 0.85,
                "processing_time_ms": r.processing_time_ms or 9000,
            }
            for r in rows
        ]

        return analyze_correlation_records(records)
    finally:
        dwh_session.close()


def persist_correlation_results(results: List[Dict[str, Any]]):
    """Stores correlation metrics in mining_quality_correlations."""
    dwh_session = DWHSessionLocal()
    try:
        dwh_session.query(MiningQualityCorrelation).delete()
        for res in results:
            entry = MiningQualityCorrelation(
                dimension_name=res["dimension_name"],
                dimension_value=res["dimension_value"],
                total_events=res["total_events"],
                success_rate=Decimal(str(res["success_rate"])),
                avg_quality_score=Decimal(str(res["avg_quality_score"])),
                avg_processing_time_ms=res["avg_processing_time_ms"],
                correlation_with_failure=Decimal(str(res["correlation_with_failure"])),
                created_at=datetime.utcnow(),
            )
            dwh_session.add(entry)
        dwh_session.commit()
        logger.info("Persisted %d correlation metrics to mining_quality_correlations.", len(results))
    finally:
        dwh_session.close()


def generate_and_save_correlations() -> int:
    """Entrypoint function for pipeline and scheduled executions."""
    results = run_correlation_analysis()
    if results:
        persist_correlation_results(results)
    return len(results)


if __name__ == "__main__":
    generate_and_save_correlations()
