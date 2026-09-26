"""Statistics endpoint (per-user for users, global for admins)."""
from datetime import datetime
from fastapi import APIRouter, Depends

from auth import get_current_user
from db import get_db

router = APIRouter(prefix="/api", tags=["stats"])


def _parse_iso(val):
    if val is None:
        return None
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return None
    return val


@router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    query = {} if current_user["role"] == "admin" else {"owner_id": current_user["id"]}
    jobs = await db.jobs.find(query, {"_id": 0, "status": 1, "started_at": 1, "completed_at": 1}).to_list(length=10000)

    total = len(jobs)
    pending = sum(1 for j in jobs if j["status"] == "pending")
    running = sum(1 for j in jobs if j["status"] == "running")
    done = sum(1 for j in jobs if j["status"] == "done")
    failed = sum(1 for j in jobs if j["status"] == "failed")
    cancelled = sum(1 for j in jobs if j["status"] == "cancelled")

    # Avg processing time (successfully completed only)
    durations = []
    for j in jobs:
        if j["status"] == "done":
            s = _parse_iso(j.get("started_at"))
            c = _parse_iso(j.get("completed_at"))
            if s and c:
                durations.append((c - s).total_seconds())
    avg = round(sum(durations) / len(durations), 2) if durations else 0.0

    finished = done + failed
    failure_rate = round(failed / finished, 3) if finished > 0 else 0.0

    return {
        "total_jobs": total,
        "pending_jobs": pending,
        "running_jobs": running,
        "completed_jobs": done,
        "failed_jobs": failed,
        "cancelled_jobs": cancelled,
        "average_processing_time": avg,
        "failure_rate": failure_rate,
    }
