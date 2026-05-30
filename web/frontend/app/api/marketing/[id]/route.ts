import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8001"

function authHeaders(session: any, req: NextRequest) {
  return {
    "Content-Type": "application/json",
    "x-user-id": (session.user as any).googleId ?? (session.user as any).id ?? "",
    "x-user-email": session.user.email ?? "",
    "x-user-name": session.user.name ?? "",
    "x-user-avatar": session.user.image ?? "",
    "cookie": req.headers.get("cookie") ?? "",
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const res = await fetch(`${API_URL}/marketing/${params.id}`, {
    cache: "no-store",
    headers: authHeaders(session, req),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
