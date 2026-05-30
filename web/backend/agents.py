"""
agents.py — LLM debate logic via SSE streaming.

Runs a multi-round debate between Advocate (pro) and Devil (kontra),
then produces a Judge verdict. Yields events as async generator.
"""
import json
from typing import AsyncGenerator, Optional

import httpx

from config import LLM_API_KEY, LLM_BASE_URL, MODEL


ADVOCATE_SYSTEM = """Kamu adalah Advocate — pembela ide user. Tugasmu:
- Berikan argumen KUAT mendukung ide/keputusan user
- Gunakan data, logika, dan contoh nyata
- Tetap objektif tapi optimis
- Jawab dalam bahasa Indonesia, 2-3 paragraf"""

DEVIL_SYSTEM = """Kamu adalah Devil's Advocate — penentang ide user. Tugasmu:
- Berikan argumen KUAT menentang ide/keputusan user
- Tunjukkan risiko, kelemahan, dan blind spot
- Gunakan data, logika, dan contoh nyata
- Tetap objektif tapi kritis
- Jawab dalam bahasa Indonesia, 2-3 paragraf"""

JUDGE_SYSTEM = """Kamu adalah Judge — hakim netral yang menilai debat. Tugasmu:
- Rangkum argumen kedua sisi secara fair
- Berikan verdict: LANJUT, TUNDA, atau JANGAN
- Jelaskan risiko dan peluang
- Berikan action items konkret
- Format output sebagai JSON:
{
  "summary": "rangkuman singkat",
  "risks": ["risiko 1", "risiko 2"],
  "opportunities": ["peluang 1", "peluang 2"],
  "verdict": "LANJUT" | "TUNDA" | "JANGAN",
  "action_items": ["item 1", "item 2"]
}
Jawab HANYA JSON, tanpa markdown code block."""


async def _chat_completion(
    system: str,
    messages: list[dict],
    persona_desc: Optional[str] = None,
) -> str:
    """Call LLM and return full response text."""
    system_prompt = system
    if persona_desc:
        system_prompt = f"{persona_desc}\n\n{system}"

    payload = {
        "model": MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "temperature": 0.8,
        "max_tokens": 1500,
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{LLM_BASE_URL}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {LLM_API_KEY}"},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def run_debate(
    topic: str,
    rounds_count: int = 3,
    advocate_persona: Optional[str] = None,
    devil_persona: Optional[str] = None,
) -> AsyncGenerator[dict, None]:
    """
    Run a multi-round debate. Yields events:
    - {"type": "round", "round": N, "advocate": "...", "devil": "..."}
    - {"type": "verdict", "verdict": "..."}
    - {"type": "done"}
    """
    conversation_history = []

    for round_num in range(1, rounds_count + 1):
        # Advocate turn
        advocate_messages = conversation_history + [
            {"role": "user", "content": f"Topik debat: {topic}\n\nBerikan argumen PRO untuk round {round_num}."}
        ]
        advocate_response = await _chat_completion(
            ADVOCATE_SYSTEM, advocate_messages, advocate_persona
        )

        # Devil turn
        devil_messages = conversation_history + [
            {"role": "user", "content": f"Topik debat: {topic}\n\nArgumen Advocate:\n{advocate_response}\n\nBerikan argumen KONTRA untuk round {round_num}."}
        ]
        devil_response = await _chat_completion(
            DEVIL_SYSTEM, devil_messages, devil_persona
        )

        # Add to history for context
        conversation_history.append(
            {"role": "assistant", "content": f"[Round {round_num} Advocate]: {advocate_response}"}
        )
        conversation_history.append(
            {"role": "assistant", "content": f"[Round {round_num} Devil]: {devil_response}"}
        )

        yield {
            "type": "round",
            "round": round_num,
            "advocate": advocate_response,
            "devil": devil_response,
        }

    # Judge verdict
    judge_messages = [
        {"role": "user", "content": f"Topik debat: {topic}\n\nBerikut ringkasan debat:\n" + "\n".join(
            msg["content"] for msg in conversation_history
        ) + "\n\nBerikan verdict dalam format JSON."}
    ]
    verdict_raw = await _chat_completion(JUDGE_SYSTEM, judge_messages)

    yield {"type": "verdict", "verdict": verdict_raw}
    yield {"type": "done"}
