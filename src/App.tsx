import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './app/Layout'
import Dashboard from './features/dashboard/Dashboard'
import Profile from './features/profile/Profile'
import Login from './features/auth/Login'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import Page from './components/Page'
import Analyze from './features/analysis/Analyze'

function Protected() {
  const { session, loading } = useAuth()
  if (loading) return <p className="p-6 text-slate-400">Cargando…</p>
  return session ? <Layout /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route index element={<Dashboard />} />
          <Route path="analizar" element={<Analyze />} />
          <Route path="estadisticas" element={<Page title="Estadísticas" text="Marcas, tendencias y evolución por sesión." />} />
          <Route path="brain" element={<Page title="VELOCITY BRAIN" text="Tu asistente deportivo con IA." />} />
          <Route path="perfil" element={<Profile />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
