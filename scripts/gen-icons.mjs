import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
const T = new Uint32Array(256)
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0 }
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => {
  const t = Buffer.from(type), l = Buffer.alloc(4), c = Buffer.alloc(4)
  l.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data])))
  return Buffer.concat([l, t, data, c])
}
const seg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}
const mix = (c, to, a) => c + (to - c) * a
function png(s) {
  const row = s * 4 + 1
  const raw = Buffer.alloc(row * s)
  const w = s * 0.07, aa = s * 0.012
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const u = x / s, v = y / s
      const glow = Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.6) / 0.6) ** 2
      let r = 8 + 8 * v + 10 * glow, g = 12 + 14 * v + 70 * glow, b = 18 + 40 * v + 95 * glow
      const d = Math.min(seg(x, y, s * 0.27, s * 0.28, s * 0.5, s * 0.7), seg(x, y, s * 0.73, s * 0.28, s * 0.5, s * 0.7))
      if (d < w + aa) { const a = d < w ? 1 : 1 - (d - w) / aa; r = mix(r, 34, a); g = mix(g, 211, a); b = mix(b, 238, a) }
      const e = seg(x, y, s * 0.36, s * 0.8, s * 0.64, s * 0.8)
      if (e < s * 0.014 + aa) { const a = e < s * 0.014 ? 1 : 1 - (e - s * 0.014) / aa; r = mix(r, 163, a); g = mix(g, 230, a); b = mix(b, 53, a) }
      const i = y * row + 1 + x * 4
      raw[i] = Math.round(r); raw[i + 1] = Math.round(g); raw[i + 2] = Math.round(b); raw[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(s, 0); ihdr.writeUInt32BE(s, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', png(192))
writeFileSync('public/icons/icon-512.png', png(512))
writeFileSync('public/icons/apple-touch-icon.png', png(180))
console.log('iconos listos')
