"""
DWM Data Mining Layer: Correlation Analysis
Analyzes and explains AI Virtual Try-On model failures and quality degradations
across dimension attributes (device, product category, price bracket, time grain).
Persists findings into `mining_quality_correlations` for admin insights.
"""
import sys
import os
import math
import logging
from decimal import Decimal
from typing import List, Dict, Any
from datetime import datetime
from collections import defaultdict

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


def compute_pearson_correlation(x: List[float], y: List[float]) -> float:
    """Computes standard Pearson / Point-Biserial correlation coefficient between two lists."""
    n = len(x)
    if n < 2:
        return 0.0

    mean_x = sum(x) / n
    mean_y = sum(y) / n

    variance_x = sum((xi - mean_x) ** 2 for xi in x)
    variance_y = sum((yi - mean_y) ** 2 for yi in y)

    if variance_x <= 0 or variance_y <= 0:
        return 0.0

    covariance = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    return covariance / math.sqrt(variance_x * variance_y)


def run_correlation_analysis() -> List[Dict[str, Any]]:
    """
    Queries fact events joined with product, device, outcome, and time dimensions,
    calculates metrics per dimension attribute, and computes correlation with failure.
    """
    logger.info("Starting correlation analysis on warehouse facts...")
    dwh_session = DWHSessionLocal()

    try:
        # Join facts with related dimensions
        query = (
            dwh_session.query(
                FactTryonEvent.tryon_id,
                FactTryonEvent.processing_time_ms,
                FactTryonEvent.quality_score,
                DimOutcome.success_or_fail,
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
        total_facts = len(rows)

        if total_facts == 0:
            logger.warning("No try-on fact records found. Skipping correlation analysis.")
            return []

        logger.info("Analyzing %d try-on events for failure correlation...", total_facts)

        # Vector of failure indicator (1 = FAILURE, 0 = SUCCESS)
        failure_vector = [
            1.0 if r.success_or_fail.upper() == "FAILURE" else 0.0
            for r in rows
        ]

        # Dimension attributes to evaluate
        attributes_to_check = [
            ("device_type", lambda r: str(r.device_type)),
            ("upload_method", lambda r: str(r.upload_method)),
            ("product_category", lambda r: str(r.category)),
            ("price_bracket", lambda r: str(r.price_bracket)),
            ("weekday_or_weekend", lambda r: str(r.weekday_or_weekend)),
            ("hour_slot", lambda r: f"{r.hour:02d}:00"),
        ]

        results = []

        for dim_name, extractor in attributes_to_check:
            # Group events by dimension value
            groups = defaultdict(list)
            for idx, r in enumerate(rows):
                val = extractor(r)
                groups[val].append(idx)

            for val, indices in groups.items():
                count = len(indices)
                if count == 0:
                    continue

                # Indicator vector for this attribute
                indicator_vector = [1.0 if i in indices else 0.0 for i in range(total_facts)]
                corr = compute_pearson_correlation(indicator_vector, failure_vector)

                # Subgroup metrics
                sub_successes = sum(1 for i in indices if failure_vector[i] == 0.0)
                success_rate = sub_successes / count

                quality_scores = [
                    float(rows[i].quality_score)
                    for i in indices
                    if rows[i].quality_score is not None
                ]
                avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else None

                proc_times = [
                    rows[i].processing_time_ms
                    for i in indices
                    if rows[i].processing_time_ms is not None
                ]
                avg_proc_time = int(sum(proc_times) / len(proc_times)) if proc_times else None

                results.append({
                    "dimension_name": dim_name,
                    "dimension_value": val,
                    "total_events": count,
                    "success_rate": Decimal(str(round(success_rate, 4))),
                    "avg_quality_score": Decimal(str(round(avg_quality, 4))) if avg_quality is not None else None,
                    "avg_processing_time_ms": avg_proc_time,
                    "correlation_with_failure": Decimal(str(round(corr, 4))),
                })

        logger.info("Correlation analysis finished. Computed %d attribute correlation metrics.", len(results))
        return results

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
                success_rate=res["success_rate"],
                avg_quality_score=res["avg_quality_score"],
                avg_processing_time_ms=res["avg_processing_time_ms"],
                correlation_with_failure=res["correlation_with_failure"],
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
