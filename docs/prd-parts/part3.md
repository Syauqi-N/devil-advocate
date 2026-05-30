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

## 11. Xendit Integration Detail

### Product yang Dipakai

**Xendit Invoice API** — bukan Recurring Charge. User bayar manual tiap bulan via invoice link. Alasan:
- Lebih sederhana untuk MVP
- Tidak butuh kartu kredit (support VA + QRIS + e-wallet)
- User punya kontrol penuh kapan mau perpanjang

### Flow Lengkap

```
1. User klik "Upgrade Sekarang" di /pricing atau UpgradePromptModal
2. Frontend POST /api/subscription/create-invoice
3. FastAPI:
   a. Cek tidak ada invoice pending (status='pending' di subscriptions)
   b. Buat Xendit invoice via Xendit API:
      - external_id: "da-sub-{user_id}-{timestamp}"
      - amount: 49000
      - description: "Devil's Advocate Pro - 1 bulan"
      - customer: { email, name }
      - invoice_duration: 86400 (24 jam)
      - success_redirect_url: https://debate.soqisoqi.my.id/pricing?status=success
      - failure_redirect_url: https://debate.soqisoqi.my.id/pricing?status=failed
      - callback_url: https://debate.soqisoqi.my.id/api/subscription/webhook
   c. Simpan ke tabel subscriptions:
      - status: 'pending'
      - xendit_invoice_id: dari response Xendit
   d. Return invoice_url ke frontend
4. Frontend redirect user ke invoice_url (Xendit hosted page)
5. User bayar (VA / QRIS / e-wallet)
6. Xendit POST ke /api/subscription/webhook
7. FastAPI webhook handler:
   a. Verify X-CALLBACK-TOKEN header == XENDIT_WEBHOOK_TOKEN
   b. Parse body, cek status == "PAID"
   c. Find subscription by xendit_invoice_id
   d. Update subscription: status='active', started_at=now(), expires_at=now()+30hari
   e. Update users.is_pro = true
   f. Return 200 OK
8. User redirect kembali ke /pricing?status=success
9. Frontend detect query param → tampilkan success message → refetch useSubscription
```

### Webhook Security

```python
# FastAPI webhook handler
from fastapi import Header, HTTPException

async def subscription_webhook(
    payload: dict,
    x_callback_token: str = Header(None)
):
    if x_callback_token != settings.XENDIT_WEBHOOK_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid webhook token")
    # ... process
```

### Edge Cases

| Case | Handling |
|------|----------|
| Invoice expired (24 jam tidak bayar) | Xendit kirim webhook status=EXPIRED → update subscription status='expired' |
| Double payment (user bayar 2x) | Cek xendit_invoice_id sudah ada di subscriptions → skip, return 200 |
| Webhook retry (Xendit retry jika 200 tidak diterima) | Idempotent: cek status sudah 'active' → skip update, return 200 |
| User klik Upgrade saat ada pending invoice | Return PENDING_INVOICE_EXISTS + invoice_url yang ada |
| User Pro expired, klik Upgrade lagi | Buat invoice baru, flow normal |
| Webhook datang sebelum create-invoice selesai | Tidak mungkin — Xendit hanya kirim webhook setelah payment |

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
| `XENDIT_SECRET_KEY` | Xendit secret key (xnd_production_...) | ✅ Baru |
| `XENDIT_WEBHOOK_TOKEN` | Token untuk verify Xendit webhook | ✅ Baru |
| `XENDIT_CALLBACK_URL` | https://debate.soqisoqi.my.id/api/subscription/webhook | ✅ Baru |
| `XENDIT_SUCCESS_URL` | https://debate.soqisoqi.my.id/pricing?status=success | ✅ Baru |
| `XENDIT_FAILURE_URL` | https://debate.soqisoqi.my.id/pricing?status=failed | ✅ Baru |

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
