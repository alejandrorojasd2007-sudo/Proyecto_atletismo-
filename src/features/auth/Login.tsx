import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from './AuthContext'

const input =
  'w-full rounded-xl border border-white/10 bg-graphite px-4 py-3 outline-none focus:border-cyanx'

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
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (mode === 'register') setMsg('Revisa tu correo para confirmar la cuenta.')
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setMsg(error.message)
  }

  async function recover() {
    if (!email) return setMsg('Escribe tu correo primero.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setMsg(error ? error.message : 'Te enviamos un enlace para recuperar el acceso.')
  }

  return (
    <main className="flex min-h-screen flex-col justify-center px-6">
      <h1 className="text-center text-4xl font-bold tracking-tight">
        VELOCITY <span className="text-cyanx">AI</span>
      </h1>
      <p className="mb-8 mt-1 text-center text-sm text-slate-400">The science of speed.</p>
      <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-surface p-5">
        <input className={input} type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={input} type={show ? 'text' : 'password'} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        {mode === 'register' && (
          <>
            <input className={input} type={show ? 'text' : 'password'} placeholder="Confirmar contraseña" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <label className="flex items-start gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5" />
              Acepto los términos y la política de privacidad.
            </label>
          </>
        )}
        <button type="button" onClick={() => setShow(!show)} className="text-xs text-slate-400">
          {show ? 'Ocultar' : 'Mostrar'} contraseña
        </button>
        <button disabled={busy} className="w-full rounded-xl bg-cyanx py-3 font-semibold text-graphite disabled:opacity-50">
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button type="button" onClick={google} className="w-full rounded-xl border border-white/15 py-3">
          Continuar con Google
        </button>
        {msg && <p className="text-sm text-amber-300">{msg}</p>}
        <div className="flex justify-between text-xs text-slate-400">
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Crear cuenta' : 'Ya tengo cuenta'}
          </button>
          <button type="button" onClick={recover}>Recuperar acceso</button>
        </div>
      </form>
    </main>
  )
}
