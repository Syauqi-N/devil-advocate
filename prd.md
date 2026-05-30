# PRD — Devil's Advocate Bot

**Version:** 1.0  
**Date:** 2026-05-20  
**Status:** Ready for Implementation

---

## 1. Overview

Bot Telegram yang mensimulasikan debat antara 3 persona AI untuk membantu user stress-test ide bisnis atau keputusan penting. Satu bot, satu service, tiga kepribadian berbeda yang dipanggil secara berurutan.

**Tagline:** *"Sebelum eksekusi, debatkan dulu."*

---

## 2. Target User

- Founder / co-founder yang mau validasi ide sebelum build
- Professional yang mau second opinion sebelum ambil keputusan besar (karir, investasi, pivot)
- Tim kecil yang butuh structured brainstorming

---

## 3. Core Concept

```
User input: "Gw mau bikin marketplace freelancer khusus desainer"

🟢 Advocate  [R1]: Ini peluang bagus karena...
🔴 Devil     [R1]: Tapi masalah fundamentalnya...

🟢 Advocate  [R2]: Counter: itu bisa diatasi dengan...
🔴 Devil     [R2]: Tetap lemah karena...

🟢 Advocate  [R3]: Argumen final...
🔴 Devil     [R3]: Argumen final...

⚖️ Judge: Verdict — risiko utama, peluang nyata, rekomendasi: Lanjut / Pivot / Stop
```

Total: **7 LLM calls** per debat (3 round × 2 agent + 1 judge).  
Estimasi waktu: **45–60 detik** per debat.

---

## 4. Agent Personas

### 🟢 Advocate
```
System prompt:
Kamu adalah Advocate — seorang optimis yang berpengalaman di dunia startup dan bisnis.
Tugasmu: temukan sisi positif, peluang nyata, dan benchmark dari ide yang diberikan.
Gaya: percaya diri, data-driven, kasih contoh konkret dari bisnis serupa yang sukses.
Jangan asal setuju — argumenmu harus solid dan spesifik.
Balas dalam bahasa yang sama dengan user.
Maksimal 200 kata.
```

### 🔴 Devil's Advocate
```
System prompt:
Kamu adalah Devil's Advocate — seorang skeptis tajam yang tugasnya mencari lubang fatal.
Fokus: risiko eksekusi, masalah market, kompetitor, asumsi yang salah, worst case scenario.
Gaya: kritis tapi konstruktif, bukan sekedar negatif. Tunjukkan lubang yang spesifik.
Kamu tahu argumen Advocate sebelumnya — counter dengan tepat.
Balas dalam bahasa yang sama dengan user.
Maksimal 200 kata.
```

### ⚖️ Judge
```
System prompt:
Kamu adalah Judge — analis netral yang mensintesis debat dan memberikan verdict.
Kamu sudah membaca semua argumen dari Advocate dan Devil's Advocate.
Output wajib:
1. Risiko utama (top 3, bullet point)
2. Peluang nyata (top 3, bullet point)
3. Verdict: LANJUT / PIVOT / STOP
4. Action items konkret sebelum eksekusi (3–5 langkah)
Gaya: tegas, actionable, tidak bertele-tele.
Balas dalam bahasa yang sama dengan user.
```

---

## 5. Commands

| Command | Deskripsi |
|---|---|
| `/debate [ide]` | Mulai debat baru (3 round + verdict) |
| `/history` | List 10 debat terakhir user |
| `/lihat [id]` | Baca ulang debat spesifik |
| `/bahasa [id/en]` | Set bahasa output (default: auto-detect) |
| `/help` | Panduan penggunaan |
| `/start` | Welcome message |

---

## 6. User Flow

### DM (Private Chat)
```
User → /debate [ide]
Bot  → "⏳ Memulai debat... (3 round, ~60 detik)"
Bot  → [typing indicator]
Bot  → "🟢 Advocate [Round 1]:\n{argumen}"
Bot  → [typing indicator]
Bot  → "🔴 Devil [Round 1]:\n{counter}"
... (repeat 3 rounds)
Bot  → "⚖️ Judge — Verdict:\n{verdict}"
Bot  → "💾 Debat disimpan. ID: DA-{id} | /lihat DA-{id}"
```

### Grup
```
User → /debate@botname [ide]
Bot  → (sama seperti DM, tapi visible ke semua member grup)
```

---

## 7. Technical Architecture

### Stack
- **Language:** Python 3.11+
- **Telegram:** `python-telegram-bot` v21+
- **LLM:** OpenAI-compatible API via kiro-gateway (`http://localhost:8000/v1`)
- **Model:** `claude-sonnet-4.6` untuk semua agent
- **DB:** SQLite (via `aiosqlite`)
- **Deploy:** systemd service

### File Structure
```
/opt/devil-advocate-bot/
├── bot.py              # Main bot logic
├── agents.py           # Agent personas & LLM calls
├── database.py         # SQLite operations
├── config.py           # Config & env vars
├── requirements.txt
└── .env                # BOT_TOKEN, KIRO_API_KEY
```

### Environment Variables
```env
BOT_TOKEN=<telegram_bot_token>
KIRO_API_KEY=kiro-local-secret
KIRO_BASE_URL=http://localhost:8000/v1
MODEL=claude-sonnet-4.6
MAX_DEBATES_FREE=5          # per user per hari (untuk freemium nanti)
```

### Database Schema
```sql
CREATE TABLE debates (
    id          TEXT PRIMARY KEY,       -- DA-xxxxxxxx
    user_id     INTEGER NOT NULL,
    chat_id     INTEGER NOT NULL,
    topic       TEXT NOT NULL,
    rounds      JSON NOT NULL,          -- [{advocate, devil}, ...]
    verdict     TEXT,
    language    TEXT DEFAULT 'auto',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    user_id         INTEGER PRIMARY KEY,
    username        TEXT,
    language        TEXT DEFAULT 'auto',
    debates_today   INTEGER DEFAULT 0,
    last_reset      DATE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. LLM Call Flow (agents.py)

```python
async def run_debate(topic: str, language: str) -> dict:
    history = []
    rounds = []

    for round_num in range(1, 4):
        # Advocate
        advocate_prompt = build_advocate_prompt(topic, history, round_num)
        advocate_reply = await call_llm(ADVOCATE_SYSTEM, advocate_prompt)
        history.append({"role": "advocate", "content": advocate_reply})

        # Devil
        devil_prompt = build_devil_prompt(topic, history, round_num)
        devil_reply = await call_llm(DEVIL_SYSTEM, devil_prompt)
        history.append({"role": "devil", "content": devil_reply})

        rounds.append({"advocate": advocate_reply, "devil": devil_reply})

    # Judge
    judge_prompt = build_judge_prompt(topic, rounds)
    verdict = await call_llm(JUDGE_SYSTEM, judge_prompt)

    return {"rounds": rounds, "verdict": verdict}
```

---

## 9. Systemd Service

```ini
# /etc/systemd/system/devil-advocate-bot.service
[Unit]
Description=Devil's Advocate Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/devil-advocate-bot
EnvironmentFile=/opt/devil-advocate-bot/.env
ExecStart=/usr/bin/python3 bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## 10. MVP Scope

### ✅ In Scope (v1.0)
- `/debate`, `/history`, `/lihat`, `/help`, `/start`
- 3 round debat + verdict
- Support DM + Grup
- SQLite history
- Auto-detect bahasa (ID/EN)
- Typing indicator saat generate
- Pesan dikirim satu per satu (bukan wall of text)

### ❌ Out of Scope (v1.0)
- Freemium / payment gate
- Web app
- Custom round count
- Export PDF
- Notifikasi / reminder

---

## 11. Monetization (Post-MVP)

- **Freemium:** 3 debat/hari gratis, unlimited = Rp 49.000/bln
- **Team plan:** akses grup unlimited = Rp 149.000/bln per grup
- **White-label:** jual ke agency / konsultan sebagai tool internal

---

## 12. Success Metrics (MVP)

- 50 debat dalam 2 minggu pertama
- Retention: user kembali debat minimal 2x
- Feedback: verdict dianggap "actionable" oleh user

---

*PRD ini siap untuk implementasi langsung.*
