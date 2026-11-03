interface Env {
  GEMINI_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  ASSETS: { fetch: (r: Request) => Promise<Response> }
}
const SYSTEM = `Eres VELOCITY BRAIN, asistente de atletismo especializado en 100 m, 200 m, 400 m y 400 m con vallas.
Distingue observaciones de hipótesis. No inventes mediciones. No diagnostiques lesiones ni prescribas tratamientos.
Si faltan datos, pídelos. Responde en español, claro y breve.`
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname !== '/api/chat') return env.ASSETS.fetch(req)
    if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!token) return json({ error: 'Sin sesión' }, 401)
    const u = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY } })
    if (!u.ok) return json({ error: 'Sesión inválida' }, 401)
    const body = (await req.json().catch(() => null)) as { messages?: { role: string; content: string }[] } | null
    const msgs = (body?.messages ?? []).slice(-12)
    if (!msgs.length || msgs.some((m) => typeof m.content !== 'string' || m.content.length > 2000)) return json({ error: 'Mensaje inválido' }, 400)
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      }),
    })
    if (!r.ok) return json({ error: 'Error del modelo' }, 502)
    const d = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    return json({ reply: d.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '' })
  },
}
