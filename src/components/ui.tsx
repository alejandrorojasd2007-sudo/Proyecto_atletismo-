import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

export const fade: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}
export const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <motion.section variants={stagger} initial="hidden" animate="show" className="px-5 pb-6 pt-2">
      <motion.h2 variants={fade} className="text-3xl font-bold tracking-tight">{title}</motion.h2>
      {subtitle && <motion.p variants={fade} className="mt-1 text-sm text-slate-400">{subtitle}</motion.p>}
      <div className="mt-5 space-y-4">{children}</div>
    </motion.section>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <motion.div variants={fade} whileTap={{ scale: 0.985 }} className={`glass rounded-3xl p-5 ${className}`}>{children}</motion.div>
}
