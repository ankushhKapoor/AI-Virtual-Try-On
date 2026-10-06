# AI Virtual Try-On — DWM Excel & 10k Synthetic Datasets Guide

This folder contains all generated Excel workbooks (`.xlsx`) and CSV data files tailored for **Data Warehousing & Data Mining (DWM)** presentation, evaluation, and analytics demonstrations.

---

## 📁 Directory Structure & File Index

```text
dwm_exports/
├── README.md                                        # This comprehensive documentation guide
├── present_data/                                    # Real Live Database Data (Extracted from MySQL)
│   ├── Virtual_TryOn_DWM_Present_Data.xlsx          # Multi-sheet styled master Excel workbook
│   └── csv/                                         # Individual CSV dumps for each live table
│       ├── dwh_fact_tryon_event.csv                 # Live Star Schema Fact records
│       ├── dwh_dim_user.csv                         # Live User Dimension (SCD-1)
│       ├── dwh_dim_product.csv                      # Live Product Dimension
│       ├── dwh_dim_time.csv                         # Live Time Dimension (YYYYMMDDHH)
│       ├── dwh_dim_device.csv                       # Live Device Channel Dimension
│       ├── dwh_dim_outcome.csv                      # Live Outcome & Failure Reason Dimension
│       ├── dwh_agg_tryon_daily.csv                  # Live Pre-aggregated Daily Summaries
│       ├── dwh_agg_tryon_monthly.csv                # Live Pre-aggregated Monthly Summaries
│       ├── dwh_mining_association_rules.csv         # Live Mined Apriori Association Rules
│       ├── dwh_mining_quality_correlations.csv      # Live Failure & Quality Correlation Analysis
│       ├── dwh_etl_watermark.csv                    # Incremental ETL Watermark tracking
│       ├── oltp_vton_jobs.csv                       # Live OLTP Try-on Jobs
│       ├── oltp_users.csv                           # Live OLTP Registered Users
│       └── oltp_products.csv                        # Live OLTP Catalog Products
│
└── synthetic_10k/                                   # 10,000 Record Benchmark Datasets
    ├── Virtual_TryOn_DWM_10k_Synthetic_Master.xlsx # Multi-sheet styled master Excel workbook (10k)
    └── csv/                                         # 10,000 Record CSV files
        ├── vton_dw_unified_analytical_10k.csv       # ⭐ Star flat denormalized 10k dataset (for Pivot Tables)
        ├── fact_tryon_event_10k.csv                 # 10,000 Star Schema Fact records
        ├── dim_user_10k.csv                         # 1,200 User Dimension records
        ├── dim_product_10k.csv                      # Product Catalog Dimension (ASINs, categories, colors)
        ├── dim_time_10k.csv                         # 3,373 Granular Time Dimension records
        ├── dim_device_10k.csv                       # Device & Upload Method Dimension
        ├── dim_outcome_10k.csv                      # Success & Failure Reason Dimension
        ├── agg_tryon_daily_10k.csv                  # 212 Daily Rollup records across 7 months
        ├── agg_tryon_monthly_10k.csv                # 7 Monthly Rollup records
        ├── mining_association_rules_10k.csv         # Top Apriori Product Association Rules
        ├── mining_quality_correlations_10k.csv      # Failure & Quality Correlation Matrix
        ├── mining_kmeans_user_clusters_10k.csv      # K-Means User Segmentation (1,200 users)
        ├── mining_kmeans_cluster_profiles_10k.csv   # K-Means Cluster Centroids & Profiles
        ├── oltp_vton_jobs_10k.csv                   # 10,000 Operational OLTP Job logs
        ├── oltp_users_10k.csv                       # Operational OLTP Users
        └── oltp_products_10k.csv                    # Operational OLTP Product Catalog
```

---

## 📊 How to Present in Excel for DWM Evaluation

### 1. Presenting the Star Schema (OLAP Warehouse)
Open `Virtual_TryOn_DWM_Present_Data.xlsx` or `Virtual_TryOn_DWM_10k_Synthetic_Master.xlsx`:
- **`00_Project_Overview`**: Shows the executive counts, table classifications, and schema definitions.
- **`Fact_Tryon_Event`**: Contains the central measure table with foreign keys (`user_key`, `product_key`, `time_key`, `device_key`, `outcome_key`) and quantitative metrics (`processing_time_ms`, `quality_score`, `user_rating`, `retry_count`, `saved_after_tryon`).
- **`Dim_*` sheets**: Explain the 5 dimension tables feeding into the fact table.

### 2. Creating Instant Pivot Tables & Slicers (Demo Favorite)
Open `vton_dw_unified_analytical_10k.csv` (or sheet `Unified_Analytics_10k` in the Excel file):
1. Select all data (`Ctrl + A`) -> Click **Insert** -> **PivotTable**.
2. **Analysis 1 (Device vs Failure Rates)**:
   - Rows: `device_type`, `upload_method`
   - Columns: `outcome`
   - Values: Count of `tryon_id`
   - *Observation*: Demonstrates that mobile camera uploads have higher failure rates due to lighting/occlusion compared to desktop/studio uploads.
3. **Analysis 2 (Category vs Processing Latency)**:
   - Rows: `category`
   - Values: Average of `processing_time_sec`, Average of `quality_score`
   - *Observation*: Shows that layered garments like Blazers, Jackets, and Maxi Dresses require higher inference time than T-Shirts.
4. **Analysis 3 (Time-Series Activity Heatmap)**:
   - Rows: `day_type` (Weekday vs Weekend)
   - Columns: `hour`
   - Values: Count of `tryon_id`
   - *Observation*: Shows peak virtual fitting traffic occurring in evening hours (18:00 - 22:00) and weekends.

### 3. Demonstrating Data Mining (Apriori & Correlations)
- Navigate to **`Mining_Association_Rules`**:
  - Highlights frequently co-tried clothing bundles mined using the **Apriori Algorithm** (e.g. *Denim Jacket + Black T-Shirt + Distressed Jeans* with `Support: 6.12%`, `Confidence: 81.45%`, `Lift: 4.19`).
  - Perfect for answering *"How does the system recommend complementary apparel after a try-on?"*
- Navigate to **`Mining_Correlations`**:
  - Displays correlation coefficients between dimensional attributes (e.g. upload methods, price brackets) and model failure probability.

---

## 🔄 Re-running or Customizing Exports

Both generation and export scripts are automated and located in `scripts/`:

### To Re-Export Live Database Data:
```powershell
uv run python scripts/export_present_db_to_excel.py
```

### To Re-Generate 10k Synthetic Datasets:
```powershell
uv run python scripts/generate_synthetic_10k_dwm.py
```
