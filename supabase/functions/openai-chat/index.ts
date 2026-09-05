import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const DEFAULT_MODEL = "gpt-4o-mini"

const ALLOWED_ORIGINS = new Set([
  "https://storybuilder.pw",
  "https://www.storybuilder.pw",
  "https://pab89154.github.io",
  "http://localhost:5173",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5175",
])

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") ?? ""
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://storybuilder.pw"
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders(req),
    })
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim()
  if (!openaiKey) {
    return new Response(
      JSON.stringify({
        error: "OPENAI_API_KEY is not configured on the server",
      }),
      {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    )
  }

  let payload: {
    messages?: unknown
    model?: string
    temperature?: number
    max_tokens?: number
    stream?: boolean
  }

  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    })
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages are required" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    })
  }

  const stream = payload.stream !== false
  const body = {
    model: typeof payload.model === "string" && payload.model
      ? payload.model
      : DEFAULT_MODEL,
    messages: payload.messages,
    temperature: typeof payload.temperature === "number"
      ? payload.temperature
      : 0.8,
    max_tokens: typeof payload.max_tokens === "number"
      ? payload.max_tokens
      : 1024,
    stream,
  }

  const upstream = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => upstream.statusText)
    return new Response(detail || JSON.stringify({ error: "OpenAI request failed" }), {
      status: upstream.status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    })
  }

  if (!stream) {
    const text = await upstream.text()
    return new Response(text, {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    })
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
})
