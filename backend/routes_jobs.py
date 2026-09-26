"""Job endpoints: create, list, get, retry, cancel, delete."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user, require_admin
from db import get_db
from models import JobCreate, Job, job_out

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


async def _log_admin_action(db, admin: dict, action: str, target_id: str | None = None, details: str | None = None):
    import uuid
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_name": admin["name"],
        "action": action,
        "target_id": target_id,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@router.post("", response_model=Job)
async def create_job(body: JobCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    job = Job(
        owner_id=current_user["id"],
        owner_name=current_user["name"],
        type=body.type,
        description=body.description.strip(),
        priority=body.priority,
    )
    doc = job.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.jobs.insert_one(doc)
    return job


@router.get("/my")
async def list_my_jobs(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.jobs.find({"owner_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1)
    return [job_out(d) for d in await cursor.to_list(length=500)]


@router.get("")
async def list_all_jobs(_: dict = Depends(require_admin)):
    db = get_db()
    cursor = db.jobs.find({}, {"_id": 0}).sort("created_at", -1)
    return [job_out(d) for d in await cursor.to_list(length=2000)]


@router.get("/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["role"] != "admin" and job["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    return job


@router.post("/{job_id}/retry")
async def retry_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["role"] != "admin" and job["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    if job["status"] != "failed":
        raise HTTPException(status_code=400, detail="Only failed jobs can be retried")
    await db.jobs.update_one(
        {"id": job_id, "status": "failed"},
        {"$set": {
            "status": "pending",
            "started_at": None,
            "completed_at": None,
            "error_message": None,
            "result": None,
        }},
    )
    if current_user["role"] == "admin" and job["owner_id"] != current_user["id"]:
        await _log_admin_action(db, current_user, "retry_job", job_id, f"Retried job of user {job['owner_name']}")
    return {"ok": True}


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["role"] != "admin" and job["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    if job["status"] not in ("pending", "running"):
        raise HTTPException(status_code=400, detail="Only pending or running jobs can be cancelled")
    await db.jobs.update_one(
        {"id": job_id, "status": {"$in": ["pending", "running"]}},
        {"$set": {"status": "cancelled", "completed_at": datetime.now(timezone.utc).isoformat()}},
    )
    if current_user["role"] == "admin" and job["owner_id"] != current_user["id"]:
        await _log_admin_action(db, current_user, "cancel_job", job_id, f"Cancelled job of user {job['owner_name']}")
    return {"ok": True}


@router.delete("/{job_id}")
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["role"] != "admin" and job["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.jobs.delete_one({"id": job_id})
    if current_user["role"] == "admin" and job["owner_id"] != current_user["id"]:
        await _log_admin_action(db, current_user, "delete_job", job_id, f"Deleted job of user {job['owner_name']}")
    return {"ok": True}
