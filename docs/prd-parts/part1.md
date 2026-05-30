# PRD: Devil's Advocate Web App — v2.0 (Final)
# Part 1: Overview, Goals, Tech Stack, ERD

**Slug:** devil-advocate-web-v2
**Tanggal:** 2026-05-22
**Status:** draft
**Owner:** Soqi
**Prev version:** PRD.md (v1 — MVP done, live)

---

## 1. Overview

Devil's Advocate adalah web app yang membantu user membuat keputusan lebih baik dengan cara mendebatkan ide mereka dari dua sisi — Advocate (pro) dan Devil (kontra). V1 sudah live di https://debate.soqisoqi.my.id dengan fitur dasar debat + Google OAuth.

V2 fokus pada tiga hal: **monetisasi** (Xendit subscription Pro Rp 49.000/bulan), **personalisasi** (custom persona), dan **growth** (template debat siap pakai). V2 juga melakukan upgrade infrastruktur: SQLite → PostgreSQL, header-based auth → JWT token-based auth.

---

## 2. Goals

- Monetisasi via subscription Pro menggunakan Xendit Invoice API
- User bisa customize persona Advocate & Devil sesuai konteks
- Template debat siap pakai untuk onboarding lebih cepat
- Auth yang proper dan aman (JWT httpOnly cookie)
- Database yang reliable untuk production (PostgreSQL)
- Meningkatkan retention dan share rate

---

## 3. Non-Goals (Out of Scope v2.0)

- Mobile app native
- Team / org plan
- Export PDF
- Multi-bahasa (tetap Indonesia)
- API public untuk developer
- Embed widget
- Auto-debit recurring (Xendit Invoice = user bayar manual tiap bulan)
- Email marketing / newsletter
- Referral program

---

## 4. Target User

- Founder, product manager, freelancer Indonesia yang butuh tools berpikir kritis
- User yang sudah pakai v1 dan mau upgrade ke Pro
- Power user yang sering debat topik bisnis/karir/investasi

---

## 5. Tech Stack

| Layer | Tech | Versi |
|-------|------|-------|
| Frontend | Next.js App Router | 14.x |
| Auth | NextAuth v5 (Google OAuth) | 5.x |
| Backend | FastAPI | 0.111.x |
| Database | PostgreSQL | 16.x |
| ORM/Migration | SQLAlchemy + Alembic | 2.x / 1.13.x |
| Payment | Xendit Invoice API | v2 |
| LLM | 9router (hermes2/claude) | - |
| Infra | systemd + nginx + Cloudflare Tunnel | - |
| Runtime | Python 3.11, Node.js 20 | - |

---

## 6. Architecture

```
User Browser
    │
    ▼
Cloudflare Tunnel
    │
    ▼
nginx :80
    ├── /api/auth/*     → Next.js :3006 (NextAuth)
    ├── /api/*          → FastAPI :8001
    └── /*              → Next.js :3006
    
Auth Flow:
Google OAuth → NextAuth → generate JWT → set httpOnly cookie
    │
    ▼
FastAPI middleware → verify JWT dari cookie → inject user ke request

Payment Flow:
User klik Upgrade → POST /api/subscription/create-invoice
    → Xendit buat invoice → redirect user ke Xendit hosted page
    → User bayar → Xendit POST /api/subscription/webhook
    → FastAPI update subscription → user jadi Pro
```

---

## 7. ERD (Entity Relationship Diagram)

### Diagram Relasi

```
users
  │
  ├──< sessions (1:N)
  │
  ├──< subscriptions (1:N)
  │
  ├──< personas (1:N)
  │     │
  │     └──< debates.persona_id (FK nullable)
  │
  └──< debates (1:N)
        │
        └──< debate_rounds (1:N)

debate_templates
  │
  ├── persona_id → personas (FK nullable)
  └──< debates.template_id (FK nullable)
```

---

### Tabel: users

| Kolom | Tipe | Constraint |
|-------|------|------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| google_id | VARCHAR(255) | UNIQUE, NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| avatar_url | TEXT | NULLABLE |
| is_pro | BOOLEAN | NOT NULL, DEFAULT false |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Index: `idx_users_google_id`, `idx_users_email`

---

### Tabel: sessions

| Kolom | Tipe | Constraint |
|-------|------|------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → users.id ON DELETE CASCADE, NOT NULL |
| token | VARCHAR(512) | UNIQUE, NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| ip_address | VARCHAR(45) | NULLABLE |
| user_agent | TEXT | NULLABLE |
| revoked | BOOLEAN | NOT NULL, DEFAULT false |

Index: `idx_sessions_token`, `idx_sessions_user_id`

---

### Tabel: subscriptions

| Kolom | Tipe | Constraint |
|-------|------|------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → users.id ON DELETE CASCADE, NOT NULL |
| plan | VARCHAR(10) | NOT NULL, DEFAULT 'free' — ENUM: free, pro |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' — ENUM: active, expired, cancelled, pending |
| xendit_invoice_id | VARCHAR(255) | NULLABLE |
| xendit_payment_id | VARCHAR(255) | NULLABLE |
| started_at | TIMESTAMPTZ | NULLABLE |
| expires_at | TIMESTAMPTZ | NULLABLE |
| cancelled_at | TIMESTAMPTZ | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Index: `idx_subscriptions_user_id`, `idx_subscriptions_xendit_invoice_id`

Note: satu user bisa punya banyak subscription records (history). Status Pro aktif = subscription terbaru dengan plan='pro' AND status='active' AND expires_at > now().

---

### Tabel: personas

| Kolom | Tipe | Constraint |
|-------|------|------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → users.id ON DELETE CASCADE, NULLABLE (NULL = system template) |
| name | VARCHAR(100) | NOT NULL |
| advocate_name | VARCHAR(100) | NOT NULL |
| advocate_description | TEXT | NOT NULL |
| devil_name | VARCHAR(100) | NOT NULL |
| devil_description | TEXT | NOT NULL |
| is_template | BOOLEAN | NOT NULL, DEFAULT false |
| is_pro_only | BOOLEAN | NOT NULL, DEFAULT false |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Index: `idx_personas_user_id`
Constraint: user custom persona max 10 per user (enforced di aplikasi)

---

### Tabel: debate_templates

| Kolom | Tipe | Constraint |
|-------|------|------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| name | VARCHAR(100) | NOT NULL |
| description | TEXT | NULLABLE |
| topic_preset | TEXT | NOT NULL |
| persona_id | UUID | FK → personas.id ON DELETE SET NULL, NULLABLE |
| is_pro | BOOLEAN | NOT NULL, DEFAULT false |
| emoji | VARCHAR(10) | NULLABLE |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

---

### Tabel: debates

| Kolom | Tipe | Constraint |
|-------|------|------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → users.id ON DELETE CASCADE, NOT NULL |
| topic | TEXT | NOT NULL |
| rounds_count | INTEGER | NOT NULL, DEFAULT 2 |
| verdict | TEXT | NULLABLE |
| share_token | VARCHAR(64) | UNIQUE, NOT NULL |
| persona_id | UUID | FK → personas.id ON DELETE SET NULL, NULLABLE |
| template_id | UUID | FK → debate_templates.id ON DELETE SET NULL, NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Index: `idx_debates_user_id`, `idx_debates_share_token`

---

### Tabel: debate_rounds

| Kolom | Tipe | Constraint |
|-------|------|------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| debate_id | UUID | FK → debates.id ON DELETE CASCADE, NOT NULL |
| round_number | INTEGER | NOT NULL |
| advocate_argument | TEXT | NOT NULL |
| devil_argument | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

Index: `idx_debate_rounds_debate_id`
Constraint: UNIQUE(debate_id, round_number)
