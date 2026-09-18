import os
from urllib.parse import quote_plus
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.database.core.config import settings

# Warehouse database name can be overridden via DWH_DB_NAME env var, default: virtual_tryon_dwh
DWH_DB_NAME = os.getenv("DWH_DB_NAME", "virtual_tryon_dwh")

# ─────────────────────────────────────────────────────────────
# 1. OLTP Database Connection (app/database/connection.py reuse)
# ─────────────────────────────────────────────────────────────
OLTP_DATABASE_URL = settings.DATABASE_URL
oltp_engine = create_engine(OLTP_DATABASE_URL, pool_pre_ping=True)
OLTPSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=oltp_engine)

# ─────────────────────────────────────────────────────────────
# 2. DWH (OLAP) Database Connection
# ─────────────────────────────────────────────────────────────
encoded_password = quote_plus(settings.DB_PASSWORD)
DWH_DATABASE_URL = (
    f"mysql+pymysql://{settings.DB_USER}:{encoded_password}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{DWH_DB_NAME}"
)

# Root server URL (without database) used for CREATE DATABASE IF NOT EXISTS
SERVER_DATABASE_URL = (
    f"mysql+pymysql://{settings.DB_USER}:{encoded_password}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/"
)

dwh_engine = create_engine(DWH_DATABASE_URL, pool_pre_ping=True)
DWHSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=dwh_engine)

DWHBase = declarative_base()


def init_dwh_database():
    """
    Ensures the DWH MySQL schema exists and all star schema tables are created.
    """
    # 1. Create schema if missing
    server_engine = create_engine(SERVER_DATABASE_URL, pool_pre_ping=True)
    with server_engine.connect() as conn:
        conn.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{DWH_DB_NAME}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
        )
        conn.commit()
    server_engine.dispose()

    # 2. Create tables via DWHBase metadata
    from dwm import models  # noqa: F401
    DWHBase.metadata.create_all(bind=dwh_engine)


def get_oltp_db():
    """Yields a database session connected to operational OLTP."""
    db = OLTPSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_dwh_db():
    """Yields a database session connected to analytics DWH."""
    db = DWHSessionLocal()
    try:
        yield db
    finally:
        db.close()
