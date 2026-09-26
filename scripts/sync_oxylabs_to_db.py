"""
AI Virtual Try-On: Sync Oxylabs Amazon Clothes to Database
Fetches live apparel catalogs from Amazon India via Oxylabs API
and persists them into the MySQL `products` table.

Usage:
    python scripts/sync_oxylabs_to_db.py
"""
import sys
import os
import logging

# Allow execution from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import collect_search_products
from app.database.connection import SessionLocal, create_all_tables
from app.database.models.product import Product

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s]: %(message)s")
logger = logging.getLogger("sync_clothes")

CATEGORIES_TO_FETCH = [
    ("jackets", "Jackets"),
    ("shirts for men", "Shirts"),
    ("dresses for women", "Dresses"),
    ("t-shirts", "T-Shirts"),
]


def sync_amazon_clothes(limit_per_category: int = 15):
    logger.info("Initializing database tables...")
    create_all_tables()
    db = SessionLocal()

    total_inserted = 0
    total_updated = 0

    try:
        for query, category_label in CATEGORIES_TO_FETCH:
            logger.info("Fetching '%s' from Amazon India via Oxylabs...", query)
            try:
                products, _ = collect_search_products(query=query, domain="in", geo_location="")
            except Exception as e:
                logger.error("Failed to fetch query '%s': %s", query, e)
                continue

            logger.info("Retrieved %d products for '%s'. Saving to database...", len(products), query)

            for p in products[:limit_per_category]:
                asin = p.get("asin")
                title = p.get("title")
                if not asin or not title:
                    continue

                price = p.get("price")
                currency = p.get("currency") or "INR"
                image_url = p.get("image")
                product_url = p.get("url")

                existing = db.query(Product).filter(Product.amazon_product_id == asin).first()
                if existing:
                    existing.title = title
                    existing.price = price
                    existing.currency = currency
                    existing.image_url = image_url
                    existing.product_url = product_url
                    existing.category = category_label
                    total_updated += 1
                else:
                    new_product = Product(
                        amazon_product_id=asin,
                        title=title,
                        price=price,
                        currency=currency,
                        image_url=image_url,
                        product_url=product_url,
                        category=category_label,
                    )
                    db.add(new_product)
                    total_inserted += 1

            db.commit()

        logger.info("Sync complete! Inserted: %d new products | Updated: %d existing products.",
                    total_inserted, total_updated)
        return total_inserted + total_updated

    finally:
        db.close()


if __name__ == "__main__":
    sync_amazon_clothes()
