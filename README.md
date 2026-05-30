# Devil's Advocate Bot

Bot Telegram yang mensimulasikan debat antara 3 persona AI untuk stress-test ide bisnis atau keputusan penting. Satu bot, tiga kepribadian berbeda yang berdebat secara berurutan lalu memberikan verdict.

## Fungsi

- Simulasi debat 3 ronde antara Advocate (optimis) vs Devil's Advocate (skeptis)
- Judge AI memberikan verdict final: LANJUT / PIVOT / STOP
- Identifikasi risiko utama dan peluang nyata
- Action items konkret sebelum eksekusi
- Web interface untuk akses via browser
- Riwayat debat tersimpan di database

## Use Case

Seorang founder mau validasi ide "marketplace freelancer khusus desainer" sebelum mulai build. Dia kirim ide ke bot, lalu bot jalankan debat 3 ronde — Advocate cari sisi positif dan benchmark, Devil's Advocate cari lubang fatal dan risiko eksekusi. Judge sintesis semua argumen dan kasih verdict plus action items. Total waktu: ~60 detik, 7 LLM calls.

Cocok juga untuk professional yang mau second opinion sebelum ambil keputusan besar seperti resign, pivot bisnis, atau investasi.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Language | Python 3 |
| Telegram | python-telegram-bot 21.6 |
| HTTP Client | httpx |
| Database | SQLite via aiosqlite |
| LLM | OpenAI-compatible API |
| Web Interface | Next.js (frontend) + FastAPI/Node (backend) |
| Config | python-dotenv |
| Infra | Docker Compose |

## Instalasi

### Bot Telegram

```bash
cd devil-advocate
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env dengan credentials
```

Jalankan bot:

```bash
python3 bot.py
```

### Web Interface

```bash
cd web
docker compose up -d
docker compose logs -f
```

### Jalankan sebagai systemd service

```bash
sudo cp devil-advocate-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now devil-advocate-bot
journalctl -u devil-advocate-bot -f
```

### Konfigurasi `.env`

```env
TELEGRAM_BOT_TOKEN=token_dari_botfather
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

### Cara Pakai

Kirim ide atau keputusan ke bot:

```
Gw mau bikin marketplace freelancer khusus desainer

Gw mau resign dari kerja dan fokus freelance

Gw mau pivot startup gw dari B2C ke B2B
```

Bot akan mulai debat otomatis dan kirim hasil tiap ronde secara real-time.

## Alur Debat

```
User input ide
    → 🟢 Advocate R1: argumen positif
    → 🔴 Devil R1: counter & risiko
    → 🟢 Advocate R2: counter balik
    → 🔴 Devil R2: tetap kritis
    → 🟢 Advocate R3: argumen final
    → 🔴 Devil R3: argumen final
    → ⚖️ Judge: verdict + action items
```
