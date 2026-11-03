type P = [number, number]
const L = '#22d3ee', R = '#a78bfa', C = '#a3e635'
const JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]

export function drawSkeleton(ctx: CanvasRenderingContext2D, lm: number[][], tx: (x: number, y: number) => P, lw: number) {
  const ok = (...ids: number[]) => ids.every((i) => lm[i] && lm[i][2] > 0.4)
  const pt = (i: number): P => tx(lm[i][0], lm[i][1])
  const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const segs: [P, P, string][] = []
  const dots: [P, string][] = []
  const add = (a: number, b: number, c: string) => { if (ok(a, b)) segs.push([pt(a), pt(b), c]) }
  if (ok(11, 12, 23, 24)) {
    const n = mid(pt(11), pt(12)), p = mid(pt(23), pt(24))
    segs.push([n, p, C])
    dots.push([n, C], [p, C])
    if (ok(0)) segs.push([pt(0), n, C])
  }
  add(11, 12, C); add(23, 24, C); add(11, 23, L); add(12, 24, R)
  add(11, 13, L); add(13, 15, L); add(23, 25, L); add(25, 27, L); add(27, 29, L); add(29, 31, L); add(27, 31, L)
  add(12, 14, R); add(14, 16, R); add(24, 26, R); add(26, 28, R); add(28, 30, R); add(30, 32, R); add(28, 32, R)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (const [a, b, c] of segs) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1])
    ctx.strokeStyle = c; ctx.globalAlpha = 0.22; ctx.lineWidth = lw * 3.2; ctx.stroke()
  }
  for (const [a, b, c] of segs) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1])
    ctx.strokeStyle = c; ctx.globalAlpha = 1; ctx.lineWidth = lw; ctx.stroke()
  }
  JOINTS.forEach((i) => { if (ok(i)) dots.push([pt(i), i % 2 === 1 ? L : R]) })
  for (const [p, c] of dots) {
    ctx.beginPath(); ctx.arc(p[0], p[1], lw * 1.9, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = c; ctx.stroke()
  }
  if (ok(0)) {
    const h = pt(0)
    ctx.beginPath(); ctx.arc(h[0], h[1], lw * 3.4, 0, Math.PI * 2)
    ctx.strokeStyle = C; ctx.lineWidth = lw; ctx.stroke()
  }
  ctx.globalAlpha = 1
}
