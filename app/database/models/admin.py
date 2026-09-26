from sqlalchemy import Column, BigInteger, String, DateTime, Boolean
from sqlalchemy.sql import func

from app.database.connection import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    name = Column(String(100), nullable=False)

    email = Column(
        String(255),
        nullable=False,
        unique=True,
        index=True
    )

    password_hash = Column(String(255), nullable=False)

    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    last_login_at = Column(
        DateTime,
        nullable=True
    )