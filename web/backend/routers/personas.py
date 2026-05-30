"""Persona CRUD endpoints — Pro users can create/update/delete custom personas."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text

from auth.middleware import get_current_user, get_current_pro_user
from database import _session

router = APIRouter(prefix="/personas", tags=["personas"])

CUSTOM_PERSONA_LIMIT = 10


# --- Schemas ---

class PersonaCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    advocate_name: str = Field(..., min_length=1, max_length=100)
    advocate_description: str = Field(..., min_length=1, max_length=500)
    devil_name: str = Field(..., min_length=1, max_length=100)
    devil_description: str = Field(..., min_length=1, max_length=500)


class PersonaUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    advocate_name: str | None = Field(default=None, max_length=100)
    advocate_description: str | None = Field(default=None, max_length=500)
    devil_name: str | None = Field(default=None, max_length=100)
    devil_description: str | None = Field(default=None, max_length=500)


# --- Endpoints ---

@router.get("")
async def list_personas(user: dict = Depends(get_current_user)):
    """List all personas: system templates + user's custom personas."""
    user_id = user["id"]

    async with _session() as db:
        # Templates (is_template=true, user_id IS NULL)
        result = await db.execute(
            text(
                "SELECT id, name, advocate_name, devil_name, is_pro_only "
                "FROM personas WHERE is_template = true ORDER BY name"
            )
        )
        templates = [dict(r) for r in result.mappings().fetchall()]

        # Custom personas owned by user
        result = await db.execute(
            text(
                "SELECT id, name, advocate_name, advocate_description, "
                "devil_name, devil_description, created_at "
                "FROM personas WHERE user_id = :uid AND is_template = false "
                "ORDER BY created_at DESC"
            ),
            {"uid": user_id},
        )
        custom = [dict(r) for r in result.mappings().fetchall()]

        # Convert datetime to ISO string
        for p in custom:
            if p.get("created_at"):
                p["created_at"] = str(p["created_at"])

    return {
        "templates": templates,
        "custom": custom,
        "custom_count": len(custom),
        "custom_limit": CUSTOM_PERSONA_LIMIT,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_persona(
    data: PersonaCreate,
    user: dict = Depends(get_current_pro_user),
):
    """Create a custom persona (Pro only, max 10)."""
    user_id = user["id"]

    async with _session() as db:
        # Check limit
        result = await db.execute(
            text(
                "SELECT COUNT(*) as cnt FROM personas "
                "WHERE user_id = :uid AND is_template = false"
            ),
            {"uid": user_id},
        )
        count = result.scalar() or 0
        if count >= CUSTOM_PERSONA_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Persona limit reached (max 10)",
            )

        import uuid
        persona_id = str(uuid.uuid4())

        await db.execute(
            text(
                "INSERT INTO personas (id, user_id, name, advocate_name, "
                "advocate_description, devil_name, devil_description, "
                "is_template, is_pro_only) "
                "VALUES (:id, :uid, :name, :adv_name, :adv_desc, "
                ":dev_name, :dev_desc, false, false)"
            ),
            {
                "id": persona_id,
                "uid": user_id,
                "name": data.name,
                "adv_name": data.advocate_name,
                "adv_desc": data.advocate_description,
                "dev_name": data.devil_name,
                "dev_desc": data.devil_description,
            },
        )
        await db.commit()

        # Fetch created persona
        result = await db.execute(
            text(
                "SELECT id, name, advocate_name, advocate_description, "
                "devil_name, devil_description, created_at "
                "FROM personas WHERE id = :id"
            ),
            {"id": persona_id},
        )
        persona = dict(result.mappings().fetchone())
        if persona.get("created_at"):
            persona["created_at"] = str(persona["created_at"])

    return persona


@router.put("/{persona_id}")
async def update_persona(
    persona_id: str,
    data: PersonaUpdate,
    user: dict = Depends(get_current_pro_user),
):
    """Update a custom persona (Pro only, owner only)."""
    user_id = user["id"]

    async with _session() as db:
        # Check ownership
        result = await db.execute(
            text(
                "SELECT id, user_id, is_template FROM personas WHERE id = :id"
            ),
            {"id": persona_id},
        )
        row = result.mappings().fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persona not found",
            )
        if row["is_template"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot edit template personas",
            )
        if row["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        # Build dynamic update
        updates = {}
        if data.name is not None:
            updates["name"] = data.name
        if data.advocate_name is not None:
            updates["advocate_name"] = data.advocate_name
        if data.advocate_description is not None:
            updates["advocate_description"] = data.advocate_description
        if data.devil_name is not None:
            updates["devil_name"] = data.devil_name
        if data.devil_description is not None:
            updates["devil_description"] = data.devil_description

        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )

        set_clause = ", ".join(f"{k} = :{k}" for k in updates)
        updates["id"] = persona_id
        await db.execute(
            text(f"UPDATE personas SET {set_clause}, updated_at = now() WHERE id = :id"),
            updates,
        )
        await db.commit()

        # Fetch updated
        result = await db.execute(
            text(
                "SELECT id, name, advocate_name, advocate_description, "
                "devil_name, devil_description, created_at, updated_at "
                "FROM personas WHERE id = :id"
            ),
            {"id": persona_id},
        )
        persona = dict(result.mappings().fetchone())
        for k in ("created_at", "updated_at"):
            if persona.get(k):
                persona[k] = str(persona[k])

    return persona


@router.delete("/{persona_id}")
async def delete_persona(
    persona_id: str,
    user: dict = Depends(get_current_pro_user),
):
    """Delete a custom persona (Pro only, owner only)."""
    user_id = user["id"]

    async with _session() as db:
        result = await db.execute(
            text(
                "SELECT id, user_id, is_template FROM personas WHERE id = :id"
            ),
            {"id": persona_id},
        )
        row = result.mappings().fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persona not found",
            )
        if row["is_template"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete template personas",
            )
        if row["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        await db.execute(
            text("DELETE FROM personas WHERE id = :id"),
            {"id": persona_id},
        )
        await db.commit()

    return {"message": "Persona deleted"}
