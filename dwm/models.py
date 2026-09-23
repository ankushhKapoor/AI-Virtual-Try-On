from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    String,
    Date,
    DateTime,
    Numeric,
    Boolean,
    ForeignKey,
    Text,
)
from sqlalchemy.sql import func
from dwm.connection import DWHBase


class DimUser(DWHBase):
    __tablename__ = "dim_user"

    user_key = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=False, unique=True, index=True)
    signup_date = Column(Date, nullable=False)
    total_tryons = Column(Integer, nullable=False, default=0)
    engagement_level = Column(String(50), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class DimProduct(DWHBase):
    __tablename__ = "dim_product"

    product_key = Column(BigInteger, primary_key=True, autoincrement=True)
    product_id = Column(BigInteger, nullable=False, unique=True, index=True)
    amazon_product_id = Column(String(100), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    color = Column(String(50), nullable=False, default="Unknown/Unspecified")
    pattern = Column(String(50), nullable=False, default="Solid/Standard")
    price_bracket = Column(String(50), nullable=False, index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class DimTime(DWHBase):
    __tablename__ = "dim_time"

    time_key = Column(BigInteger, primary_key=True)
    full_timestamp = Column(DateTime, nullable=False)
    hour = Column(Integer, nullable=False)
    day = Column(Integer, nullable=False)
    week = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    weekday_or_weekend = Column(String(20), nullable=False)


class DimDevice(DWHBase):
    __tablename__ = "dim_device"

    device_key = Column(BigInteger, primary_key=True, autoincrement=True)
    device_type = Column(String(50), nullable=False)
    upload_method = Column(String(50), nullable=False)


class DimOutcome(DWHBase):
    __tablename__ = "dim_outcome"

    outcome_key = Column(BigInteger, primary_key=True, autoincrement=True)
    success_or_fail = Column(String(20), nullable=False)
    failure_reason = Column(String(255), nullable=False, default="None")


class FactTryonEvent(DWHBase):
    __tablename__ = "fact_tryon_event"

    tryon_id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_id = Column(BigInteger, nullable=False, unique=True, index=True)
    user_key = Column(BigInteger, ForeignKey("dim_user.user_key"), nullable=False, index=True)
    product_key = Column(BigInteger, ForeignKey("dim_product.product_key"), nullable=False, index=True)
    time_key = Column(BigInteger, ForeignKey("dim_time.time_key"), nullable=False, index=True)
    device_key = Column(BigInteger, ForeignKey("dim_device.device_key"), nullable=False, index=True)
    outcome_key = Column(BigInteger, ForeignKey("dim_outcome.outcome_key"), nullable=False, index=True)
    processing_time_ms = Column(Integer, nullable=True)
    quality_score = Column(Numeric(4, 2), nullable=True)
    user_rating = Column(Integer, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    saved_after_tryon = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())


class MiningAssociationRule(DWHBase):
    __tablename__ = "mining_association_rules"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    antecedent_product_keys = Column(Text, nullable=False)
    consequent_product_keys = Column(Text, nullable=False)
    antecedent_categories = Column(Text, nullable=False)
    consequent_categories = Column(Text, nullable=False)
    support = Column(Numeric(6, 4), nullable=False)
    confidence = Column(Numeric(6, 4), nullable=False)
    lift = Column(Numeric(6, 4), nullable=False)
    item_count = Column(Integer, nullable=False, default=2)
    created_at = Column(DateTime, server_default=func.now())


class MiningQualityCorrelation(DWHBase):
    __tablename__ = "mining_quality_correlations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    dimension_name = Column(String(50), nullable=False, index=True)
    dimension_value = Column(String(100), nullable=False)
    total_events = Column(Integer, nullable=False)
    success_rate = Column(Numeric(6, 4), nullable=False)
    avg_quality_score = Column(Numeric(6, 4), nullable=True)
    avg_processing_time_ms = Column(Integer, nullable=True)
    correlation_with_failure = Column(Numeric(6, 4), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class AggTryonDaily(DWHBase):
    __tablename__ = "agg_tryon_daily"

    date = Column(Date, primary_key=True)
    total_tryons = Column(Integer, nullable=False)
    successful_tryons = Column(Integer, nullable=False)
    failed_tryons = Column(Integer, nullable=False)
    avg_processing_time_ms = Column(Integer, nullable=True)
    avg_quality_score = Column(Numeric(4, 2), nullable=True)
    unique_active_users = Column(Integer, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AggTryonMonthly(DWHBase):
    __tablename__ = "agg_tryon_monthly"

    year_month = Column(String(7), primary_key=True)
    total_tryons = Column(Integer, nullable=False)
    successful_tryons = Column(Integer, nullable=False)
    failed_tryons = Column(Integer, nullable=False)
    avg_processing_time_ms = Column(Integer, nullable=True)
    avg_quality_score = Column(Numeric(4, 2), nullable=True)
    unique_active_users = Column(Integer, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ETLWatermark(DWHBase):
    __tablename__ = "etl_watermark"

    id = Column(Integer, primary_key=True)
    pipeline_name = Column(String(50), nullable=False)
    last_extracted_job_id = Column(BigInteger, nullable=False, default=0)
    last_extracted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
