import Phaser from 'phaser'
import { GAME_H, GAME_W, MOTHS, type MothKind } from '../config.ts'

type Ctx = CanvasRenderingContext2D

function canvas(scene: Phaser.Scene, key: string, w: number, h: number): CanvasRenderingContext2D | null {
  if (scene.textures.exists(key)) scene.textures.remove(key)
  const tex = scene.textures.createCanvas(key, w, h)
  if (!tex) return null
  const ctx = tex.getContext()
  ctx.clearRect(0, 0, w, h)
  return ctx
}

function commit(scene: Phaser.Scene, key: string): void {
  const tex = scene.textures.get(key)
  if (tex instanceof Phaser.Textures.CanvasTexture) tex.refresh()
}

/** Soft radial falloff, white -> transparent. Used for the flame light, bloom and embers. */
function radial(ctx: Ctx, size: number, stops: Array<[number, string]>): void {
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [pos, color] of stops) g.addColorStop(pos, color)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
}

/** '#rrggbb' + alpha -> 'rgba(...)'. */
function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

function drawMoth(ctx: Ctx, s: number, body: string, wing: string, glow: string): void {
  const w = Math.ceil(s * 4)
  const h = Math.ceil(s * 3)
  ctx.save()
  ctx.translate(w / 2, h / 2)

  // soft halo so a moth reads even outside the flame light
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.5)
  halo.addColorStop(0, withAlpha(glow, 0.22))
  halo.addColorStop(1, withAlpha(glow, 0))
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2)
  ctx.fill()

  // upper wings
  ctx.fillStyle = wing
  ctx.globalAlpha = 0.96
  ctx.beginPath()
  ctx.ellipse(-s * 0.85, -s * 0.1, s * 0.95, s * 0.62, -0.42, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha(glow, 0.3)
  ctx.lineWidth = Math.max(1, s * 0.06)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(s * 0.85, -s * 0.1, s * 0.95, s * 0.62, 0.42, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // lower wings
  ctx.globalAlpha = 0.8
  ctx.beginPath()
  ctx.ellipse(-s * 0.62, s * 0.45, s * 0.62, s * 0.42, 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(s * 0.62, s * 0.45, s * 0.62, s * 0.42, -0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // wing markings
  ctx.globalAlpha = 0.35
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.ellipse(-s * 0.85, -s * 0.15, s * 0.3, s * 0.22, -0.42, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(s * 0.85, -s * 0.15, s * 0.3, s * 0.22, 0.42, 0, Math.PI * 2)
  ctx.fill()

  // body
  ctx.globalAlpha = 1
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.3, s * 0.66, 0, 0, Math.PI * 2)
  ctx.fill()

  // fuzzy head
  ctx.beginPath()
  ctx.ellipse(0, -s * 0.6, s * 0.24, s * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()

  // antennae
  ctx.strokeStyle = body
  ctx.lineWidth = Math.max(1, s * 0.07)
  ctx.beginPath()
  ctx.moveTo(-s * 0.1, -s * 0.76)
  ctx.quadraticCurveTo(-s * 0.4, -s * 1.12, -s * 0.62, -s * 1.02)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(s * 0.1, -s * 0.76)
  ctx.quadraticCurveTo(s * 0.4, -s * 1.12, s * 0.62, -s * 1.02)
  ctx.stroke()

  // eyes — these stay legible even in the dark
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(-s * 0.14, -s * 0.62, s * 0.14, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(s * 0.14, -s * 0.62, s * 0.14, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFlame(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2
  const base = h * 0.94
  const tip = h * 0.06

  const teardrop = (width: number, height: number, top: number): void => {
    ctx.beginPath()
    ctx.moveTo(cx, top)
    ctx.bezierCurveTo(cx + width, top + height * 0.38, cx + width * 0.86, base, cx, base)
    ctx.bezierCurveTo(cx - width * 0.86, base, cx - width, top + height * 0.38, cx, top)
    ctx.closePath()
  }

  const outer = ctx.createLinearGradient(0, tip, 0, base)
  outer.addColorStop(0, 'rgba(255, 120, 20, 0)')
  outer.addColorStop(0.35, 'rgba(255, 138, 32, 0.75)')
  outer.addColorStop(0.72, 'rgba(255, 196, 72, 0.95)')
  outer.addColorStop(1, 'rgba(255, 246, 214, 1)')
  ctx.fillStyle = outer
  teardrop(w * 0.44, base - tip, tip)
  ctx.fill()

  const inner = ctx.createLinearGradient(0, h * 0.4, 0, base)
  inner.addColorStop(0, 'rgba(255, 246, 214, 0)')
  inner.addColorStop(0.5, 'rgba(255, 238, 170, 0.9)')
  inner.addColorStop(1, 'rgba(255, 255, 255, 1)')
  ctx.fillStyle = inner
  teardrop(w * 0.24, base - h * 0.4, h * 0.4)
  ctx.fill()
}

/** Procedurally draws every texture the game uses. No external assets. */
export function buildTextures(scene: Phaser.Scene): void {
  // --- soft radial glow (flame light, bloom, embers) ---
  const glow = canvas(scene, 'glow', 256, 256)
  if (glow) {
    radial(glow, 256, [
      [0, 'rgba(255,255,255,1)'],
      [0.18, 'rgba(255,255,255,0.82)'],
      [0.42, 'rgba(255,255,255,0.34)'],
      [0.7, 'rgba(255,255,255,0.09)'],
      [1, 'rgba(255,255,255,0)'],
    ])
    commit(scene, 'glow')
  }

  // --- crisp core glow (fireball, perfect bloom) ---
  const spark = canvas(scene, 'spark', 128, 128)
  if (spark) {
    radial(spark, 128, [
      [0, 'rgba(255,255,255,1)'],
      [0.28, 'rgba(255,255,255,0.72)'],
      [0.62, 'rgba(255,255,255,0.16)'],
      [1, 'rgba(255,255,255,0)'],
    ])
    commit(scene, 'spark')
  }

  // --- ember particle ---
  const ember = canvas(scene, 'ember', 32, 32)
  if (ember) {
    radial(ember, 32, [
      [0, 'rgba(255,255,255,1)'],
      [0.35, 'rgba(255,220,160,0.75)'],
      [1, 'rgba(255,160,60,0)'],
    ])
    commit(scene, 'ember')
  }

  // --- flame core ---
  const flame = canvas(scene, 'flame', 128, 168)
  if (flame) {
    drawFlame(flame, 128, 168)
    commit(scene, 'flame')
  }

  // --- background gradient ---
  const bg = canvas(scene, 'bg', GAME_W, GAME_H)
  if (bg) {
    const g = bg.createLinearGradient(0, 0, 0, GAME_H)
    g.addColorStop(0, '#05040a')
    g.addColorStop(0.55, '#0a0712')
    g.addColorStop(1, '#150c17')
    bg.fillStyle = g
    bg.fillRect(0, 0, GAME_W, GAME_H)
    commit(scene, 'bg')
  }

  // --- vignette (dark edges) ---
  const vig = canvas(scene, 'vignette', 256, 256)
  if (vig) {
    const g = vig.createRadialGradient(128, 128, 20, 128, 128, 150)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.55, 'rgba(0,0,0,0.22)')
    g.addColorStop(1, 'rgba(0,0,0,0.92)')
    vig.fillStyle = g
    vig.fillRect(0, 0, 256, 256)
    commit(scene, 'vignette')
  }

  // --- danger vignette (red edges) ---
  const danger = canvas(scene, 'danger', 256, 256)
  if (danger) {
    const g = danger.createRadialGradient(128, 128, 18, 128, 128, 152)
    g.addColorStop(0, 'rgba(255,0,0,0)')
    g.addColorStop(0.5, 'rgba(190,20,20,0.18)')
    g.addColorStop(1, 'rgba(255,30,20,0.85)')
    danger.fillStyle = g
    danger.fillRect(0, 0, 256, 256)
    commit(scene, 'danger')
  }

  // --- moths ---
  const mothStyles: Record<MothKind, { body: string; wing: string; glow: string }> = {
    slow: { body: '#3a2d4a', wing: '#8a76ab', glow: '#ffcf8a' },
    fast: { body: '#4a2c36', wing: '#b08a86', glow: '#ffd0a0' },
    tanky: { body: '#2b3d4a', wing: '#7fa3b8', glow: '#a8e0ff' },
  }
  for (const kind of Object.keys(MOTHS) as MothKind[]) {
    const def = MOTHS[kind]
    const ctx = canvas(scene, `moth-${kind}`, Math.ceil(def.radius * 4), Math.ceil(def.radius * 3))
    if (!ctx) continue
    const st = mothStyles[kind]
    drawMoth(ctx, def.radius, st.body, st.wing, st.glow)
    commit(scene, `moth-${kind}`)
  }
}
