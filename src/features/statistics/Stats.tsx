import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, Screen } from '../../components/ui'
import { supabase } from '../../services/supabase'
import { eventLabel } from '../../types/events'

type JobRef = { created_at: string; params: { event?: string } | null }
type Row = { metric: string; value: number | null; unit: string; job_id: string; analysis_jobs: JobRef | JobRef[] | null }
type Job = { id: string; date: string; event: string; m: Record<string, number>; unit: string }
type PB = { id: string; event: string; mark_seconds: number }
const tip = { background: '#0d141d', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 }

export default function Stats() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [pbs, setPbs] = useState<PB[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    (async () => {
      const r = await supabase.from('analysis_results').select('metric,value,unit,job_id,analysis_jobs(created_at,params)').limit(1000)
      const map = new Map<string, Job>()
      for (const row of (r.data ?? []) as unknown as Row[]) {
        const j = Array.isArray(row.analysis_jobs) ? row.analysis_jobs[0] : row.analysis_jobs
        if (!j || row.value == null) continue
        const cur = map.get(row.job_id) ?? { id: row.job_id, date: j.created_at, event: j.params?.event ?? '', m: {}, unit: 'alt/s' }
        cur.m[row.metric] = row.value
        if (row.metric === 'speed_mean') cur.unit = row.unit
        map.set(row.job_id, cur)
      }
      setJobs([...map.values()].sort((a, b) => a.date.localeCompare(b.date)))
      const p = await supabase.from('personal_bests').select('id,event,mark_seconds').order('event')
      setPbs((p.data as PB[]) ?? [])
      setReady(true)
    })()
  }, [])

  const latest = jobs[jobs.length - 1]
  const segData = latest ? [1, 2, 3, 4].filter((k) => latest.m[`speed_seg_${k}`] != null).map((k) => ({ name: `T${k}`, v: latest.m[`speed_seg_${k}`] })) : []
  const trend = jobs.filter((j) => j.m.speed_mean != null).map((j) => ({ name: new Date(j.date).toLocaleDateString('es', { day: '2-digit', month: 'short' }), v: j.m.speed_mean }))
  const kpis: [string, string, string][] = latest
    ? [['Cadencia', latest.m.cadence != null ? String(latest.m.cadence) : '—', 'pasos/s'], ['Tronco', latest.m.trunk_lean_mean != null ? String(latest.m.trunk_lean_mean) : '—', '°'], ['Rodilla', latest.m.knee_flex_max != null ? String(latest.m.knee_flex_max) : '—', '°']]
    : []

  return (
    <Screen title="Estadísticas" subtitle="Todo sale de tus análisis guardados. Valores estimados con cámara 2D.">
      {!ready && <p className="text-sm text-slate-400">Cargando…</p>}
      {ready && !latest && <Card><p className="text-slate-300">Aún no hay análisis. Sube un video en <b>Analizar</b> y verás aquí tus gráficas.</p></Card>}
      {latest && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {kpis.map(([t, v, u]) => (
              <Card key={t} className="!p-4">
                <p className="text-xs text-slate-400">{t}</p>
                <p className="mt-1 text-xl font-bold text-cyanx">{v}</p>
                <p className="text-[10px] text-slate-500">{u}</p>
              </Card>
            ))}
          </div>
          <Card>
            <p className="mb-1 font-semibold">Velocidad por tramo</p>
            <p className="mb-3 text-xs text-slate-400">{eventLabel(latest.event)} · último análisis · {latest.unit}</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={segData}>
                <defs>
                  <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#22d3ee" stopOpacity={0.5} />
                    <stop offset="1" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={34} />
                <Tooltip contentStyle={tip} />
                <Area type="monotone" dataKey="v" stroke="#22d3ee" strokeWidth={2.5} fill="url(#ga)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <p className="mb-3 font-semibold">Evolución entre sesiones</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trend}>
                <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={34} />
                <Tooltip contentStyle={tip} />
                <Line type="monotone" dataKey="v" stroke="#a3e635" strokeWidth={2.5} dot={{ r: 4, fill: '#a3e635' }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
      {ready && (
        <Card>
          <p className="mb-2 font-semibold">Mis marcas</p>
          {pbs.length ? pbs.map((p) => (
            <div key={p.id} className="flex justify-between py-1 text-sm"><span className="text-slate-400">{eventLabel(p.event)}</span><span className="text-cyanx">{p.mark_seconds} s</span></div>
          )) : <p className="text-sm text-slate-500">Agrega tus marcas en Perfil.</p>}
        </Card>
      )}
    </Screen>
  )
}
