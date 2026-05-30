import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8001"

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const res = await fetch(`${API_URL}/marketing/share/${params.token}`, {
    cache: "no-store",
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
