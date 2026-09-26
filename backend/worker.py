"""Async worker pool that processes jobs from MongoDB.

Design:
- A single scheduler loop runs forever, polling for pending jobs.
- It maintains a set of running asyncio.Tasks.
- Concurrency is bounded by the current `max_workers` setting.
- When admin changes `max_workers` via the settings endpoint, the scheduler picks up
  the new limit on its next tick (dynamic resize without restart).
"""
import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Optional

from db import get_db

logger = logging.getLogger("queueflow.worker")

# Priority ordering (higher value = processed first)
PRIORITY_RANK = {"high": 3, "medium": 2, "low": 1}


class WorkerManager:
    def __init__(self) -> None:
        self._running_tasks: set[asyncio.Task] = set()
        self._scheduler_task: Optional[asyncio.Task] = None
        self._max_workers: int = 2
        self._stop = asyncio.Event()
        self._poll_interval = 1.0  # seconds

    @property
    def max_workers(self) -> int:
        return self._max_workers

    @property
    def active_workers(self) -> int:
        return len([t for t in self._running_tasks if not t.done()])

    async def start(self, initial_max_workers: int = 2) -> None:
        self._max_workers = max(1, min(20, initial_max_workers))
        self._stop.clear()
        if self._scheduler_task is None or self._scheduler_task.done():
            self._scheduler_task = asyncio.create_task(self._scheduler_loop())
            logger.info("Worker scheduler started (max_workers=%s)", self._max_workers)

    async def stop(self) -> None:
        self._stop.set()
        if self._scheduler_task:
            self._scheduler_task.cancel()
            try:
                await self._scheduler_task
            except asyncio.CancelledError:
                pass
        for t in list(self._running_tasks):
            t.cancel()

    def set_max_workers(self, value: int) -> None:
        self._max_workers = max(1, min(20, int(value)))
        logger.info("Worker concurrency updated to %s", self._max_workers)

    async def _scheduler_loop(self) -> None:
        db = get_db()
        while not self._stop.is_set():
            try:
                # Cleanup finished tasks
                self._running_tasks = {t for t in self._running_tasks if not t.done()}

                # Spawn new workers up to max_workers
                while len(self._running_tasks) < self._max_workers:
                    job = await self._claim_next_pending_job(db)
                    if job is None:
                        break
                    task = asyncio.create_task(self._process_job(job))
                    self._running_tasks.add(task)

                await asyncio.sleep(self._poll_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:  # keep scheduler alive
                logger.exception("Scheduler error: %s", e)
                await asyncio.sleep(self._poll_interval)

    async def _claim_next_pending_job(self, db) -> Optional[dict]:
        """Atomically pick highest-priority oldest pending job and mark running.

        Uses a mapped `priority_rank` field for correct server-side sort. Each new
        job stores its rank; we backfill legacy docs on the fly.
        """
        # Backfill priority_rank for any pending docs that lack it (one-time per doc)
        await db.jobs.update_many(
            {"status": "pending", "priority_rank": {"$exists": False}, "priority": "high"},
            {"$set": {"priority_rank": 3}},
        )
        await db.jobs.update_many(
            {"status": "pending", "priority_rank": {"$exists": False}, "priority": "medium"},
            {"$set": {"priority_rank": 2}},
        )
        await db.jobs.update_many(
            {"status": "pending", "priority_rank": {"$exists": False}, "priority": "low"},
            {"$set": {"priority_rank": 1}},
        )

        cursor = db.jobs.find({"status": "pending"}, {"_id": 0}).sort(
            [("priority_rank", -1), ("created_at", 1)]
        ).limit(5)
        candidates = await cursor.to_list(length=5)
        if not candidates:
            return None
        for cand in candidates:
            started_at = datetime.now(timezone.utc).isoformat()
            result = await db.jobs.update_one(
                {"id": cand["id"], "status": "pending"},
                {"$set": {"status": "running", "started_at": started_at}},
            )
            if result.modified_count == 1:
                cand["status"] = "running"
                cand["started_at"] = started_at
                return cand
        return None

    async def _process_job(self, job: dict) -> None:
        db = get_db()
        job_id = job["id"]
        delay = random.uniform(5, 15)  # seconds, per spec
        try:
            await asyncio.sleep(delay)
        except asyncio.CancelledError:
            # Job was cancelled while running (e.g. admin cancel or shutdown)
            return

        # Re-check status: if it was cancelled during processing, don't overwrite
        current = await db.jobs.find_one({"id": job_id}, {"_id": 0, "status": 1})
        if not current or current.get("status") != "running":
            return

        completed_at = datetime.now(timezone.utc).isoformat()
        if random.random() < 0.9:
            result_text = _success_result(job["type"])
            await db.jobs.update_one(
                {"id": job_id, "status": "running"},
                {
                    "$set": {
                        "status": "done",
                        "completed_at": completed_at,
                        "result": result_text,
                        "error_message": None,
                    }
                },
            )
        else:
            await db.jobs.update_one(
                {"id": job_id, "status": "running"},
                {
                    "$set": {
                        "status": "failed",
                        "completed_at": completed_at,
                        "error_message": "Simulated processing failure: temporary worker error.",
                        "result": None,
                    }
                },
            )


def _success_result(job_type: str) -> str:
    return {
        "image_resize": "Image resize completed successfully.",
        "send_email": "Email delivered successfully to recipient.",
        "data_export": "Data export finished and file is ready.",
        "pdf_generation": "PDF generated and stored successfully.",
    }.get(job_type, "Job completed successfully.")


# Global singleton
worker_manager = WorkerManager()
