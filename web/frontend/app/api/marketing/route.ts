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

// POST /api/marketing/start
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.text()
  const res = await fetch(`${API_URL}/marketing/start`, {
    method: "POST",
    headers: authHeaders(session, req),
    body,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: res.statusText }))
    return NextResponse.json(data, { status: res.status })
  }

  // Pipe SSE stream
  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

// GET /api/marketing — list sessions
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const search = req.nextUrl.search ?? ""
  const res = await fetch(`${API_URL}/marketing${search}`, {
    cache: "no-store",
    headers: authHeaders(session, req),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
