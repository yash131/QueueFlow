# QueueFlow — PRD

## Original problem statement
Build a production-quality full-stack Job Queue & Task Scheduler Dashboard (QueueFlow) with role-based access (Admin and User). Users submit background jobs; a real Python asyncio worker pool processes them in priority order. Admin can dynamically change concurrency, cancel/retry/delete jobs, view users, and see an audit trail. Yellow (#FACC15) + white + dark neutral theme, smooth Framer Motion animations, responsive across breakpoints. JWT + bcrypt auth. Deployable frontend on Vercel, backend on Render, DB on MongoDB Atlas.

## User personas
- **User** — signs up, submits jobs, watches them process live, cancels/retries/deletes their own.
- **Admin** — seeded from env (`ADMIN_EMAIL` / `ADMIN_PASSWORD`); manages all jobs, users, and the worker pool.

## Core requirements
- JWT auth with bcrypt hashing (no admin escalation via /register)
- Real async worker pool (5–15 s simulated processing, 90/10 success/fail)
- Priority-aware scheduling: high > medium > low, oldest-first inside a priority
- Dynamic max_workers 1–20 without restart
- State-transition validation (only failed→pending on retry, pending|running→cancelled on cancel)
- Job scoping: users only see/act on their own jobs; every private endpoint enforces this server-side
- Admin audit log for cross-user actions and worker changes
- Live UI polling every ~2.5 s
- Responsive UI (desktop / tablet / mobile)

## Architecture
```
React CRA (port 3000)  ─HTTP─▶  FastAPI + asyncio worker (port 8001)  ─Motor─▶  MongoDB
```

## What's been implemented (2026-09-26)
- Backend: server.py + auth.py + db.py + models.py + worker.py + routes_auth/jobs/admin/stats.py + seed_admin.py; JWT+bcrypt; admin seeding from env; dynamic worker pool with server-side priority sort; index on (status, priority_rank, created_at); audit log; env-driven CORS.
- Frontend: routing + AuthProvider + protected routes + role guards; Login + Register split-screen; User Dashboard (stats + form + kanban); Admin Dashboard (8 stats + jobs table + Recent Activity); Users; Settings (slider 1–20); Unauthorized page. Framer Motion transitions, sonner toasts, shadcn/ui, Lucide icons.
- Env: /app/backend/.env.example + /app/frontend/.env.example. README with deployment guide.
- Tests: 26 backend pytest + 10 Playwright frontend flows — 100 % pass on first run.

## Backlog (P1)
- Server-side aggregation for /api/stats at scale
- Job creation rate-limiting per user
- Email notifications on job completion (Resend)
- WebSocket push instead of polling
- Bulk actions in admin table
- Export audit log as CSV

## Backlog (P2)
- Multi-tenant workspaces
- Real job payloads (actually resize an image, generate a PDF)
- Cron-scheduled recurring jobs
