import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8001"

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    const res = await fetch(`${API_URL}/subscription/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
      cache: "no-store",
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error("[webhook] error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
