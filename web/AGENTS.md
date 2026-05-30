# Devil's Advocate Web — Project Context

## Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS — `/opt/devil-advocate-web/frontend/`
- **Backend**: FastAPI, Python, SQLite (MVP) — `/opt/devil-advocate-web/backend/`
- **LLM**: hermes2 via 9router (localhost:20128)
- **Auth**: NextAuth.js v5, Google OAuth
- **Domain**: https://debate.soqisoqi.my.id
- **Nginx**: routes `/` → :3006 (frontend), `/api/` → :8001 (backend), except `/api/auth/` → frontend

## Services
- Frontend: `systemctl status devil-advocate-frontend`
- Backend: `systemctl status devil-advocate-backend`
- Logs frontend: `journalctl -u devil-advocate-frontend -f`
- Logs backend: `journalctl -u devil-advocate-backend -f`

## PRD
- `/root/agent-control-room/projects/devil-advocate-web/PRD.md`

## Key Files
- Backend entry: `/opt/devil-advocate-web/backend/main.py`
- Backend DB: `/opt/devil-advocate-web/backend/database.py`
- Backend auth: `/opt/devil-advocate-web/backend/auth.py`
- Frontend auth: `/opt/devil-advocate-web/frontend/src/auth.ts`
- Frontend env: `/opt/devil-advocate-web/frontend/.env.local`
- Backend env: `/opt/devil-advocate-web/backend/.env`
- Nginx config: `/etc/nginx/sites-available/devil-advocate`

## Common Issues & Fixes
- **401 Not Authenticated**: cek apakah `/api/auth/` di nginx sudah di-route ke frontend (port 3006), bukan backend
- **502 Bad Gateway**: frontend crash, cek `journalctl -u devil-advocate-frontend -n 50`
- **Stream tidak jalan**: cek `/opt/devil-advocate-web/frontend/src/app/api/debate/stream/route.ts`
- **DB error**: SQLite di `/opt/devil-advocate-web/backend/debate.db`

## Rebuild Frontend
```bash
cd /opt/devil-advocate-web/frontend
SKIP_ENV_VALIDATION=1 node_modules/.bin/next build 2>&1
systemctl restart devil-advocate-frontend
```

## Restart Backend
```bash
systemctl restart devil-advocate-backend
journalctl -u devil-advocate-backend -n 20
```
