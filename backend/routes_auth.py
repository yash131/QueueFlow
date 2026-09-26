"""Auth routes: register + login."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from db import get_db
from auth import hash_password, verify_password, create_access_token
from models import RegisterInput, LoginInput, TokenResponse, user_to_public

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterInput):
    db = get_db()
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0, "id": 1})
    if existing:
        raise HTTPException(status_code=409, detail="Email is already registered")

    user_doc = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "email": email,
        "role": "user",  # always user on self-registration
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_doc["id"], user_doc["role"])
    return TokenResponse(access_token=token, user=user_to_public(user_doc))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginInput):
    db = get_db()
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["role"])
    return TokenResponse(access_token=token, user=user_to_public(user))
