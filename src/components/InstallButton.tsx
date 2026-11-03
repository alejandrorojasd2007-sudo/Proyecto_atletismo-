import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { getPrompt, install, isStandalone, subscribe } from '../services/pwa'

export default function InstallButton({ compact = false }: { compact?: boolean }) {
  const [, force] = useState(0)
  const [help, setHelp] = useState(false)
  useEffect(() => subscribe(() => force((n) => n + 1)), [])
  if (isStandalone()) return null
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)

  async function click() {
    if (getPrompt()) await install()
    else setHelp(true)
  }

  return (
    <>
      <motion.button whileTap={{ scale: 0.95 }} onClick={click} className={compact ? 'btn btn-primary btn-sm' : 'btn btn-primary w-full'}>
        <Download size={compact ? 14 : 18} /> Instalar app
      </motion.button>
      <AnimatePresence>
        {help && (
          <motion.div className="fixed inset-0 z-50 flex items-end bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHelp(false)}>
            <motion.div className="glass mx-auto w-full max-w-md rounded-3xl p-6" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} onClick={(e) => e.stopPropagation()}>
              <p className="text-lg font-semibold">Instalar VELOCITY AI</p>
              <p className="mt-2 text-sm text-slate-300">
                {ios
                  ? 'Toca el botón Compartir y elige "Añadir a pantalla de inicio".'
                  : 'Abre el menú ⋮ del navegador y elige "Instalar aplicación" o "Añadir a pantalla de inicio".'}
              </p>
              <button className="btn btn-ghost mt-4 w-full" onClick={() => setHelp(false)}>Entendido</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
