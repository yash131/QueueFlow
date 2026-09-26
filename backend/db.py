"""MongoDB connection helper."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

_client: AsyncIOMotorClient | None = None
_db = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return _client


def get_db():
    global _db
    if _db is None:
        _db = get_client()[os.environ["DB_NAME"]]
    return _db


async def close_db():
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def ensure_indexes():
    """Create MongoDB indexes on startup."""
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.jobs.create_index("owner_id")
    await db.jobs.create_index("status")
    await db.jobs.create_index("priority")
    await db.jobs.create_index("created_at")
    # Compound index for the pending-job scheduler query
    await db.jobs.create_index([("status", 1), ("priority", -1), ("created_at", 1)])
    await db.audit_logs.create_index("timestamp")
