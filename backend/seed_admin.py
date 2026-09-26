"""Seed the default admin account from env vars.

Idempotent: if the admin exists with a different password, update the hash.
"""
import os
import uuid
from datetime import datetime, timezone

from db import get_db
from auth import hash_password, verify_password


async def seed_admin() -> dict:
    db = get_db()
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower().strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")

    existing = await db.users.find_one({"email": admin_email}, {"_id": 0})
    if existing is None:
        doc = {
            "id": str(uuid.uuid4()),
            "name": "Admin",
            "email": admin_email,
            "role": "admin",
            "password_hash": hash_password(admin_password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        return {"created": True, "email": admin_email}

    # Update password if env changed and ensure admin role
    updates = {}
    if not verify_password(admin_password, existing.get("password_hash", "")):
        updates["password_hash"] = hash_password(admin_password)
    if existing.get("role") != "admin":
        updates["role"] = "admin"
    if updates:
        await db.users.update_one({"email": admin_email}, {"$set": updates})
    return {"created": False, "email": admin_email, "updated": bool(updates)}
