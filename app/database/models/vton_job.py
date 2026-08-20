from sqlalchemy import (
    Column,
    BigInteger,
    String,
    DateTime,
    Integer,
    ForeignKey
)
from sqlalchemy.sql import func

from app.database.connection import Base


class VTONJob(Base):
    __tablename__ = "vton_jobs"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    user_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id"),
        nullable=False,
        index=True
    )

    status = Column(
        String(20),
        nullable=False,
        default="PENDING"
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    completed_at = Column(
        DateTime,
        nullable=True
    )

    processing_time = Column(
        Integer,
        nullable=True
    )