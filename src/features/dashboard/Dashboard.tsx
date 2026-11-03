import { useEffect, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Award, Dumbbell, Flame, Rocket, Sparkles, Target, Trophy, Video } from 'lucide-react'
import { Card, Screen } from '../../components/ui'
import { supabase } from '../../services/supabase'
import { useAuth } from '../auth/AuthContext'
import { eventLabel } from '../../types/events'
import { DRILLS } from '../training/drills'
import InstallButton from '../../components/InstallButton'

const PHRASES = [
  'Cada metro cuenta. Hoy suma uno más.',
  'La velocidad se construye en los días que no tienes ganas.',
  'Tu único rival es el atleta que eras ayer.',
  'Técnica primero, velocidad después.',
  'La constancia vence al talento cuando el talento no es constante.',
  'Respira, relaja la cara y corre rápido.',
  'Un buen calentamiento es medio entrenamiento.',
  'No busques la marca perfecta: busca la siguiente mejora.',
  'Descansar también es entrenar.',
  'Los récords empiezan con una sesión como la de hoy.',
  'Menos excusas, más aceleración.',
  'Confía en el proceso y mide tu progreso.',
  'Hoy es un buen día para mejorar tu salida.',
  'Corre con ritmo, termina con fuerza.',
]
const TITLES = ['Novato', 'Aspirante', 'Velocista', 'Competidor', 'Élite', 'Leyenda']
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

function Counter({ to }: { to: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const c = animate(0, to, { duration: 1, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) })
    return () => c.stop()
  }, [to])
  return <>{n}</>
}

function Ring({ value, max }: { value: number; max: number }) {
  const r = 34, c = 2 * Math.PI * r
  const p = Math.min(1, value / Math.max(1, max))
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#a3e635" />
        </linearGradient>
      </defs>
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
      <motion.circle cx="44" cy="44" r={r} fill="none" stroke="url(#rg)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - p) }} transition={{ duration: 1, ease: 'easeOut' }} transform="rotate(-90 44 44)" />
      <text x="44" y="50" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700">{value}/{max}</text>
    </svg>
  )
}

type Data = { sessions: number; analyses: number; marks: number; streak: number; week: number; goal: number; name: string; event: string; last: { created_at: string; params: { event?: string } } | null }
const EMPTY: Data = { sessions: 0, analyses: 0, marks: 0, streak: 0, week: 0, goal: 4, name: '', event: '100m', last: null }

export default function Dashboard() {
  const { session } = useAuth()
  const uid = session?.user.id
  const [d, setD] = useState<Data>(EMPTY)

  useEffect(() => {
    if (!uid) return
    void (async () => {
      const head = (t: string) => supabase.from(t).select('id', { count: 'exact', head: true })
      const [s, a, m, l, ss, pr, sp] = await Promise.all([
        head('training_sessions'),
        supabase.from('analysis_jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        head('personal_bests'),
        supabase.from('analysis_jobs').select('created_at,params').eq('status', 'completed').order('created_at', { ascending: false }).limit(1),
        supabase.from('training_sessions').select('created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('display_name,preferences').eq('id', uid).maybeSingle(),
        supabase.from('athlete_profiles').select('specialties').eq('user_id', uid).maybeSingle(),
      ])
      const rows = (ss.data ?? []) as { created_at: string }[]
      const days = new Set(rows.map((r) => iso(new Date(r.created_at))))
      let streak = 0
      const cur = new Date()
      if (!days.has(iso(cur))) cur.setDate(cur.getDate() - 1)
      while (days.has(iso(cur))) { streak++; cur.setDate(cur.getDate() - 1) }
      const now = new Date()
      const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
      const week = rows.filter((r) => new Date(r.created_at) >= mon).length
      const prof = pr.data as { display_name?: string; preferences?: { weekly_goal?: number } } | null
      const spec = (sp.data as { specialties?: string[] } | null)?.specialties?.[0] ?? '100m'
      setD({ sessions: s.count ?? 0, analyses: a.count ?? 0, marks: m.count ?? 0, streak, week, goal: Number(prof?.preferences?.weekly_goal) || 4, name: prof?.display_name ?? '', event: spec, last: (l.data?.[0] ?? null) as Data['last'] })
    })()
  }, [uid])

  const hr = new Date().getHours()
  const greet = hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches'
  const first = (d.name || session?.user.email?.split('@')[0] || '').split(' ')[0]
  const xp = d.sessions * 25 + d.analyses * 25 + d.marks * 15
  const level = Math.floor(xp / 100)
  const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const drills = DRILLS[d.event] ?? DRILLS['100m']
  const drill = drills[day % drills.length]
  const badges = [
    { icon: Rocket, label: 'Primer análisis', ok: d.analyses >= 1 },
    { icon: Flame, label: 'Racha de 3', ok: d.streak >= 3 },
    { icon: Target, label: 'Primera marca', ok: d.marks >= 1 },
    { icon: Award, label: '5 análisis', ok: d.analyses >= 5 },
    { icon: Trophy, label: 'Meta semanal', ok: d.week >= d.goal },
  ]

  return (
    <Screen title={`Hola, ${first}`} subtitle={`${greet} · ${new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}`}>
      <Card className="relative overflow-hidden !border-cyanx/25">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 shrink-0 text-cyanx" size={20} />
          <p className="font-medium leading-snug">{PHRASES[day % PHRASES.length]}</p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="font-semibold">Nivel {level + 1} · {TITLES[Math.min(level, TITLES.length - 1)]}</p>
          <p className="text-xs text-slate-400">{xp} XP</p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-cyanx to-lime" initial={{ width: 0 }} animate={{ width: `${xp % 100}%` }} transition={{ duration: 0.9 }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">Te faltan {100 - (xp % 100)} XP para el siguiente nivel.</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col items-center justify-center text-center">
          <Flame className={d.streak > 0 ? 'text-orange-400' : 'text-slate-600'} size={28} />
          <p className="mt-1 text-4xl font-bold"><Counter to={d.streak} /></p>
          <p className="text-xs text-slate-400">días de racha</p>
        </Card>
        <Card className="flex flex-col items-center justify-center text-center">
          <Ring value={d.week} max={d.goal} />
          <p className="text-xs text-slate-400">meta semanal</p>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {([['Sesiones', d.sessions], ['Análisis', d.analyses], ['Marcas', d.marks]] as [string, number][]).map(([t, v]) => (
          <Card key={t} className="!p-4">
            <p className="text-xs text-slate-400">{t}</p>
            <p className="mt-2 text-3xl font-bold text-cyanx"><Counter to={v} /></p>
          </Card>
        ))}
      </div>

      <Link to="/entrenar" className="block">
        <Card className="!border-lime/25">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-lime to-cyanx text-ink"><Dumbbell size={22} /></div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">Entrenamiento de hoy · {eventLabel(d.event)}</p>
              <p className="font-semibold">{drill.name}</p>
              <p className="text-sm text-cyanx">{drill.plan}</p>
            </div>
            <ArrowRight className="text-lime" />
          </div>
        </Card>
      </Link>

      <Link to="/analizar" className="block">
        <Card className="!border-cyanx/30">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyanx to-electric text-ink"><Video size={22} /></div>
            <div className="flex-1">
              <p className="font-semibold">Analiza una carrera</p>
              <p className="text-sm text-slate-400">{d.last ? `Último: ${eventLabel(d.last.params?.event)} · ${new Date(d.last.created_at).toLocaleDateString('es')}` : 'Sube un video de 100, 200, 400 m o vallas.'}</p>
            </div>
            <ArrowRight className="text-cyanx" />
          </div>
        </Card>
      </Link>

      <Card>
        <p className="mb-3 font-semibold">Logros</p>
        <div className="grid grid-cols-5 gap-2">
          {badges.map(({ icon: Icon, label, ok }) => (
            <div key={label} className={`flex flex-col items-center gap-1.5 text-center ${ok ? '' : 'opacity-35'}`}>
              <div className={`grid h-11 w-11 place-items-center rounded-2xl ${ok ? 'bg-gradient-to-br from-cyanx to-electric text-ink' : 'bg-white/10 text-slate-400'}`}><Icon size={20} /></div>
              <span className="text-[10px] leading-tight text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </Card>
      <InstallButton />
    </Screen>
  )
}
