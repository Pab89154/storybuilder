import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const DEFAULT_MODEL = "gemini-3.6-flash"

/** Tried once when the requested model answers 503/429 (capacity, not a bad prompt). */
const OVERLOAD_FALLBACKS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

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

/** Lightweight mirror of StoryBuilder’s client content filter (kid-friendly). */
function normalizeSafetyText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const SAFETY_PATTERNS: RegExp[] = [
  /\b(porn|porno|xxx|nsfw|hentai|nude|nudes|naked|nudity|erotic|erotica)\b/i,
  /\b(sex\s*tape|blow\s*job|orgasm|incest|loli|shota|pedo|child\s*porn)\b/i,
  /\b(sexy|seductive|lingerie|strip(per|tease)?|prostitut)\b/i,
  /\b(how\s+to\s+(kill|murder|make\s+a?\s*bomb)|behead|torture\s+methods?)\b/i,
  /\b(kill\s+all\s+|heil\s+hitler|white\s+power)\b/i,
  /\b(how\s+to\s+(buy|sell|make)\s+(cocaine|heroin|fentanyl|meth))\b/i,
  /\b(suicide\s+methods?|how\s+to\s+(kill|end)\s+(myself|my\s+life))\b/i,
  /\b(cocaine|heroin|fentanyl|methamphetamine)\b/i,
]

function checkMessagesSafety(messages: ChatMessage[]): string | null {
  const combined = messages
    .filter((m) => m.role !== "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n")
  const q = normalizeSafetyText(combined)
  if (!q) return null
  if (SAFETY_PATTERNS.some((re) => re.test(q))) {
    return "StoryBuilder can’t process inappropriate content. Keep stories kid-friendly."
  }
  return null
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientGeminiFailure(status: number, detail: string): boolean {
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true
  }
  return /UNAVAILABLE|high demand|RESOURCE_EXHAUSTED|overloaded/i.test(detail)
}

function geminiEndpoint(model: string, stream: boolean, geminiKey: string): string {
  const action = stream ? "streamGenerateContent?alt=sse" : "generateContent"
  const joiner = stream ? "&" : "?"
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}${joiner}key=${encodeURIComponent(geminiKey)}`
}

type GeminiAttempt =
  | { kind: "ok"; response: Response }
  | { kind: "fatal"; status: number; detail: string }
  | { kind: "transient"; status: number; detail: string }

async function attemptGemini(
  model: string,
  stream: boolean,
  geminiKey: string,
  geminiBody: unknown,
): Promise<GeminiAttempt> {
  try {
    const upstream = await fetch(geminiEndpoint(model, stream, geminiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    })
    if (upstream.ok && upstream.body) return { kind: "ok", response: upstream }
    const detail = await upstream.text().catch(() => "")
    if (isTransientGeminiFailure(upstream.status, detail)) {
      return { kind: "transient", status: upstream.status, detail }
    }
    return {
      kind: "fatal",
      status: upstream.status || 502,
      detail: detail || "Gemini request failed",
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "network error"
    return { kind: "transient", status: 503, detail }
  }
}

/** One short retry on the requested model, then a single fallback model. */
async function generateWithFallback(
  model: string,
  stream: boolean,
  geminiKey: string,
  geminiBody: unknown,
): Promise<GeminiAttempt> {
  const fallback = OVERLOAD_FALLBACKS.find((candidate) => candidate !== model)
  const candidates = fallback ? [model, fallback] : [model]
  let lastTransient: GeminiAttempt & { kind: "transient" } = {
    kind: "transient",
    status: 503,
    detail: "",
  }

  for (let index = 0; index < candidates.length; index++) {
    const attempts = index === 0 ? 2 : 1
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) await sleep(800)
      else if (index > 0) await sleep(300)
      const result = await attemptGemini(candidates[index], stream, geminiKey, geminiBody)
      if (result.kind === "ok") return result
      if (result.kind === "fatal") {
        // A missing fallback model should not replace the original overload error.
        if (index > 0) return lastTransient
        return result
      }
      lastTransient = result
    }
  }

  return lastTransient
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

  const safetyError = checkMessagesSafety(payload.messages)
  if (safetyError) {
    return new Response(JSON.stringify({ error: safetyError }), {
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

  const attempt = await generateWithFallback(model, stream, geminiKey, geminiBody)
  if (attempt.kind === "fatal") {
    return new Response(attempt.detail || JSON.stringify({ error: "Gemini request failed" }), {
      status: attempt.status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    })
  }
  if (attempt.kind === "transient") {
    const quota =
      attempt.status === 429 ||
      /RESOURCE_EXHAUSTED|quota exceeded|rate[- ]?limit/i.test(attempt.detail)
    const overload =
      attempt.status === 503 ||
      /UNAVAILABLE|high demand|overloaded/i.test(attempt.detail)
    if (quota && !overload) {
      return new Response(
        JSON.stringify({
          error: {
            code: 429,
            message: "Resource has been exhausted (e.g. check quota).",
            status: "RESOURCE_EXHAUSTED",
          },
        }),
        {
          status: 429,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      )
    }
    if (overload || attempt.status === 503) {
      return new Response(
        JSON.stringify({
          error: {
            code: 503,
            message: "The story AI is busy right now. Please try again in a moment.",
            status: "UNAVAILABLE",
          },
        }),
        {
          status: 503,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      )
    }
    return new Response(attempt.detail || JSON.stringify({ error: "Gemini request failed" }), {
      status: attempt.status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    })
  }

  const upstream = attempt.response

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
