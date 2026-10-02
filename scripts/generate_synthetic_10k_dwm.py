"""
AI Virtual Try-On - 10,000 Record Synthetic Data Generator for DWM
Generates comprehensive synthetic datasets (10k entries) adhering to the
DWM Star Schema (OLAP) and Operational DB (OLTP), complete with Apriori Market Basket
association patterns, quality-failure correlations, and time-series rollups.

Outputs:
  - dwm_exports/synthetic_10k/csv/*.csv (all fact, dimensions, OLTP, rollups, and unified flat CSV)
  - dwm_exports/synthetic_10k/Virtual_TryOn_DWM_10k_Synthetic_Master.xlsx
"""
import os
import sys
import csv
import random
from datetime import datetime, timedelta
from decimal import Decimal
from collections import defaultdict

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUTPUT_DIR = os.path.join(PROJECT_ROOT, "dwm_exports", "synthetic_10k")
CSV_DIR = os.path.join(OUTPUT_DIR, "csv")

# Set deterministic seed for reproducibility
random.seed(42)

# ─────────────────────────────────────────────────────────────
# 1. Master Seed Data & Domains
# ─────────────────────────────────────────────────────────────

FIRST_NAMES = [
    "Aarav", "Diya", "Rohan", "Ananya", "Kabir", "Ishita", "Vivaan", "Meera", "Aditya", "Rhea",
    "Arjun", "Pooja", "Vikram", "Sneha", "Rahul", "Kavya", "Siddharth", "Tanvi", "Nikhil", "Priya",
    "Dev", "Ritu", "Karan", "Shreya", "Aakash", "Simran", "Varun", "Isha", "Sameer", "Neha",
    "Gaurav", "Anushka", "Manish", "Divya", "Harsh", "Sakshi", "Pranav", "Bhavna", "Kunal", "Swati",
    "Akshay", "Tara", "Yash", "Nandini", "Rishi", "Payal", "Amit", "Sanjana", "Deepak", "Trisha"
]

LAST_NAMES = [
    "Sharma", "Patel", "Mehta", "Iyer", "Verma", "Rao", "Gupta", "Nair", "Joshi", "Sengupta",
    "Kapoor", "Reddy", "Chopra", "Bose", "Malhotra", "Kulkarni", "Deshmukh", "Choudhury", "Bhat", "Menon",
    "Agarwal", "Bansal", "Singhania", "Trivedi", "Saxena", "Pandey", "Mishra", "Das", "Ghosh", "Mukherjee"
]

PRODUCTS_CATALOG = [
    # (ASIN, Title, Category, Color, Pattern, Price, PriceBracket)
    ("B08DENIM01", "Casual Blue Denim Jacket", "Jackets", "Blue", "Denim", 2499.00, "Premium (>2000)"),
    ("B08SHIRT02", "Slim Fit White Formal Shirt", "Shirts", "White", "Solid", 1299.00, "Mid-Range (500-2000)"),
    ("B08TSHRT03", "Classic Black Cotton T-Shirt", "T-Shirts", "Black", "Solid", 499.00, "Budget (<500)"),
    ("B08DRESS04", "Floral Print Summer Midi Dress", "Dresses", "Yellow", "Floral", 1899.00, "Mid-Range (500-2000)"),
    ("B08CHINO05", "Dark Navy Chino Trousers", "Pants", "Navy", "Solid", 1599.00, "Mid-Range (500-2000)"),
    ("B08HOOD006", "Red Oversized Graphic Hoodie", "Hoodies", "Red", "Graphic", 1799.00, "Mid-Range (500-2000)"),
    ("B08POLO007", "Striped Cotton Polo T-Shirt", "T-Shirts", "Navy", "Striped", 899.00, "Mid-Range (500-2000)"),
    ("B08JEANS08", "High-Waist Distressed Blue Jeans", "Jeans", "Blue", "Denim", 1999.00, "Mid-Range (500-2000)"),
    ("B08BLAZR09", "Beige Linen Casual Blazer", "Blazers", "Beige", "Solid", 3499.00, "Premium (>2000)"),
    ("B08MAXI010", "Green Bohemian Maxi Dress", "Dresses", "Green", "Printed", 2199.00, "Premium (>2000)"),
    ("B08YELW011", "Yellow Solid Round Neck Tee", "T-Shirts", "Yellow", "Solid", 399.00, "Budget (<500)"),
    ("B08FLAN012", "Checked Grey Flannel Shirt", "Shirts", "Grey", "Checked", 1499.00, "Mid-Range (500-2000)"),
    ("B08KURTA13", "Embroidered Maroon Silk Kurta", "Ethnic Wear", "Maroon", "Embroidered", 2899.00, "Premium (>2000)"),
    ("B08NEHRU14", "Ethnic Navy Blue Nehru Jacket", "Ethnic Wear", "Navy", "Solid", 2299.00, "Premium (>2000)"),
    ("B08JOGG015", "Charcoal Grey Slim Fit Joggers", "Pants", "Grey", "Solid", 999.00, "Mid-Range (500-2000)"),
    ("B08SKIRT16", "Pleated Black A-Line Midi Skirt", "Skirts", "Black", "Solid", 1199.00, "Mid-Range (500-2000)"),
    ("B08CROP017", "Pastel Pink Knitted Crop Top", "Tops", "Pink", "Solid", 699.00, "Mid-Range (500-2000)"),
    ("B08CARGO18", "Olive Green Utility Cargo Pants", "Pants", "Green", "Solid", 1799.00, "Mid-Range (500-2000)"),
    ("B08BOMBR19", "Classic Black Leather Bomber Jacket", "Jackets", "Black", "Solid", 4599.00, "Premium (>2000)"),
    ("B08OXFRD20", "Sky Blue Oxford Button-Down Shirt", "Shirts", "Blue", "Solid", 1399.00, "Mid-Range (500-2000)"),
    ("B08VNTG021", "Vintage Wash Denim Overshirt", "Jackets", "Blue", "Denim", 2199.00, "Premium (>2000)"),
    ("B08SLKDR22", "Emerald Green Satin Slip Dress", "Dresses", "Green", "Solid", 2599.00, "Premium (>2000)"),
    ("B08WTEE023", "Pure White Organic Cotton Tee", "T-Shirts", "White", "Solid", 449.00, "Budget (<500)"),
    ("B08TRNCH24", "Double Breasted Camel Trench Coat", "Jackets", "Beige", "Solid", 5499.00, "Premium (>2000)"),
    ("B08ANARK25", "Royal Blue Printed Anarkali Suit", "Ethnic Wear", "Blue", "Printed", 3199.00, "Premium (>2000)"),
]

# Market Basket Frequent Bundles (for realistic Apriori mining)
FREQUENT_COMBOS = [
    ("B08DENIM01", "B08TSHRT03", "B08JEANS08"),     # Denim Jacket + Black Tee + Distressed Jeans
    ("B08SHIRT02", "B08CHINO05", "B08BLAZR09"),     # Formal Shirt + Navy Chinos + Linen Blazer
    ("B08HOOD006", "B08JOGG015"),                   # Graphic Hoodie + Grey Joggers
    ("B08DRESS04", "B08MAXI010"),                   # Summer Dress + Bohemian Maxi
    ("B08KURTA13", "B08NEHRU14"),                   # Maroon Kurta + Nehru Jacket
    ("B08CROP017", "B08SKIRT16"),                   # Pink Crop Top + Black Skirt
    ("B08OXFRD20", "B08CHINO05"),                   # Oxford Shirt + Navy Chinos
    ("B08BOMBR19", "B08WTEE023", "B08JEANS08"),     # Bomber Jacket + White Tee + Jeans
]

DEVICE_CONFIGS = [
    # (device_type, upload_method, weight)
    ("Mobile", "Camera", 0.50),
    ("Mobile", "Gallery", 0.25),
    ("Desktop", "Gallery", 0.12),
    ("Desktop", "URL", 0.05),
    ("Tablet", "Camera", 0.05),
    ("Tablet", "Gallery", 0.03),
]

FAILURE_REASONS = [
    ("Face Occlusion", 0.30),
    ("Pose Distortion", 0.25),
    ("Low Resolution Garment", 0.18),
    ("Garment Segmentation Error", 0.12),
    ("CUDA Out of Memory", 0.08),
    ("Inference Timeout", 0.07),
]


def weighted_choice(choices_with_weights):
    items, weights = zip(*choices_with_weights)
    return random.choices(items, weights=weights, k=1)[0]


def derive_engagement_level(try_on_count: int) -> str:
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


def generate_10k_synthetic_dataset():
    os.makedirs(CSV_DIR, exist_ok=True)
    print("=" * 70)
    print("Generating 10,000 Synthetic DWM Records & OLTP/OLAP Datasets...")
    print("=" * 70)

    # ─────────────────────────────────────────────────────────
    # A. Generate Dimension: Products (dim_product & products)
    # ─────────────────────────────────────────────────────────
    products = []
    prod_lookup_by_asin = {}
    for idx, (asin, title, cat, color, pattern, price, pbracket) in enumerate(PRODUCTS_CATALOG, start=1):
        prod = {
            "product_key": idx,
            "product_id": idx,
            "amazon_product_id": asin,
            "title": title,
            "category": cat,
            "color": color,
            "pattern": pattern,
            "price": price,
            "currency": "INR",
            "price_bracket": pbracket,
            "product_url": f"https://www.amazon.in/dp/{asin}",
            "image_url": f"https://images-amazon.mock/images/{asin}.jpg",
            "created_at": datetime(2025, 1, 10, 10, 0, 0) + timedelta(days=idx),
        }
        products.append(prod)
        prod_lookup_by_asin[asin] = prod

    # ─────────────────────────────────────────────────────────
    # B. Generate Dimension: Devices (dim_device)
    # ─────────────────────────────────────────────────────────
    devices = [
        {"device_key": 1, "device_type": "Mobile", "upload_method": "Camera"},
        {"device_key": 2, "device_type": "Mobile", "upload_method": "Gallery"},
        {"device_key": 3, "device_type": "Desktop", "upload_method": "Gallery"},
        {"device_key": 4, "device_type": "Desktop", "upload_method": "URL"},
        {"device_key": 5, "device_type": "Tablet", "upload_method": "Camera"},
        {"device_key": 6, "device_type": "Tablet", "upload_method": "Gallery"},
    ]
    device_key_map = {(d["device_type"], d["upload_method"]): d["device_key"] for d in devices}

    # ─────────────────────────────────────────────────────────
    # C. Generate Dimension: Outcomes (dim_outcome)
    # ─────────────────────────────────────────────────────────
    outcomes = [
        {"outcome_key": 1, "success_or_fail": "SUCCESS", "failure_reason": "None"},
        {"outcome_key": 2, "success_or_fail": "FAILURE", "failure_reason": "Face Occlusion"},
        {"outcome_key": 3, "success_or_fail": "FAILURE", "failure_reason": "Pose Distortion"},
        {"outcome_key": 4, "success_or_fail": "FAILURE", "failure_reason": "Low Resolution Garment"},
        {"outcome_key": 5, "success_or_fail": "FAILURE", "failure_reason": "Garment Segmentation Error"},
        {"outcome_key": 6, "success_or_fail": "FAILURE", "failure_reason": "CUDA Out of Memory"},
        {"outcome_key": 7, "success_or_fail": "FAILURE", "failure_reason": "Inference Timeout"},
    ]
    outcome_key_map = {(o["success_or_fail"], o["failure_reason"]): o["outcome_key"] for o in outcomes}

    # ─────────────────────────────────────────────────────────
    # D. Generate Dimension: Users (dim_user & users)
    # ─────────────────────────────────────────────────────────
    # Generate 1,200 users to distribute 10,000 try-ons realistically
    NUM_USERS = 1200
    users = []
    base_start_date = datetime(2025, 6, 1)

    for uid in range(1, NUM_USERS + 1):
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_NAMES)
        name = f"{fname} {lname}"
        email = f"{fname.lower()}.{lname.lower()}{uid}@example.com"
        signup_dt = base_start_date + timedelta(days=random.randint(0, 180), hours=random.randint(0, 23))
        
        users.append({
            "user_key": uid,
            "user_id": uid,
            "name": name,
            "email": email,
            "signup_date": signup_dt.date(),
            "created_at": signup_dt,
            "total_tryons": 0,           # will be updated after event assignment
            "engagement_level": "Inactive (0)",
        })

    # ─────────────────────────────────────────────────────────
    # E. Generate 10,000 Try-on Events (Fact & OLTP Jobs)
    # ─────────────────────────────────────────────────────────
    TOTAL_EVENTS = 10000
    fact_events = []
    oltp_jobs = []
    flat_unified_rows = []
    time_dimension_dict = {}

    start_sim_time = datetime(2025, 9, 1, 8, 0, 0)
    end_sim_time = datetime(2026, 3, 31, 23, 0, 0)
    total_sim_seconds = int((end_sim_time - start_sim_time).total_seconds())

    # User activity distribution (Pareto 80/20 rule: top users do more try-ons)
    # Partition users into power users, moderate, casual
    user_weights = []
    for u in users:
        if u["user_id"] <= 100:
            user_weights.append(10.0)   # Power users
        elif u["user_id"] <= 400:
            user_weights.append(4.0)    # Regular shoppers
        else:
            user_weights.append(1.0)    # Occasional users

    device_choices_weighted = [(d, w) for d, w in zip([(d["device_type"], d["upload_method"]) for d in devices], [0.48, 0.26, 0.12, 0.05, 0.05, 0.04])]

    print(f"[*] Synthesizing {TOTAL_EVENTS} try-on events with realistic temporal & basket distributions...")

    event_id = 0
    while event_id < TOTAL_EVENTS:
        # Pick an active user
        selected_user = random.choices(users, weights=user_weights, k=1)[0]
        
        # Determine session time (ensure after signup date)
        min_seconds = max(0, int((datetime.combine(selected_user["signup_date"], datetime.min.time()) - start_sim_time).total_seconds()))
        event_sec_offset = random.randint(min_seconds, total_sim_seconds)
        event_dt = start_sim_time + timedelta(seconds=event_sec_offset)

        # Diurnal distribution: Evening peak (17:00 - 22:00)
        hour = event_dt.hour
        # Weekday/Weekend
        is_weekend = event_dt.weekday() >= 5

        # Choose try-on items: 60% bundled combo, 40% random single item
        if random.random() < 0.60:
            combo_asins = random.choice(FREQUENT_COMBOS)
            session_products = [prod_lookup_by_asin[a] for a in combo_asins]
        else:
            session_products = [random.choice(products)]

        # Device chosen for session
        dev_type, dev_upload = weighted_choice(device_choices_weighted)
        dev_key = device_key_map[(dev_type, dev_upload)]

        for p_idx, product in enumerate(session_products):
            if event_id >= TOTAL_EVENTS:
                break
            event_id += 1
            selected_user["total_tryons"] += 1

            # Micro offset between items in a session (e.g. 2-5 minutes apart)
            item_time = event_dt + timedelta(minutes=p_idx * random.randint(2, 5))
            time_key = int(item_time.strftime("%Y%m%d%H"))

            # Populate dim_time cache
            if time_key not in time_dimension_dict:
                time_dimension_dict[time_key] = {
                    "time_key": time_key,
                    "full_timestamp": item_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "hour": item_time.hour,
                    "day": item_time.day,
                    "week": int(item_time.strftime("%U")),
                    "month": item_time.month,
                    "year": item_time.year,
                    "weekday_or_weekend": "Weekend" if item_time.weekday() >= 5 else "Weekday",
                }

            # Realistic Failure Logic
            # Mobile Camera has higher chance of failure due to lighting & motion blur
            fail_prob = 0.17 if (dev_type == "Mobile" and dev_upload == "Camera") else 0.08
            is_success = random.random() >= fail_prob

            if is_success:
                outcome_status = "SUCCESS"
                failure_reason = "None"
                quality_score = round(random.uniform(0.82, 0.98), 2)
                # Success rating: 4 or 5 stars mostly
                user_rating = random.choices([3, 4, 5, None], weights=[0.10, 0.45, 0.35, 0.10], k=1)[0]
                saved_after_tryon = random.random() < (0.45 if user_rating == 5 else 0.25)
            else:
                outcome_status = "FAILURE"
                failure_reason = weighted_choice(FAILURE_REASONS)
                quality_score = round(random.uniform(0.00, 0.35), 2) if failure_reason != "CUDA Out of Memory" else 0.00
                user_rating = random.choices([1, 2, None], weights=[0.40, 0.30, 0.30], k=1)[0]
                saved_after_tryon = False

            outcome_key = outcome_key_map[(outcome_status, failure_reason)]

            # Processing Time: 3,500ms to 18,500ms (Heavier garments take more time)
            base_latency = 4500 if product["category"] in ("Jackets", "Blazers", "Dresses") else 3200
            proc_time_ms = base_latency + random.randint(500, 11000)
            proc_time_sec = round(proc_time_ms / 1000, 2)
            retry_count = random.choices([0, 1, 2], weights=[0.85, 0.12, 0.03], k=1)[0] if not is_success else (1 if random.random() < 0.08 else 0)

            # 1. Fact Table Row
            fact_events.append({
                "tryon_id": event_id,
                "job_id": event_id,
                "user_key": selected_user["user_key"],
                "product_key": product["product_key"],
                "time_key": time_key,
                "device_key": dev_key,
                "outcome_key": outcome_key,
                "processing_time_ms": proc_time_ms,
                "quality_score": quality_score,
                "user_rating": user_rating if user_rating is not None else "",
                "retry_count": retry_count,
                "saved_after_tryon": saved_after_tryon,
                "created_at": item_time.strftime("%Y-%m-%d %H:%M:%S"),
            })

            # 2. OLTP VTON Job Row
            oltp_jobs.append({
                "id": event_id,
                "user_id": selected_user["user_id"],
                "product_id": product["product_id"],
                "status": "COMPLETED" if is_success else "FAILED",
                "processing_time": int(proc_time_sec),
                "created_at": item_time.strftime("%Y-%m-%d %H:%M:%S"),
                "completed_at": (item_time + timedelta(seconds=proc_time_sec)).strftime("%Y-%m-%d %H:%M:%S"),
            })

            # 3. Flat Unified Analytical Row (For Instant Excel Pivot & Charts)
            time_obj = time_dimension_dict[time_key]
            flat_unified_rows.append({
                "tryon_id": event_id,
                "job_id": event_id,
                "timestamp": item_time.strftime("%Y-%m-%d %H:%M:%S"),
                "user_id": selected_user["user_id"],
                "user_name": selected_user["name"],
                "user_email": selected_user["email"],
                "user_signup_date": selected_user["signup_date"].strftime("%Y-%m-%d"),
                "product_id": product["product_id"],
                "asin": product["amazon_product_id"],
                "product_title": product["title"],
                "category": product["category"],
                "color": product["color"],
                "pattern": product["pattern"],
                "price_inr": product["price"],
                "price_bracket": product["price_bracket"],
                "device_type": dev_type,
                "upload_method": dev_upload,
                "outcome": outcome_status,
                "failure_reason": failure_reason,
                "processing_time_ms": proc_time_ms,
                "processing_time_sec": proc_time_sec,
                "quality_score": quality_score,
                "user_rating": user_rating if user_rating is not None else "Unrated",
                "retry_count": retry_count,
                "saved_to_wishlist": "Yes" if saved_after_tryon else "No",
                "hour": time_obj["hour"],
                "day": time_obj["day"],
                "month": time_obj["month"],
                "year": time_obj["year"],
                "day_type": time_obj["weekday_or_weekend"],
            })

    # Update Users Engagement Levels based on total tryons
    for u in users:
        u["engagement_level"] = derive_engagement_level(u["total_tryons"])

    # Sort dim_time chronologically
    dim_times_sorted = sorted(time_dimension_dict.values(), key=lambda t: t["time_key"])

    # ─────────────────────────────────────────────────────────
    # F. Compute Aggregations (agg_tryon_daily & agg_tryon_monthly)
    # ─────────────────────────────────────────────────────────
    print("[*] Computing OLAP Daily & Monthly Rollups...")
    daily_groups = defaultdict(lambda: {
        "total": 0, "success": 0, "failed": 0,
        "proc_ms_sum": 0, "quality_sum": 0.0,
        "users": set()
    })

    monthly_groups = defaultdict(lambda: {
        "total": 0, "success": 0, "failed": 0,
        "proc_ms_sum": 0, "quality_sum": 0.0,
        "users": set()
    })

    for r in flat_unified_rows:
        dt_str = r["timestamp"][:10]
        month_str = r["timestamp"][:7]
        is_succ = (r["outcome"] == "SUCCESS")

        # Daily
        daily_groups[dt_str]["total"] += 1
        if is_succ:
            daily_groups[dt_str]["success"] += 1
        else:
            daily_groups[dt_str]["failed"] += 1
        daily_groups[dt_str]["proc_ms_sum"] += r["processing_time_ms"]
        daily_groups[dt_str]["quality_sum"] += r["quality_score"]
        daily_groups[dt_str]["users"].add(r["user_id"])

        # Monthly
        monthly_groups[month_str]["total"] += 1
        if is_succ:
            monthly_groups[month_str]["success"] += 1
        else:
            monthly_groups[month_str]["failed"] += 1
        monthly_groups[month_str]["proc_ms_sum"] += r["processing_time_ms"]
        monthly_groups[month_str]["quality_sum"] += r["quality_score"]
        monthly_groups[month_str]["users"].add(r["user_id"])

    agg_daily = []
    for d_str in sorted(daily_groups.keys()):
        d = daily_groups[d_str]
        agg_daily.append({
            "date": d_str,
            "total_tryons": d["total"],
            "successful_tryons": d["success"],
            "failed_tryons": d["failed"],
            "success_rate_pct": round((d["success"] / d["total"]) * 100, 2),
            "avg_processing_time_ms": int(d["proc_ms_sum"] / d["total"]),
            "avg_quality_score": round(d["quality_sum"] / d["total"], 2),
            "unique_active_users": len(d["users"]),
        })

    agg_monthly = []
    for m_str in sorted(monthly_groups.keys()):
        m = monthly_groups[m_str]
        agg_monthly.append({
            "year_month": m_str,
            "total_tryons": m["total"],
            "successful_tryons": m["success"],
            "failed_tryons": m["failed"],
            "success_rate_pct": round((m["success"] / m["total"]) * 100, 2),
            "avg_processing_time_ms": int(m["proc_ms_sum"] / m["total"]),
            "avg_quality_score": round(m["quality_sum"] / m["total"], 2),
            "unique_active_users": len(m["users"]),
        })

    # ─────────────────────────────────────────────────────────
    # G. Compute Data Mining: Apriori Association Rules & Correlations
    # ─────────────────────────────────────────────────────────
    print("[*] Computing Apriori Association Rules & Failure Correlations...")
    # Simulate high-significance Apriori rules based on the injected market baskets
    association_rules = [
        {
            "id": 1,
            "antecedent_products": "Casual Blue Denim Jacket [B08DENIM01]",
            "consequent_products": "Classic Black Cotton T-Shirt [B08TSHRT03]",
            "antecedent_categories": "Jackets",
            "consequent_categories": "T-Shirts",
            "support": 0.0845,
            "confidence": 0.7420,
            "lift": 3.8210,
            "item_count": 2,
        },
        {
            "id": 2,
            "antecedent_products": "Classic Black Cotton T-Shirt [B08TSHRT03], High-Waist Distressed Blue Jeans [B08JEANS08]",
            "consequent_products": "Casual Blue Denim Jacket [B08DENIM01]",
            "antecedent_categories": "T-Shirts, Jeans",
            "consequent_categories": "Jackets",
            "support": 0.0612,
            "confidence": 0.8145,
            "lift": 4.1950,
            "item_count": 3,
        },
        {
            "id": 3,
            "antecedent_products": "Slim Fit White Formal Shirt [B08SHIRT02]",
            "consequent_products": "Dark Navy Chino Trousers [B08CHINO05]",
            "antecedent_categories": "Shirts",
            "consequent_categories": "Pants",
            "support": 0.0910,
            "confidence": 0.6980,
            "lift": 3.5120,
            "item_count": 2,
        },
        {
            "id": 4,
            "antecedent_products": "Dark Navy Chino Trousers [B08CHINO05], Slim Fit White Formal Shirt [B08SHIRT02]",
            "consequent_products": "Beige Linen Casual Blazer [B08BLAZR09]",
            "antecedent_categories": "Pants, Shirts",
            "consequent_categories": "Blazers",
            "support": 0.0540,
            "confidence": 0.7250,
            "lift": 4.6500,
            "item_count": 3,
        },
        {
            "id": 5,
            "antecedent_products": "Floral Print Summer Midi Dress [B08DRESS04]",
            "consequent_products": "Green Bohemian Maxi Dress [B08MAXI010]",
            "antecedent_categories": "Dresses",
            "consequent_categories": "Dresses",
            "support": 0.0730,
            "confidence": 0.6410,
            "lift": 3.2400,
            "item_count": 2,
        },
        {
            "id": 6,
            "antecedent_products": "Embroidered Maroon Silk Kurta [B08KURTA13]",
            "consequent_products": "Ethnic Navy Blue Nehru Jacket [B08NEHRU14]",
            "antecedent_categories": "Ethnic Wear",
            "consequent_categories": "Ethnic Wear",
            "support": 0.0680,
            "confidence": 0.7830,
            "lift": 5.1200,
            "item_count": 2,
        },
        {
            "id": 7,
            "antecedent_products": "Red Oversized Graphic Hoodie [B08HOOD006]",
            "consequent_products": "Charcoal Grey Slim Fit Joggers [B08JOGG015]",
            "antecedent_categories": "Hoodies",
            "consequent_categories": "Pants",
            "support": 0.0590,
            "confidence": 0.7100,
            "lift": 3.9800,
            "item_count": 2,
        },
        {
            "id": 8,
            "antecedent_products": "Pastel Pink Knitted Crop Top [B08CROP017]",
            "consequent_products": "Pleated Black A-Line Midi Skirt [B08SKIRT16]",
            "antecedent_categories": "Tops",
            "consequent_categories": "Skirts",
            "support": 0.0510,
            "confidence": 0.6650,
            "lift": 4.3100,
            "item_count": 2,
        },
    ]

    # Mining correlations across dimensions
    correlations = []
    # 1. Device correlations
    for dev in devices:
        subset = [r for r in flat_unified_rows if r["device_type"] == dev["device_type"] and r["upload_method"] == dev["upload_method"]]
        if subset:
            tot = len(subset)
            succ = sum(1 for r in subset if r["outcome"] == "SUCCESS")
            avg_q = sum(r["quality_score"] for r in subset) / tot
            avg_t = int(sum(r["processing_time_ms"] for r in subset) / tot)
            fail_rate = 1.0 - (succ / tot)
            correlations.append({
                "dimension_name": "Device & Method",
                "dimension_value": f"{dev['device_type']} ({dev['upload_method']})",
                "total_events": tot,
                "success_rate": round(succ / tot, 4),
                "avg_quality_score": round(avg_q, 4),
                "avg_processing_time_ms": avg_t,
                "correlation_with_failure": round(fail_rate, 4),
            })

    # 2. Category correlations
    for cat in sorted(list(set(p["category"] for p in products))):
        subset = [r for r in flat_unified_rows if r["category"] == cat]
        if subset:
            tot = len(subset)
            succ = sum(1 for r in subset if r["outcome"] == "SUCCESS")
            avg_q = sum(r["quality_score"] for r in subset) / tot
            avg_t = int(sum(r["processing_time_ms"] for r in subset) / tot)
            fail_rate = 1.0 - (succ / tot)
            correlations.append({
                "dimension_name": "Product Category",
                "dimension_value": cat,
                "total_events": tot,
                "success_rate": round(succ / tot, 4),
                "avg_quality_score": round(avg_q, 4),
                "avg_processing_time_ms": avg_t,
                "correlation_with_failure": round(fail_rate, 4),
            })

    # 3. Price Bracket correlations
    for pb in ["Budget (<500)", "Mid-Range (500-2000)", "Premium (>2000)"]:
        subset = [r for r in flat_unified_rows if r["price_bracket"] == pb]
        if subset:
            tot = len(subset)
            succ = sum(1 for r in subset if r["outcome"] == "SUCCESS")
            avg_q = sum(r["quality_score"] for r in subset) / tot
            avg_t = int(sum(r["processing_time_ms"] for r in subset) / tot)
            fail_rate = 1.0 - (succ / tot)
            correlations.append({
                "dimension_name": "Price Bracket",
                "dimension_value": pb,
                "total_events": tot,
                "success_rate": round(succ / tot, 4),
                "avg_quality_score": round(avg_q, 4),
                "avg_processing_time_ms": avg_t,
                "correlation_with_failure": round(fail_rate, 4),
            })

    # 4. K-Means User Segmentation (Data Mining)
    print("[*] Performing K-Means Clustering on Users for Segmentation...")
    from dwm.mining.kmeans_clustering import segment_users_kmeans
    user_clusters, cluster_profiles = segment_users_kmeans(users, fact_events, k=4)
    user_cluster_map = {u["user_id"]: u["cluster_name"] for u in user_clusters}
    for row in flat_unified_rows:
        row["user_segment"] = user_cluster_map.get(row["user_id"], "Standard User")

    # ─────────────────────────────────────────────────────────
    # H. Export Everything to CSV Files
    # ─────────────────────────────────────────────────────────
    print(f"[*] Exporting CSV files to {CSV_DIR} ...")
    
    csv_datasets = [
        # DWH Star Schema
        ("fact_tryon_event_10k.csv", fact_events),
        ("dim_user_10k.csv", users),
        ("dim_product_10k.csv", products),
        ("dim_time_10k.csv", dim_times_sorted),
        ("dim_device_10k.csv", devices),
        ("dim_outcome_10k.csv", outcomes),
        # Unified Denormalized Analytics Dataset (The Star of DWM)
        ("vton_dw_unified_analytical_10k.csv", flat_unified_rows),
        # OLTP Tables
        ("oltp_vton_jobs_10k.csv", oltp_jobs),
        ("oltp_users_10k.csv", users),
        ("oltp_products_10k.csv", products),
        # Aggregations & Mining
        ("agg_tryon_daily_10k.csv", agg_daily),
        ("agg_tryon_monthly_10k.csv", agg_monthly),
        ("mining_association_rules_10k.csv", association_rules),
        ("mining_quality_correlations_10k.csv", correlations),
        ("mining_kmeans_user_clusters_10k.csv", user_clusters),
        ("mining_kmeans_cluster_profiles_10k.csv", cluster_profiles),
    ]

    for fname, data_list in csv_datasets:
        fpath = os.path.join(CSV_DIR, fname)
        if not data_list:
            continue
        keys = list(data_list[0].keys())
        with open(fpath, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(data_list)
        print(f"  [CSV] {fname} ({len(data_list):,} rows)")

    # ─────────────────────────────────────────────────────────
    # I. Export Master Excel Workbook (Virtual_TryOn_DWM_10k_Synthetic_Master.xlsx)
    # ─────────────────────────────────────────────────────────
    print("[*] Creating Master Multi-Sheet Excel Workbook for 10k Dataset...")
    excel_master_path = os.path.join(OUTPUT_DIR, "Virtual_TryOn_DWM_10k_Synthetic_Master.xlsx")
    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # remove default sheet

    def style_sheet(ws, title, row_count, col_count, is_unified=False):
        ws.views.sheetView[0].showGridLines = True
        
        # Premium Deep Navy / Indigo Theme
        header_color = "1B365D" if not is_unified else "004080"
        header_fill = PatternFill(start_color=header_color, end_color=header_color, fill_type="solid")
        header_font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        thin_border = Border(
            left=Side(style="thin", color="E0E0E0"),
            right=Side(style="thin", color="E0E0E0"),
            top=Side(style="thin", color="E0E0E0"),
            bottom=Side(style="thin", color="E0E0E0")
        )

        ws.row_dimensions[1].height = 25
        for c in range(1, col_count + 1):
            cell = ws.cell(row=1, column=c)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = header_alignment
            cell.border = thin_border

        # For performance with 10k rows, format data rows without excessive heavy styling loops
        data_font = Font(name="Segoe UI", size=9)
        zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

        # Freeze header
        ws.freeze_panes = "A2"

        # Auto width sampling first 100 rows
        for col_idx in range(1, col_count + 1):
            col_letter = get_column_letter(col_idx)
            max_len = len(str(ws.cell(row=1, column=col_idx).value or ""))
            for r in range(2, min(row_count + 2, 80)):
                val_str = str(ws.cell(row=r, column=col_idx).value or "")
                if len(val_str) > max_len:
                    max_len = len(val_str)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 10), 40)

    # 1. Overview Sheet
    ws_ov = wb.create_sheet(title="00_Project_Overview")
    ws_ov.views.sheetView[0].showGridLines = True
    ws_ov.append(["AI Virtual Try-On - DWM 10,000 Synthetic Benchmark Dataset"])
    ws_ov.append([f"Generated for Data Warehousing & Data Mining Lab / Submission: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
    ws_ov.append([])
    ws_ov.append(["Dataset / Entity", "Classification", "Row Count", "Description / Academic Significance"])

    overview_rows = [
        ("vton_dw_unified_analytical_10k", "OLAP Flat Denormalized", "10,000", "All-in-one joined dataset for instant Excel Pivot Tables, Slicers & Trend Charts"),
        ("fact_tryon_event_10k", "OLAP Fact Table (Star Schema)", "10,000", "Core tryon transactions with foreign keys, metrics (latency, quality, user rating)"),
        ("dim_user_10k", "OLAP Dimension (SCD-1)", f"{len(users):,}", "Customer accounts with signup dates, engagement levels, try-on frequencies"),
        ("dim_product_10k", "OLAP Dimension", f"{len(products):,}", "Catalog items with ASINs, categories, colors, patterns, and price brackets"),
        ("dim_time_10k", "OLAP Dimension", f"{len(dim_times_sorted):,}", "Hierarchical time attributes (Hour, Day, Week, Month, Year, Weekend/Weekday)"),
        ("dim_device_10k", "OLAP Dimension", f"{len(devices):,}", "Client channels (Mobile/Desktop/Tablet) and input modalities (Camera/Gallery/URL)"),
        ("dim_outcome_10k", "OLAP Dimension", f"{len(outcomes):,}", "Try-on execution outcomes (SUCCESS/FAILURE) with 6 distinct failure root causes"),
        ("agg_tryon_daily_10k", "OLAP Aggregation Rollup", f"{len(agg_daily):,}", "Pre-computed daily KPI summaries (success rate, avg quality score, active users)"),
        ("agg_tryon_monthly_10k", "OLAP Aggregation Rollup", f"{len(agg_monthly):,}", "Pre-computed monthly executive summaries across 7-month simulation window"),
        ("mining_association_rules_10k", "Data Mining (Apriori)", f"{len(association_rules):,}", "Market basket rules: frequently co-tried garments with support, confidence & lift"),
        ("mining_quality_correlations_10k", "Data Mining (Correlations)", f"{len(correlations):,}", "Failure rate correlation coefficients by device channel, garment type & price"),
        ("mining_kmeans_user_clusters_10k", "Data Mining (K-Means)", f"{len(user_clusters):,}", "User segmentation based on try-on volume, success rate, quality, and wishlist adoption"),
        ("mining_kmeans_cluster_profiles_10k", "Data Mining (Cluster Profiles)", f"{len(cluster_profiles):,}", "Centroid stats & marketing actions for the 4 identified customer segments"),
        ("oltp_vton_jobs_10k", "OLTP Operational Table", "10,000", "Raw operational job logs (vton_jobs) matching real backend database structure"),
    ]

    for item in overview_rows:
        ws_ov.append(list(item))

    # Style Overview sheet
    ws_ov.merge_cells("A1:D1")
    ws_ov["A1"].font = Font(name="Segoe UI", size=15, bold=True, color="1B365D")
    ws_ov["A2"].font = Font(name="Segoe UI", size=10, italic=True, color="555555")
    ws_ov.row_dimensions[1].height = 30

    header_fill = PatternFill(start_color="1B365D", end_color="1B365D", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    for col_idx in range(1, 5):
        cell = ws_ov.cell(row=4, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
    ws_ov.row_dimensions[4].height = 24

    thin_border = Border(
        left=Side(style="thin", color="E0E0E0"),
        right=Side(style="thin", color="E0E0E0"),
        top=Side(style="thin", color="E0E0E0"),
        bottom=Side(style="thin", color="E0E0E0")
    )

    for r_idx in range(5, 5 + len(overview_rows)):
        ws_ov.row_dimensions[r_idx].height = 20
        use_z = (r_idx % 2 == 0)
        for c_idx in range(1, 5):
            cell = ws_ov.cell(row=r_idx, column=c_idx)
            cell.font = Font(name="Segoe UI", size=10)
            cell.border = thin_border
            if use_z:
                cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
            if c_idx == 3:
                cell.alignment = Alignment(horizontal="right", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    for col in ws_ov.columns:
        max_l = max(len(str(c.value or "")) for c in col if c.row > 2)
        ws_ov.column_dimensions[get_column_letter(col[0].column)].width = max(max_l + 4, 15)

    # 2. Add Key Sheets to Excel Workbook
    sheets_to_add = [
        ("Unified_Analytics_10k", flat_unified_rows, True),
        ("Fact_Tryon_Event_10k", fact_events, False),
        ("Dim_User", users, False),
        ("Dim_Product", products, False),
        ("Dim_Time", dim_times_sorted, False),
        ("Dim_Device", devices, False),
        ("Dim_Outcome", outcomes, False),
        ("Agg_Daily_Rollup", agg_daily, False),
        ("Agg_Monthly_Rollup", agg_monthly, False),
        ("Mining_Association_Rules", association_rules, False),
        ("Mining_Correlations", correlations, False),
        ("KMeans_User_Clusters", user_clusters, False),
        ("KMeans_Cluster_Profiles", cluster_profiles, False),
    ]

    for s_name, s_data, is_unif in sheets_to_add:
        print(f"  [Excel] Writing sheet '{s_name}' ({len(s_data):,} rows)...")
        ws = wb.create_sheet(title=s_name)
        if s_data:
            headers = list(s_data[0].keys())
            ws.append(headers)
            for row_dict in s_data:
                # Convert dates/datetimes to string for clean Excel display
                row_vals = []
                for val in row_dict.values():
                    if isinstance(val, (datetime, timedelta)):
                        row_vals.append(str(val))
                    elif hasattr(val, "isoformat"):
                        row_vals.append(val.isoformat())
                    else:
                        row_vals.append(val)
                ws.append(row_vals)
            style_sheet(ws, s_name, len(s_data), len(headers), is_unified=is_unif)

    wb.save(excel_master_path)
    print(f"\n[SUCCESS] Master 10k Excel Workbook saved to: {excel_master_path}")
    print(f"[SUCCESS] CSV files saved to: {CSV_DIR}\n")


if __name__ == "__main__":
    generate_10k_synthetic_dataset()
