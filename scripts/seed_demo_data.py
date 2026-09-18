"""
AI Virtual Try-On - OLTP Demo Data Seeder
Populates users, products, and vton_jobs with realistic synthetic data
for validating ETL, Star Schema loading, Apriori Association Rules,
Failure Correlation Analysis, and OLAP Time-Series Rollups.

Usage:
    python scripts/seed_demo_data.py
"""
import sys
import os
import random
from datetime import datetime, timedelta

# Allow execution from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal, create_all_tables
from app.database.models import User, Product, VTONJob
from app.database.core.security import hash_password


CATEGORIES = [
    ("Casual Blue Denim Jacket", "Jackets", 2499.00, "B08DENIM01"),
    ("Slim Fit White Formal Shirt", "Shirts", 1299.00, "B08SHIRT02"),
    ("Classic Black Cotton T-Shirt", "T-Shirts", 499.00, "B08TSHRT03"),
    ("Floral Print Summer Midi Dress", "Dresses", 1899.00, "B08DRESS04"),
    ("Dark Navy Chino Trousers", "Pants", 1599.00, "B08CHINO05"),
    ("Red Oversized Graphic Hoodie", "Hoodies", 1799.00, "B08HOOD006"),
    ("Striped Cotton Polo T-Shirt", "T-Shirts", 899.00, "B08POLO007"),
    ("High-Waist Distressed Blue Jeans", "Jeans", 1999.00, "B08JEANS08"),
    ("Beige Linen Casual Blazer", "Blazers", 3499.00, "B08BLAZR09"),
    ("Green Bohemian Maxi Dress", "Dresses", 2199.00, "B08MAXI010"),
    ("Yellow Solid Round Neck Tee", "T-Shirts", 399.00, "B08YELW011"),
    ("Checked Grey Flannel Shirt", "Shirts", 1499.00, "B08FLAN012"),
]

USERS_LIST = [
    ("Aarav Sharma", "aarav@example.com"),
    ("Diya Patel", "diya@example.com"),
    ("Rohan Mehta", "rohan@example.com"),
    ("Ananya Iyer", "ananya@example.com"),
    ("Kabir Verma", "kabir@example.com"),
    ("Ishita Rao", "ishita@example.com"),
    ("Vivaan Gupta", "vivaan@example.com"),
    ("Meera Nair", "meera@example.com"),
    ("Aditya Joshi", "aditya@example.com"),
    ("Rhea Sengupta", "rhea@example.com"),
]


def seed_demo_oltp():
    print("=== Seeding AI Virtual Try-On OLTP Demo Data ===")
    create_all_tables()
    db = SessionLocal()

    try:
        # 1. Seed Users
        created_users = []
        for name, email in USERS_LIST:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    name=name,
                    email=email,
                    password_hash=hash_password("DemoPassword123"),
                    try_on_count=0,
                    is_active=True,
                    created_at=datetime.utcnow() - timedelta(days=random.randint(15, 60)),
                )
                db.add(user)
                db.flush()
            created_users.append(user)

        # 2. Seed Products
        created_products = []
        for title, cat, price, asin in CATEGORIES:
            prod = db.query(Product).filter(Product.amazon_product_id == asin).first()
            if not prod:
                prod = Product(
                    amazon_product_id=asin,
                    title=title,
                    price=price,
                    currency="INR",
                    category=cat,
                    product_url=f"https://www.amazon.in/dp/{asin}",
                    image_url=f"https://images-amazon.mock/images/{asin}.jpg",
                )
                db.add(prod)
                db.flush()
            created_products.append(prod)

        db.commit()
        print(f"[OK] Active Users: {len(created_users)} | Active Catalog Products: {len(created_products)}")

        # 3. Seed VTON Jobs (Simulate co-occurrences for Apriori association rules)
        # Frequent pairs:
        # (Denim Jacket + Black T-Shirt), (White Shirt + Navy Chinos), (Graphic Hoodie + Blue Jeans)
        product_by_asin = {p.amazon_product_id: p for p in created_products}

        co_occurring_combos = [
            ("B08DENIM01", "B08TSHRT03"),
            ("B08SHIRT02", "B08CHINO05"),
            ("B08HOOD006", "B08JEANS08"),
            ("B08DRESS04", "B08MAXI010"),
        ]

        total_new_jobs = 0
        now = datetime.utcnow()

        for user in created_users:
            num_sessions = random.randint(3, 7)
            for s in range(num_sessions):
                session_time = now - timedelta(days=random.randint(0, 20), hours=random.randint(1, 23))

                # 60% chance to try a frequent combo, 40% random items
                if random.random() < 0.65:
                    combo = random.choice(co_occurring_combos)
                    chosen_prods = [product_by_asin[combo[0]], product_by_asin[combo[1]]]
                else:
                    chosen_prods = random.sample(created_products, k=random.randint(1, 3))

                for prod in chosen_prods:
                    # 85% success rate, 15% failure rate (to test correlation analysis)
                    is_success = random.random() < 0.85
                    status = "COMPLETED" if is_success else "FAILED"
                    proc_time = random.randint(4, 18)  # 4 to 18 seconds

                    job = VTONJob(
                        user_id=user.id,
                        product_id=prod.id,
                        status=status,
                        processing_time=proc_time,
                        created_at=session_time,
                        completed_at=session_time + timedelta(seconds=proc_time),
                    )
                    db.add(job)
                    user.try_on_count += 1
                    total_new_jobs += 1

        db.commit()
        print(f"[OK] Generated {total_new_jobs} synthetic try-on jobs across user fitting sessions.")
        print("Demo OLTP database is now fully populated!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_oltp()
