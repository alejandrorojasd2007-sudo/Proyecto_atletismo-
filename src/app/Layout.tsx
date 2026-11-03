import { NavLink, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, Video, BarChart3, Bot, User } from 'lucide-react'
import Logo from '../components/Logo'
import InstallButton from '../components/InstallButton'

const items = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/analizar', label: 'Analizar', icon: Video },
  { to: '/estadisticas', label: 'Stats', icon: BarChart3 },
  { to: '/brain', label: 'Brain', icon: Bot },
  { to: '/perfil', label: 'Perfil', icon: User },
]

export default function Layout() {
  const loc = useLocation()
  const outlet = useOutlet()
  return (
    <div className="min-h-screen pb-32">
      <div className="aurora"><i /><i /><i /><i /><b className="streak" /><b className="streak s2" /><b className="streak s3" /><span className="track" /></div>
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <Logo />
        <InstallButton compact />
      </header>
      <AnimatePresence mode="wait">
        <motion.div key={loc.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
          {outlet}
        </motion.div>
      </AnimatePresence>
      <nav className="glass fixed inset-x-3 bottom-3 z-20 mx-auto flex max-w-md justify-around rounded-3xl p-1.5">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium">
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="pill" className="absolute inset-0 rounded-2xl bg-cyanx/15 ring-1 ring-cyanx/30" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <Icon size={21} className={`relative ${isActive ? 'text-cyanx' : 'text-slate-400'}`} />
                <span className={`relative ${isActive ? 'text-cyanx' : 'text-slate-400'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
