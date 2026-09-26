"""Admin routes: users list, worker settings, audit logs."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from auth import require_admin
from db import get_db
from models import SettingsUpdate
from worker import worker_manager

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
async def list_users(_: dict = Depends(require_admin)):
    db = get_db()
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(length=1000)

    # Attach per-user job stats
    for u in users:
        jobs = await db.jobs.find({"owner_id": u["id"]}, {"_id": 0, "status": 1}).to_list(length=5000)
        total = len(jobs)
        completed = sum(1 for j in jobs if j["status"] == "done")
        failed = sum(1 for j in jobs if j["status"] == "failed")
        u["total_jobs"] = total
        u["completed_jobs"] = completed
        u["failed_jobs"] = failed
    return users


@router.get("/settings")
async def get_settings(_: dict = Depends(require_admin)):
    db = get_db()
    doc = await db.settings.find_one({"id": "singleton"}, {"_id": 0})
    if not doc:
        new_doc = {"id": "singleton", "max_workers": worker_manager.max_workers, "updated_at": datetime.now(timezone.utc).isoformat()}
        await db.settings.insert_one(dict(new_doc))
        doc = new_doc
    return {
        "id": doc["id"],
        "max_workers": doc["max_workers"],
        "updated_at": doc["updated_at"],
        "active_workers": worker_manager.active_workers,
    }


@router.put("/settings")
async def update_settings(body: SettingsUpdate, admin: dict = Depends(require_admin)):
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    await db.settings.update_one(
        {"id": "singleton"},
        {"$set": {"max_workers": body.max_workers, "updated_at": now}},
        upsert=True,
    )
    worker_manager.set_max_workers(body.max_workers)

    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_name": admin["name"],
        "action": "update_workers",
        "target_id": None,
        "details": f"Set max concurrent workers to {body.max_workers}",
        "timestamp": now,
    })
    return {
        "id": "singleton",
        "max_workers": body.max_workers,
        "updated_at": now,
        "active_workers": worker_manager.active_workers,
    }


@router.get("/audit")
async def list_audit(_: dict = Depends(require_admin)):
    db = get_db()
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(50).to_list(length=50)
    return logs
