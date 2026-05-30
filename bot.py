import logging

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import Application, CommandHandler, ContextTypes

from agents import run_debate
from config import BOT_TOKEN, MAX_DEBATES_FREE
from database import (
    check_and_increment_usage,
    get_debate,
    get_history,
    get_or_create_user,
    init_db,
    save_debate,
    set_user_language,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

WELCOME = """👋 *Devil's Advocate Bot*

_"Sebelum eksekusi, debatkan dulu."_

Bot ini mensimulasikan debat 3 persona AI untuk stress-test ide bisnis kamu.

🟢 *Advocate* — cari peluang
🔴 *Devil* — cari lubang
⚖️ *Judge* — verdict akhir

Ketik /help untuk panduan lengkap."""

HELP = """📖 *Panduan Penggunaan*

/debate [ide] — Mulai debat baru (3 round + verdict)
/history — List 10 debat terakhir
/lihat [id] — Baca ulang debat spesifik
/bahasa [id/en] — Set bahasa output
/help — Panduan ini

*Contoh:*
`/debate Marketplace freelancer khusus desainer`

Debat memakan waktu ~60 detik (7 LLM calls)."""


async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await get_or_create_user(update.effective_user.id, update.effective_user.username)
    await update.message.reply_text(WELCOME, parse_mode="Markdown")


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(HELP, parse_mode="Markdown")


async def debate_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id
    topic = " ".join(context.args) if context.args else ""

    if not topic:
        await update.message.reply_text("❌ Kasih topik dong.\nContoh: `/debate Marketplace freelancer khusus desainer`", parse_mode="Markdown")
        return

    await get_or_create_user(user_id, update.effective_user.username)

    if not await check_and_increment_usage(user_id, MAX_DEBATES_FREE):
        await update.message.reply_text(f"⚠️ Limit harian tercapai ({MAX_DEBATES_FREE} debat/hari). Coba lagi besok!")
        return

    await update.message.reply_text("⏳ Memulai debat... (3 round, ~60 detik)")

    try:
        result = await _run_and_stream(update, topic)
    except Exception as e:
        logger.error(f"Debate error: {e}")
        await update.message.reply_text("❌ Terjadi error saat debat. Coba lagi nanti.")
        return

    debate_id = await save_debate(user_id, chat_id, topic, result["rounds"], result["verdict"])
    await update.message.reply_text(f"💾 Debat disimpan. ID: `{debate_id}`\nKetik `/lihat {debate_id}` untuk baca ulang.", parse_mode="Markdown")


async def _run_and_stream(update: Update, topic: str) -> dict:
    """Run debate and send messages progressively."""
    from agents import ADVOCATE_SYSTEM, DEVIL_SYSTEM, JUDGE_SYSTEM, call_llm, _format_history

    history = []
    rounds = []

    for round_num in range(1, 4):
        await update.effective_chat.send_action(ChatAction.TYPING)

        # Advocate
        advocate_ctx = f"Topik: {topic}\nRound {round_num}/3"
        if history:
            advocate_ctx += f"\n\nDebat sebelumnya:\n{_format_history(history)}\n\nBerikan argumen lanjutan."
        advocate_reply = await call_llm(ADVOCATE_SYSTEM, advocate_ctx)
        history.append({"role": "advocate", "content": advocate_reply})
        await update.message.reply_text(f"🟢 *Advocate [Round {round_num}]:*\n{advocate_reply}", parse_mode="Markdown")

        await update.effective_chat.send_action(ChatAction.TYPING)

        # Devil
        devil_ctx = f"Topik: {topic}\nRound {round_num}/3\n\nDebat sebelumnya:\n{_format_history(history)}\n\nCounter argumen Advocate."
        devil_reply = await call_llm(DEVIL_SYSTEM, devil_ctx)
        history.append({"role": "devil", "content": devil_reply})
        await update.message.reply_text(f"🔴 *Devil [Round {round_num}]:*\n{devil_reply}", parse_mode="Markdown")

        rounds.append({"advocate": advocate_reply, "devil": devil_reply})

    await update.effective_chat.send_action(ChatAction.TYPING)

    # Judge
    judge_ctx = f"Topik: {topic}\n\nTranskrip debat lengkap:\n{_format_history(history)}\n\nBerikan verdict."
    verdict = await call_llm(JUDGE_SYSTEM, judge_ctx)
    await update.message.reply_text(f"⚖️ *Judge — Verdict:*\n{verdict}", parse_mode="Markdown")

    return {"rounds": rounds, "verdict": verdict}


async def history_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    debates = await get_history(user_id)
    if not debates:
        await update.message.reply_text("📭 Belum ada debat. Mulai dengan /debate [ide]")
        return

    lines = ["📜 *Riwayat Debat:*\n"]
    for d in debates:
        lines.append(f"• `{d['id']}` — {d['topic'][:50]}\n  _{d['created_at']}_")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def lihat_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    debate_id = context.args[0] if context.args else ""
    if not debate_id:
        await update.message.reply_text("❌ Kasih ID debat.\nContoh: `/lihat DA-abc12345`", parse_mode="Markdown")
        return

    debate = await get_debate(debate_id)
    if not debate:
        await update.message.reply_text("❌ Debat tidak ditemukan.")
        return

    text = f"📋 *Debat: {debate['topic']}*\n\n"
    for i, r in enumerate(debate["rounds"], 1):
        text += f"🟢 *Advocate [R{i}]:*\n{r['advocate']}\n\n"
        text += f"🔴 *Devil [R{i}]:*\n{r['devil']}\n\n"
    text += f"⚖️ *Verdict:*\n{debate['verdict']}"

    # Split if too long for Telegram (4096 char limit)
    if len(text) <= 4096:
        await update.message.reply_text(text, parse_mode="Markdown")
    else:
        for i in range(0, len(text), 4096):
            await update.message.reply_text(text[i:i+4096], parse_mode="Markdown")


async def bahasa_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    lang = context.args[0].lower() if context.args else ""
    if lang not in ("id", "en", "auto"):
        await update.message.reply_text("❌ Pilih: `id`, `en`, atau `auto`", parse_mode="Markdown")
        return
    await set_user_language(update.effective_user.id, lang)
    await update.message.reply_text(f"✅ Bahasa diset ke: *{lang}*", parse_mode="Markdown")


async def post_init(application: Application):
    await init_db()


def main():
    app = Application.builder().token(BOT_TOKEN).post_init(post_init).build()

    app.add_handler(CommandHandler("start", start_cmd))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("debate", debate_cmd))
    app.add_handler(CommandHandler("history", history_cmd))
    app.add_handler(CommandHandler("lihat", lihat_cmd))
    app.add_handler(CommandHandler("bahasa", bahasa_cmd))

    logger.info("Bot started")
    app.run_polling()


if __name__ == "__main__":
    main()
