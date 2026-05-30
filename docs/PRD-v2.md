# PRD: Devil's Advocate Web App — v2.0

**Slug:** devil-advocate-web-v2
**Tanggal:** 2026-05-22
**Status:** draft
**Owner:** Soqi
**Prev version:** PRD.md (v1 — MVP)

---

## 1. Overview

Lanjutan dari MVP v1 yang sudah live di https://debate.soqisoqi.my.id. V2 fokus pada **monetisasi**, **personalisasi**, dan **growth** — tiga fitur utama: Paywall, Custom Persona, dan Template Debat.

---

## 2. Goals

- Monetisasi via subscription Pro (Midtrans)
- User bisa customize persona Advocate & Devil sesuai konteks mereka
- Template debat siap pakai untuk onboarding lebih cepat
- Meningkatkan retention dan share rate

---

## 3. Non-Goals (Out of Scope v2.0)

- Mobile app native
- Team / org plan
- Export PDF
- Multi-bahasa (tetap Indonesia)
- API public untuk developer
- Embed widget

---

## 4. Features

### 4.1 Paywall & Subscription

**Free tier (existing):**
- 1 debat/hari
- Persona default (Advocate vs Devil)
- Akses template debat (topik pre-fill saja)

**Pro tier — Rp 49.000/bulan:**
- Unlimited debat
- Custom persona (buat + simpan persona sendiri)
- Akses semua template termasuk template premium
- Badge "Pro" di profil

**Flow:**
1. User habis kuota → muncul upgrade prompt
2. Klik "Upgrade ke Pro" → halaman `/pricing`
3. Pilih plan → redirect ke Midtrans payment page
4. Setelah bayar → webhook Midtrans → aktifkan Pro
5. Pro aktif → unlimited debat + fitur unlocked

**DB schema tambahan:**
```sql
subscriptions (
  id, user_id, plan ENUM('free','pro'),
  status ENUM('active','expired','cancelled'),
  started_at, expires_at,
  midtrans_order_id, midtrans_transaction_id
)
```

**Midtrans integration:**
- Snap API untuk payment page
- Webhook `/api/payment/webhook` untuk update status
- Cek subscription di setiap request debate

---

### 4.2 Custom Persona

**2 layer persona:**

**Layer 1 — Template Persona** (semua user, gratis):
Pre-built personas yang bisa dipilih sebelum debat:

| Template | Advocate | Devil |
|----------|----------|-------|
| Default | Advocate optimis | Devil skeptis |
| Startup | Early adopter antusias | Investor skeptis |
| Karir | Growth mindset | Risk analyst |
| Investasi | Bull case | Bear case |
| Pivot | New direction | Stay the course |
| Produk | Product enthusiast | Pragmatic engineer |
| Keuangan | Optimis finansial | CFO konservatif |

**Layer 2 — Custom Persona** (Pro only):
- User define sendiri nama + deskripsi persona
- Contoh: "Nama: Bos Galak, Deskripsi: CFO yang sangat konservatif dan selalu fokus pada cash flow"
- Simpan sebagai "My Personas" (max 10 persona tersimpan)
- Bisa dipakai ulang di debat berikutnya

**Flow UI:**
```
[Input topik]
[2 Round] [3 Round]

Persona:
  [Default ▼]  ← dropdown/modal
    ○ Default
    ○ Startup
    ○ Karir
    ○ Investasi
    ○ Pivot
    ○ Produk
    ○ Keuangan
    ─────────────
    ✦ Custom (Pro) →  [Buat Persona]
    ─────────────
    My Personas (Pro):
    ○ Bos Galak vs Anak Startup
    ○ ...

[Debatkan →]
```

**DB schema tambahan:**
```sql
personas (
  id, user_id, name,
  advocate_name, advocate_description,
  devil_name, devil_description,
  created_at
)
```

---

### 4.3 Template Debat

Template = preset topik + persona yang sudah dikurasi. Muncul di dashboard sebagai cards/chips yang bisa diklik.

**Free templates:**
- 🚀 Startup Idea — "Marketplace freelancer khusus desainer lokal"
- 💼 Career Move — "Resign dan freelance full-time"
- 💰 Investment — "Investasi di reksa dana vs properti"
- 🔄 Pivot — "Pivot dari B2C ke B2B"
- ☕ Lifestyle — "Buka coffee shop di kota kecil"

**Pro templates (lebih spesifik + persona premium):**
- 🏢 Fundraising — "Raise seed round sekarang vs bootstrap dulu" + persona VC vs Founder
- 📊 Hiring — "Hire full-time vs outsource" + persona HR vs Finance
- 🌍 Ekspansi — "Ekspansi ke luar kota vs fokus lokal dulu" + persona Growth vs Ops
- 💳 Pricing — "Naikkan harga 30% sekarang" + persona Sales vs Customer Success

**Flow:**
1. User klik template → topik + persona auto-fill di input
2. User bisa edit topik sebelum submit
3. Pro template → kalau free user klik → muncul upgrade prompt

---

## 5. UI Spec

### Halaman `/pricing`
```
┌─────────────────────────────────────────────────┐
│  Devil's Advocate                    [Avatar]   │
├─────────────────────────────────────────────────┤
│                                                 │
│           Upgrade ke Pro                        │
│                                                 │
│  ┌──────────────┐    ┌──────────────────────┐  │
│  │   FREE       │    │   PRO                │  │
│  │   Gratis     │    │   Rp 49.000/bln      │  │
│  │              │    │                      │  │
│  │ ✓ 1 debat/hr │    │ ✓ Unlimited debat    │  │
│  │ ✓ Template   │    │ ✓ Custom persona     │  │
│  │   dasar      │    │ ✓ Template premium   │  │
│  │              │    │ ✓ Simpan persona     │  │
│  │              │    │ ✓ Badge Pro          │  │
│  │  [Aktif]     │    │  [Upgrade Sekarang]  │  │
│  └──────────────┘    └──────────────────────┘  │
│                                                 │
│  🔒 Pembayaran aman via Midtrans                │
│  ↩ Batalkan kapan saja                         │
└─────────────────────────────────────────────────┘
```

### Dashboard — dengan Template & Persona selector
```
┌──────────────┬──────────────────────────────────────────┐
│  [≡] Devil's │  Devil's Advocate            [Avatar]    │
│  Advocate    ├──────────────────────────────────────────┤
│              │                                          │
│  [+ New]     │       🔴 Devil's Advocate               │
│              │  "Sebelum eksekusi, debatkan dulu."      │
│  — Recents — │                                          │
│  ...         │  ┌────────────────────────────────────┐  │
│              │  │  Masukkan ide atau keputusan...    │  │
│              │  └────────────────────────────────────┘  │
│              │                                          │
│              │  [ 2 Round ]  [ 3 Round ✓ ]             │
│              │                                          │
│              │  Persona: [ Default ▼ ]                  │
│              │                                          │
│              │  Template:                               │
│              │  🚀 Startup  💼 Karir  💰 Investasi      │
│              │  🔄 Pivot  ☕ Lifestyle  ✦ Pro →         │
│              │                                          │
│              │  ⚡ 1 debat gratis tersisa hari ini      │
└──────────────┴──────────────────────────────────────────┘
```

---

## 6. Tech Stack (tambahan dari v1)

- **Payment:** Midtrans Snap API
- **Webhook:** FastAPI endpoint `/api/payment/webhook`
- **Env vars baru:** `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_ENV` (sandbox/production)

---

## 7. API Endpoints Baru

```
POST /payment/create-transaction   → buat Midtrans Snap token
POST /payment/webhook              → terima notifikasi Midtrans
GET  /me/subscription              → cek status subscription user
GET  /personas                     → list persona user (Pro)
POST /personas                     → buat persona baru (Pro)
DELETE /personas/{id}              → hapus persona
GET  /templates                    → list semua template
```

---

## 8. Specialist Assignment

- **patia (backend):** Midtrans integration, subscription logic, persona CRUD, template seeding
- **alya (frontend):** Pricing page, persona selector UI, template chips Pro, upgrade prompts
- **alika (devops):** Env vars Midtrans, webhook SSL (Midtrans butuh HTTPS), DB migration

---

## 9. Kanban Task Breakdown

### patia (backend)
1. DB migration — tambah tabel `subscriptions` dan `personas`
2. Midtrans Snap integration — `POST /payment/create-transaction`
3. Midtrans webhook handler — update subscription status
4. Subscription middleware — cek Pro status di debate endpoint
5. Persona CRUD endpoints
6. Template seeding — insert 12 templates ke DB
7. `GET /templates` dan `GET /me/subscription` endpoints

### alya (frontend)
1. Halaman `/pricing` — free vs pro comparison cards
2. Persona selector component — dropdown dengan template + custom
3. Custom persona form modal (Pro only)
4. Template chips di dashboard — free + Pro (locked)
5. Upgrade prompt modal — muncul saat kuota habis atau klik Pro feature
6. Badge Pro di navbar/avatar
7. Integrasi Midtrans Snap di frontend (snap.js)

### alika (devops)
1. DB migration script untuk tabel baru
2. Tambah env vars Midtrans ke systemd service
3. Pastikan webhook endpoint accessible via HTTPS (Cloudflare tunnel sudah handle)

---

## 10. Success Metrics

- Conversion free → Pro: >5% dalam bulan pertama
- Custom persona usage: >30% debat pakai non-default persona
- Template click rate: >40% user klik template minimal 1x
- Churn rate Pro: <20%/bulan

---

## 11. Risks & Assumptions

- **Risk:** Midtrans sandbox vs production — test dulu di sandbox sebelum go-live
- **Risk:** User tidak mau bayar Rp 49k — mitigasi: free tier tetap useful, Pro hanya untuk power user
- **Assumption:** Midtrans cukup untuk payment Indonesia — tidak perlu Stripe
- **Assumption:** 10 saved personas cukup untuk Pro user
- **Assumption:** HTTPS via Cloudflare Tunnel sudah cukup untuk Midtrans webhook

---

## 12. Timeline

- [ ] Phase 1 — Backend v2 (patia): 3-4 hari
- [ ] Phase 2 — Frontend v2 (alya): 4-5 hari
- [ ] Phase 3 — DevOps + migration (alika): 1 hari
- [ ] Phase 4 — Midtrans sandbox testing: 1-2 hari
- [ ] Phase 5 — Go-live v2: 1 hari

**Target v2 launch:** ~2 minggu dari start
