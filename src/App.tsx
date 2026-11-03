import { Navigate, Route, Routes } from 'react-router-dom'
import { motion } from 'framer-motion'
import Layout from './app/Layout'
import Logo from './components/Logo'
import Dashboard from './features/dashboard/Dashboard'
import Analyze from './features/analysis/Analyze'
import Stats from './features/statistics/Stats'
import Brain from './features/assistant/Brain'
import Profile from './features/profile/Profile'
import Login from './features/auth/Login'
import { AuthProvider, useAuth } from './features/auth/AuthContext'

function Protected() {
  const { session, loading } = useAuth()
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <Logo big />
        </motion.div>
      </div>
    )
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
          <Route path="estadisticas" element={<Stats />} />
          <Route path="brain" element={<Brain />} />
          <Route path="perfil" element={<Profile />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
