interface Env {
  GEMINI_API_KEY?: string
  GEMINI_API_ATLETISMO?: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  ASSETS: { fetch: (r: Request) => Promise<Response> }
}
const SYSTEM = `Eres Coach IA, el cerebro deportivo de VELOCITY AI. Tu especialidad es el atletismo (100 m, 200 m, 400 m y 400 m con vallas), y también respondes sobre otros deportes y temas relacionados: entrenamiento, fuerza y acondicionamiento, fisiología del ejercicio, biomecánica, nutrición deportiva, recuperación, competiciones, resultados, récords y noticias.
Tienes búsqueda en internet: úsala para resultados recientes, récords, rankings, calendarios, reglamentos y noticias, y siempre que no estés seguro de un dato. Prioriza fuentes oficiales (World Athletics, federaciones, organizadores, medios deportivos reconocidos). Si las fuentes no coinciden o no encuentras el dato, dilo; nunca inventes cifras, marcas ni fechas.
Si la pregunta no tiene relación con deporte, actividad física o salud deportiva, responde en una frase que solo ayudas con deporte y propón una pregunta deportiva relacionada.
Estilo: español, cercano y motivador, claro y práctico; usa listas cortas y negritas cuando ayuden. Distingue hechos de hipótesis. Los datos de análisis del atleta son estimaciones de video 2D.
Seguridad: no diagnostiques lesiones ni prescribas tratamientos, medicamentos o dosis de suplementos; ante dolor, mareos o dudas médicas, recomienda a un profesional. No ayudes con dopaje.
Cierra con un siguiente paso concreto.`
const ATTEMPTS: [string, boolean][] = [['gemini-2.5-flash', true], ['gemini-2.5-flash', false], ['gemini-flash-latest', true]]
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
    const today = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    const ctx = typeof body?.context === 'string' && body.context ? `\n\nDatos guardados del atleta (estimados):\n${body.context.slice(0, 1500)}` : ''
    const sys = `${SYSTEM}\n\nHoy es ${today}.${ctx}`
    const key = (env.GEMINI_API_KEY || '').trim()
    let detail = ''
    let quota = false
    for (const [model, search] of ATTEMPTS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { temperature: 0.6 },
          ...(search ? { tools: [{ google_search: {} }] } : {}),
        }),
      })
      if (r.ok && r.body) return new Response(r.body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' } })
      const t = (await r.text()).replace(/\s+/g, ' ')
      if (/API key not valid|API_KEY_INVALID/i.test(t)) return json({ error: 'La clave de Gemini no es válida. Cámbiala en Cloudflare (GEMINI_API_KEY).' }, 502)
      quota = quota || r.status === 429
      detail = `${model} ${r.status}: ` + t.slice(0, 160)
    }
    if (quota) return json({ error: 'Se agotó el cupo gratis de Gemini por ahora. Intenta en unos minutos.' }, 429)
    return json({ error: 'Error del modelo', detail }, 502)
  },
}
