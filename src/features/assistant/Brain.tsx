import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { Screen } from '../../components/ui'

type Msg = { role: 'user' | 'assistant'; content: string }
const IDEAS = ['¿Cómo mejoro mi salida en 100 m?', 'Explícame la inclinación del tronco', 'Ritmo entre vallas en 400 m']

export default function Brain() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  async function send(q?: string) {
    const t = (q ?? text).trim()
    if (!t || busy) return
    const next = [...msgs, { role: 'user' as const, content: t }]
    setMsgs(next); setText(''); setBusy(true)
    const { data } = await supabase.auth.getSession()
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ messages: next }),
    }).catch(() => null)
    const j = ((await r?.json().catch(() => null)) ?? {}) as { reply?: string; error?: string }
    setMsgs([...next, { role: 'assistant', content: j.reply ?? j.error ?? 'No pude conectar con el asistente.' }])
    setBusy(false)
  }

  return (
    <Screen title="VELOCITY BRAIN" subtitle="Tu asistente de velocidad y vallas. No sustituye a tu entrenador ni a un médico.">
      {!msgs.length && (
        <div className="flex flex-wrap gap-2">
          {IDEAS.map((i) => <button key={i} onClick={() => send(i)} className="glass rounded-full px-4 py-2 text-xs text-slate-300">{i}</button>)}
        </div>
      )}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`max-w-[88%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm ${m.role === 'user' ? 'ml-auto bg-gradient-to-br from-cyanx/30 to-electric/30' : 'glass'}`}>
              {m.content}
            </motion.div>
          ))}
        </AnimatePresence>
        {busy && (
          <div className="glass flex w-16 justify-center gap-1 rounded-3xl py-3">
            {[0, 1, 2].map((d) => <motion.span key={d} className="h-2 w-2 rounded-full bg-cyanx" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.15 }} />)}
          </div>
        )}
        <div ref={end} />
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Pregunta sobre velocidad o vallas…" className="field" />
        <button onClick={() => send()} disabled={busy} className="btn btn-primary !px-4"><Send size={18} /></button>
      </div>
    </Screen>
  )
}
