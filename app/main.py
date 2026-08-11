from fastapi import FastAPI

from app.routes.users import router as users_router


app = FastAPI(
    title="AI Virtual Try-On API",
    version="1.0.0"
)


app.include_router(users_router)


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