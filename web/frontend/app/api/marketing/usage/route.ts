import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8001"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const googleId = (session.user as any).googleId ?? session.user.id
  const headers = {
    "x-user-id": googleId,
    "x-user-email": session.user.email ?? "",
    "x-user-name": session.user.name ?? "",
    "x-user-avatar": session.user.image ?? "",
    "cookie": req.headers.get("cookie") ?? "",
  }

  const res = await fetch(`${API_URL}/marketing/me/usage`, {
    cache: "no-store",
    headers,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
