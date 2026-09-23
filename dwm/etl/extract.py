import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

from dwm.connection import OLTPSessionLocal, DWHSessionLocal
from dwm.models import ETLWatermark

logger = logging.getLogger("dwm.etl.extract")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def get_current_watermark(dwh_db: Session) -> int:
    """
    Reads the highest job_id successfully processed from etl_watermark.
    """
    watermark = dwh_db.query(ETLWatermark).filter(ETLWatermark.id == 1).first()
    if watermark:
        return watermark.last_extracted_job_id
    return 0


def extract_oltp_data(
    watermark_job_id: int = 0,
    full_refresh: bool = False
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Extracts raw data from OLTP database (users, products, and vton_jobs).
    Supports incremental extraction based on vton_jobs.id watermark.

    Returns:
        Dict with keys: 'users', 'products', 'jobs', 'extracted_at', 'max_job_id'
    """
    logger.info("Starting OLTP data extraction...")
    oltp_db = OLTPSessionLocal()
    extracted_at = datetime.utcnow()

    try:
        # 1. Extract Users
        users_result = oltp_db.execute(
            text("""
                SELECT 
                    id, name, email, try_on_count, is_active, 
                    created_at, updated_at, last_login_at
                FROM users
            """)
        ).mappings().all()
        raw_users = [dict(u) for u in users_result]
        logger.info("Extracted %d user records from OLTP.", len(raw_users))

        # 2. Extract Products
        products_result = oltp_db.execute(
            text("""
                SELECT 
                    id, amazon_product_id, title, price, currency, 
                    product_url, image_url, category, created_at, updated_at
                FROM products
            """)
        ).mappings().all()
        raw_products = [dict(p) for p in products_result]
        logger.info("Extracted %d product records from OLTP.", len(raw_products))

        # 3. Extract VTON Jobs (Incremental vs Full)
        if full_refresh or watermark_job_id <= 0:
            logger.info("Performing FULL scan of vton_jobs table.")
            jobs_query = text("""
                SELECT 
                    id, user_id, product_id, status, 
                    created_at, completed_at, processing_time
                FROM vton_jobs
                ORDER BY id ASC
            """)
            jobs_result = oltp_db.execute(jobs_query).mappings().all()
        else:
            logger.info("Performing INCREMENTAL scan of vton_jobs table (job_id > %d).", watermark_job_id)
            jobs_query = text("""
                SELECT 
                    id, user_id, product_id, status, 
                    created_at, completed_at, processing_time
                FROM vton_jobs
                WHERE id > :watermark
                ORDER BY id ASC
            """)
            jobs_result = oltp_db.execute(jobs_query, {"watermark": watermark_job_id}).mappings().all()

        raw_jobs = [dict(j) for j in jobs_result]
        logger.info("Extracted %d try-on job records from OLTP.", len(raw_jobs))

        max_job_id = max([j["id"] for j in raw_jobs], default=watermark_job_id)

        return {
            "users": raw_users,
            "products": raw_products,
            "jobs": raw_jobs,
            "extracted_at": extracted_at,
            "max_job_id": max_job_id,
        }

    finally:
        oltp_db.close()


if __name__ == "__main__":
    dwh_db = DWHSessionLocal()
    wm = get_current_watermark(dwh_db)
    dwh_db.close()
    data = extract_oltp_data(watermark_job_id=wm)
    print(f"Extraction summary: {len(data['users'])} users, {len(data['products'])} products, {len(data['jobs'])} jobs.")
