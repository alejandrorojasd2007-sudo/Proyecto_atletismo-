import { useEffect, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Video } from 'lucide-react'
import { Card, Screen } from '../../components/ui'
import { supabase } from '../../services/supabase'
import { eventLabel } from '../../types/events'
import InstallButton from '../../components/InstallButton'

function Counter({ to }: { to: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const c = animate(0, to, { duration: 1, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) })
    return () => c.stop()
  }, [to])
  return <>{n}</>
}

type Last = { created_at: string; params: { event?: string } } | null

export default function Dashboard() {
  const [c, setC] = useState({ sessions: 0, analyses: 0, marks: 0 })
  const [last, setLast] = useState<Last>(null)

  useEffect(() => {
    (async () => {
      const head = (t: string) => supabase.from(t).select('id', { count: 'exact', head: true })
      const [s, a, m, l] = await Promise.all([
        head('training_sessions'),
        supabase.from('analysis_jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        head('personal_bests'),
        supabase.from('analysis_jobs').select('created_at,params').eq('status', 'completed').order('created_at', { ascending: false }).limit(1),
      ])
      setC({ sessions: s.count ?? 0, analyses: a.count ?? 0, marks: m.count ?? 0 })
      setLast((l.data?.[0] as Last) ?? null)
    })()
  }, [])

  const stats: [string, number][] = [['Sesiones', c.sessions], ['Análisis', c.analyses], ['Marcas', c.marks]]

  return (
    <Screen title="Resumen" subtitle="Tu rendimiento, medido con datos reales.">
      <div className="grid grid-cols-3 gap-3">
        {stats.map(([t, v]) => (
          <Card key={t} className="!p-4">
            <p className="text-xs text-slate-400">{t}</p>
            <p className="mt-2 text-3xl font-bold text-cyanx"><Counter to={v} /></p>
          </Card>
        ))}
      </div>
      <Link to="/analizar" className="block">
        <Card className="relative overflow-hidden !border-cyanx/30">
          <motion.div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyanx/20 blur-2xl" animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 4 }} />
          <div className="relative flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyanx to-electric text-ink"><Video size={22} /></div>
            <div className="flex-1">
              <p className="font-semibold">Analiza una carrera</p>
              <p className="text-sm text-slate-400">Sube un video de 100, 200, 400 m o vallas.</p>
            </div>
            <ArrowRight className="text-cyanx" />
          </div>
        </Card>
      </Link>
      {last && (
        <Card>
          <p className="text-xs text-slate-400">Último análisis</p>
          <p className="mt-1 font-semibold">{eventLabel(last.params?.event)} · {new Date(last.created_at).toLocaleDateString('es')}</p>
        </Card>
      )}
      <InstallButton />
    </Screen>
  )
}
