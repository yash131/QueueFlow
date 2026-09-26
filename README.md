# QueueFlow — Job Queue & Task Scheduler Dashboard

A production-style full-stack SaaS app: submit background jobs, watch a real Python `asyncio` worker pool crunch them in priority order, and manage everything from a polished yellow-and-white dashboard.

**Stack**
- **Frontend:** React (CRA), Tailwind CSS, Framer Motion, React Router, shadcn/ui, Lucide React, Sonner
- **Backend:** FastAPI, Pydantic, Motor (async MongoDB), PyJWT, bcrypt, `asyncio` worker
- **Database:** MongoDB

## Features

**User**
- Register / login with JWT (bcrypt-hashed passwords)
- Submit jobs (Image Resize, Send Email, Data Export, PDF Generation) with priority
- Live dashboard with stat cards + Kanban board grouped by status
- Job detail modal with full timing information
- Live polling every 2.5s — status changes animate in

**Admin**
- All-users job table with search + filters (status / user / type / priority)
- Cancel, retry, delete any job
- Users tab: everyone's job counts (total, completed, failed)
- Settings tab: change max concurrent workers (1–20) live
- Recent Activity feed of admin actions (audit log)

**Backend engine**
- Priority-aware scheduler: `high > medium > low`, oldest first inside a priority
- Real `asyncio.Task` concurrency, bounded by dynamic `max_workers`
- Random 5–15 s processing simulation, 90 % success / 10 % failure
- Concurrency changes take effect on next scheduler tick — no restart

## Architecture

```
React (CRA)                 FastAPI (uvicorn)              MongoDB
┌────────────┐   HTTP     ┌───────────────────┐   Motor  ┌─────────┐
│ Dashboard  │ ─────────▶ │  /api/*  routes   │ ────────▶│ jobs    │
│ Auth ctx   │            │  Auth (JWT+bcrypt)│          │ users   │
│ Polling    │            │  Async worker     │          │ audit   │
└────────────┘            └───────────────────┘          └─────────┘
```

## Role system
- Anyone registering via `/api/auth/register` is created with `role: "user"`.
- A single admin is seeded on startup from env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- Every private route is protected on the backend; admin-only endpoints check `role == "admin"`.
- Users can only access their own jobs; the admin can access everyone's.

## Default admin (dev)

```
Email:    laluchacha4@gmail.com
Password: Admin@12345
```

**Change these before deploying** by editing `backend/.env` (or the platform's secret store):
```
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<a strong password>
```
Seeding is idempotent: if the admin already exists and the password in `.env` has changed, the hash is updated on next startup.

## Local setup

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# copy .env.example -> .env and fill in values
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install
# create .env with:  REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```

### MongoDB
Use MongoDB Atlas or a local instance; set `MONGO_URL` and `DB_NAME` in `backend/.env`.

## API

Interactive docs: **`GET /docs`** (FastAPI Swagger UI).

```
POST   /api/auth/register        Register a new user (role=user)
POST   /api/auth/login           Login → { access_token, user }
GET    /api/auth/me              Current user (auth required)

POST   /api/jobs                 Submit a job
GET    /api/jobs/my              List my jobs
GET    /api/jobs                 List all jobs (admin)
GET    /api/jobs/{id}            Get one (owner or admin)
POST   /api/jobs/{id}/retry      Retry a failed job
POST   /api/jobs/{id}/cancel     Cancel pending/running
DELETE /api/jobs/{id}            Delete

GET    /api/admin/users          All users + job stats (admin)
GET    /api/admin/settings       Worker settings (admin)
PUT    /api/admin/settings       Change max workers 1–20 (admin)
GET    /api/admin/audit          Recent admin actions (admin)

GET    /api/stats                Stats (scoped to user, or all for admin)
GET    /api/health               Health + worker snapshot
```

Send the JWT as `Authorization: Bearer <access_token>` on every private call.

## Environment variables

**backend/.env** (see `backend/.env.example`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=queueflow_db
JWT_SECRET=<random-hex>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<strong password>
MAX_WORKERS_DEFAULT=2
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

**frontend/.env**
```
REACT_APP_BACKEND_URL=https://your-backend.onrender.com
```

## Deployment

**Frontend → Vercel**
1. Import the repo, set root directory to `frontend`.
2. Build command: `yarn build` · Output: `build`.
3. Add env var `REACT_APP_BACKEND_URL` pointing at your Render backend URL.

**Backend → Render**
1. New Web Service · root `backend`.
2. Build: `pip install -r requirements.txt`.
3. Start: `uvicorn server:app --host 0.0.0.0 --port $PORT`.
4. Add env vars from `backend/.env.example` (fill real values).
5. Update `CORS_ORIGINS` to include your Vercel domain.

**Database → MongoDB Atlas**
- Create a free cluster, whitelist Render IPs (or `0.0.0.0/0` for demo), copy connection string into `MONGO_URL`.

## Security notes
- Passwords hashed with bcrypt.
- JWTs signed with `JWT_SECRET`; keep this secret and unique per environment.
- Every private endpoint validates the caller and ownership (users can never touch other users' jobs).
- Admin endpoints use a `require_admin` dependency — the role check is on the server, not just the UI.
- CORS is env-driven; set explicit origins in production.

## License
MIT
