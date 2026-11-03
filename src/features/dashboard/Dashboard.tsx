const cards = ['Mejor marca', 'Sesiones', 'Análisis']

export default function Dashboard() {
  return (
    <section className="px-5 py-4">
      <h2 className="text-2xl font-semibold">Resumen</h2>
      <p className="text-sm text-slate-400">Tus datos aparecerán aquí cuando cargues tu primera sesión.</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c} className="rounded-2xl border border-white/10 bg-surface p-3">
            <p className="text-xs text-slate-400">{c}</p>
            <p className="mt-2 text-2xl font-bold text-cyanx">—</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-cyanx/30 bg-cyanx/10 p-5">
        <p className="font-semibold">Analiza tu primera carrera</p>
        <p className="mt-1 text-sm text-slate-300">Sube un video de 100, 200, 400 m o vallas.</p>
      </div>
    </section>
  )
}
