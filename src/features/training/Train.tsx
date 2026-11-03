import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Card, Screen } from '../../components/ui'
import { supabase } from '../../services/supabase'
import { useAuth } from '../auth/AuthContext'
import { EVENTS } from '../../types/events'
import { DRILLS } from './drills'

export default function Train() {
  const { session } = useAuth()
  const [ev, setEv] = useState<string>('100m')
  const [done, setDone] = useState<string[]>([])
  const [toast, setToast] = useState('')

  async function finish(id: string, name: string) {
    const uid = session?.user.id
    if (!uid || done.includes(id)) return
    const { error } = await supabase.from('training_sessions').insert({ user_id: uid, event: ev, kind: 'drill', notes: name })
    if (error) { setToast('No se pudo guardar: ' + error.message); return }
    setDone([...done, id])
    setToast('+25 XP · ¡Bien hecho!')
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <Screen title="Entrenar" subtitle="Elige tu prueba, haz la sesión y suma XP y racha.">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {EVENTS.map(([v, l]) => (
          <button key={v} onClick={() => setEv(v)} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${ev === v ? 'border-cyanx bg-cyanx/15 text-cyanx' : 'border-white/10 text-slate-400'}`}>{l}</button>
        ))}
      </div>
      {(DRILLS[ev] ?? []).map((d) => (
        <Card key={d.id}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-semibold">{d.name}</p>
              <p className="mt-0.5 text-sm text-cyanx">{d.plan}</p>
              <p className="mt-1 text-sm text-slate-400">{d.cue}</p>
            </div>
            <button onClick={() => finish(d.id, d.name)} className={`btn btn-sm ${done.includes(d.id) ? 'btn-ghost text-lime' : 'btn-primary'}`}>
              <Check size={16} /> {done.includes(d.id) ? 'Hecho' : 'Hecho'}
            </button>
          </div>
        </Card>
      ))}
      <Card>
        <p className="text-xs text-slate-400">Ajusta volumen e intensidad con tu entrenador. Si sientes dolor, detente y consulta a un profesional.</p>
      </Card>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass fixed left-1/2 top-24 z-40 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium text-lime">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  )
}
