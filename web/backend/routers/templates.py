"""Templates endpoint — list all debate templates with persona info."""

from fastapi import APIRouter, Depends
from sqlalchemy import text

from auth.middleware import get_current_user
from database import _session

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("")
async def list_templates(user: dict = Depends(get_current_user)):
    """List all debate templates with linked persona info."""
    async with _session() as db:
        result = await db.execute(
            text(
                """
                SELECT
                    t.id, t.name, t.description, t.topic_preset,
                    t.is_pro, t.emoji, t.sort_order,
                    p.id AS persona_id,
                    p.name AS persona_name,
                    p.advocate_name AS persona_advocate_name,
                    p.devil_name AS persona_devil_name
                FROM debate_templates t
                LEFT JOIN personas p ON t.persona_id = p.id
                ORDER BY t.sort_order, t.name
                """
            )
        )
        rows = result.mappings().fetchall()

    items = []
    for r in rows:
        persona = None
        if r.get("persona_id"):
            persona = {
                "id": r["persona_id"],
                "name": r["persona_name"],
                "advocate_name": r["persona_advocate_name"],
                "devil_name": r["persona_devil_name"],
            }
        items.append({
            "id": r["id"],
            "name": r["name"],
            "description": r["description"],
            "topic_preset": r["topic_preset"],
            "persona": persona,
            "is_pro": r["is_pro"],
            "emoji": r["emoji"],
            "sort_order": r["sort_order"],
        })

    return {"items": items}
