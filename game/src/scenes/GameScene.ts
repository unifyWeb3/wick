import Phaser from 'phaser'
import {
  BREACH_PENALTY, BREACH_RADIUS, DANGER_FUEL, DRAIN_MULT_MAX, FLAME_GROW_TIME, FLAME_MAX_RADIUS,
  FLAME_MIN_RADIUS, FUEL_DRAIN_BASE, FUEL_MAX, FUEL_RADIUS_MIN_SCALE, GAME_H, GAME_W, HIT_REFUND,
  MISS_PENALTY, MOTHS, PERFECT_BAND, PERFECT_REFUND, SLOWMO_FACTOR, SLOWMO_MS, WICK_X, WICK_Y,
  rampAt, type MothDef, type MothKind,
} from '../config.ts'
import type { AudioKit } from '../game/AudioKit.ts'
import { getBest, getBestCombo, setBest, setBestCombo } from '../game/storage.ts'
import { AUDIO_KEY } from './BootScene.ts'

const FONT = 'monospace'
const ADD = Phaser.BlendModes.ADD

interface Moth {
  def: MothDef
  sprite: Phaser.GameObjects.Image
  hp: number
  speed: number
  phase: number
  age: number
  dead: boolean
}

export interface EndPayload {
  score: number
  best: number
  maxCombo: number
  bestCombo: number
  newBest: boolean
}

export class GameScene extends Phaser.Scene {
  private fuel = FUEL_MAX
  private score = 0
  private combo = 0
  private maxCombo = 0
  private best = 0
  private elapsed = 0
  private spawnTimer = 0.7
  private spawned = 0
  private holdT = 0
  private holding = false
  private ended = false
  private inputLockedUntil = 0
  private slowmoUntil = 0
  private damageFlash = 0
  private recoil = 0
  private hintUsed = false
  private lastCrackle = -1
  private moths: Moth[] = []

  private audio!: AudioKit
  private space?: Phaser.Input.Keyboard.Key

  private ambient!: Phaser.GameObjects.Image
  private glow!: Phaser.GameObjects.Image
  private flame!: Phaser.GameObjects.Image
  private ring!: Phaser.GameObjects.Graphics
  private danger!: Phaser.GameObjects.Image
  private fuelBar!: Phaser.GameObjects.Graphics
  private scoreText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private bestText!: Phaser.GameObjects.Text
  private hint!: Phaser.GameObjects.Text
  private embers!: Phaser.GameObjects.Particles.ParticleEmitter
  private hitFx!: Phaser.GameObjects.Particles.ParticleEmitter
  private perfectFx!: Phaser.GameObjects.Particles.ParticleEmitter
  private breachFx!: Phaser.GameObjects.Particles.ParticleEmitter

  constructor() {
    super('Game')
  }

  create(): void {
    this.audio = this.registry.get(AUDIO_KEY) as AudioKit
    this.best = getBest()
    this.audio.startCrackle()
    this.audio.setCrackle(0.08)
    this.lastCrackle = 0
    this.inputLockedUntil = performance.now() + 260
    this.space = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.cameras.main.fadeIn(220, 0, 0, 0)

    this.add.image(0, 0, 'bg').setOrigin(0).setDepth(0)
    this.add.image(WICK_X, GAME_H / 2, 'vignette').setDisplaySize(GAME_W, GAME_H).setAlpha(0.8).setDepth(2)
    this.ambient = this.add.image(WICK_X, WICK_Y - 160, 'glow').setBlendMode(ADD).setTint(0xff8a3a).setAlpha(0.05).setDisplaySize(760, 760).setDepth(3)
    this.glow = this.add.image(WICK_X, WICK_Y - 10, 'glow').setBlendMode(ADD).setDepth(5)

    const candle = this.add.graphics().setDepth(7)
    candle.fillStyle(0x1b1422, 1)
    candle.fillRoundedRect(WICK_X - 14, WICK_Y + 12, 28, 44, 6)
    candle.fillStyle(0x2a1f33, 1)
    candle.fillEllipse(WICK_X, WICK_Y + 14, 28, 10)
    candle.lineStyle(2, 0x3a2c43, 1)
    candle.lineBetween(WICK_X, WICK_Y + 10, WICK_X, WICK_Y - 2)

    this.flame = this.add.image(WICK_X, WICK_Y + 8, 'flame').setOrigin(0.5, 1).setBlendMode(ADD).setDepth(20)
    this.ring = this.add.graphics().setDepth(25)

    this.embers = this.add.particles(WICK_X, WICK_Y - 6, 'ember', {
      lifespan: { min: 500, max: 1100 },
      speedX: { min: -16, max: 16 },
      speedY: { min: -70, max: -25 },
      scale: { start: 0.26, end: 0 },
      alpha: { start: 0.7, end: 0 },
      frequency: 90,
      blendMode: ADD,
      tint: 0xffb060,
    }).setDepth(28)

    const burst = (tint: number, speed: number, scale: number): Phaser.GameObjects.Particles.ParticleEmitter =>
      this.add.particles(0, 0, 'spark', {
        lifespan: { min: 200, max: 520 },
        speed: { min: speed * 0.25, max: speed },
        scale: { start: scale, end: 0 },
        alpha: { start: 0.95, end: 0 },
        blendMode: ADD,
        tint,
        emitting: false,
      }).setDepth(30)
    this.hitFx = burst(0xffb060, 170, 0.45)
    this.perfectFx = burst(0xfff3d0, 260, 0.6)
    this.breachFx = burst(0xff5a3c, 150, 0.5)

    this.danger = this.add.image(WICK_X, GAME_H / 2, 'danger').setDisplaySize(GAME_W, GAME_H).setAlpha(0).setDepth(55)

    this.fuelBar = this.add.graphics().setDepth(100)
    this.add.text(24, 22, 'SCORE', { fontFamily: FONT, fontSize: '9px', color: '#8f7f9c' }).setLetterSpacing(2).setDepth(100)
    this.scoreText = this.add.text(24, 38, '0000', { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#f4e6d2' }).setDepth(100)
    this.bestText = this.add.text(366, 24, `BEST ${this.best}`, { fontFamily: FONT, fontSize: '11px', color: '#8f7f9c' }).setOrigin(1, 0).setLetterSpacing(1).setDepth(100)
    this.comboText = this.add.text(WICK_X, 26, '', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffcf8a' }).setOrigin(0.5, 0).setLetterSpacing(1).setDepth(100)
    this.hint = this.add.text(WICK_X, WICK_Y + 64, 'HOLD TO GROW  ·  RELEASE TO STRIKE', { fontFamily: FONT, fontSize: '10px', color: '#a08ea9' }).setOrigin(0.5).setLetterSpacing(1).setDepth(100).setAlpha(0.75)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio.stopCrackle()
      for (const m of this.moths) m.sprite.destroy()
      this.moths = []
    })

    this.updateHud()
    this.updateHudFrame(0)
  }

  update(_time: number, delta: number): void {
    if (this.ended) return
    const now = performance.now()
    let dt = Math.min(delta, 50) / 1000
    if (now < this.slowmoUntil) dt *= SLOWMO_FACTOR

    const down = (this.input.activePointer.isDown || Boolean(this.space?.isDown)) && now >= this.inputLockedUntil
    if (down && !this.holding) {
      this.holding = true
    } else if (!down && this.holding) {
      this.holding = false
      this.release()
    }

    if (this.holding) this.holdT = Math.min(1, this.holdT + dt / FLAME_GROW_TIME)

    this.elapsed += dt
    this.fuel -= FUEL_DRAIN_BASE * (1 + (DRAIN_MULT_MAX - 1) * this.holdT) * dt
    if (this.fuel <= 0) {
      this.fuel = 0
      this.gameOver()
      return
    }

    this.recoil = Math.max(0, this.recoil - dt * 7)
    this.updateFlame()
    this.updateSpawn(dt)
    this.updateMoths(dt)
    this.updateHudFrame(dt)
  }

  private radius(): number {
    const ratio = Phaser.Math.Clamp(this.fuel / FUEL_MAX, 0, 1)
    const scale = FUEL_RADIUS_MIN_SCALE + (1 - FUEL_RADIUS_MIN_SCALE) * ratio
    return (FLAME_MIN_RADIUS + (FLAME_MAX_RADIUS - FLAME_MIN_RADIUS) * this.holdT) * scale
  }

  private updateFlame(): void {
    const ratio = Phaser.Math.Clamp(this.fuel / FUEL_MAX, 0, 1)
    const radius = this.radius()
    const flick = 1 + Math.sin(this.elapsed * 9.1) * 0.012 + Math.sin(this.elapsed * 23.3) * 0.007
    const size = radius * 2.45 * flick

    this.glow.setDisplaySize(size, size)
    this.glow.setAlpha(0.22 + ratio * 0.22)
    this.glow.setTint(Phaser.Display.Color.GetColor(255, Math.round(130 + 80 * ratio), Math.round(55 + 60 * ratio)))
    this.ambient.setAlpha(0.035 + ratio * 0.03)

    const fs = (0.52 + this.holdT * 0.5) * (0.88 + ratio * 0.12) * flick * (1 - this.recoil * 0.25)
    this.flame.setScale(fs, fs * (1 - this.recoil * 0.35))
    this.flame.setTint(Phaser.Display.Color.GetColor(255, Math.round(150 + 60 * ratio), Math.round(70 + 50 * ratio)))

    this.ring.clear()
    const reachAlpha = 0.045 + (this.holding ? 0.1 + this.holdT * 0.12 : 0)
    this.ring.lineStyle(1, 0xffd9a0, reachAlpha)
    this.ring.strokeCircle(WICK_X, WICK_Y, radius)
    if (this.holdT > 0.05) {
      this.ring.lineStyle(1, 0xffd9a0, 0.05 + this.holdT * 0.07)
      this.ring.strokeCircle(WICK_X, WICK_Y, radius * (1 - PERFECT_BAND))
    }
  }

  private updateSpawn(dt: number): void {
    this.spawnTimer -= dt
    if (this.spawnTimer > 0 || this.moths.length >= 14) return

    const ramp = rampAt(this.elapsed)
    const first = this.spawned === 0
    const roll = Math.random()
    let kind: MothKind = 'slow'
    if (!first) {
      if (roll < ramp.tankyChance) kind = 'tanky'
      else if (roll < ramp.tankyChance + ramp.fastChance) kind = 'fast'
    }
    const def = MOTHS[kind]

    const edge = Math.random()
    let x = 0
    let y = 0
    if (first) {
      x = Math.random() < 0.5 ? -26 : GAME_W + 26
      y = Phaser.Math.Between(470, 590)
    } else if (edge < 0.4) {
      x = Phaser.Math.Between(24, GAME_W - 24)
      y = -24
    } else if (edge < 0.7) {
      x = -26
      y = Phaser.Math.Between(90, 610)
    } else {
      x = GAME_W + 26
      y = Phaser.Math.Between(90, 610)
    }

    const sprite = this.add.image(x, y, `moth-${kind}`).setDepth(12).setAlpha(0.32)
    this.moths.push({
      def,
      sprite,
      hp: def.hp,
      speed: def.speed * Phaser.Math.FloatBetween(0.9, 1.12) * ramp.speedMul,
      phase: Math.random() * Math.PI * 2,
      age: 0,
      dead: false,
    })
    this.spawned += 1
    this.spawnTimer = ramp.spawnInterval * Phaser.Math.FloatBetween(0.8, 1.2)
  }

  private updateMoths(dt: number): void {
    const radius = this.radius()
    for (const m of [...this.moths]) {
      if (m.dead) continue
      m.age += dt
      const dx = WICK_X - m.sprite.x
      const dy = WICK_Y - m.sprite.y
      const dist = Math.hypot(dx, dy)
      if (dist < BREACH_RADIUS) {
        this.breach(m)
        continue
      }
      const nx = dx / (dist || 1)
      const ny = dy / (dist || 1)
      const lateral = Math.sin(m.age * 2.6 + m.phase) * m.def.weave * m.speed
      const vx = nx * m.speed - ny * lateral
      const vy = ny * m.speed + nx * lateral
      m.sprite.x += vx * dt
      m.sprite.y += vy * dt
      const rot = Math.atan2(vy, vx) + Math.PI / 2
      m.sprite.rotation = Phaser.Math.Angle.RotateTo(m.sprite.rotation, rot, 5 * dt)
      m.sprite.scaleX = 1 + Math.sin(m.age * m.def.flap) * 0.1
      const lit = Phaser.Math.Clamp((radius + 20 - dist) / 55, 0, 1)
      m.sprite.setAlpha(0.5 + 0.5 * lit)
      const rr = Math.round(168 + 87 * lit)
      const gg = Math.round(158 + 97 * lit)
      const bb = Math.round(200 + 55 * lit)
      m.sprite.setTint(Phaser.Display.Color.GetColor(rr, gg, bb))
    }
  }

  private release(): void {
    if (this.ended) return
    this.audio.strike()
    const radius = this.radius()
    this.holdT = 0
    this.recoil = 1
    this.audio.setCrackle(0.08)
    this.lastCrackle = 0

    if (!this.hintUsed) {
      this.hintUsed = true
      this.tweens.add({ targets: this.hint, alpha: 0, duration: 300 })
    }

    let target: Moth | null = null
    let targetDist = Number.POSITIVE_INFINITY
    for (const m of this.moths) {
      if (m.dead) continue
      const d = Math.hypot(m.sprite.x - WICK_X, m.sprite.y - WICK_Y)
      if (d <= radius && d < targetDist) {
        target = m
        targetDist = d
      }
    }

    if (!target) {
      this.miss()
      return
    }
    this.hit(target, targetDist >= radius * (1 - PERFECT_BAND))
  }

  private miss(): void {
    this.fuel -= MISS_PENALTY
    this.combo = 0
    this.audio.miss()
    this.cameras.main.shake(70, 0.002)
    this.hitFx.explode(6, WICK_X, WICK_Y - 26)
    this.floatText(WICK_X, WICK_Y - 74, `-${MISS_PENALTY}`, '#ff7a5a', 14)
    this.updateHud()
    if (this.fuel <= 0) {
      this.fuel = 0
      this.gameOver()
    }
  }

  private hit(m: Moth, perfect: boolean): void {
    const def = m.def
    this.combo += perfect ? 2 : 1
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    this.fuel = Math.min(FUEL_MAX, this.fuel + (perfect ? PERFECT_REFUND : HIT_REFUND))
    m.hp -= 1
    const killed = m.hp <= 0
    if (killed) this.score += def.points * this.combo * (perfect ? 2 : 1)

    const px = m.sprite.x
    const py = m.sprite.y
    this.fireball(px, py)

    if (perfect) {
      this.audio.perfect()
      this.flashScreen()
      this.cameras.main.shake(130, 0.006)
      this.slowmoUntil = performance.now() + SLOWMO_MS
      this.time.delayedCall(90, () => this.perfectFx.explode(26, px, py))
      this.floatText(px, py - 28, 'PERFECT', '#fff7e0', 19)
    } else {
      this.audio.hit()
      this.cameras.main.shake(80, 0.003)
      this.hitFx.explode(12, px, py)
      this.floatText(px, py - 20, `+${HIT_REFUND}`, '#ffcf8a', 13)
    }

    if (killed) this.killMoth(m)
    else this.perfectFx.explode(6, px, py)

    this.updateHud()
  }

  private fireball(tx: number, ty: number): void {
    const ball = this.add.image(WICK_X, WICK_Y - 30, 'spark').setBlendMode(ADD).setDepth(29).setScale(0.35).setTint(0xffe0a8)
    this.tweens.add({
      targets: ball,
      x: tx,
      y: ty,
      scale: 1.5,
      alpha: 0.15,
      duration: 95,
      ease: 'Quad.in',
      onComplete: () => ball.destroy(),
    })
  }

  private breach(m: Moth): void {
    this.killMoth(m)
    this.breachFx.explode(16, WICK_X, WICK_Y - 20)
    this.fuel -= BREACH_PENALTY
    this.combo = 0
    this.damageFlash = 1
    this.audio.breach()
    this.cameras.main.shake(220, 0.013)
    this.floatText(WICK_X, WICK_Y - 104, `-${BREACH_PENALTY}`, '#ff5a3c', 18)
    this.updateHud()
    if (this.fuel <= 0) {
      this.fuel = 0
      this.gameOver()
    }
  }

  private killMoth(m: Moth): void {
    m.dead = true
    this.moths = this.moths.filter((o) => o !== m)
    const s = m.sprite
    s.setAlpha(1)
    this.tweens.add({
      targets: s,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 170,
      ease: 'Quad.out',
      onComplete: () => s.destroy(),
    })
  }

  private flashScreen(): void {
    const flash = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xfff2d8).setOrigin(0).setDepth(70).setAlpha(0.5)
    this.tweens.add({ targets: flash, alpha: 0, duration: 170, ease: 'Quad.out', onComplete: () => flash.destroy() })
  }

  private floatText(x: number, y: number, msg: string, color: string, size: number): void {
    const txt = this.add
      .text(x, y, msg, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color })
      .setOrigin(0.5)
      .setDepth(80)
    this.tweens.add({
      targets: txt,
      y: y - 34,
      alpha: 0,
      duration: 650,
      ease: 'Quad.out',
      onComplete: () => txt.destroy(),
    })
  }

  private updateHud(): void {
    this.scoreText.setText(String(this.score).padStart(4, '0'))
    this.bestText.setText(`BEST ${this.best}`)
    const show = this.combo > 0
    this.comboText.setText(show ? `COMBO ×${this.combo}` : '')
    this.comboText.setAlpha(show ? 1 : 0)
    if (show) {
      this.tweens.killTweensOf(this.comboText)
      this.comboText.setScale(1)
      this.tweens.add({ targets: this.comboText, scaleX: 1.22, scaleY: 1.22, duration: 70, yoyo: true, ease: 'Quad.out' })
    }
  }

  private updateHudFrame(dt: number): void {
    const ratio = Phaser.Math.Clamp(this.fuel / FUEL_MAX, 0, 1)
    this.fuelBar.clear()
    this.fuelBar.fillStyle(0x241b2c, 0.92)
    this.fuelBar.fillRoundedRect(24, 82, 342, 6, 3)
    const low = ratio < DANGER_FUEL / FUEL_MAX
    const col = low ? 0xff5a3c : 0xffb45c
    const blink = low ? 0.65 + 0.35 * Math.abs(Math.sin(this.elapsed * 6)) : 1
    this.fuelBar.fillStyle(col, blink)
    this.fuelBar.fillRoundedRect(24, 82, Math.max(6, 342 * ratio), 6, 3)

    let dangerAlpha = 0
    if (low) dangerAlpha = (1 - ratio / (DANGER_FUEL / FUEL_MAX)) * 0.55
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.2)
    this.danger.setAlpha(Math.min(0.85, dangerAlpha + this.damageFlash * 0.45))

    if (Math.abs(this.holdT - this.lastCrackle) > 0.03) {
      this.audio.setCrackle(0.08 + this.holdT * 0.92)
      this.lastCrackle = this.holdT
    }
  }

  private gameOver(): void {
    if (this.ended) return
    this.ended = true
    this.holding = false
    this.holdT = 0
    this.fuel = 0
    this.ring.clear()
    this.audio.flameOut()
    this.embers.stop()
    this.cameras.main.shake(320, 0.016)
    this.cameras.main.fadeOut(420, 0, 0, 0)

    const prevBest = getBest()
    const newBest = this.score > prevBest
    if (newBest) setBest(this.score)
    const prevCombo = getBestCombo()
    if (this.maxCombo > prevCombo) setBestCombo(this.maxCombo)

    this.time.delayedCall(430, () => {
      const payload: EndPayload = {
        score: this.score,
        best: Math.max(prevBest, this.score),
        maxCombo: this.maxCombo,
        bestCombo: Math.max(prevCombo, this.maxCombo),
        newBest,
      }
      this.scene.start('End', payload)
    })
  }
}
