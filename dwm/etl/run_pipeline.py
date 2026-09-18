"""
AI Virtual Try-On - DWM ETL Pipeline Runner
Extracts from OLTP MySQL -> Transforms into Star Schema -> Loads into DWH MySQL.

Usage:
    python dwm/etl/run_pipeline.py [--full-refresh]
"""
import sys
import os
import argparse
import logging
from datetime import datetime

# Allow execution from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dwm.connection import init_dwh_database, DWHSessionLocal
from dwm.etl.extract import extract_oltp_data, get_current_watermark
from dwm.etl.transform import transform_data
from dwm.etl.load import load_data

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
)
logger = logging.getLogger("dwm.etl.pipeline")


def run_etl_pipeline(full_refresh: bool = False) -> dict:
    """
    Executes the end-to-end ETL workflow:
    1. Ensures DWH database and schema tables are initialized.
    2. Determines high-watermark job_id (unless full_refresh is requested).
    3. Extracts OLTP users, products, and vton_jobs.
    4. Transforms data into star schema dimension and fact formats.
    5. Loads dimension surrogate keys and fact rows idempotently.
    6. Updates watermark.
    """
    start_time = datetime.utcnow()
    logger.info("==================================================================")
    logger.info("Starting DWM ETL Pipeline Execution (Mode: %s)",
                "FULL REFRESH" if full_refresh else "INCREMENTAL")
    logger.info("==================================================================")

    # 1. Initialize schema
    init_dwh_database()

    # 2. Watermark check
    dwh_session = DWHSessionLocal()
    try:
        current_watermark = 0 if full_refresh else get_current_watermark(dwh_session)
    finally:
        dwh_session.close()

    logger.info("Starting extraction from watermark job_id: %d", current_watermark)

    # 3. Extract
    extracted = extract_oltp_data(
        watermark_job_id=current_watermark,
        full_refresh=full_refresh
    )

    # 4. Transform
    transformed = transform_data(extracted)

    # 5. Load
    load_results = load_data(transformed)

    elapsed = (datetime.utcnow() - start_time).total_seconds()
    logger.info("==================================================================")
    logger.info("ETL Pipeline completed successfully in %.2f seconds.", elapsed)
    logger.info("Summary: Extracted %d jobs | Facts Processed: %d | Watermark: %d",
                len(extracted["jobs"]),
                load_results["total_facts_processed"],
                load_results["max_job_id"])
    logger.info("==================================================================")

    return {
        "status": "success",
        "elapsed_seconds": elapsed,
        "users_extracted": len(extracted["users"]),
        "products_extracted": len(extracted["products"]),
        "jobs_extracted": len(extracted["jobs"]),
        "facts_processed": load_results["total_facts_processed"],
        "max_job_id": load_results["max_job_id"],
    }


def main():
    parser = argparse.ArgumentParser(description="Run DWM ETL Pipeline for AI Virtual Try-On")
    parser.add_argument(
        "--full-refresh",
        action="store_true",
        help="Ignore incremental watermark and re-extract all OLTP historical jobs"
    )
    args = parser.parse_args()
    try:
        run_etl_pipeline(full_refresh=args.full_refresh)
    except Exception as e:
        logger.exception("ETL Pipeline execution failed: %s", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
