/**
 * Catch-all proxy: forwards /api/proxy/* → FastAPI backend at localhost:8001
 * Preserves method, headers, and body.
 */
import { NextRequest, NextResponse } from "next/server"

const BACKEND = "http://127.0.0.1:8001"

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/")
  const search = req.nextUrl.search ?? ""
  const url = `${BACKEND}/${path}${search}`

  const headers = new Headers()
  req.headers.forEach((value, key) => {
    // Skip headers that should not be forwarded
    if (!["host", "connection", "transfer-encoding"].includes(key.toLowerCase())) {
      headers.set(key, value)
    }
  })

  const body = req.method !== "GET" && req.method !== "HEAD"
    ? await req.arrayBuffer()
    : undefined

  const res = await fetch(url, {
    method: req.method,
    headers,
    body: body ? Buffer.from(body) : undefined,
  })

  const resHeaders = new Headers()
  res.headers.forEach((value, key) => {
    if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
      resHeaders.set(key, value)
    }
  })

  return new NextResponse(res.body, {
    status: res.status,
    headers: resHeaders,
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
