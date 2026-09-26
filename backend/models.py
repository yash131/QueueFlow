"""Pydantic models for QueueFlow."""
from datetime import datetime, timezone
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, EmailStr, Field, ConfigDict


JobType = Literal["image_resize", "send_email", "data_export", "pdf_generation"]
Priority = Literal["low", "medium", "high"]
JobStatus = Literal["pending", "running", "done", "failed", "cancelled"]
UserRole = Literal["user", "admin"]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Auth ---------- #
class RegisterInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# ---------- Jobs ---------- #
class JobCreate(BaseModel):
    type: JobType
    description: str = Field(min_length=1, max_length=500)
    priority: Priority = "medium"


class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    owner_name: str
    type: JobType
    description: str
    priority: Priority
    status: JobStatus = "pending"
    created_at: datetime = Field(default_factory=now_utc)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[str] = None
    error_message: Optional[str] = None


# ---------- Settings ---------- #
class SettingsModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "singleton"
    max_workers: int = 2
    updated_at: datetime = Field(default_factory=now_utc)


class SettingsUpdate(BaseModel):
    max_workers: int = Field(ge=1, le=20)


# ---------- Audit ---------- #
class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    admin_name: str
    action: str
    target_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=now_utc)


# ---------- Stats ---------- #
class Stats(BaseModel):
    total_jobs: int
    pending_jobs: int
    running_jobs: int
    completed_jobs: int
    failed_jobs: int
    cancelled_jobs: int
    average_processing_time: float  # seconds
    failure_rate: float  # 0..1


# ---------- Serialization helpers ---------- #
def user_to_public(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "name": doc["name"],
        "email": doc["email"],
        "role": doc["role"],
        "created_at": doc["created_at"],
    }


def job_out(doc: dict) -> dict:
    """Normalize a job document for JSON output (strip _id)."""
    doc.pop("_id", None)
    return doc
