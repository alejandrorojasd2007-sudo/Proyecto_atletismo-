import { useEffect, useState, type ChangeEvent } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../auth/AuthContext'

const EV = [['100m', '100 m'], ['200m', '200 m'], ['400m', '400 m'], ['400mh', '400 m vallas']] as const
const MAX = 50 * 1024 * 1024
type Job = { id: string; status: string; params: { event?: string }; created_at: string }

export default function Analyze() {
  const { session } = useAuth()
  const [event, setEvent] = useState('100m')
  const [consent, setConsent] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])

  async function load() {
    const { data } = await supabase.from('analysis_jobs').select('id,status,params,created_at').order('created_at', { ascending: false }).limit(10)
    setJobs((data as Job[]) ?? [])
  }
  useEffect(() => { load() }, [])

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > MAX) { setFile(null); return setMsg('El archivo supera 50 MB.') }
    setMsg(''); setFile(f)
  }

  async function upload() {
    const uid = session?.user.id
    if (!uid || !file) return setMsg('Elige un archivo.')
    if (!consent) return setMsg('Debes confirmar el consentimiento.')
    setBusy(true); setMsg('')
    const kind = file.type.startsWith('video') ? 'video' : 'image'
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${uid}/${crypto.randomUUID()}.${ext}`
    const up = await supabase.storage.from('media').upload(path, file, { contentType: file.type })
    if (up.error) { setBusy(false); return setMsg(up.error.message) }
    const s = await supabase.from('training_sessions').insert({ user_id: uid, event, kind: 'analysis' }).select('id').single()
    if (s.error) { setBusy(false); return setMsg(s.error.message) }
    const m = await supabase.from('media_assets').insert({ user_id: uid, session_id: s.data.id, storage_path: path, kind, size_bytes: file.size, consent: true }).select('id').single()
    if (m.error) { setBusy(false); return setMsg(m.error.message) }
    const j = await supabase.from('analysis_jobs').insert({ user_id: uid, media_id: m.data.id, params: { event } })
    setBusy(false)
    setMsg(j.error ? j.error.message : 'Subido. El análisis quedó en estado: pendiente.')
    setFile(null)
    load()
  }

  return (
    <section className="px-5 py-4">
      <h2 className="text-2xl font-semibold">Analizar</h2>
      <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-surface p-5">
        <select value={event} onChange={(e) => setEvent(e.target.value)} className="w-full rounded-xl border border-white/10 bg-graphite px-4 py-3 text-sm">
          {EV.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="file" accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp" onChange={pick} className="w-full text-sm text-slate-400" />
        <label className="flex items-start gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          Confirmo que tengo consentimiento de la persona que aparece para subir y analizar este material.
        </label>
        <button onClick={upload} disabled={busy} className="w-full rounded-xl bg-cyanx py-3 font-semibold text-graphite disabled:opacity-50">{busy ? 'Subiendo…' : 'Subir'}</button>
        {msg && <p className="text-sm text-amber-300">{msg}</p>}
      </div>
      <h3 className="mb-2 mt-6 font-semibold">Mis análisis</h3>
      <ul className="space-y-2 text-sm">
        {jobs.map((j) => (
          <li key={j.id} className="flex justify-between rounded-xl border border-white/10 bg-surface px-4 py-3">
            <span>{j.params.event} · {new Date(j.created_at).toLocaleDateString()}</span>
            <span className="text-cyanx">{j.status}</span>
          </li>
        ))}
        {!jobs.length && <li className="text-slate-500">Sin análisis todavía.</li>}
      </ul>
    </section>
  )
}
