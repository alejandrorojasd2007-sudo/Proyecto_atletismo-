import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from './AuthContext'
import Logo from '../../components/Logo'

export default function Login() {
  const { session } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [terms, setTerms] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    if (mode === 'register') {
      if (password !== confirm) return setMsg('Las contraseñas no coinciden.')
      if (!terms) return setMsg('Debes aceptar los términos y la privacidad.')
    }
    setBusy(true)
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (mode === 'register') setMsg('Revisa tu correo para confirmar la cuenta.')
  }

  async function recover() {
    if (!email) return setMsg('Escribe tu correo primero.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setMsg(error ? error.message : 'Te enviamos un enlace para recuperar el acceso.')
  }

  return (
    <main className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6">
      <div className="aurora"><i /><i /><i /></div>
      <svg className="pointer-events-none absolute inset-x-0 top-0 h-56 w-full opacity-30" viewBox="0 0 400 200" preserveAspectRatio="none">
        {[30, 70, 110, 150].map((y) => (
          <line key={y} className="lane" x1="0" x2="400" y1={y} y2={y} stroke="#22d3ee" strokeWidth="2" />
        ))}
      </svg>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative mb-8 flex flex-col items-center">
        <Logo big />
        <h1 className="mt-4 text-4xl font-bold tracking-tight">VELOCITY <span className="text-grad">AI</span></h1>
        <p className="mt-1 text-sm text-slate-400">The science of speed.</p>
      </motion.div>
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }} className="glass relative mx-auto w-full max-w-sm space-y-3 rounded-3xl p-5">
        <input className="field" type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="relative">
          <input className="field pr-12" type={show ? 'text' : 'password'} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {mode === 'register' && (
            <motion.div key="reg" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
              <input className="field" type={show ? 'text' : 'password'} placeholder="Confirmar contraseña" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              <label className="flex items-start gap-2 text-xs text-slate-400">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5" />
                Acepto los términos y la política de privacidad.
              </label>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileTap={{ scale: 0.97 }} disabled={busy} className="btn btn-primary w-full">
          {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </motion.button>
        <AnimatePresence>
          {msg && <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm text-amber-300">{msg}</motion.p>}
        </AnimatePresence>
        <div className="flex justify-between text-xs text-slate-400">
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Crear cuenta' : 'Ya tengo cuenta'}
          </button>
          <button type="button" onClick={recover}>Recuperar acceso</button>
        </div>
      </motion.form>
    </main>
  )
}
