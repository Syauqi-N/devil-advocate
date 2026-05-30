import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8001"

export async function GET(req: NextRequest) {
  const session = await auth()

  const headers: Record<string, string> = {}
  if (session?.user) {
    headers["x-user-id"] = (session.user as any).googleId ?? (session.user as any).id ?? ""
    headers["x-user-email"] = session.user.email ?? ""
    headers["x-user-name"] = session.user.name ?? ""
    headers["x-user-avatar"] = session.user.image ?? ""
    headers["cookie"] = req.headers.get("cookie") ?? ""
  }

  const res = await fetch(`${API_URL}/templates`, {
    cache: "no-store",
    headers,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
