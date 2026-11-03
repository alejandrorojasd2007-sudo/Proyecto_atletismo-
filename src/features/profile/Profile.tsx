import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../services/supabase'

const EV = [['100m', '100 m'], ['200m', '200 m'], ['400m', '400 m'], ['400mh', '400 m vallas']] as const
type PB = { id: string; event: string; mark_seconds: number }

export default function Profile() {
  const { session } = useAuth()
  const uid = session?.user.id
  const [specs, setSpecs] = useState<string[]>([])
  const [pbs, setPbs] = useState<PB[]>([])
  const [ev, setEv] = useState('100m')
  const [mark, setMark] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    if (!uid) return
    const a = await supabase.from('athlete_profiles').select('specialties').eq('user_id', uid).maybeSingle()
    setSpecs(a.data?.specialties ?? [])
    const p = await supabase.from('personal_bests').select('id,event,mark_seconds').order('created_at', { ascending: false })
    setPbs((p.data as PB[]) ?? [])
  }
  useEffect(() => { load() }, [uid])

  async function toggle(v: string) {
    if (!uid) return
    const next = specs.includes(v) ? specs.filter((x) => x !== v) : [...specs, v]
    setSpecs(next)
    const { error } = await supabase.from('athlete_profiles').upsert({ user_id: uid, specialties: next })
    if (error) setMsg(error.message)
  }

  async function addPb() {
    const n = Number(mark.replace(',', '.'))
    if (!uid || !(n > 0)) return setMsg('Marca inválida.')
    const { error } = await supabase.from('personal_bests').insert({ user_id: uid, event: ev, mark_seconds: n, source: 'declarada' })
    if (error) setMsg(error.message)
    else { setMark(''); setMsg(''); load() }
  }

  const box = 'mt-4 rounded-2xl border border-white/10 bg-surface p-5'
  return (
    <section className="px-5 py-4">
      <h2 className="text-2xl font-semibold">Perfil</h2>
      <div className={box}>
        <p className="text-sm text-slate-400">Sesión iniciada como</p>
        <p className="font-medium">{session?.user.email}</p>
      </div>
      <div className={box}>
        <p className="mb-3 font-semibold">Mis especialidades</p>
        <div className="flex flex-wrap gap-2">
          {EV.map(([v, l]) => (
            <button key={v} onClick={() => toggle(v)} className={`rounded-full border px-4 py-2 text-sm ${specs.includes(v) ? 'border-cyanx bg-cyanx/15 text-cyanx' : 'border-white/10 text-slate-400'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className={box}>
        <p className="mb-3 font-semibold">Mis marcas (segundos)</p>
        <div className="flex gap-2">
          <select value={ev} onChange={(e) => setEv(e.target.value)} className="rounded-xl border border-white/10 bg-graphite px-3 py-3 text-sm">
            {EV.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input value={mark} onChange={(e) => setMark(e.target.value)} inputMode="decimal" placeholder="10.85" className="w-full rounded-xl border border-white/10 bg-graphite px-4 py-3 text-sm outline-none focus:border-cyanx" />
          <button onClick={addPb} className="rounded-xl bg-cyanx px-4 font-semibold text-graphite">+</button>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {pbs.map((p) => <li key={p.id} className="flex justify-between"><span className="text-slate-400">{p.event}</span><span className="text-cyanx">{p.mark_seconds} s</span></li>)}
          {!pbs.length && <li className="text-slate-500">Aún no hay marcas guardadas.</li>}
        </ul>
      </div>
      {msg && <p className="mt-3 text-sm text-amber-300">{msg}</p>}
      <button onClick={() => supabase.auth.signOut()} className="mt-4 w-full rounded-xl border border-white/10 py-3 text-slate-300">Cerrar sesión</button>
    </section>
  )
}
