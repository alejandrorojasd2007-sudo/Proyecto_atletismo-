import { useEffect, useState } from 'react'
import { Card } from '../../components/ui'
import { supabase } from '../../services/supabase'
import { useAuth } from '../auth/AuthContext'

export default function Settings() {
  const { session } = useAuth()
  const uid = session?.user.id
  const [name, setName] = useState('')
  const [goal, setGoal] = useState(4)
  const [reduce, setReduce] = useState(localStorage.getItem('vel_reduce') === '1')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!uid) return
    supabase.from('profiles').select('display_name,preferences').eq('id', uid).maybeSingle().then(({ data }) => {
      const p = data as { display_name?: string; preferences?: { weekly_goal?: number } } | null
      setName(p?.display_name ?? '')
      setGoal(Number(p?.preferences?.weekly_goal) || 4)
    })
  }, [uid])

  function toggleReduce() {
    const n = !reduce
    setReduce(n)
    localStorage.setItem('vel_reduce', n ? '1' : '0')
    document.documentElement.classList.toggle('reduce', n)
  }

  async function save() {
    if (!uid) return
    const { error } = await supabase.from('profiles').update({ display_name: name, preferences: { weekly_goal: goal } }).eq('id', uid)
    setMsg(error ? error.message : 'Guardado ✓')
  }

  return (
    <Card className="space-y-3">
      <p className="font-semibold">Ajustes</p>
      <input className="field" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">Meta semanal (sesiones)</span>
        <select value={goal} onChange={(e) => setGoal(Number(e.target.value))} className="field !w-20 !py-2">
          {[2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">Reducir animaciones (más fluido)</span>
        <button onClick={toggleReduce} className={`relative h-7 w-12 rounded-full transition-colors ${reduce ? 'bg-cyanx' : 'bg-white/15'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${reduce ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      <button onClick={save} className="btn btn-primary w-full">Guardar</button>
      {msg && <p className="text-sm text-amber-300">{msg}</p>}
    </Card>
  )
}
