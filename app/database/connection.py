from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.database.core.config import settings

_db_path = (Path(__file__).resolve().parents[2] / "app.db").resolve()
_sqlite_url = f"sqlite:///{_db_path}".replace("\\", "/")

DATABASE_URL = settings.DATABASE_URL

try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True
    )
    # Quick connectivity test
    with engine.connect() as _conn:
        pass
except Exception:
    # Graceful fallback to SQLite when local MySQL is unreachable
    engine = create_engine(
        _sqlite_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )



SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def create_all_tables():
    from app.database.models.user import User
    from app.database.models.admin import Admin
    from app.database.models.product import Product
    from app.database.models.vton_job import VTONJob

    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()