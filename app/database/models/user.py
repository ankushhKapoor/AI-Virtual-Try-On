from sqlalchemy import Column, BigInteger, String, DateTime, Boolean, Integer
from sqlalchemy.sql import func

from app.database.connection import Base


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    name = Column(String(100), nullable=False)

    email = Column(
        String(255),
        nullable=False,
        unique=True,
        index=True
    )

    password_hash = Column(String(255), nullable=False)

    image_path = Column(String(500), nullable=True)

    try_on_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True
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

    last_login_at = Column(
        DateTime,
        nullable=True
    )