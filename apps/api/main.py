from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from middleware.auth_middleware import AuthMiddleware
from routers import auth as auth_router

app = FastAPI(title="Meridian API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuthMiddleware)

app.include_router(auth_router.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
