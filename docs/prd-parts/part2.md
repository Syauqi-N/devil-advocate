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
