# Devil's Advocate Backend

FastAPI backend untuk Devil's Advocate Web App.

## Stack

- Python 3.12
- FastAPI + uvicorn
- SQLite (aiosqlite) — local dev, upgrade ke PostgreSQL via alembic migration
- SSE streaming untuk debate output

## Struktur

```
backend/
  main.py          — FastAPI app, semua routes
  config.py        — Settings via pydantic-settings + .env
  database.py      — SQLite async CRUD (aiosqlite)
  auth.py          — Auth via header X-User-Id / X-User-Email (dari NextAuth proxy)
  agents.py        — LLM debate logic (Advocate, Devil, Judge) + SSE generator
  requirements.txt — Pinned dependencies
  .env             — Local config (jangan commit)
  .env.example     — Template
```

## Setup

```bash
cd /opt/devil-advocate-web/backend

# Install deps
pip install -r requirements.txt

# Copy env
cp .env.example .env
# Edit .env — isi NINEROUTER_API_KEY dari /opt/devil-advocate-bot/.env

# Run
python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Endpoints

| Method | Path                      | Auth | Keterangan                        |
|--------|---------------------------|------|-----------------------------------|
| GET    | /health                   | No   | Health check                      |
| POST   | /debate                   | Yes  | Run debate, SSE stream            |
| GET    | /debate/{id}              | Yes  | Get debate by ID                  |
| POST   | /debate/{id}/share        | Yes  | Make debate public, return token  |
| GET    | /share/{token}            | No   | Get public debate by share token  |
| GET    | /history                  | No   | List user debate history          |
| GET    | /me/usage                 | Yes  | Cek kuota hari ini                |

## Auth

Backend pakai header-based auth — Next.js middleware inject headers dari NextAuth session:

```
X-User-Id: <google_sub>
X-User-Email: <email>
X-User-Name: <name>
X-User-Avatar: <picture_url>
```

User di-auto-provision ke DB saat pertama request.

## SSE Streaming (/debate)

Response adalah `text/event-stream`. Events:

```
data: {"type": "round", "round": 1, "advocate": "...", "devil": "..."}
data: {"type": "round", "round": 2, "advocate": "...", "devil": "..."}
data: {"type": "round", "round": 3, "advocate": "...", "devil": "..."}
data: {"type": "verdict", "verdict": "..."}
data: {"type": "done", "id": "DA-xxxx", "share_token": "...", "verdict_badge": "LANJUT|PIVOT|STOP"}
```

Error:
```
data: {"type": "error", "detail": "..."}
```

## Daily Limit

1 debate/hari per user. Ditrack di tabel `usage` (user_id, date, count).
Config: `MAX_DEBATES_FREE=1` di .env.

## Database Schema (SQLite)

```sql
users   (id, google_id, email, name, avatar, created_at)
debates (id, user_id, topic, rounds_count, rounds JSON, verdict, verdict_badge,
         share_token, is_public, created_at)
usage   (user_id, date, count)  -- PK: (user_id, date)
```

## PostgreSQL Migration (untuk production)

Alembic sudah setup di `migrations/`. Jalankan setelah alika setup PostgreSQL:

```bash
# Set DATABASE_URL di .env
export DATABASE_URL=postgresql://devil_user:pass@localhost:5432/devil_advocate

# Run migration
cd /opt/devil-advocate-web/backend
alembic upgrade head
```
