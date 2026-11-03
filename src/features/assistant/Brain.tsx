import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Activity, BarChart3, CalendarDays, Globe, HeartPulse, Send, SquarePen, Trophy, Zap } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../auth/AuthContext'

type Src = { uri: string; title: string }
type Msg = { role: 'user' | 'assistant'; content: string; at: string; src?: Src[]; sug?: string }
const CHIPS = [
  { icon: Zap, label: 'Salida', q: '¿Cómo mejoro mi salida y los primeros 30 m?' },
  { icon: Globe, label: 'Noticias', q: '¿Cuáles son las últimas noticias y resultados del atletismo esta semana?' },
  { icon: Trophy, label: 'Récords', q: '¿Cuáles son los récords mundiales actuales de 100, 200 y 400 m y 400 m vallas?' },
  { icon: Activity, label: 'Técnica', q: 'Dame 3 correcciones técnicas clave para mi carrera.' },
  { icon: CalendarDays, label: 'Plan semanal', q: 'Arma mi plan de entrenamiento de esta semana.' },
  { icon: HeartPulse, label: 'Recuperación', q: '¿Cómo me recupero mejor entre sesiones?' },
  { icon: BarChart3, label: 'Mi análisis', q: 'Explícame los resultados de mi último análisis y qué mejorar.' },
]
const hhmm = (d: string) => new Date(d).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

function Avatar({ size = 36 }: { size?: number }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyanx to-electric shadow-lg shadow-cyan-500/20" style={{ width: size, height: size }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 64 64">
        <path d="M16 18 L32 46 L48 18" fill="none" stroke="#04121a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

async function buildContext() {
  const parts: string[] = []
  const pb = await supabase.from('personal_bests').select('event,mark_seconds')
  const pbs = (pb.data ?? []) as { event: string; mark_seconds: number }[]
  if (pbs.length) parts.push('Marcas personales: ' + pbs.map((p) => `${p.event} ${p.mark_seconds}s`).join(', '))
  const j = await supabase.from('analysis_jobs').select('id,created_at,params').eq('status', 'completed').order('created_at', { ascending: false }).limit(1)
  const job = (j.data?.[0] ?? null) as { id: string; created_at: string; params: { event?: string } | null } | null
  if (job) {
    const r = await supabase.from('analysis_results').select('metric,value,unit').eq('job_id', job.id)
    const rows = (r.data ?? []) as { metric: string; value: number | null; unit: string }[]
    const lines = rows.filter((x) => x.value != null).map((x) => `${x.metric}: ${x.value} ${x.unit}`)
    parts.push(`Último análisis (${job.params?.event ?? ''}, ${new Date(job.created_at).toLocaleDateString('es')}):\n${lines.join('\n')}`)
  }
  return parts.join('\n')
}

export default function Brain() {
  const { session } = useAuth()
  const uid = session?.user.id
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const conv = useRef<string | null>(null)
  const ctx = useRef('')
  const end = useRef<HTMLDivElement>(null)
  const ta = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void (async () => {
      ctx.current = await buildContext()
      const c = await supabase.from('conversations').select('id').order('created_at', { ascending: false }).limit(1)
      const id = (c.data?.[0] as { id: string } | undefined)?.id
      if (!id) return
      conv.current = id
      const m = await supabase.from('messages').select('role,content,created_at').eq('conversation_id', id).order('created_at').limit(60)
      const rows = (m.data ?? []) as { role: 'user' | 'assistant'; content: string; created_at: string }[]
      setMsgs(rows.map((x) => ({ role: x.role, content: x.content, at: x.created_at })))
    })()
  }, [])

  useEffect(() => { end.current?.scrollIntoView({ behavior: busy ? 'auto' : 'smooth', block: 'end' }) }, [msgs, busy])

  function reset() { conv.current = null; setMsgs([]) }

  async function send(q?: string) {
    const t = (q ?? text).trim()
    if (!t || busy || !uid) return
    const history: Msg[] = [...msgs, { role: 'user', content: t, at: new Date().toISOString() }]
    const botAt = new Date().toISOString()
    let src: Src[] = []
    let sug = ''
    const show = (c: string) => setMsgs([...history, { role: 'assistant', content: c, at: botAt, src, sug }])
    show(''); setText(''); setBusy(true)
    if (ta.current) ta.current.style.height = 'auto'
    let acc = ''
    let ok = false
    try {
      const { data } = await supabase.auth.getSession()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), context: ctx.current }),
      })
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; detail?: string }
        throw new Error(j.detail ? `${j.error} · ${j.detail}` : (j.error ?? 'Error de conexión'))
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true }).replace(/\r/g, '')
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.split('\n').find((l) => l.startsWith('data:'))
          if (!line) continue
          try {
            const d = JSON.parse(line.slice(5)) as { candidates?: { content?: { parts?: { text?: string }[] }; groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[]; searchEntryPoint?: { renderedContent?: string } } }[] }
            const cand = d.candidates?.[0]
            acc += cand?.content?.parts?.map((x) => x.text ?? '').join('') ?? ''
            const gm = cand?.groundingMetadata
            if (gm?.groundingChunks?.length) src = gm.groundingChunks.flatMap((g) => (g.web?.uri ? [{ uri: g.web.uri, title: g.web.title ?? g.web.uri }] : []))
            if (gm?.searchEntryPoint?.renderedContent) sug = gm.searchEntryPoint.renderedContent
            show(acc)
          } catch { /* fragmento incompleto */ }
        }
      }
      ok = acc.length > 0
      if (!ok) { acc = 'No recibí respuesta. Intenta de nuevo.'; show(acc) }
    } catch (e) {
      acc = '⚠️ ' + (e instanceof Error ? e.message : 'Error')
      show(acc)
    }
    if (ok) {
      try {
        if (!conv.current) {
          const c = await supabase.from('conversations').insert({ user_id: uid, title: t.slice(0, 40) }).select('id').single()
          if (c.error) throw c.error
          conv.current = (c.data as { id: string }).id
        }
        await supabase.from('messages').insert({ user_id: uid, conversation_id: conv.current, role: 'user', content: t })
        await supabase.from('messages').insert({ user_id: uid, conversation_id: conv.current, role: 'assistant', content: acc })
      } catch { /* el historial es opcional */ }
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-[calc(100dvh-150px)] flex-col px-4">
      <div className="glass mb-3 flex items-center gap-3 rounded-3xl p-3">
        <Avatar size={42} />
        <div className="flex-1">
          <p className="font-semibold leading-tight">Coach IA</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-lime" /> En línea · busca en internet</p>
        </div>
        <button onClick={reset} aria-label="Nueva conversación" className="btn btn-ghost btn-sm"><SquarePen size={16} /></button>
      </div>

      <div className="flex-1 space-y-4 pb-4">
        {!msgs.length && (
          <div className="flex flex-col items-center gap-3 px-6 pt-10 text-center">
            <Avatar size={72} />
            <p className="text-xl font-bold">¡Vamos a mejorar tu marca!</p>
            <p className="text-sm text-slate-400">Pregúntame de atletismo y otros deportes: técnica, planes, resultados, récords y noticias de última hora.</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && <Avatar />}
            <div className={`max-w-[84%] ${m.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block px-4 py-3 text-left text-[15px] ${m.role === 'user' ? 'rounded-3xl rounded-tr-md border border-white/15 bg-gradient-to-br from-electric/40 to-violetx/40' : 'glass rounded-3xl rounded-tl-md !border-cyanx/25'}`}>
                {m.role === 'assistant' && !m.content ? (
                  <span className="flex gap-1 py-1">
                    {[0, 1, 2].map((d) => <motion.span key={d} className="h-2 w-2 rounded-full bg-cyanx" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.15 }} />)}
                  </span>
                ) : (
                  <div className="md"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                )}
              </div>
              {!!m.src?.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.src.slice(0, 5).map((x, k) => (
                    <a key={k} href={x.uri} target="_blank" rel="noreferrer" className="glass max-w-[180px] truncate rounded-full px-3 py-1 text-[11px] text-cyanx">{x.title}</a>
                  ))}
                </div>
              )}
              {m.sug && <iframe title="Sugerencias de Google" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={m.sug} className="mt-2 h-12 w-full rounded-2xl border-0" />}
              <p className="mt-1 text-[10px] text-slate-500">{hhmm(m.at)}</p>
            </div>
          </motion.div>
        ))}
        <div ref={end} />
      </div>

      <div className="sticky bottom-[92px] z-10 space-y-2 pb-2">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {CHIPS.map(({ icon: Icon, label, q }) => (
            <button key={label} onClick={() => send(q)} disabled={busy} className="glass flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs text-slate-200">
              <Icon size={14} className="text-cyanx" /> {label}
            </button>
          ))}
        </div>
        <div className="glass flex items-end gap-2 rounded-3xl p-2">
          <textarea
            ref={ta}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + 'px' }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            placeholder="Escribe a tu Coach IA…"
            className="max-h-[120px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-slate-500"
          />
          <button onClick={() => send()} disabled={busy || !text.trim()} className="btn btn-primary !rounded-full !p-3"><Send size={18} /></button>
        </div>
      </div>
    </div>
  )
}
