from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.database.core.config import settings


DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
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