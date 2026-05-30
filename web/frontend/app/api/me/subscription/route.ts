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

  // Fetch subscription status + usage in parallel
  const [subRes, usageRes] = await Promise.all([
    fetch(`${API_URL}/subscription/me`, { cache: "no-store", headers }),
    fetch(`${API_URL}/me/usage`, { cache: "no-store", headers }),
  ])

  const subData = await subRes.json()
  const usageData = usageRes.ok ? await usageRes.json() : { used: 0, limit: 1, remaining: 1 }

  // Merge: subscription fields + debates_today + debates_limit
  const merged = {
    ...subData,
    debates_today: usageData.used ?? 0,
    debates_limit: usageData.limit === -1 ? null : (usageData.limit ?? 1),
  }

  return NextResponse.json(merged, { status: subRes.status })
}
