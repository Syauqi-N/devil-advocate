import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8001"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const res = await fetch(`${API_URL}/debate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": (session.user as any).googleId ?? (session.user as any).id ?? "",
      "x-user-email": session.user.email ?? "",
      "x-user-name": session.user.name ?? "",
      "x-user-avatar": session.user.image ?? "",
      "cookie": req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error: text }, { status: res.status })
  }

  // Backend returns SSE stream — pipe it directly to client
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
