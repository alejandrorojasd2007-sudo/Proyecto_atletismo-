import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type { Track } from './poseEngine'
import { drawSkeleton } from './skeleton'

type S = { t: number; v: number }

function drawChart(c: CanvasRenderingContext2D, W: number, H: number, s: S[], t: number, vmax: number, unit: string) {
  c.clearRect(0, 0, W, H)
  if (s.length < 2) return
  const L = 10, R = 10, T = 46, B = 16
  const t0 = s[0].t, t1 = s[s.length - 1].t
  const X = (tt: number) => L + ((tt - t0) / (t1 - t0 || 1)) * (W - L - R)
  const Y = (v: number) => H - B - (v / vmax) * (H - T - B)
  c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 1
  for (let g = 0; g <= 3; g++) { const y = T + (g / 3) * (H - T - B); c.beginPath(); c.moveTo(L, y); c.lineTo(W - R, y); c.stroke() }
  c.fillStyle = '#94a3b8'; c.font = '600 22px system-ui'; c.textAlign = 'left'; c.fillText('Velocidad en vivo', L, 30)
  const cur = Math.min(Math.max(t, t0), t1)
  const pts = s.filter((p) => p.t <= cur)
  if (!pts.length) return
  const last = pts[pts.length - 1]
  const g = c.createLinearGradient(0, T, 0, H - B)
  g.addColorStop(0, 'rgba(34,211,238,.45)'); g.addColorStop(1, 'rgba(34,211,238,0)')
  c.beginPath(); c.moveTo(X(pts[0].t), Y(0))
  pts.forEach((p) => c.lineTo(X(p.t), Y(p.v)))
  c.lineTo(X(last.t), Y(0)); c.closePath(); c.fillStyle = g; c.fill()
  c.beginPath()
  pts.forEach((p, i) => (i ? c.lineTo(X(p.t), Y(p.v)) : c.moveTo(X(p.t), Y(p.v))))
  c.strokeStyle = '#22d3ee'; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke()
  c.beginPath(); c.arc(X(last.t), Y(last.v), 8, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill()
  c.fillStyle = '#22d3ee'; c.font = '700 32px system-ui'; c.textAlign = 'right'
  c.fillText(`${last.v.toFixed(2)} ${unit}`, W - R, 32)
}

export default function Player({ file, track }: { file: File; track: Track }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const vref = useRef<HTMLVideoElement>(null)
  const ov = useRef<HTMLCanvasElement>(null)
  const fig = useRef<HTMLCanvasElement>(null)
  const ch = useRef<HTMLCanvasElement>(null)
  const sl = useRef<HTMLInputElement>(null)
  const lastDraw = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const dur = track.frames.length / track.fps
  const vmax = useMemo(() => Math.max(...track.series.map((s) => s.v), 0.1) * 1.15, [track])
  const range = useMemo(() => {
    const xs: number[] = [], ys: number[] = []
    for (const lm of track.frames) {
      if (lm && lm[23][2] > 0.4 && lm[24][2] > 0.4) {
        xs.push(((lm[23][0] + lm[24][0]) / 2) * track.w)
        ys.push(((lm[23][1] + lm[24][1]) / 2) * track.h)
      }
    }
    return { min: Math.min(...xs), max: Math.max(...xs), y0: xs.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0 }
  }, [track])

  const draw = useCallback(() => {
    const v = vref.current
    if (!v) return
    const t = v.currentTime
    const i = Math.max(0, Math.min(track.frames.length - 1, Math.round(t * track.fps)))
    const lm = track.frames[i]
    if (sl.current) sl.current.value = String(t)

    const oc = ov.current
    const o = oc?.getContext('2d')
    if (oc && o) {
      o.clearRect(0, 0, oc.width, oc.height)
      if (lm) drawSkeleton(o, lm, (x, y) => [x * oc.width, y * oc.height], 3)
    }

    const fc = fig.current
    const f = fc?.getContext('2d')
    if (fc && f) {
      const W = fc.width, H = fc.height
      f.clearRect(0, 0, W, H)
      f.strokeStyle = 'rgba(255,255,255,.08)'; f.lineWidth = 2
      f.beginPath()
      for (let k = 1; k < 5; k++) { const y = H * 0.72 + k * H * 0.06; f.moveTo(0, y); f.lineTo(W, y) }
      f.stroke()
      f.strokeStyle = 'rgba(34,211,238,.55)'; f.lineWidth = 3
      f.beginPath(); f.moveTo(0, H * 0.72); f.lineTo(W, H * 0.72); f.stroke()
      if (lm && track.bodyPx > 0) {
        const k = (H * 0.5) / track.bodyPx
        const hipX = ((lm[23][0] + lm[24][0]) / 2) * track.w
        const hipY = ((lm[23][1] + lm[24][1]) / 2) * track.h
        const span = range.max - range.min
        const px = span > track.w * 0.15 ? W * 0.12 + ((hipX - range.min) / span) * W * 0.76 : W / 2
        const py = H * 0.45 + (hipY - range.y0) * k
        drawSkeleton(f, lm, (x, y) => [px + (x * track.w - hipX) * k, py + (y * track.h - hipY) * k], 4)
      }
    }

    const cc = ch.current
    const c = cc?.getContext('2d')
    if (cc && c) drawChart(c, cc.width, cc.height, track.series, t, vmax, track.unit)
  }, [track, range, vmax])

  useEffect(() => {
    const v = vref.current
    if (!v) return
    let raf = 0
    const tick = () => {
      const now = performance.now()
      if (now - lastDraw.current > 32) { lastDraw.current = now; draw() }
      if (!v.paused && !v.ended) raf = requestAnimationFrame(tick)
    }
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick) }
    const once = () => draw()
    v.addEventListener('play', start)
    v.addEventListener('seeked', once)
    v.addEventListener('loadeddata', once)
    v.addEventListener('ended', once)
    draw()
    return () => {
      cancelAnimationFrame(raf)
      v.removeEventListener('play', start)
      v.removeEventListener('seeked', once)
      v.removeEventListener('loadeddata', once)
      v.removeEventListener('ended', once)
    }
  }, [draw])

  function toggle() { const v = vref.current; if (!v) return; if (v.paused) void v.play(); else v.pause() }
  function cycle() {
    const n = rate === 1 ? 0.5 : rate === 0.5 ? 0.25 : 1
    setRate(n)
    if (vref.current) vref.current.playbackRate = n
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto overflow-hidden rounded-3xl bg-black" style={{ aspectRatio: `${track.w}/${track.h}`, width: `min(100%, ${(55 * track.w) / track.h}vh)` }}>
        <video ref={vref} src={url} muted playsInline preload="auto" className="absolute inset-0 h-full w-full" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
        <canvas ref={ov} width={640} height={Math.round((640 * track.h) / track.w)} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={toggle} className="btn btn-primary btn-sm">{playing ? <Pause size={16} /> : <Play size={16} />}</button>
        <input ref={sl} type="range" min={0} max={dur} step={0.01} defaultValue={0} onChange={(e) => { const v = vref.current; if (v) v.currentTime = Number(e.target.value) }} className="flex-1 accent-cyan-400" />
        <button onClick={cycle} className="btn btn-ghost btn-sm">{rate}×</button>
      </div>
      <canvas ref={fig} width={720} height={340} className="w-full rounded-3xl border border-white/10 bg-black/30" />
      <canvas ref={ch} width={720} height={300} className="w-full rounded-3xl border border-white/10 bg-black/30" />
    </div>
  )
}
