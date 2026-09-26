"""QueueFlow FastAPI entrypoint.

Exposes /api/* endpoints, seeds the default admin, and manages the async worker pool.
"""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

# Load env vars BEFORE importing any modules that read them at import time
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, Depends  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from db import ensure_indexes, close_db, get_db  # noqa: E402
from seed_admin import seed_admin  # noqa: E402
from worker import worker_manager  # noqa: E402
from routes_auth import router as auth_router  # noqa: E402
from routes_jobs import router as jobs_router  # noqa: E402
from routes_admin import router as admin_router  # noqa: E402
from routes_stats import router as stats_router  # noqa: E402
from auth import get_current_user  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("queueflow")

app = FastAPI(title="QueueFlow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(jobs_router)
app.include_router(admin_router)
app.include_router(stats_router)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "active_workers": worker_manager.active_workers,
        "max_workers": worker_manager.max_workers,
    }


@app.get("/api/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
        "created_at": current_user["created_at"],
    }


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    seeded = await seed_admin()
    logger.info("Admin seed: %s", seeded)

    # Load settings and start worker
    db = get_db()
    settings_doc = await db.settings.find_one({"id": "singleton"}, {"_id": 0})
    initial_workers = int(settings_doc["max_workers"]) if settings_doc else int(os.environ.get("MAX_WORKERS_DEFAULT", "2"))
    await worker_manager.start(initial_workers)
    logger.info("QueueFlow startup complete")


@app.on_event("shutdown")
async def on_shutdown():
    await worker_manager.stop()
    await close_db()
