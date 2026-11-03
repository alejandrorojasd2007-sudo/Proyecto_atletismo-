import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../services/supabase'
import { Card, Screen } from '../../components/ui'
import { EVENTS, eventLabel } from '../../types/events'
import InstallButton from '../../components/InstallButton'
import Settings from './Settings'

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

  return (
    <Screen title="Perfil">
      <Card>
        <p className="text-sm text-slate-400">Sesión iniciada como</p>
        <p className="font-medium">{session?.user.email}</p>
      </Card>
      <Card>
        <p className="mb-3 font-semibold">Mis especialidades</p>
        <div className="flex flex-wrap gap-2">
          {EVENTS.map(([v, l]) => (
            <motion.button key={v} whileTap={{ scale: 0.94 }} onClick={() => toggle(v)} className={`rounded-full border px-4 py-2 text-sm transition-colors ${specs.includes(v) ? 'border-cyanx bg-cyanx/15 text-cyanx' : 'border-white/10 text-slate-400'}`}>{l}</motion.button>
          ))}
        </div>
      </Card>
      <Card>
        <p className="mb-3 font-semibold">Mis marcas (segundos)</p>
        <div className="flex gap-2">
          <select value={ev} onChange={(e) => setEv(e.target.value)} className="field !w-auto">
            {EVENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input value={mark} onChange={(e) => setMark(e.target.value)} inputMode="decimal" placeholder="10.85" className="field" />
          <button onClick={addPb} className="btn btn-primary !px-5">+</button>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {pbs.map((p) => <li key={p.id} className="flex justify-between"><span className="text-slate-400">{eventLabel(p.event)}</span><span className="text-cyanx">{p.mark_seconds} s</span></li>)}
          {!pbs.length && <li className="text-slate-500">Aún no hay marcas guardadas.</li>}
        </ul>
        {msg && <p className="mt-3 text-sm text-amber-300">{msg}</p>}
      </Card>
      <Settings />
      <InstallButton />
      <button onClick={() => supabase.auth.signOut()} className="btn btn-ghost w-full"><LogOut size={16} /> Cerrar sesión</button>
    </Screen>
  )
}
