-- =====================================================================
-- DWM Module: Star Schema & Data Mining DDL
-- AI Virtual Try-On Platform
-- Schema: virtual_tryon_dwh (OLAP / Analytics)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS virtual_tryon_dwh
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE virtual_tryon_dwh;

-- ---------------------------------------------------------------------
-- 1. DIMENSION TABLES
-- ---------------------------------------------------------------------

-- Dimension: User
CREATE TABLE IF NOT EXISTS dim_user (
    user_key BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT 'Natural key referencing OLTP users.id',
    signup_date DATE NOT NULL,
    total_tryons INT NOT NULL DEFAULT 0,
    engagement_level VARCHAR(50) NOT NULL COMMENT 'Low (0-2), Medium (3-10), High (11-25), Power User (>25)',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_dim_user_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dimension: Product
CREATE TABLE IF NOT EXISTS dim_product (
    product_key BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL COMMENT 'Natural key referencing OLTP products.id',
    amazon_product_id VARCHAR(100) NOT NULL COMMENT 'ASIN from Amazon catalog',
    category VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL DEFAULT 'Unknown/Unspecified',
    pattern VARCHAR(50) NOT NULL DEFAULT 'Solid/Standard',
    price_bracket VARCHAR(50) NOT NULL COMMENT 'Budget (<500), Mid-Range (500-2000), Premium (>2000)',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_dim_product_product_id (product_id),
    INDEX idx_dim_product_category (category),
    INDEX idx_dim_product_price_bracket (price_bracket)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dimension: Time (Calendar & Grain breakdown)
CREATE TABLE IF NOT EXISTS dim_time (
    time_key BIGINT PRIMARY KEY COMMENT 'Key formatted as YYYYMMDDHH or surrogate ID',
    full_timestamp DATETIME NOT NULL,
    hour INT NOT NULL COMMENT 'Hour of day (0-23)',
    day INT NOT NULL COMMENT 'Day of month (1-31)',
    week INT NOT NULL COMMENT 'ISO Week (1-53)',
    month INT NOT NULL COMMENT 'Month of year (1-12)',
    year INT NOT NULL COMMENT 'Calendar year',
    weekday_or_weekend VARCHAR(20) NOT NULL COMMENT 'Weekday or Weekend',
    INDEX idx_dim_time_day_month_year (year, month, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dimension: Device
CREATE TABLE IF NOT EXISTS dim_device (
    device_key BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_type VARCHAR(50) NOT NULL COMMENT 'Mobile, Desktop, Tablet, Unknown',
    upload_method VARCHAR(50) NOT NULL COMMENT 'Camera, Gallery, URL, Unknown',
    UNIQUE KEY uk_dim_device (device_type, upload_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dimension: Outcome
CREATE TABLE IF NOT EXISTS dim_outcome (
    outcome_key BIGINT AUTO_INCREMENT PRIMARY KEY,
    success_or_fail VARCHAR(20) NOT NULL COMMENT 'SUCCESS or FAILURE',
    failure_reason VARCHAR(255) NOT NULL DEFAULT 'None',
    UNIQUE KEY uk_dim_outcome (success_or_fail, failure_reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. FACT TABLE
-- ---------------------------------------------------------------------

-- Fact: Try-On Event (Central grain: 1 row per try-on execution)
CREATE TABLE IF NOT EXISTS fact_tryon_event (
    tryon_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Fact surrogate key',
    job_id BIGINT NOT NULL COMMENT 'Natural key referencing OLTP vton_jobs.id for idempotency',
    user_key BIGINT NOT NULL,
    product_key BIGINT NOT NULL,
    time_key BIGINT NOT NULL,
    device_key BIGINT NOT NULL,
    outcome_key BIGINT NOT NULL,
    processing_time_ms INT NULL COMMENT 'Total model inference + pipeline execution latency in ms',
    quality_score DECIMAL(4, 2) NULL COMMENT 'AI synthetic visual quality score (e.g. 0.00 - 1.00 or 1-5)',
    user_rating INT NULL COMMENT 'User feedback rating (1-5), if submitted',
    retry_count INT NOT NULL DEFAULT 0,
    saved_after_tryon BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether user saved/wishlisted the look',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_fact_tryon_job_id (job_id),
    INDEX idx_fact_user_key (user_key),
    INDEX idx_fact_product_key (product_key),
    INDEX idx_fact_time_key (time_key),
    INDEX idx_fact_device_key (device_key),
    INDEX idx_fact_outcome_key (outcome_key),

    CONSTRAINT fk_fact_user FOREIGN KEY (user_key) REFERENCES dim_user (user_key) ON DELETE RESTRICT,
    CONSTRAINT fk_fact_product FOREIGN KEY (product_key) REFERENCES dim_product (product_key) ON DELETE RESTRICT,
    CONSTRAINT fk_fact_time FOREIGN KEY (time_key) REFERENCES dim_time (time_key) ON DELETE RESTRICT,
    CONSTRAINT fk_fact_device FOREIGN KEY (device_key) REFERENCES dim_device (device_key) ON DELETE RESTRICT,
    CONSTRAINT fk_fact_outcome FOREIGN KEY (outcome_key) REFERENCES dim_outcome (outcome_key) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. DATA MINING RESULT TABLES
-- ---------------------------------------------------------------------

-- Association Rules Mining (Apriori Results)
CREATE TABLE IF NOT EXISTS mining_association_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    antecedent_product_keys TEXT NOT NULL COMMENT 'Comma-separated product keys in antecedent itemset',
    consequent_product_keys TEXT NOT NULL COMMENT 'Comma-separated product keys in consequent itemset',
    antecedent_categories TEXT NOT NULL,
    consequent_categories TEXT NOT NULL,
    support DECIMAL(6, 4) NOT NULL,
    confidence DECIMAL(6, 4) NOT NULL,
    lift DECIMAL(6, 4) NOT NULL,
    item_count INT NOT NULL DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rules_lift (lift DESC),
    INDEX idx_rules_confidence (confidence DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Model Failure & Quality Correlation Analysis Results
CREATE TABLE IF NOT EXISTS mining_quality_correlations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    dimension_name VARCHAR(50) NOT NULL COMMENT 'device_type, category, price_bracket, hour, etc.',
    dimension_value VARCHAR(100) NOT NULL,
    total_events INT NOT NULL,
    success_rate DECIMAL(6, 4) NOT NULL,
    avg_quality_score DECIMAL(6, 4) NULL,
    avg_processing_time_ms INT NULL,
    correlation_with_failure DECIMAL(6, 4) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_correlations_dim (dimension_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. OLAP ROLLUP AGGREGATION TABLES
-- ---------------------------------------------------------------------

-- Daily Try-on Rollup
CREATE TABLE IF NOT EXISTS agg_tryon_daily (
    date DATE PRIMARY KEY,
    total_tryons INT NOT NULL,
    successful_tryons INT NOT NULL,
    failed_tryons INT NOT NULL,
    avg_processing_time_ms INT NULL,
    avg_quality_score DECIMAL(4, 2) NULL,
    unique_active_users INT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Monthly Try-on Rollup
CREATE TABLE IF NOT EXISTS agg_tryon_monthly (
    year_month VARCHAR(7) PRIMARY KEY COMMENT 'Format: YYYY-MM',
    total_tryons INT NOT NULL,
    successful_tryons INT NOT NULL,
    failed_tryons INT NOT NULL,
    avg_processing_time_ms INT NULL,
    avg_quality_score DECIMAL(4, 2) NULL,
    unique_active_users INT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. ETL WATERMARK / CONTROL TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etl_watermark (
    id INT PRIMARY KEY,
    pipeline_name VARCHAR(50) NOT NULL,
    last_extracted_job_id BIGINT NOT NULL DEFAULT 0,
    last_extracted_at DATETIME NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize watermark record if empty
INSERT INTO etl_watermark (id, pipeline_name, last_extracted_job_id, last_extracted_at)
SELECT 1, 'vton_etl', 0, NULL
WHERE NOT EXISTS (SELECT 1 FROM etl_watermark WHERE id = 1);
