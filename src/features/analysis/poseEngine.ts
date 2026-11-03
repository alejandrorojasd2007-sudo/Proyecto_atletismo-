import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

export type Metric = { metric: string; value: number | null; unit: string; method: 'estimated' | 'unavailable'; confidence: number | null; notes: string }
type Pt = { x: number; y: number; v: number }
type Frame = { t: number; nose: Pt; sh: Pt; hip: Pt; ank: Pt; kl: Pt; kr: Pt; hl: Pt; hr: Pt; al: Pt; ar: Pt }

const FPS = 15
const MAX_SECONDS = 30
const sorted = (a: number[]) => [...a].sort((x, y) => x - y)
const pct = (a: number[], p: number) => { const s = sorted(a); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN }
const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN)
const round2 = (x: number) => Math.round(x * 100) / 100
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) })
const smooth = (a: number[]) => a.map((_, i) => mean(a.slice(Math.max(0, i - 1), i + 2)))
const ang = (a: Pt, b: Pt, c: Pt) => {
  const x1 = a.x - b.x, y1 = a.y - b.y, x2 = c.x - b.x, y2 = c.y - b.y
  const d = (x1 * x2 + y1 * y2) / ((Math.hypot(x1, y1) * Math.hypot(x2, y2)) || 1)
  return (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI
}

async function makeLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
  const opts = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate },
    runningMode: 'VIDEO' as const,
    numPoses: 1,
  })
  try { return await PoseLandmarker.createFromOptions(fileset, opts('GPU')) }
  catch { return await PoseLandmarker.createFromOptions(fileset, opts('CPU')) }
}

function loadVideo(file: File) {
  const url = URL.createObjectURL(file)
  const v = document.createElement('video')
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url
  return new Promise<{ v: HTMLVideoElement; url: string }>((res, rej) => {
    v.onloadeddata = () => res({ v, url })
    v.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se pudo leer el video. Prueba con un MP4.')) }
  })
}
const seek = (v: HTMLVideoElement, t: number) =>
  new Promise<void>((res) => {
    const on = () => { v.removeEventListener('seeked', on); res() }
    v.addEventListener('seeked', on)
    v.currentTime = t
  })

export async function analyzeVideo(file: File, opts: { heightCm?: number }, onProgress: (p: number, label: string) => void): Promise<Metric[]> {
  onProgress(0, 'Cargando motor de visión…')
  const lm = await makeLandmarker()
  const { v, url } = await loadVideo(file)
  try {
    const W = v.videoWidth, H = v.videoHeight
    const n = Math.floor(Math.min(v.duration, MAX_SECONDS) * FPS)
    if (!(n >= 10)) throw new Error('El video es demasiado corto (mínimo 1 segundo).')
    const frames: Frame[] = []
    for (let i = 0; i < n; i++) {
      const t = i / FPS
      await seek(v, t + 0.001)
      const r = lm.detectForVideo(v, Math.round((i * 1000) / FPS))
      const L = r.landmarks[0]
      if (L) {
        const p = (k: number): Pt => ({ x: L[k].x * W, y: L[k].y * H, v: L[k].visibility ?? 0 })
        frames.push({ t, nose: p(0), sh: mid(p(11), p(12)), hip: mid(p(23), p(24)), ank: mid(p(27), p(28)), kl: p(25), kr: p(26), hl: p(23), hr: p(24), al: p(27), ar: p(28) })
      }
      onProgress((i + 1) / n, `Analizando fotogramas ${i + 1}/${n}`)
    }
    return compute(frames, n, opts.heightCm)
  } finally {
    lm.close()
    URL.revokeObjectURL(url)
  }
}

function compute(frames: Frame[], n: number, heightCm?: number): Metric[] {
  const good = frames.filter((f) => Math.min(f.sh.v, f.hip.v, f.ank.v) > 0.5)
  const rate = good.length / n
  const rateMetric = (why: string): Metric => ({ metric: 'detection_rate', value: Math.round(rate * 100), unit: '%', method: 'estimated', confidence: null, notes: why })
  if (good.length < 10) return [rateMetric('No se detectó el cuerpo completo en suficientes fotogramas. Usa cámara fija, vista lateral y cuerpo completo visible.')]
  const span = good[good.length - 1].t - good[0].t
  if (span < 1) return [rateMetric('El tramo útil es menor a 1 segundo.')]

  const vis = mean(good.map((f) => Math.min(f.sh.v, f.hip.v, f.ank.v)))
  const conf = round2(Math.max(0, Math.min(1, rate * vis)))
  const hx = smooth(good.map((f) => f.hip.x))
  const dir = hx[hx.length - 1] >= hx[0] ? 1 : -1
  const stat = pct(good.map((f) => Math.abs(f.ank.y - f.nose.y)), 0.5) / 0.9
  const conv = heightCm ? heightCm / 100 : 1
  const unit = heightCm ? 'm/s' : 'alt/s'
  const scaleNote = heightCm ? 'Escala por estatura declarada.' : 'Sin estatura: unidad en alturas corporales por segundo.'

  const speeds: number[] = []
  for (let k = 0; k < 4; k++) {
    const a = Math.floor((k * good.length) / 4), b = Math.floor(((k + 1) * good.length) / 4) - 1
    const dt = b > a ? good[b].t - good[a].t : 0
    speeds.push(dt > 0 ? (((hx[b] - hx[a]) * dir) / dt / stat) * conv : NaN)
  }
  const meanSpeed = (((hx[hx.length - 1] - hx[0]) * dir) / span / stat) * conv
  const finite = speeds.filter(Number.isFinite)

  const lean = good.map((f) => (Math.atan2((f.sh.x - f.hip.x) * dir, f.hip.y - f.sh.y) * 180) / Math.PI)
  const flex: number[] = []
  for (const f of good) {
    if (Math.min(f.kl.v, f.hl.v, f.al.v) > 0.5) flex.push(180 - ang(f.hl, f.kl, f.al))
    if (Math.min(f.kr.v, f.hr.v, f.ar.v) > 0.5) flex.push(180 - ang(f.hr, f.kr, f.ar))
  }
  let steps = 0, last = 0
  for (const f of good) {
    const s = (f.al.x - f.ar.x) * dir
    if (Math.abs(s) < stat * 0.04) continue
    const sg = s > 0 ? 1 : -1
    if (last !== 0 && sg !== last) steps++
    last = sg
  }
  const cadence = steps >= 3 ? steps / span : NaN

  const m = (metric: string, value: number, u: string, notes: string): Metric =>
    Number.isFinite(value)
      ? { metric, value: round2(value), unit: u, method: 'estimated', confidence: conf, notes }
      : { metric, value: null, unit: u, method: 'unavailable', confidence: null, notes: 'No hay datos suficientes para estimarlo.' }
  const cam = 'Requiere cámara fija y vista lateral. ' + scaleNote

  return [
    m('speed_mean', meanSpeed, unit, cam),
    m('speed_max', finite.length ? Math.max(...finite) : NaN, unit, 'Máximo entre 4 tramos. ' + cam),
    ...speeds.map((s, i) => m(`speed_seg_${i + 1}`, s, unit, `Tramo ${i + 1} de 4. ` + cam)),
    m('trunk_lean_mean', pct(lean, 0.5), '°', 'Positivo = tronco inclinado hacia delante. Vista lateral.'),
    m('trunk_lean_max', pct(lean, 0.95), '°', 'Percentil 95 de la inclinación del tronco.'),
    m('knee_flex_max', pct(flex, 0.95), '°', 'Flexión máxima de rodilla (percentil 95), pierna de recobro.'),
    m('cadence', cadence, 'pasos/s', 'Cruces de piernas por segundo en el tramo detectado.'),
    { metric: 'detection_rate', value: Math.round(rate * 100), unit: '%', method: 'estimated', confidence: null, notes: 'Fotogramas con cuerpo completo detectado.' },
  ]
}
