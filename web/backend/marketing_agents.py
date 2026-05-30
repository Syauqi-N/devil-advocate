"""
marketing_agents.py — AI Marketing Strategy logic via SSE streaming.

Flow:
1. Dari business_description → generate pertanyaan kontekstual (max 5, satu per satu)
2. Tiap jawaban dikirim → generate pertanyaan berikutnya atau stop jika cukup
3. Setelah semua jawaban → generate strategi marketing structured (JSON)

Events yielded:
- {"type": "question", "number": N, "text": "...", "options": [...]}
- {"type": "strategy", "content": {...}}  ← structured JSON
- {"type": "done"}
- {"type": "error", "message": "..."}
"""
import json
from typing import AsyncGenerator, Optional

import httpx

from config import LLM_API_KEY, LLM_BASE_URL, MODEL

MAX_QUESTIONS = 5

# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

QUESTION_SYSTEM = """Kamu adalah konsultan marketing berpengalaman yang sedang melakukan intake session dengan pemilik bisnis.

Tugasmu: ajukan pertanyaan kontekstual yang relevan untuk memahami bisnis mereka secara mendalam sebelum membuat strategi marketing.

Topik pertanyaan bisa mencakup:
- Omzet bulanan saat ini dan target omzet
- Strategi marketing yang sudah dijalankan
- Budget marketing yang tersedia
- Target pelanggan / segmen pasar
- Kompetitor utama
- Channel penjualan (online/offline)
- Produk/layanan unggulan
- Masalah marketing terbesar saat ini

Aturan:
- Ajukan SATU pertanyaan per respons
- Pertanyaan harus spesifik dan relevan dengan konteks bisnis yang diberikan
- Sertakan 3-4 opsi jawaban yang relevan (singkat, max 8 kata per opsi)
- Format output HANYA JSON:
{
  "question": "teks pertanyaan",
  "options": ["opsi 1", "opsi 2", "opsi 3", "opsi 4"],
  "should_stop": false
}
- Set "should_stop": true jika sudah cukup informasi untuk membuat strategi (biasanya setelah 3-5 pertanyaan)
- Jawab HANYA JSON, tanpa markdown code block"""

STRATEGY_SYSTEM = """Kamu adalah konsultan marketing senior yang membuat strategi marketing komprehensif berdasarkan informasi bisnis yang dikumpulkan.

Buat strategi yang:
- Praktis dan actionable untuk bisnis skala mereka
- Realistis dengan budget yang tersedia
- Fokus pada quick wins + long-term growth
- Spesifik untuk industri/bisnis mereka

Format output HANYA JSON (tanpa markdown code block):
{
  "summary": "ringkasan situasi bisnis dan rekomendasi utama (2-3 kalimat)",
  "positioning": "bagaimana bisnis harus memposisikan diri di pasar",
  "target_audience": "deskripsi target pelanggan ideal yang spesifik",
  "channels": [
    {
      "name": "nama channel",
      "tactic": "taktik spesifik yang harus dilakukan",
      "budget_pct": 30,
      "priority": "high|medium|low"
    }
  ],
  "budget_allocation": "penjelasan alokasi budget secara keseluruhan",
  "timeline": [
    {
      "period": "Bulan 1-2",
      "focus": "fokus utama periode ini",
      "actions": ["aksi 1", "aksi 2", "aksi 3"]
    }
  ],
  "kpis": ["KPI 1", "KPI 2", "KPI 3"],
  "quick_wins": ["quick win 1", "quick win 2", "quick win 3"]
}"""

# ---------------------------------------------------------------------------
# LLM helper
# ---------------------------------------------------------------------------

async def _chat(system: str, messages: list[dict]) -> str:
    payload = {
        "model": MODEL,
        "messages": [{"role": "system", "content": system}] + messages,
        "temperature": 0.7,
        "max_tokens": 2000,
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{LLM_BASE_URL}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {LLM_API_KEY}"},
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

def _parse_json(text: str) -> dict:
    """Parse JSON from LLM response, strip markdown fences if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    return json.loads(text)

# ---------------------------------------------------------------------------
# Generate next question
# ---------------------------------------------------------------------------

async def generate_question(
    business_description: str,
    qa_history: list[dict],  # [{"question": "...", "answer": "..."}]
    question_number: int,
) -> dict:
    """
    Generate the next contextual question.
    Returns dict: {"question": str, "options": list[str], "should_stop": bool}
    """
    history_text = ""
    if qa_history:
        history_text = "\n\nPercakapan sebelumnya:\n" + "\n".join(
            f"Q{i+1}: {qa['question']}\nA: {qa['answer']}"
            for i, qa in enumerate(qa_history)
        )

    messages = [
        {
            "role": "user",
            "content": (
                f"Deskripsi bisnis: {business_description}"
                f"{history_text}\n\n"
                f"Ini adalah pertanyaan ke-{question_number} dari maksimal {MAX_QUESTIONS}. "
                f"{'Sudah ada ' + str(len(qa_history)) + ' jawaban sebelumnya. ' if qa_history else ''}"
                f"Ajukan pertanyaan berikutnya yang paling relevan, atau set should_stop=true jika sudah cukup informasi."
            ),
        }
    ]

    raw = await _chat(QUESTION_SYSTEM, messages)
    result = _parse_json(raw)
    return {
        "question": result.get("question", ""),
        "options": result.get("options", []),
        "should_stop": bool(result.get("should_stop", False)),
    }

# ---------------------------------------------------------------------------
# Generate marketing strategy
# ---------------------------------------------------------------------------

async def generate_strategy(
    business_description: str,
    qa_history: list[dict],
) -> dict:
    """
    Generate structured marketing strategy from all Q&A.
    Returns parsed strategy dict.
    """
    qa_text = "\n".join(
        f"Q: {qa['question']}\nA: {qa['answer']}"
        for qa in qa_history
    )

    messages = [
        {
            "role": "user",
            "content": (
                f"Deskripsi bisnis: {business_description}\n\n"
                f"Informasi tambahan dari sesi konsultasi:\n{qa_text}\n\n"
                f"Buat strategi marketing komprehensif berdasarkan informasi di atas."
            ),
        }
    ]

    raw = await _chat(STRATEGY_SYSTEM, messages)
    return _parse_json(raw)

# ---------------------------------------------------------------------------
# Full session stream
# ---------------------------------------------------------------------------

async def run_marketing_session(
    business_description: str,
    qa_history: list[dict],
    question_number: int,
) -> AsyncGenerator[dict, None]:
    """
    Stream events for one step of the marketing session.

    If question_number <= MAX_QUESTIONS and not enough info:
      → yield question event
    Else:
      → yield strategy event + done
    """
    try:
        # Generate next question
        if question_number <= MAX_QUESTIONS:
            q = await generate_question(business_description, qa_history, question_number)

            if not q["should_stop"] or question_number == 1:
                yield {
                    "type": "question",
                    "number": question_number,
                    "text": q["question"],
                    "options": q["options"],
                }
                return

        # Generate strategy (either should_stop=True or max questions reached)
        yield {"type": "generating_strategy"}
        strategy = await generate_strategy(business_description, qa_history)
        yield {"type": "strategy", "content": strategy}
        yield {"type": "done"}

    except Exception as e:
        import traceback
        import logging
        logging.getLogger("marketing").error(f"Error: {e}\n{traceback.format_exc()}")
        yield {"type": "error", "message": str(e)}
