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
# PRD: Devil's Advocate Web App — v2.0 (Final)
# Part 2: Auth Contract & API Contract

---

## 8. Auth Contract (JWT-based)

### Overview

V1 pakai `X-User-Id` + `X-User-Email` header dari client — tidak aman karena bisa di-spoof. V2 switch ke JWT httpOnly cookie.

### Flow Login

```
1. User klik "Login dengan Google"
2. NextAuth redirect ke Google OAuth
3. Google callback → NextAuth handler di /api/auth/callback/google
4. NextAuth jwt() callback:
   - Ambil google_id, email, name, avatar dari profile
   - Upsert user di PostgreSQL via FastAPI POST /auth/sync-user
   - Generate session token (UUID) → simpan ke tabel sessions
   - Embed session_token + user_id di JWT payload
5. NextAuth set cookie:
   - Name: next-auth.session-token
   - httpOnly: true
   - secure: true (production)
   - sameSite: lax
   - maxAge: 30 hari
6. FastAPI middleware baca cookie next-auth.session-token
   - Verify JWT signature (shared NEXTAUTH_SECRET)
   - Extract session_token dari payload
   - Query tabel sessions → cek tidak revoked + belum expired
   - Inject user object ke request.state.user
```

### JWT Payload Structure

```json
{
  "sub": "user-uuid",
  "session_token": "session-uuid",
  "email": "user@gmail.com",
  "name": "User Name",
  "iat": 1716000000,
  "exp": 1718592000
}
```

### Token Strategy

- **Access:** JWT di httpOnly cookie, expire 30 hari (NextAuth default)
- **Refresh:** NextAuth handle otomatis via session rotation
- **Revoke:** DELETE dari tabel sessions (logout / force logout)
- **FastAPI verify:** decode JWT dengan NEXTAUTH_SECRET, cek sessions table

### Shared Secret

```
NEXTAUTH_SECRET=<same-value-di-frontend-dan-backend>
```

FastAPI decode JWT pakai library `python-jose` dengan algoritma HS256.

---

## 9. API Contract Lengkap

### Konvensi

- Base URL: `https://debate.soqisoqi.my.id/api`
- Auth: JWT via cookie `next-auth.session-token` (otomatis dikirim browser)
- Content-Type: `application/json`
- Error response selalu: `{ "detail": "pesan error", "code": "ERROR_CODE" }`

---

### AUTH ENDPOINTS

---

#### GET /auth/me

Ambil profil user yang sedang login + status subscription.

```
Auth: jwt_required
Request Headers: Cookie: next-auth.session-token=<token>
Request Body: -

Response 200:
{
  "id": "uuid",
  "email": "user@gmail.com",
  "name": "User Name",
  "avatar_url": "https://...",
  "is_pro": true,
  "subscription": {
    "plan": "pro",
    "status": "active",
    "expires_at": "2026-06-22T00:00:00Z"
  },
  "debates_today": 1,
  "debates_limit": null  // null = unlimited (Pro), integer = limit (Free)
}

Response 401:
{ "detail": "Not authenticated", "code": "NOT_AUTHENTICATED" }
```

---

#### POST /auth/logout

Revoke session token (hapus dari tabel sessions).

```
Auth: jwt_required
Request Body: -

Response 200:
{ "message": "Logged out successfully" }

Response 401:
{ "detail": "Not authenticated", "code": "NOT_AUTHENTICATED" }
```

Note: Frontend juga harus call NextAuth signOut() untuk clear cookie.

---

#### POST /auth/sync-user

Internal endpoint — dipanggil NextAuth saat login untuk upsert user ke PostgreSQL.

```
Auth: internal (INTERNAL_API_KEY header)
Request Headers: X-Internal-Key: <INTERNAL_API_KEY>
Request Body:
{
  "google_id": "string",
  "email": "string",
  "name": "string",
  "avatar_url": "string | null"
}

Response 200:
{
  "id": "uuid",
  "is_new": true | false
}

Response 401:
{ "detail": "Unauthorized", "code": "UNAUTHORIZED" }
```

---

### DEBATE ENDPOINTS

---

#### POST /debate

Buat debat baru + stream hasilnya via SSE.

```
Auth: jwt_required
Request Body:
{
  "topic": "string (required, max 500 char)",
  "rounds_count": 2 | 3,
  "persona_id": "uuid | null",
  "template_id": "uuid | null"
}

Response: text/event-stream (SSE)

Event types:
  data: {"type": "round", "round": 1, "advocate": "...", "devil": "..."}
  data: {"type": "verdict", "content": "..."}
  data: {"type": "done", "id": "debate-uuid", "share_token": "abc123"}
  data: {"type": "error", "message": "..."}

Response 401:
{ "detail": "Not authenticated", "code": "NOT_AUTHENTICATED" }

Response 429:
{ "detail": "Daily limit reached. Upgrade to Pro for unlimited debates.", "code": "DAILY_LIMIT_REACHED" }

Response 403:
{ "detail": "Persona not found or not accessible", "code": "PERSONA_NOT_ACCESSIBLE" }
```

Logic limit:
- Free user: max 1 debat per hari (cek COUNT debates WHERE user_id = ? AND created_at >= today)
- Pro user: unlimited
- Cek is_pro dari users.is_pro (di-sync saat webhook Xendit diterima)

---

#### GET /debates

List debat milik user (paginated).

```
Auth: jwt_required
Query params:
  page: integer (default 1)
  limit: integer (default 10, max 50)

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "topic": "string",
      "rounds_count": 2,
      "share_token": "string",
      "persona": { "id": "uuid", "name": "string" } | null,
      "template": { "id": "uuid", "name": "string" } | null,
      "created_at": "2026-05-22T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "has_next": true
}

Response 401:
{ "detail": "Not authenticated", "code": "NOT_AUTHENTICATED" }
```

---

#### GET /debates/{id}

Detail debat lengkap termasuk semua rounds.

```
Auth: jwt_required (owner only)
Path params: id = debate UUID

Response 200:
{
  "id": "uuid",
  "topic": "string",
  "rounds_count": 2,
  "verdict": "string",
  "share_token": "string",
  "persona": {
    "id": "uuid",
    "name": "string",
    "advocate_name": "string",
    "devil_name": "string"
  } | null,
  "template": { "id": "uuid", "name": "string" } | null,
  "rounds": [
    {
      "round_number": 1,
      "advocate_argument": "string",
      "devil_argument": "string"
    }
  ],
  "created_at": "2026-05-22T10:00:00Z"
}

Response 401:
{ "detail": "Not authenticated", "code": "NOT_AUTHENTICATED" }

Response 403:
{ "detail": "Access denied", "code": "ACCESS_DENIED" }

Response 404:
{ "detail": "Debate not found", "code": "NOT_FOUND" }
```

---

#### GET /debates/share/{share_token}

Public share — tidak butuh auth.

```
Auth: public
Path params: share_token = string

Response 200: (sama dengan GET /debates/{id} tapi tanpa user info)
{
  "id": "uuid",
  "topic": "string",
  "rounds_count": 2,
  "verdict": "string",
  "rounds": [...],
  "persona": { "name": "string", "advocate_name": "string", "devil_name": "string" } | null,
  "created_at": "2026-05-22T10:00:00Z"
}

Response 404:
{ "detail": "Debate not found", "code": "NOT_FOUND" }
```

---

### SUBSCRIPTION ENDPOINTS

---

#### GET /me/subscription

Cek status subscription user.

```
Auth: jwt_required

Response 200:
{
  "plan": "free" | "pro",
  "status": "active" | "expired" | "cancelled" | "pending",
  "expires_at": "2026-06-22T00:00:00Z" | null,
  "debates_today": 1,
  "debates_limit": 1 | null,
  "pending_invoice_url": "https://checkout.xendit.co/..." | null
}

Response 401:
{ "detail": "Not authenticated", "code": "NOT_AUTHENTICATED" }
```

---

#### POST /subscription/create-invoice

Buat Xendit invoice untuk upgrade ke Pro.

```
Auth: jwt_required
Request Body: {} (kosong, semua data dari JWT)

Response 200:
{
  "invoice_id": "xendit-invoice-id",
  "invoice_url": "https://checkout.xendit.co/web/...",
  "expires_at": "2026-05-23T10:00:00Z"
}

Response 400:
{ "detail": "Already Pro subscriber", "code": "ALREADY_PRO" }

Response 400:
{ "detail": "Pending invoice exists", "code": "PENDING_INVOICE_EXISTS", "invoice_url": "https://..." }

Response 401:
{ "detail": "Not authenticated", "code": "NOT_AUTHENTICATED" }
```

---

#### POST /subscription/webhook

Xendit webhook — update status subscription setelah pembayaran.

```
Auth: public (verify X-CALLBACK-TOKEN header)
Request Headers:
  X-CALLBACK-TOKEN: <XENDIT_WEBHOOK_TOKEN>
Request Body (dari Xendit):
{
  "id": "xendit-invoice-id",
  "external_id": "da-sub-{user_id}-{timestamp}",
  "status": "PAID" | "EXPIRED",
  "paid_amount": 49000,
  "paid_at": "2026-05-22T10:00:00Z"
}

Response 200:
{ "message": "OK" }

Response 401:
{ "detail": "Invalid webhook token", "code": "INVALID_WEBHOOK_TOKEN" }
```

Logic saat PAID:
1. Cari subscription by xendit_invoice_id
2. Update status → 'active', started_at = now(), expires_at = now() + 30 hari
3. Update users.is_pro = true
4. Log payment

Logic saat EXPIRED:
1. Update subscription status → 'expired'
2. Jika tidak ada subscription aktif lain → users.is_pro = false

---

#### DELETE /subscription/cancel

Cancel subscription Pro.

```
Auth: jwt_required

Response 200:
{
  "message": "Subscription cancelled. Pro access remains until expires_at.",
  "expires_at": "2026-06-22T00:00:00Z"
}

Response 400:
{ "detail": "No active Pro subscription", "code": "NO_ACTIVE_SUBSCRIPTION" }

Response 401:
{ "detail": "Not authenticated", "code": "NOT_AUTHENTICATED" }
```

Note: Cancel tidak langsung cabut akses Pro — akses tetap sampai expires_at.

---

### PERSONA ENDPOINTS

---

#### GET /personas

List semua persona yang bisa dipakai user: system templates + custom milik user.

```
Auth: jwt_required

Response 200:
{
  "templates": [
    {
      "id": "uuid",
      "name": "Default",
      "advocate_name": "Advocate",
      "devil_name": "Devil",
      "is_pro_only": false
    },
    {
      "id": "uuid",
      "name": "Startup",
      "advocate_name": "Early Adopter",
      "devil_name": "Skeptical Investor",
      "is_pro_only": false
    }
  ],
  "custom": [
    {
      "id": "uuid",
      "name": "Bos Galak vs Anak Startup",
      "advocate_name": "Anak Startup",
      "advocate_description": "...",
      "devil_name": "Bos Galak",
      "devil_description": "...",
      "created_at": "2026-05-22T10:00:00Z"
    }
  ],
  "custom_count": 1,
  "custom_limit": 10
}

Response 401:
{ "detail": "Not authenticated", "code": "NOT_AUTHENTICATED" }
```

Note: `custom` array kosong jika user Free (bukan error, hanya empty).

---

#### POST /personas

Buat custom persona baru (Pro only).

```
Auth: pro_required
Request Body:
{
  "name": "string (required, max 100 char)",
  "advocate_name": "string (required, max 100 char)",
  "advocate_description": "string (required, max 500 char)",
  "devil_name": "string (required, max 100 char)",
  "devil_description": "string (required, max 500 char)"
}

Response 201:
{
  "id": "uuid",
  "name": "string",
  "advocate_name": "string",
  "advocate_description": "string",
  "devil_name": "string",
  "devil_description": "string",
  "created_at": "2026-05-22T10:00:00Z"
}

Response 400:
{ "detail": "Persona limit reached (max 10)", "code": "PERSONA_LIMIT_REACHED" }

Response 403:
{ "detail": "Pro subscription required", "code": "PRO_REQUIRED" }

Response 401:
{ "detail": "Not authenticated", "code": "NOT_AUTHENTICATED" }
```

---

#### PUT /personas/{id}

Update custom persona milik user (Pro only).

```
Auth: pro_required
Path params: id = persona UUID
Request Body: (semua field optional)
{
  "name": "string",
  "advocate_name": "string",
  "advocate_description": "string",
  "devil_name": "string",
  "devil_description": "string"
}

Response 200: (persona object yang diupdate)

Response 403:
{ "detail": "Pro subscription required", "code": "PRO_REQUIRED" }
{ "detail": "Access denied", "code": "ACCESS_DENIED" }

Response 404:
{ "detail": "Persona not found", "code": "NOT_FOUND" }
```

---

#### DELETE /personas/{id}

Hapus custom persona milik user.

```
Auth: pro_required
Path params: id = persona UUID

Response 200:
{ "message": "Persona deleted" }

Response 403:
{ "detail": "Access denied", "code": "ACCESS_DENIED" }

Response 404:
{ "detail": "Persona not found", "code": "NOT_FOUND" }
```

Note: Debat yang sudah pakai persona ini tidak terpengaruh (persona_id di debates → SET NULL).

---

### TEMPLATE ENDPOINTS

---

#### GET /templates

List semua template debat.

```
Auth: jwt_required

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "name": "Startup Idea",
      "description": "Debatkan ide startup kamu",
      "topic_preset": "Marketplace freelancer khusus desainer lokal",
      "persona": {
        "id": "uuid",
        "name": "Startup",
        "advocate_name": "Early Adopter",
        "devil_name": "Skeptical Investor"
      } | null,
      "is_pro": false,
      "emoji": "🚀",
      "sort_order": 1
    }
  ]
}

Response 401:
{ "detail": "Not authenticated", "code": "NOT_AUTHENTICATED" }
```

Note: Semua template dikembalikan (free + pro). Frontend yang handle locked state untuk Pro templates.
# PRD: Devil's Advocate Web App — v2.0 (Final)
# Part 3: Frontend Contract, Xendit Integration, Migration, Env Vars, Kanban, Metrics

---

## 10. Frontend Component Contract

### Konvensi

- Auth guard via `useSession()` dari NextAuth
- Pro guard via `useSubscription()` hook custom
- API calls via `fetch` ke `/api/*` (nginx route ke FastAPI)
- Cookie dikirim otomatis oleh browser (httpOnly, sameSite: lax)

---

### Hook: `useSubscription`

**File:** `hooks/useSubscription.ts`

```typescript
interface SubscriptionState {
  isPro: boolean
  plan: 'free' | 'pro'
  status: 'active' | 'expired' | 'cancelled' | 'pending'
  expiresAt: string | null
  debatesToday: number
  debatesLimit: number | null  // null = unlimited
  pendingInvoiceUrl: string | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

// Usage
const { isPro, debatesLimit, debatesToday } = useSubscription()
```

- Fetch dari `GET /api/me/subscription`
- Cache di SWR atau React Query, revalidate setiap 60 detik
- Expose `refetch()` untuk trigger setelah payment redirect kembali

---

### Page: `/pricing`

**File:** `app/pricing/page.tsx`

```typescript
// Props: none (server component, tapi butuh session)
// Auth guard: redirect ke /login jika tidak auth

// State:
// - isLoading: boolean (saat klik Upgrade)
// - error: string | null

// API calls:
// - POST /api/subscription/create-invoice → dapat invoice_url → redirect

// UI sections:
// 1. Header: "Upgrade ke Pro"
// 2. Comparison cards: Free vs Pro
// 3. CTA button: "Upgrade Sekarang" (disabled jika sudah Pro)
// 4. Info: "Pembayaran aman via Xendit"
// 5. Info: "Batalkan kapan saja"

// Error states:
// - "Gagal membuat invoice. Coba lagi." (network error)
// - "Kamu sudah berlangganan Pro." (ALREADY_PRO)
// - "Ada invoice yang belum dibayar." + link ke invoice (PENDING_INVOICE_EXISTS)
```

**Free tier features:**
- 1 debat/hari
- Persona template dasar
- Template debat gratis

**Pro tier features (Rp 49.000/bulan):**
- Unlimited debat
- Custom persona (buat + simpan, max 10)
- Semua template termasuk Pro
- Badge Pro

---

### Component: `PersonaSelector`

**File:** `components/PersonaSelector.tsx`

```typescript
interface PersonaSelectorProps {
  value: string | null          // persona id yang dipilih
  onChange: (id: string | null) => void
  isPro: boolean
  onUpgradeClick: () => void    // trigger UpgradePromptModal
}

// State:
// - isOpen: boolean (dropdown open/close)
// - personas: { templates: Persona[], custom: Persona[] } | null
// - isLoading: boolean

// API calls:
// - GET /api/personas (fetch saat mount)

// Sections di dropdown:
// 1. Template personas (semua user)
// 2. Divider
// 3. "Custom (Pro)" → jika isPro: buka CustomPersonaModal, jika tidak: onUpgradeClick()
// 4. "My Personas" (Pro only) → list custom personas user

// Error states:
// - Gagal fetch personas → tampilkan "Default" saja, log error
```

---

### Component: `TemplateChips`

**File:** `components/TemplateChips.tsx`

```typescript
interface TemplateChipsProps {
  onSelect: (template: { topic: string; personaId: string | null }) => void
  isPro: boolean
  onUpgradeClick: () => void
}

// State:
// - templates: Template[] | null
// - isLoading: boolean

// API calls:
// - GET /api/templates (fetch saat mount)

// Render:
// - Free templates: chip clickable → onSelect({ topic, personaId })
// - Pro templates: chip dengan lock icon → jika isPro: onSelect, jika tidak: onUpgradeClick()

// Error states:
// - Gagal fetch → tidak tampilkan chips (silent fail, log error)
```

---

### Component: `UpgradePromptModal`

**File:** `components/UpgradePromptModal.tsx`

```typescript
interface UpgradePromptModalProps {
  isOpen: boolean
  onClose: () => void
  trigger: 'daily_limit' | 'custom_persona' | 'pro_template'
}

// State:
// - isLoading: boolean (saat klik Upgrade)

// API calls:
// - POST /api/subscription/create-invoice → redirect ke invoice_url

// Konten berdasarkan trigger:
// - daily_limit: "Kamu sudah pakai 1 debat gratis hari ini. Upgrade ke Pro untuk unlimited."
// - custom_persona: "Custom persona adalah fitur Pro. Upgrade untuk buat persona sendiri."
// - pro_template: "Template ini khusus Pro. Upgrade untuk akses semua template."

// Error states:
// - Network error → "Gagal memproses. Coba lagi."
// - PENDING_INVOICE_EXISTS → tampilkan link ke invoice yang pending
```

---

### Component: `CustomPersonaModal`

**File:** `components/CustomPersonaModal.tsx`

```typescript
interface CustomPersonaModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (persona: Persona) => void
  editingPersona?: Persona | null  // null = create mode, ada = edit mode
}

// State:
// - form: { name, advocate_name, advocate_description, devil_name, devil_description }
// - isLoading: boolean
// - errors: Record<string, string>

// API calls:
// - POST /api/personas (create mode)
// - PUT /api/personas/{id} (edit mode)

// Validasi client-side:
// - name: required, max 100 char
// - advocate_name: required, max 100 char
// - advocate_description: required, max 500 char
// - devil_name: required, max 100 char
// - devil_description: required, max 500 char

// Error states:
// - PERSONA_LIMIT_REACHED → "Kamu sudah punya 10 persona. Hapus salah satu dulu."
// - Network error → "Gagal menyimpan. Coba lagi."
```

---

### Component: `ProBadge`

**File:** `components/ProBadge.tsx`

```typescript
interface ProBadgeProps {
  size?: 'sm' | 'md'
}

// Render: badge kecil "PRO" dengan warna gold/amber
// Ditampilkan di: navbar avatar, profil user
// Kondisi: hanya render jika isPro === true (dari useSubscription)
```

---

## 11. Pakasir Integration Detail

### Product yang Dipakai

**Pakasir QRIS API** — user scan QR code untuk bayar. Pakasir bukan payment gateway langsung, mereka pakai PG pihak ketiga berizin BI. Bisa aktif hari pertama tanpa proses 14 hari.

**Fee:** 0,7% + Rp 310 (nominal ≤ Rp 105k) / 1% flat (nominal > Rp 105k)

### Flow Lengkap

```
1. User klik "Upgrade Sekarang" di /pricing atau UpgradePromptModal
2. Frontend POST /api/subscription/create-invoice
3. FastAPI:
   a. Cek tidak ada invoice pending (status='pending' di subscriptions)
   b. Buat Pakasir transaction via API:
      POST https://app.pakasir.com/api/transactioncreate/qris
      Body: {
        project: PAKASIR_PROJECT_SLUG,
        order_id: "da-sub-{user_id}-{timestamp}",
        amount: 49000,
        api_key: PAKASIR_API_KEY
      }
   c. Simpan ke tabel subscriptions:
      - status: 'pending'
      - qr_string: dari response Pakasir
      - expired_at: dari response Pakasir
   d. Return { qr_string, total_payment, expired_at } ke frontend
4. Frontend tampilkan QR code dari qr_string (pakai qrcode.react)
5. User scan QR → bayar via e-wallet/m-banking
6. Pakasir POST ke /api/subscription/webhook
7. FastAPI webhook handler:
   a. Verify api_key dari payload == PAKASIR_API_KEY
   b. Cek status == "paid"
   c. Find subscription by order_id
   d. Update subscription: status='active', started_at=now(), expires_at=now()+30hari
   e. Update users.is_pro = true
   f. Return 200 OK
8. Frontend polling GET /me/subscription tiap 5 detik → detect status berubah ke active
9. Tampilkan success state → refetch useSubscription
```

### Webhook Security

```python
async def subscription_webhook(payload: dict):
    if payload.get("api_key") != settings.PAKASIR_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid webhook token")
    # ... process
```

### Edge Cases

| Case | Handling |
|------|----------|
| QR expired (belum bayar) | Frontend tampilkan timer countdown, tombol "Generate QR Baru" |
| Double payment | Cek order_id sudah ada di subscriptions → skip, return 200 |
| Webhook retry | Idempotent: cek status sudah 'active' → skip update, return 200 |
| User klik Upgrade saat ada pending QR | Return PENDING_INVOICE_EXISTS + qr_string yang ada |
| User Pro expired, klik Upgrade lagi | Buat QR baru, flow normal |

---

## 12. Migration Plan (SQLite → PostgreSQL)

### Pre-requisites

- PostgreSQL 16 sudah terinstall di server
- Alembic sudah dikonfigurasi di backend
- Backup SQLite sudah dibuat

### Step-by-step

**Step 1: Install PostgreSQL (alika)**
```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

**Step 2: Buat database + user (alika)**
```bash
sudo -u postgres psql <<EOF
CREATE USER devil_advocate WITH PASSWORD 'strong_password_here';
CREATE DATABASE devil_advocate_db OWNER devil_advocate;
GRANT ALL PRIVILEGES ON DATABASE devil_advocate_db TO devil_advocate;
EOF
```

**Step 3: Setup Alembic (patia)**
```bash
cd /opt/devil-advocate-web/backend
pip install alembic psycopg2-binary
alembic init alembic
# Edit alembic.ini: sqlalchemy.url = postgresql://...
# Edit alembic/env.py: import models, target_metadata = Base.metadata
alembic revision --autogenerate -m "v2_initial_schema"
```

**Step 4: Review + jalankan migration (patia)**
```bash
# Review generated migration file dulu
alembic upgrade head
```

**Step 5: Export data SQLite existing (patia)**
```bash
cd /opt/devil-advocate-web/backend
python scripts/migrate_sqlite_to_pg.py
# Script ini:
# 1. Baca semua users dari debates.db
# 2. Baca semua debates dari debates.db
# 3. Insert ke PostgreSQL dengan UUID baru
# 4. Map old integer ID ke UUID baru
# 5. Preserve share_token
```

**Step 6: Verifikasi data (patia)**
```bash
# Cek jumlah rows
psql -U devil_advocate -d devil_advocate_db -c "SELECT COUNT(*) FROM users;"
psql -U devil_advocate -d devil_advocate_db -c "SELECT COUNT(*) FROM debates;"
# Bandingkan dengan SQLite
sqlite3 /opt/devil-advocate-web/backend/debates.db "SELECT COUNT(*) FROM users;"
```

**Step 7: Update backend .env (alika)**
```
DB_URL=postgresql+asyncpg://devil_advocate:password@localhost/devil_advocate_db
```

**Step 8: Cutover (alika + patia)**
```bash
# Maintenance window ~5 menit
systemctl stop devil-advocate-backend
# Jalankan migration final jika ada data baru
python scripts/migrate_sqlite_to_pg.py --incremental
# Update systemd env
systemctl daemon-reload
systemctl start devil-advocate-backend
# Health check
curl http://localhost:8001/health
```

**Step 9: Backup SQLite (alika)**
```bash
cp /opt/devil-advocate-web/backend/debates.db \
   /opt/devil-advocate-web/backend/debates.db.bak.$(date +%Y%m%d)
```

**Step 10: Setup PostgreSQL backup cron (alika)**
```bash
# /etc/cron.d/devil-advocate-pg-backup
0 2 * * * postgres pg_dump devil_advocate_db > /backup/devil_advocate_$(date +\%Y\%m\%d).sql
```

---

## 13. Environment Variables

### Backend `/opt/devil-advocate-web/backend/.env`

| Var | Keterangan | Baru di v2? |
|-----|------------|-------------|
| `DB_URL` | PostgreSQL connection string | ✅ Baru (ganti DB_PATH) |
| `LLM_BASE_URL` | 9router base URL | - |
| `LLM_API_KEY` | NINEROUTER_API_KEY | - |
| `MODEL` | hermes2 | - |
| `CORS_ORIGINS` | Allowed origins | - |
| `MAX_DEBATES_FREE` | Limit debat free per hari (default: 1) | - |
| `NEXTAUTH_SECRET` | Shared secret untuk verify JWT | ✅ Baru |
| `INTERNAL_API_KEY` | Key untuk /auth/sync-user endpoint | ✅ Baru |
| `PAKASIR_PROJECT_SLUG` | Slug proyek di Pakasir dashboard | ✅ Baru |
| `PAKASIR_API_KEY` | API key dari Pakasir dashboard | ✅ Baru |
| `PAKASIR_CALLBACK_URL` | https://debate.soqisoqi.my.id/api/subscription/webhook | ✅ Baru |
| `PAKASIR_SUCCESS_URL` | https://debate.soqisoqi.my.id/pricing?status=success | ✅ Baru |

### Frontend `/opt/devil-advocate-web/frontend/.env.local`

| Var | Keterangan | Baru di v2? |
|-----|------------|-------------|
| `NEXTAUTH_URL` | https://debate.soqisoqi.my.id | - |
| `NEXTAUTH_SECRET` | Shared secret (sama dengan backend) | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - |
| `NEXT_PUBLIC_API_URL` | /api | - |
| `AUTH_TRUST_HOST` | true | - |
| `INTERNAL_API_KEY` | Key untuk call /auth/sync-user ke FastAPI | ✅ Baru |

---

## 14. Kanban Task Breakdown

### patia (backend)

| # | Task | Priority | Depends On |
|---|------|----------|------------|
| P1 | Setup Alembic + buat schema PostgreSQL (semua tabel v2) | high | - |
| P2 | JWT auth middleware — verify NextAuth JWT dari cookie di FastAPI | high | - |
| P3 | POST /auth/sync-user endpoint (internal, dipanggil NextAuth) | high | P1, P2 |
| P4 | GET /auth/me endpoint | high | P2 |
| P5 | POST /auth/logout endpoint | high | P2 |
| P6 | Update POST /debate — pakai JWT auth, cek Pro limit | high | P1, P2 |
| P7 | GET /debates + GET /debates/{id} endpoints | medium | P1, P2 |
| P8 | Xendit Invoice API integration — POST /subscription/create-invoice | high | P1, P2 |
| P9 | Xendit webhook handler — POST /subscription/webhook | high | P8 |
| P10 | GET /me/subscription + DELETE /subscription/cancel | medium | P8, P9 |
| P11 | Persona CRUD endpoints (GET/POST/PUT/DELETE /personas) | medium | P1, P2 |
| P12 | Template seeding + GET /templates endpoint | medium | P1 |
| P13 | Data migration script SQLite → PostgreSQL | high | P1 |

### alya (frontend)

| # | Task | Priority | Depends On |
|---|------|----------|------------|
| A1 | Update NextAuth config — tambah sync-user call + JWT session | high | patia P3 |
| A2 | `useSubscription` hook | high | patia P10 |
| A3 | `/pricing` page — Free vs Pro comparison + CTA | high | - |
| A4 | `UpgradePromptModal` component | high | A2 |
| A5 | Xendit redirect flow di /pricing (handle query params success/failed) | high | patia P8 |
| A6 | `PersonaSelector` component | medium | patia P11 |
| A7 | `TemplateChips` component | medium | patia P12 |
| A8 | `CustomPersonaModal` component (Pro only) | medium | A6 |
| A9 | `ProBadge` di navbar/avatar | low | A2 |
| A10 | Debate history page `/debates` | medium | patia P7 |
| A11 | Update POST /debate call — hapus X-User-Id header, pakai cookie | high | patia P6 |

### alika (devops)

| # | Task | Priority | Depends On |
|---|------|----------|------------|
| D1 | Install + setup PostgreSQL 16 di server | high | - |
| D2 | Buat database + user + grant permissions | high | D1 |
| D3 | Backup SQLite sebelum migration | high | - |
| D4 | Update systemd service backend — env vars baru (DB_URL, Xendit, NEXTAUTH_SECRET) | high | patia P1 |
| D5 | Update systemd service frontend — env vars baru (INTERNAL_API_KEY) | high | patia P3 |
| D6 | Pastikan /api/subscription/webhook accessible via HTTPS (Cloudflare Tunnel sudah handle) | medium | - |
| D7 | Setup PostgreSQL backup cron harian | medium | D2 |
| D8 | Jalankan cutover migration (maintenance window ~5 menit) | high | patia P13, D2, D3 |

---

## 15. Success Metrics

- Free → Pro conversion: >5% dalam bulan pertama
- Custom persona usage: >30% debat pakai persona non-default
- Template click rate: >40% user klik template minimal 1x
- Churn rate Pro: <20%/bulan
- Xendit webhook success rate: >99%
- Zero data loss saat migration SQLite → PostgreSQL

---

## 16. Risks & Assumptions

| Risk | Mitigasi |
|------|----------|
| Xendit webhook delay/gagal | Implement retry logic + manual check endpoint |
| Race condition update is_pro | Gunakan DB transaction saat update subscription + users |
| JWT secret mismatch antara FE dan BE | Pastikan NEXTAUTH_SECRET sama persis di kedua .env |
| Data loss saat migration | Backup SQLite dulu, test migration di staging, cutover cepat |
| User tidak mau bayar Rp 49k | Free tier tetap useful, Pro hanya untuk power user |
| PostgreSQL connection pool habis | Set pool_size + max_overflow di SQLAlchemy |
| Xendit sandbox vs production | Test di sandbox dulu, switch ke production saat go-live |

**Assumptions:**
- HTTPS via Cloudflare Tunnel sudah cukup untuk Xendit webhook
- 10 saved personas cukup untuk Pro user
- Invoice 24 jam cukup untuk user menyelesaikan pembayaran
- Debat lama tetap accessible meski subscription expired/cancelled
