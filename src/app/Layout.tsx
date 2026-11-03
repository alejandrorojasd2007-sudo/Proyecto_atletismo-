import { NavLink, Outlet } from 'react-router-dom'
import { Home, Video, BarChart3, Bot, User } from 'lucide-react'

const items = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/analizar', label: 'Analizar', icon: Video },
  { to: '/estadisticas', label: 'Stats', icon: BarChart3 },
  { to: '/brain', label: 'Brain', icon: Bot },
  { to: '/perfil', label: 'Perfil', icon: User },
]

export default function Layout() {
  return (
    <div className="min-h-screen pb-28">
      <header className="px-5 pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">
          VELOCITY <span className="text-cyanx">AI</span>
        </h1>
      </header>
      <Outlet />
      <nav className="fixed bottom-3 left-3 right-3 mx-auto flex max-w-md justify-around rounded-2xl border border-white/10 bg-surface/90 p-2 backdrop-blur">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs ${
                isActive ? 'bg-cyanx/15 text-cyanx' : 'text-slate-400'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
