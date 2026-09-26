from sqlalchemy import (
    Column,
    BigInteger,
    String,
    Text,
    Numeric,
    DateTime
)
from sqlalchemy.sql import func

from app.database.connection import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    amazon_product_id = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True
    )

    title = Column(
        String(500),
        nullable=False
    )

    price = Column(
        Numeric(10, 2),
        nullable=True
    )

    currency = Column(
        String(10),
        nullable=True
    )

    product_url = Column(
        String(1000),
        nullable=True
    )

    image_url = Column(
        String(1000),
        nullable=True
    )

    category = Column(
        String(100),
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )