import { useState, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, UploadCloud } from 'lucide-react'
import { Card, Screen } from '../../components/ui'
import { supabase } from '../../services/supabase'
import { useAuth } from '../auth/AuthContext'
import { EVENTS } from '../../types/events'
import { analyzeVideo, type Metric, type Track } from './poseEngine'
import Player from './Player'

const MAX = 50 * 1024 * 1024
const NAMES: Record<string, string> = {
  speed_mean: 'Velocidad media',
  speed_max: 'Velocidad máx. (por tramo)',
  trunk_lean_mean: 'Inclinación del tronco (media)',
  trunk_lean_max: 'Inclinación del tronco (máx.)',
  knee_flex_max: 'Flexión máx. de rodilla',
  cadence: 'Frecuencia de paso',
  detection_rate: 'Cuerpo detectado',
}
const errMsg = (e: unknown) => (typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : 'error')

export default function Analyze() {
  const { session } = useAuth()
  const [event, setEvent] = useState('100m')
  const [height, setHeight] = useState('')
  const [consent, setConsent] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [pct, setPct] = useState(0)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<Metric[]>([])
  const [track, setTrack] = useState<Track | null>(null)

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > MAX) { setFile(null); return setMsg('El archivo supera 50 MB.') }
    setMsg(''); setFile(f)
  }

  async function run() {
    const uid = session?.user.id
    if (!uid || !file) return setMsg('Elige un video.')
    if (!consent) return setMsg('Debes confirmar el consentimiento.')
    setBusy(true); setMsg(''); setResults([]); setTrack(null); setPct(1)
    const h = Number(height.replace(',', '.'))
    const heightCm = h > 100 && h < 230 ? h : undefined
    let metrics: Metric[]
    try {
      const out = await analyzeVideo(file, { heightCm }, (p, l) => { setPct(Math.round(p * 85)); setLabel(l) })
      metrics = out.metrics
      setTrack(out.track)
    } catch (e) {
      setBusy(false); setPct(0)
      return setMsg(e instanceof Error ? e.message : 'No se pudo analizar el video.')
    }
    setResults(metrics); setPct(88); setLabel('Guardando en tu historial…')
    try {
      const path = `${uid}/${crypto.randomUUID()}.${file.name.split('.').pop() ?? 'mp4'}`
      const up = await supabase.storage.from('media').upload(path, file, { contentType: file.type || 'video/mp4' })
      if (up.error) throw up.error
      const s = await supabase.from('training_sessions').insert({ user_id: uid, event, kind: 'analysis' }).select('id').single()
      if (s.error) throw s.error
      const md = await supabase.from('media_assets').insert({ user_id: uid, session_id: s.data.id, storage_path: path, kind: 'video', size_bytes: file.size, consent: true }).select('id').single()
      if (md.error) throw md.error
      const j = await supabase.from('analysis_jobs').insert({ user_id: uid, media_id: md.data.id, status: 'completed', params: { event, height_cm: heightCm ?? null }, engine_version: 'pose2d-0.1' }).select('id').single()
      if (j.error) throw j.error
      const ins = await supabase.from('analysis_results').insert(metrics.map((m) => ({ user_id: uid, job_id: j.data.id, metric: m.metric, value: m.value, unit: m.unit, method: m.method, confidence: m.confidence, notes: m.notes })))
      if (ins.error) throw ins.error
      setMsg('Guardado. Míralo en Stats.')
    } catch (e) {
      setMsg('Analizado, pero no se pudo guardar: ' + errMsg(e))
    }
    setPct(100); setLabel('Análisis completado'); setBusy(false)
  }

  const segs = results.filter((r) => r.metric.startsWith('speed_seg_') && r.value != null)
  const top = Math.max(...segs.map((s) => s.value as number), 0.0001)
  const cards = results.filter((r) => NAMES[r.metric])

  return (
    <Screen title="Analizar" subtitle="El análisis corre en tu teléfono. Video lateral, cámara fija, cuerpo completo.">
      <Card className="space-y-3">
        <select value={event} onChange={(e) => setEvent(e.target.value)} className="field">
          {EVENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-cyanx/40 bg-cyanx/5 px-4 py-8 text-center">
          <UploadCloud className="text-cyanx" />
          <span className="text-sm">{file ? file.name : 'Toca para elegir un video (máx. 50 MB)'}</span>
          <input type="file" accept="video/*" onChange={pick} className="hidden" />
        </label>
        <input className="field" inputMode="numeric" placeholder="Estatura en cm (opcional, para m/s)" value={height} onChange={(e) => setHeight(e.target.value)} />
        <label className="flex items-start gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          Confirmo que tengo consentimiento de la persona que aparece para subir y analizar este material.
        </label>
        <motion.button whileTap={{ scale: 0.97 }} onClick={run} disabled={busy} className="btn btn-primary w-full">
          {busy ? 'Analizando…' : 'Analizar video'}
        </motion.button>
        {pct > 0 && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-cyanx to-electric" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut' }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">{label}</p>
          </div>
        )}
        {msg && <p className="text-sm text-amber-300">{msg}</p>}
      </Card>

      {track && file && (
        <Card>
          <Player file={file} track={track} />
        </Card>
      )}

      {segs.length > 0 && (
        <Card>
          <p className="mb-3 font-semibold">Velocidad por tramo <span className="ml-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-300">Estimado</span></p>
          <div className="space-y-2">
            {segs.map((s, i) => (
              <div key={s.metric} className="flex items-center gap-3 text-xs">
                <span className="w-12 text-slate-400">Tramo {i + 1}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-cyanx to-lime" initial={{ width: 0 }} animate={{ width: `${Math.max(0, ((s.value as number) / top) * 100)}%` }} transition={{ delay: 0.1 * i, duration: 0.7 }} />
                </div>
                <span className="w-16 text-right text-cyanx">{s.value} {s.unit}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((r, i) => (
            <motion.div key={r.metric} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i }} className="glass rounded-3xl p-4">
              <p className="text-xs text-slate-400">{NAMES[r.metric]}</p>
              <p className="mt-1 text-2xl font-bold text-cyanx">{r.value ?? '—'} <span className="text-xs font-normal text-slate-400">{r.value != null ? r.unit : ''}</span></p>
              <p className="mt-1 text-[10px] text-slate-500">{r.method === 'estimated' ? `Estimado${r.confidence != null ? ` · confianza ${Math.round(r.confidence * 100)}%` : ''}` : 'No disponible'}</p>
            </motion.div>
          ))}
        </div>
      )}

      <Card>
        <div className="flex gap-3 text-xs text-slate-400">
          <ShieldCheck size={18} className="shrink-0 text-lime" />
          <p>Una sola cámara 2D da estimaciones, no mediciones exactas. Cada resultado indica su método y confianza. La velocidad solo es válida con cámara fija.</p>
        </div>
      </Card>
    </Screen>
  )
}
