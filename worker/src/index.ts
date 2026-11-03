interface Env {
  GEMINI_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  ASSETS: { fetch: (r: Request) => Promise<Response> }
}
const SYSTEM = `Eres Coach IA, entrenador virtual de atletismo especializado en 100 m, 200 m, 400 m y 400 m con vallas.
Habla en español, cercano y motivador, con frases claras y prácticas. Usa listas cortas y negritas cuando ayuden.
Distingue observaciones de hipótesis. No inventes mediciones: si faltan datos, pídelos. Los datos del atleta son estimaciones de video 2D.
No diagnostiques lesiones ni prescribas tratamientos: ante dolor, recomienda consultar a un profesional.
Cierra con una pregunta o un siguiente paso concreto.`
const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest']
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
    const body = (await req.json().catch(() => null)) as { messages?: { role: string; content: string }[]; context?: string } | null
    const msgs = (body?.messages ?? []).slice(-12)
    if (!msgs.length || msgs.some((m) => typeof m.content !== 'string' || m.content.length > 2000)) return json({ error: 'Mensaje inválido' }, 400)
    const sys = SYSTEM + (typeof body?.context === 'string' && body.context ? `\n\nDatos guardados del atleta (estimados):\n${body.context.slice(0, 1500)}` : '')
    let detail = ''
    for (const model of MODELS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        }),
      })
      if (r.ok && r.body) return new Response(r.body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' } })
      detail = `${model} ${r.status}: ` + (await r.text()).replace(/\s+/g, ' ').slice(0, 200)
    }
    return json({ error: 'Error del modelo', detail }, 502)
  },
}
