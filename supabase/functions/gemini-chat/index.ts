import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const DEFAULT_MODEL = "gemini-3.6-flash"

const ALLOWED_ORIGINS = new Set([
  "https://storybuilder.pw",
  "https://www.storybuilder.pw",
  "https://pab89154.github.io",
  "http://localhost:5173",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5175",
])

type ChatMessage = { role?: string; content?: string }

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

function toGeminiBody(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
) {
  const systemParts: string[] = []
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = []

  for (const message of messages) {
    const text = typeof message.content === "string" ? message.content : ""
    if (!text.trim()) continue
    const role = message.role ?? "user"
    if (role === "system") {
      systemParts.push(text)
      continue
    }
    contents.push({
      role: role === "assistant" ? "model" : "user",
      parts: [{ text }],
    })
  }

  // Gemini requires contents to start with a user turn.
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Continue." }] })
  } else if (contents[0].role !== "user") {
    contents.unshift({ role: "user", parts: [{ text: "Please continue." }] })
  }

  return {
    ...(systemParts.length
      ? { systemInstruction: { parts: [{ text: systemParts.join("\n\n") }] } }
      : {}),
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  }
}

function extractGeminiText(payload: unknown): string {
  const json = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string }
  }
  if (json.error?.message) throw new Error(json.error.message)
  const parts = json.candidates?.[0]?.content?.parts ?? []
  return parts.map((part) => part.text ?? "").join("")
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

  const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim()
  if (!geminiKey) {
    return new Response(
      JSON.stringify({
        error: "GEMINI_API_KEY is not configured on the server",
      }),
      {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    )
  }

  let payload: {
    messages?: ChatMessage[]
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

  const requested =
    typeof payload.model === "string" && payload.model.trim()
      ? payload.model.trim()
      : DEFAULT_MODEL
  // Map retired model IDs so older frontend builds keep working.
  const retired: Record<string, string> = {
    "gemini-2.0-flash": DEFAULT_MODEL,
    "gemini-2.0-flash-001": DEFAULT_MODEL,
    "gemini-1.5-flash": DEFAULT_MODEL,
    "gemini-1.5-flash-latest": DEFAULT_MODEL,
  }
  const model = retired[requested] ?? requested
  const temperature =
    typeof payload.temperature === "number" ? payload.temperature : 0.8
  const maxTokens =
    typeof payload.max_tokens === "number" ? payload.max_tokens : 1024
  const stream = payload.stream !== false
  const geminiBody = toGeminiBody(payload.messages, temperature, maxTokens)

  const endpoint = stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(geminiKey)}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody),
  })

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => upstream.statusText)
    return new Response(detail || JSON.stringify({ error: "Gemini request failed" }), {
      status: upstream.status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    })
  }

  if (!stream) {
    try {
      const json = await upstream.json()
      const content = extractGeminiText(json)
      return new Response(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content } }],
        }),
        {
          status: 200,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gemini parse failed"
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      })
    }
  }

  // Convert Gemini SSE → OpenAI-compatible SSE so the browser client stays simple.
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  ;(async () => {
    const reader = upstream.body!.getReader()
    let buffer = ""
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line.startsWith("data:")) continue
          const data = line.slice(5).trim()
          if (!data || data === "[DONE]") continue
          try {
            const parsed = JSON.parse(data)
            const text = extractGeminiText(parsed)
            if (!text) continue
            const chunk = {
              choices: [{ delta: { content: text } }],
            }
            await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
          } catch {
            /* skip malformed */
          }
        }
      }
      await writer.write(encoder.encode("data: [DONE]\n\n"))
    } catch (error) {
      const message = error instanceof Error ? error.message : "stream failed"
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ error: { message } })}\n\n`),
      )
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    status: 200,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
})
