import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../services/supabase'

export default function Profile() {
  const { session } = useAuth()
  return (
    <section className="px-5 py-4">
      <h2 className="text-2xl font-semibold">Perfil</h2>
      <div className="mt-4 rounded-2xl border border-white/10 bg-surface p-5">
        <p className="text-sm text-slate-400">Sesión iniciada como</p>
        <p className="font-medium">{session?.user.email}</p>
      </div>
      <button onClick={() => supabase.auth.signOut()} className="mt-4 w-full rounded-xl border border-white/10 py-3 text-slate-300">
        Cerrar sesión
      </button>
    </section>
  )
}
