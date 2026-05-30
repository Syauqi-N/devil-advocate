# PRD: Devil's Advocate Web App

**Slug:** devil-advocate-web
**Tanggal:** 2026-05-21
**Status:** draft
**Owner:** Soqi

---

## 1. Overview

Web app versi Devil's Advocate Bot — tool AI debate yang membantu user stress-test ide bisnis atau keputusan penting. User submit topik, 3 persona AI (Advocate, Devil, Judge) berdebat 3 round, lalu Judge kasih verdict. Hasil debat bisa di-share via public link tanpa login.

**Tagline:** *"Sebelum eksekusi, debatkan dulu."*

---

## 2. Goals

- Port fitur Telegram bot ke web dengan UX yang lebih baik
- Auth via Google OAuth — barrier masuk rendah
- Freemium: 1 debat gratis per hari per akun
- Share hasil debat via public URL (tanpa login)
- UI clean, professional, dark mode — referensi: Perplexity + Linear

---

## 3. Non-Goals (Out of Scope v1.0)

- Payment / upgrade plan (freemium limit saja, belum ada paywall)
- Round count lebih dari 3 atau kurang dari 2
- Export PDF
- Notifikasi / reminder
- Mobile app
- Telegram bot integration (tetap jalan terpisah)
- Team / org plan

---

## 4. Target User

- Founder / co-founder yang mau validasi ide sebelum build
- Professional yang butuh second opinion sebelum keputusan besar
- Tim kecil yang butuh structured brainstorming

---

## 5. Tech Stack

- **Platform:** Web app (desktop-first, mobile responsive)
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Auth:** NextAuth.js v5 — Google OAuth provider
- **Backend:** FastAPI (Python 3.12) — extend agents.py yang sudah ada
- **DB:** PostgreSQL (upgrade dari SQLite)
- **LLM:** hermes2 via 9router (localhost:20128)
- **Infra:** systemd (VPS syauqi.execute.id), nginx reverse proxy

---

## 6. Architecture

```
Browser (Next.js)
  │
  ├── /                    → Dashboard (home, input topik)
  ├── /debate/[id]         → Hasil debat (auth required)
  ├── /share/[id]          → Public share page (no auth)
  ├── /history             → Riwayat debat user
  │
  ├── NextAuth.js          → Google OAuth → session cookie
  │
  └── API Routes (Next.js) → proxy ke FastAPI
        │
        └── FastAPI (port 8001)
              ├── POST /debate          → run debate (auth required)
              ├── GET  /debate/{id}     → get debate (auth required)
              ├── GET  /share/{id}      → get public debate
              ├── GET  /history         → list user debates
              └── GET  /me/usage        → cek sisa kuota hari ini

PostgreSQL
  ├── users       (id, google_id, email, name, avatar)
  ├── debates     (id, user_id, topic, rounds JSON, verdict, is_public, created_at)
  └── usage       (user_id, date, count)
```

---

## 7. Features

### MVP (Must Have)

**Auth:**
- [ ] Halaman `/login` — dedicated login page, Google OAuth button, branding Devil's Advocate
- [ ] Dashboard `/` bisa diakses tanpa login — user bisa lihat UI dan ketik topik
- [ ] Klik tombol generate/submit → redirect ke `/login` jika belum login, simpan topik + round di query param
- [ ] Setelah login berhasil → redirect balik ke `/` dan langsung trigger generate debat
- [ ] Session persisten (cookie)

**Debate:**
- [ ] Input topik di dashboard (ChatGPT-style centered input)
- [ ] Pilihan jumlah round: **2 round** atau **3 round** (toggle/segmented control di bawah input)
- [ ] Default: 3 round
- [ ] Freemium gate: 1 debat/hari per akun, tampilkan sisa kuota (hanya visible jika sudah login)
- [ ] Streaming hasil per round (Advocate → Devil → Judge, satu per satu)
- [ ] Tampilkan progress indicator saat generate (~45–60 detik)
- [ ] Simpan hasil ke DB (termasuk jumlah round yang dipilih)

**Hasil Debat:**
- [ ] Halaman `/debate/[id]` — full debate view (auth required)
- [ ] Layout: round cards (2 kolom: Advocate kiri, Devil kanan) + verdict card bawah
- [ ] Badge verdict: LANJUT (hijau) / PIVOT (kuning) / STOP (merah)
- [ ] Share button → generate public URL `/share/[id]`

**Share:**
- [ ] Halaman `/share/[id]` — public, no auth required
- [ ] Tampilan sama dengan `/debate/[id]` tapi read-only
- [ ] Meta tags (OG image) untuk preview saat di-share ke sosmed

**History (sidebar):**
- [ ] Left sidebar ChatGPT-style — persistent di semua halaman (hanya visible jika sudah login)
- [ ] List debat user sorted by date, tiap item tampilkan topik (truncated) + tanggal
- [ ] Klik item → buka `/debate/[id]`
- [ ] Sidebar collapsible (toggle button)
- [ ] "New Debate" button di atas sidebar

**Dashboard:**
- [ ] Centered input + branding (Devil's Advocate + tagline) — accessible tanpa login
- [ ] Example topics sebagai clickable chips
- [ ] Badge sisa kuota hari ini (hanya jika sudah login)
- [ ] Navbar: logo kiri, "Masuk" button kanan jika belum login / avatar kanan jika sudah login

### Nice to Have (Post-MVP)

- [ ] Upgrade plan / paywall (unlimited debat)
- [ ] OG image generator (dynamic per debat)
- [ ] Dark/light mode toggle
- [ ] Copy verdict ke clipboard
- [ ] Embed widget untuk share di blog

---

## 8. UI Spec

### Login Page (`/login`)
```
┌─────────────────────────────────────────┐
│  Devil's Advocate                       │  ← navbar (logo only)
├─────────────────────────────────────────┤
│                                         │
│         🔴 Devil's Advocate             │
│    "Sebelum eksekusi, debatkan dulu."   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🔵  Masuk dengan Google        │   │  ← Google OAuth button
│  └─────────────────────────────────┘   │
│                                         │
│  Gratis · 1 debat per hari · No spam   │  ← trust copy
└─────────────────────────────────────────┘
```

### Dashboard (Home) — layout ChatGPT-style
```
┌──────────────┬──────────────────────────────────────┐
│  [≡] Devil's │  Devil's Advocate        [Masuk]     │ ← navbar
│  Advocate    ├──────────────────────────────────────┤
│              │                                      │
│  [+ New]     │       🔴 Devil's Advocate            │
│              │  "Sebelum eksekusi, debatkan dulu."  │
│  — Recents — │                                      │
│  Marketplace │  ┌──────────────────────────────┐   │
│  freelancer  │  │  Masukkan ide atau keputusan │   │ ← input
│  ...         │  └──────────────────────────────┘   │
│              │                                      │
│  Resign dan  │     [ 2 Round ]  [ 3 Round ✓ ]      │ ← round selector
│  freelance   │                                      │
│  ...         │  💡 Marketplace freelancer desainer  │ ← chips
│              │  💡 Resign dan freelance full-time   │
│  Pivot B2C   │  💡 Pivot dari B2C ke B2B            │
│  ke B2B      │                                      │
│  ...         │  ⚡ 1 debat gratis tersisa hari ini  │
│              │    (hanya jika sudah login)          │
└──────────────┴──────────────────────────────────────┘
```
- Sidebar hanya muncul jika sudah login
- Jika belum login: sidebar hidden, navbar tampilkan tombol "Masuk"
- Klik submit/generate tanpa login → redirect ke `/login?next=/&topic=...&rounds=3`
- Setelah login → redirect balik, auto-trigger generate

### Debate Result Page
```
┌─────────────────────────────────────────┐
│  Devil's Advocate    [Share] [History]  │
├─────────────────────────────────────────┤
│  Marketplace freelancer khusus desainer │  ← topic header
│  21 Mei 2026  •  ✅ Selesai             │
│                                         │
│  ┌─── Round 1 of 3 ──────────────────┐ │
│  │ 🟢 Advocate    │ 🔴 Devil         │ │
│  │ [argumen...]   │ [counter...]     │ │
│  └────────────────────────────────────┘ │
│  ┌─── Round 2 of 3 ──────────────────┐ │
│  │ ...            │ ...              │ │
│  └────────────────────────────────────┘ │
│  ┌─── Round 3 of 3 ──────────────────┐ │
│  │ ...            │ ...              │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ┌─── ⚖️ Judge — Verdict ────────────┐ │
│  │  Risiko: • ... • ... • ...        │ │
│  │  Peluang: • ... • ... • ...       │ │
│  │                                   │ │
│  │         [ ✅ LANJUT ]             │ │
│  │                                   │ │
│  │  Action items: 1. ... 2. ...      │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Color Palette
- Background: `#0f0f0f`
- Cards: `#1a1a1a`
- Borders: `#2a2a2a`
- Advocate accent: `#22c55e`
- Devil accent: `#ef4444`
- Judge accent: `#f59e0b`
- Body text: `#e5e5e5`
- Font: Inter

---

## 9. Specialist Assignment

- **patia (backend):** FastAPI endpoints, PostgreSQL schema, LLM integration, daily limit logic
- **alya (frontend):** Next.js app, UI components, auth flow, streaming UI
- **alika (devops):** PostgreSQL setup, nginx config, systemd services, domain routing

---

## 10. Kanban Task Breakdown

### patia (backend)
1. Setup FastAPI project structure + PostgreSQL schema (users, debates, usage)
2. Implement POST /debate endpoint — run debate, save to DB, return result
3. Implement GET /debate/{id}, GET /share/{id}, GET /history, GET /me/usage
4. Daily limit middleware (1/hari per user)
5. Auth middleware — validate NextAuth session token

### alya (frontend)
1. Setup Next.js 14 project + Tailwind + shadcn/ui + NextAuth.js (Google OAuth)
2. Dashboard page — centered input, example chips, kuota badge
3. Debate streaming UI — progress indicator, round cards muncul satu per satu
4. Debate result page `/debate/[id]` — 2-col round cards + verdict card
5. Public share page `/share/[id]` — same layout, no auth
6. History page `/history`
7. OG meta tags untuk share page

### alika (devops)
1. Setup PostgreSQL di VPS (install, create DB, user, password)
2. Nginx config — route domain/subdomain ke Next.js (port 3000) + FastAPI (port 8001)
3. Systemd service untuk FastAPI backend
4. Systemd service untuk Next.js (atau pakai PM2)
5. SSL cert (Let's Encrypt via certbot)

---

## 11. Success Metrics

- 50 debat dalam 2 minggu pertama
- Share rate: >20% debat di-share
- Return rate: user kembali debat minimal 2x dalam seminggu

---

## 12. Risks & Assumptions

- **Risk:** 9router down → debat gagal. Mitigation: error handling yang jelas + retry 1x
- **Risk:** 60 detik generate = user kabur. Mitigation: streaming per round, progress visible
- **Assumption:** Google OAuth cukup — tidak perlu email/password
- **Assumption:** 1 debat/hari cukup untuk MVP, belum perlu paywall
- **Assumption:** VPS punya resource cukup untuk PostgreSQL + Next.js + FastAPI

---

## 13. Timeline

- [ ] Phase 1 — Backend (patia): 2-3 hari
- [ ] Phase 2 — Frontend (alya): 3-4 hari
- [ ] Phase 3 — DevOps (alika): 1 hari
- [ ] Phase 4 — Integration test + launch: 1 hari

**Target MVP:** ~1 minggu dari start
