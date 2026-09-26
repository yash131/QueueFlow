"""End-to-end pytest suite for QueueFlow backend APIs.

Covers: auth (register/login/duplicate/invalid/me), jobs CRUD, priority ordering,
role guards, admin settings + audit, stats, health.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://jobsched-dashboard.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "laluchacha4@gmail.com"
ADMIN_PASSWORD = "Admin@12345"


# ---------- Fixtures ---------- #
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["access_token"]


@pytest.fixture(scope="session")
def user_creds():
    unique = uuid.uuid4().hex[:8]
    return {"name": "TEST User", "email": f"TEST_user_{unique}@example.com", "password": "Test@12345"}


@pytest.fixture(scope="session")
def user_token(s, user_creds):
    r = s.post(f"{API}/auth/register", json=user_creds)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "user"
    assert data["user"]["email"] == user_creds["email"].lower()
    return data["access_token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Health ---------- #
class TestHealth:
    def test_health_ok(self, s):
        r = s.get(f"{API}/health")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "ok"
        assert "max_workers" in d and "active_workers" in d


# ---------- Auth ---------- #
class TestAuth:
    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20

    def test_register_and_me(self, s, user_token, user_creds):
        r = s.get(f"{API}/auth/me", headers=_h(user_token))
        assert r.status_code == 200
        me = r.json()
        assert me["email"] == user_creds["email"].lower()
        assert me["role"] == "user"

    def test_duplicate_register_409(self, s, user_creds):
        r = s.post(f"{API}/auth/register", json=user_creds)
        assert r.status_code == 409
        assert "already" in r.json().get("detail", "").lower()

    def test_login_wrong_password(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-pw"})
        assert r.status_code == 401
        assert "invalid" in r.json().get("detail", "").lower()

    def test_missing_token_401(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_malformed_token_401(self, s):
        r = s.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.here"})
        assert r.status_code == 401


# ---------- Role guards ---------- #
class TestRoleGuards:
    def test_user_cannot_list_admin_users(self, s, user_token):
        r = s.get(f"{API}/admin/users", headers=_h(user_token))
        assert r.status_code == 403

    def test_user_cannot_list_all_jobs(self, s, user_token):
        r = s.get(f"{API}/jobs", headers=_h(user_token))
        assert r.status_code == 403

    def test_user_cannot_get_settings(self, s, user_token):
        r = s.get(f"{API}/admin/settings", headers=_h(user_token))
        assert r.status_code == 403


# ---------- Jobs ---------- #
class TestJobs:
    def test_create_job_persists_and_appears_in_my(self, s, user_token):
        payload = {"type": "send_email", "description": "TEST desc", "priority": "medium"}
        r = s.post(f"{API}/jobs", json=payload, headers=_h(user_token))
        assert r.status_code == 200
        job = r.json()
        assert job["status"] == "pending"
        assert job["type"] == "send_email"
        assert job["priority"] == "medium"
        assert job["owner_id"]
        jid = job["id"]

        r2 = s.get(f"{API}/jobs/my", headers=_h(user_token))
        assert r2.status_code == 200
        ids = [j["id"] for j in r2.json()]
        assert jid in ids

    def test_get_job_owner_ok(self, s, user_token):
        r = s.post(f"{API}/jobs", json={"type": "image_resize", "description": "TEST", "priority": "low"}, headers=_h(user_token))
        jid = r.json()["id"]
        r2 = s.get(f"{API}/jobs/{jid}", headers=_h(user_token))
        assert r2.status_code == 200
        assert r2.json()["id"] == jid

    def test_other_user_cannot_view_job_403(self, s, user_token):
        # Create job as user1
        r = s.post(f"{API}/jobs", json={"type": "image_resize", "description": "TEST", "priority": "low"}, headers=_h(user_token))
        jid = r.json()["id"]
        # Register second user
        creds2 = {"name": "TEST U2", "email": f"TEST_u2_{uuid.uuid4().hex[:6]}@example.com", "password": "Test@12345"}
        r2 = s.post(f"{API}/auth/register", json=creds2)
        tok2 = r2.json()["access_token"]
        r3 = s.get(f"{API}/jobs/{jid}", headers=_h(tok2))
        assert r3.status_code == 403

    def test_admin_can_view_any_job(self, s, user_token, admin_token):
        r = s.post(f"{API}/jobs", json={"type": "pdf_generation", "description": "TEST", "priority": "low"}, headers=_h(user_token))
        jid = r.json()["id"]
        r2 = s.get(f"{API}/jobs/{jid}", headers=_h(admin_token))
        assert r2.status_code == 200

    def test_retry_on_pending_returns_400(self, s, user_token):
        r = s.post(f"{API}/jobs", json={"type": "send_email", "description": "TEST", "priority": "low"}, headers=_h(user_token))
        jid = r.json()["id"]
        r2 = s.post(f"{API}/jobs/{jid}/retry", headers=_h(user_token))
        assert r2.status_code == 400

    def test_cancel_pending_job(self, s, user_token):
        r = s.post(f"{API}/jobs", json={"type": "data_export", "description": "TEST", "priority": "low"}, headers=_h(user_token))
        jid = r.json()["id"]
        r2 = s.post(f"{API}/jobs/{jid}/cancel", headers=_h(user_token))
        assert r2.status_code == 200
        r3 = s.get(f"{API}/jobs/{jid}", headers=_h(user_token))
        assert r3.json()["status"] == "cancelled"

    def test_cancel_already_cancelled_400(self, s, user_token):
        r = s.post(f"{API}/jobs", json={"type": "data_export", "description": "TEST", "priority": "low"}, headers=_h(user_token))
        jid = r.json()["id"]
        s.post(f"{API}/jobs/{jid}/cancel", headers=_h(user_token))
        r2 = s.post(f"{API}/jobs/{jid}/cancel", headers=_h(user_token))
        assert r2.status_code == 400

    def test_delete_job_and_404_after(self, s, user_token):
        r = s.post(f"{API}/jobs", json={"type": "data_export", "description": "TEST", "priority": "low"}, headers=_h(user_token))
        jid = r.json()["id"]
        r2 = s.delete(f"{API}/jobs/{jid}", headers=_h(user_token))
        assert r2.status_code == 200
        r3 = s.get(f"{API}/jobs/{jid}", headers=_h(user_token))
        assert r3.status_code == 404


# ---------- Admin: settings, users, audit ---------- #
class TestAdmin:
    def test_list_users_includes_stats(self, s, admin_token, user_creds):
        r = s.get(f"{API}/admin/users", headers=_h(admin_token))
        assert r.status_code == 200
        users = r.json()
        emails = [u["email"] for u in users]
        assert user_creds["email"].lower() in emails
        for u in users:
            assert "total_jobs" in u and "completed_jobs" in u and "failed_jobs" in u

    def test_get_settings(self, s, admin_token):
        r = s.get(f"{API}/admin/settings", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert 1 <= d["max_workers"] <= 20

    def test_update_settings_persists_and_audit(self, s, admin_token):
        # Set to 3
        r = s.put(f"{API}/admin/settings", json={"max_workers": 3}, headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["max_workers"] == 3
        # Verify persisted
        r2 = s.get(f"{API}/admin/settings", headers=_h(admin_token))
        assert r2.json()["max_workers"] == 3
        # Verify health also reflects
        r3 = s.get(f"{API}/health")
        assert r3.json()["max_workers"] == 3
        # Audit log has update_workers
        r4 = s.get(f"{API}/admin/audit", headers=_h(admin_token))
        assert r4.status_code == 200
        actions = [a["action"] for a in r4.json()]
        assert "update_workers" in actions

    def test_update_settings_validation(self, s, admin_token):
        r = s.put(f"{API}/admin/settings", json={"max_workers": 999}, headers=_h(admin_token))
        assert r.status_code == 422

    def test_admin_cancel_of_other_user_job_logs_audit(self, s, admin_token, user_token):
        r = s.post(f"{API}/jobs", json={"type": "send_email", "description": "TEST admin cancel", "priority": "low"}, headers=_h(user_token))
        jid = r.json()["id"]
        r2 = s.post(f"{API}/jobs/{jid}/cancel", headers=_h(admin_token))
        assert r2.status_code == 200
        time.sleep(0.3)
        r3 = s.get(f"{API}/admin/audit", headers=_h(admin_token))
        entries = [a for a in r3.json() if a.get("target_id") == jid]
        assert any(a["action"] == "cancel_job" for a in entries)


# ---------- Stats ---------- #
class TestStats:
    def test_user_stats(self, s, user_token):
        r = s.get(f"{API}/stats", headers=_h(user_token))
        assert r.status_code == 200
        d = r.json()
        for k in ["total_jobs", "pending_jobs", "running_jobs", "completed_jobs", "failed_jobs", "cancelled_jobs", "average_processing_time", "failure_rate"]:
            assert k in d


# ---------- Priority ordering (with max_workers=1) ---------- #
class TestPriorityOrdering:
    def test_high_priority_starts_before_low(self, s, admin_token, user_token):
        # Set worker pool to 1
        rset = s.put(f"{API}/admin/settings", json={"max_workers": 1}, headers=_h(admin_token))
        assert rset.status_code == 200

        # Wait a moment for scheduler to observe & for any in-flight to finish; then drain queue.
        # Cancel any pending jobs first to isolate.
        alljobs = s.get(f"{API}/jobs", headers=_h(admin_token)).json()
        for j in alljobs:
            if j["status"] in ("pending", "running"):
                s.post(f"{API}/jobs/{j['id']}/cancel", headers=_h(admin_token))
        # Wait until no active workers so our first submitted job actually starts
        for _ in range(30):
            h = s.get(f"{API}/health").json()
            if h.get("active_workers", 0) == 0:
                break
            time.sleep(1)

        # Submit blocker job first (low) so it fills the 1 slot
        r_block = s.post(f"{API}/jobs", json={"type": "send_email", "description": "TEST BLOCKER", "priority": "low"}, headers=_h(user_token))
        blocker_id = r_block.json()["id"]
        # Wait until blocker enters running
        for _ in range(15):
            j = s.get(f"{API}/jobs/{blocker_id}", headers=_h(user_token)).json()
            if j["status"] == "running":
                break
            time.sleep(1)

        # Now submit low then high while blocker occupies the slot
        r_low = s.post(f"{API}/jobs", json={"type": "send_email", "description": "TEST LOW", "priority": "low"}, headers=_h(user_token))
        r_high = s.post(f"{API}/jobs", json={"type": "send_email", "description": "TEST HIGH", "priority": "high"}, headers=_h(user_token))
        low_id, high_id = r_low.json()["id"], r_high.json()["id"]

        # Now cancel the blocker so the scheduler picks the next; the high should be picked first
        s.post(f"{API}/jobs/{blocker_id}/cancel", headers=_h(user_token))

        # Wait until at least one of low/high starts
        high_started = None
        low_started = None
        for _ in range(40):
            jh = s.get(f"{API}/jobs/{high_id}", headers=_h(user_token)).json()
            jl = s.get(f"{API}/jobs/{low_id}", headers=_h(user_token)).json()
            high_started = jh.get("started_at")
            low_started = jl.get("started_at")
            if high_started:
                break
            time.sleep(1)

        assert high_started is not None, "High-priority job never started"
        # Low should NOT have started yet, or must have started strictly after high
        if low_started is not None:
            assert high_started <= low_started, f"Low started {low_started} before high {high_started}"

        # Cleanup: cancel remaining pending
        for jid in (low_id, high_id):
            s.post(f"{API}/jobs/{jid}/cancel", headers=_h(user_token))

        # Restore default concurrency
        s.put(f"{API}/admin/settings", json={"max_workers": 2}, headers=_h(admin_token))


# ---------- Live processing: pending -> running -> done ---------- #
class TestLiveProcessing:
    def test_job_transitions_to_running(self, s, admin_token, user_token):
        # Ensure some capacity
        s.put(f"{API}/admin/settings", json={"max_workers": 3}, headers=_h(admin_token))
        r = s.post(f"{API}/jobs", json={"type": "send_email", "description": "TEST live", "priority": "high"}, headers=_h(user_token))
        jid = r.json()["id"]
        # Poll up to ~6s for running
        got_running = False
        for _ in range(8):
            time.sleep(1)
            st = s.get(f"{API}/jobs/{jid}", headers=_h(user_token)).json()["status"]
            if st in ("running", "done", "failed"):
                got_running = True
                break
        assert got_running, "Job never entered running state within 8s"
