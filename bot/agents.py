import httpx

from config import KIRO_API_KEY, KIRO_BASE_URL, MODEL

ADVOCATE_SYSTEM = """Kamu adalah Advocate — seorang optimis yang berpengalaman di dunia startup dan bisnis.
Tugasmu: temukan sisi positif, peluang nyata, dan benchmark dari ide yang diberikan.
Gaya: percaya diri, data-driven, kasih contoh konkret dari bisnis serupa yang sukses.
Jangan asal setuju — argumenmu harus solid dan spesifik.
Balas dalam bahasa yang sama dengan user.
Maksimal 200 kata."""

DEVIL_SYSTEM = """Kamu adalah Devil's Advocate — seorang skeptis tajam yang tugasnya mencari lubang fatal.
Fokus: risiko eksekusi, masalah market, kompetitor, asumsi yang salah, worst case scenario.
Gaya: kritis tapi konstruktif, bukan sekedar negatif. Tunjukkan lubang yang spesifik.
Kamu tahu argumen Advocate sebelumnya — counter dengan tepat.
Balas dalam bahasa yang sama dengan user.
Maksimal 200 kata."""

JUDGE_SYSTEM = """Kamu adalah Judge — analis netral yang mensintesis debat dan memberikan verdict.
Kamu sudah membaca semua argumen dari Advocate dan Devil's Advocate.
Output wajib:
1. Risiko utama (top 3, bullet point)
2. Peluang nyata (top 3, bullet point)
3. Verdict: LANJUT / PIVOT / STOP
4. Action items konkret sebelum eksekusi (3–5 langkah)
Gaya: tegas, actionable, tidak bertele-tele.
Balas dalam bahasa yang sama dengan user."""


async def call_llm(system: str, user_msg: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{KIRO_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {KIRO_API_KEY}"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
                "max_tokens": 1024,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def _format_history(history: list) -> str:
    lines = []
    for h in history:
        role = "🟢 Advocate" if h["role"] == "advocate" else "🔴 Devil"
        lines.append(f"{role}: {h['content']}")
    return "\n\n".join(lines)


async def run_debate(topic: str) -> dict:
    history = []
    rounds = []

    for round_num in range(1, 4):
        # Advocate
        advocate_ctx = f"Topik: {topic}\nRound {round_num}/3"
        if history:
            advocate_ctx += f"\n\nDebat sebelumnya:\n{_format_history(history)}\n\nBerikan argumen lanjutan."
        advocate_reply = await call_llm(ADVOCATE_SYSTEM, advocate_ctx)
        history.append({"role": "advocate", "content": advocate_reply})

        # Devil
        devil_ctx = f"Topik: {topic}\nRound {round_num}/3\n\nDebat sebelumnya:\n{_format_history(history)}\n\nCounter argumen Advocate."
        devil_reply = await call_llm(DEVIL_SYSTEM, devil_ctx)
        history.append({"role": "devil", "content": devil_reply})

        rounds.append({"advocate": advocate_reply, "devil": devil_reply})

    # Judge
    judge_ctx = f"Topik: {topic}\n\nTranskrip debat lengkap:\n{_format_history(history)}\n\nBerikan verdict."
    verdict = await call_llm(JUDGE_SYSTEM, judge_ctx)

    return {"rounds": rounds, "verdict": verdict}
