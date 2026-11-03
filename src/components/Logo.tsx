import { motion } from 'framer-motion'

export default function Logo({ big = false }: { big?: boolean }) {
  const s = big ? 72 : 34
  return (
    <div className="flex items-center gap-2.5">
      <motion.svg width={s} height={s} viewBox="0 0 64 64" initial={{ rotate: -8, scale: 0.8, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="#0d141d" stroke="rgba(255,255,255,.12)" />
        <path d="M18 20 L32 44 L46 20" fill="none" stroke="url(#lg)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 52 H40" stroke="#a3e635" strokeWidth="3" strokeLinecap="round" />
      </motion.svg>
      {!big && <span className="text-lg font-bold tracking-tight">VELOCITY <span className="text-grad">AI</span></span>}
    </div>
  )
}
