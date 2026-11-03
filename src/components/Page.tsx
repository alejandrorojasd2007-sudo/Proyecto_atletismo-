export default function Page({ title, text }: { title: string; text: string }) {
  return (
    <section className="px-5 py-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4 rounded-2xl border border-white/10 bg-surface p-5 text-slate-400">{text}</div>
    </section>
  )
}
