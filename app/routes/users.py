from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/")
def create_user(
    name: str,
    email: str,
    password_hash: str,
    db: Session = Depends(get_db)
):
    user = User(
        name=name,
        email=email,
        password_hash=password_hash
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email
    }