"""
seed_data.py — Seed 7 template personas + 9 debate templates (5 free + 4 pro).

Usage:
    cd /opt/devil-advocate-web/backend
    python scripts/seed_data.py
"""
import asyncio
import os
import sys
import uuid

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from database import _session, init_db


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

TEMPLATE_PERSONAS = [
    {
        "id": str(uuid.uuid4()),
        "name": "Classic Debate",
        "advocate_name": "The Advocate",
        "advocate_description": "A rational, evidence-based debater who builds strong logical arguments in favor of the proposition.",
        "devil_name": "The Devil",
        "devil_description": "A sharp contrarian who challenges every assumption and exposes weaknesses in the opposing argument.",
        "is_template": True,
        "is_pro_only": False,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Socratic Dialogue",
        "advocate_name": "Socrates",
        "advocate_description": "Uses probing questions to guide the discussion toward truth, building arguments through careful inquiry.",
        "devil_name": "The Sophist",
        "devil_description": "A clever rhetorician who uses persuasive language and apparent logic to challenge every claim.",
        "is_template": True,
        "is_pro_only": False,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Tech Futurist",
        "advocate_name": "The Optimist",
        "advocate_description": "A technology enthusiast who believes innovation and progress will solve humanity's greatest challenges.",
        "devil_name": "The Skeptic",
        "devil_description": "A critical thinker who questions the unintended consequences and risks of rapid technological change.",
        "is_template": True,
        "is_pro_only": False,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Philosopher Kings",
        "advocate_name": "Plato",
        "advocate_description": "Argues from idealist principles, seeking the highest good and the ideal form of society.",
        "devil_name": "Nietzsche",
        "devil_description": "Challenges conventional morality and idealism, advocating for the will to power and individual excellence.",
        "is_template": True,
        "is_pro_only": True,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Economist Clash",
        "advocate_name": "Keynes",
        "advocate_description": "Advocates for government intervention, stimulus spending, and managing aggregate demand.",
        "devil_name": "Hayek",
        "devil_description": "Champions free markets, spontaneous order, and warns against central planning and government overreach.",
        "is_template": True,
        "is_pro_only": True,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Ethical Dilemma",
        "advocate_name": "The Utilitarian",
        "advocate_description": "Judges actions by their outcomes — the greatest good for the greatest number.",
        "devil_name": "The Deontologist",
        "devil_description": "Argues that some actions are inherently right or wrong regardless of consequences.",
        "is_template": True,
        "is_pro_only": False,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Science vs Faith",
        "advocate_name": "The Empiricist",
        "advocate_description": "Relies on observable evidence, reproducible experiments, and the scientific method.",
        "devil_name": "The Theologian",
        "devil_description": "Argues from faith, tradition, and the limits of purely materialist explanations of existence.",
        "is_template": True,
        "is_pro_only": False,
    },
]

# Map persona by name for easy lookup when creating templates
_persona_by_name = {p["name"]: p for p in TEMPLATE_PERSONAS}

DEBATE_TEMPLATES = [
    # --- 5 Free ---
    {
        "id": str(uuid.uuid4()),
        "name": "AI Will Take Our Jobs",
        "description": "Debate whether artificial intelligence will cause mass unemployment or create new opportunities.",
        "topic_preset": "Artificial intelligence will cause more job losses than it creates",
        "persona_name": "Tech Futurist",
        "is_pro": False,
        "emoji": "🤖",
        "sort_order": 1,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Social Media Harms Society",
        "description": "Is social media a net negative for mental health and democracy?",
        "topic_preset": "Social media does more harm than good to society",
        "persona_name": "Classic Debate",
        "is_pro": False,
        "emoji": "📱",
        "sort_order": 2,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Universal Basic Income",
        "description": "Should governments provide every citizen with a guaranteed basic income?",
        "topic_preset": "Universal Basic Income should be implemented globally",
        "persona_name": "Economist Clash",
        "is_pro": False,
        "emoji": "💰",
        "sort_order": 3,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Trolley Problem",
        "description": "The classic ethical dilemma — sacrifice one to save many?",
        "topic_preset": "It is morally justified to sacrifice one person to save five",
        "persona_name": "Ethical Dilemma",
        "is_pro": False,
        "emoji": "🚃",
        "sort_order": 4,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Evolution vs Creation",
        "description": "Science and faith clash on the origins of life.",
        "topic_preset": "Evolution is a sufficient explanation for the origin and diversity of life",
        "persona_name": "Science vs Faith",
        "is_pro": False,
        "emoji": "🧬",
        "sort_order": 5,
    },
    # --- 4 Pro ---
    {
        "id": str(uuid.uuid4()),
        "name": "Democracy in Crisis",
        "description": "Is liberal democracy the best system of government, or is it failing?",
        "topic_preset": "Liberal democracy is the best form of government for the modern world",
        "persona_name": "Philosopher Kings",
        "is_pro": True,
        "emoji": "🗳️",
        "sort_order": 6,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Free Market vs Regulation",
        "description": "Should markets be left to self-regulate or does government intervention improve outcomes?",
        "topic_preset": "Free markets without government regulation produce the best economic outcomes",
        "persona_name": "Economist Clash",
        "is_pro": True,
        "emoji": "📈",
        "sort_order": 7,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "God and Morality",
        "description": "Can morality exist without religion? Does God ground objective ethics?",
        "topic_preset": "Objective morality requires the existence of God",
        "persona_name": "Science vs Faith",
        "is_pro": True,
        "emoji": "✝️",
        "sort_order": 8,
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Meaning of Life",
        "description": "A philosophical clash on what gives human life meaning and purpose.",
        "topic_preset": "Life has inherent meaning independent of human consciousness",
        "persona_name": "Philosopher Kings",
        "is_pro": True,
        "emoji": "🌌",
        "sort_order": 9,
    },
]


# ---------------------------------------------------------------------------
# Seed logic
# ---------------------------------------------------------------------------

async def seed():
    await init_db()

    async with _session() as db:
        # --- Seed personas ---
        inserted_personas = 0
        skipped_personas = 0
        for p in TEMPLATE_PERSONAS:
            result = await db.execute(
                text("SELECT id FROM personas WHERE name = :name AND is_template = true"),
                {"name": p["name"]},
            )
            existing = result.fetchone()
            if existing:
                # Update the in-memory id to match DB for template linking
                p["id"] = str(existing[0])
                skipped_personas += 1
                continue

            await db.execute(
                text(
                    "INSERT INTO personas "
                    "(id, user_id, name, advocate_name, advocate_description, "
                    "devil_name, devil_description, is_template, is_pro_only) "
                    "VALUES (:id, NULL, :name, :adv_name, :adv_desc, "
                    ":dev_name, :dev_desc, true, :is_pro_only)"
                ),
                {
                    "id": p["id"],
                    "name": p["name"],
                    "adv_name": p["advocate_name"],
                    "adv_desc": p["advocate_description"],
                    "dev_name": p["devil_name"],
                    "dev_desc": p["devil_description"],
                    "is_pro_only": p["is_pro_only"],
                },
            )
            inserted_personas += 1

        await db.commit()
        print(f"Personas: {inserted_personas} inserted, {skipped_personas} skipped")

        # --- Seed debate templates ---
        inserted_templates = 0
        skipped_templates = 0
        for t in DEBATE_TEMPLATES:
            result = await db.execute(
                text("SELECT id FROM debate_templates WHERE name = :name"),
                {"name": t["name"]},
            )
            if result.fetchone():
                skipped_templates += 1
                continue

            persona = _persona_by_name.get(t["persona_name"])
            persona_id = persona["id"] if persona else None

            await db.execute(
                text(
                    "INSERT INTO debate_templates "
                    "(id, name, description, topic_preset, persona_id, is_pro, emoji, sort_order) "
                    "VALUES (:id, :name, :desc, :topic, :persona_id, :is_pro, :emoji, :sort_order)"
                ),
                {
                    "id": t["id"],
                    "name": t["name"],
                    "desc": t["description"],
                    "topic": t["topic_preset"],
                    "persona_id": persona_id,
                    "is_pro": t["is_pro"],
                    "emoji": t["emoji"],
                    "sort_order": t["sort_order"],
                },
            )
            inserted_templates += 1

        await db.commit()
        print(f"Templates: {inserted_templates} inserted, {skipped_templates} skipped")

    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
