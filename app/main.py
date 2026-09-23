from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database.connection import create_all_tables
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all database tables on startup
    create_all_tables()
    yield


app = FastAPI(
    title="AI Virtual Try-On API",
    version="1.0.0",
    lifespan=lifespan
)


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {
        "message": "AI Virtual Try-On Backend"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }
