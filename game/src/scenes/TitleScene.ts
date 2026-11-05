import Phaser from 'phaser'
import { GAME_H, GAME_W, WICK_X } from '../config.ts'
import type { AudioKit } from '../game/AudioKit.ts'
import { getBest } from '../game/storage.ts'
import { AUDIO_KEY } from './BootScene.ts'

const FONT = 'monospace'
const ADD = Phaser.BlendModes.ADD
const FLAME_Y = 584

interface DecoMoth {
  sprite: Phaser.GameObjects.Image
  radius: number
  angle: number
  speed: number
  phase: number
}

export class TitleScene extends Phaser.Scene {
  private audio!: AudioKit
  private flame!: Phaser.GameObjects.Image
  private glow!: Phaser.GameObjects.Image
  private ring!: Phaser.GameObjects.Graphics
  private prompt!: Phaser.GameObjects.Text
  private wordmark!: Phaser.GameObjects.Text
  private decos: DecoMoth[] = []
  private starting = false

  constructor() {
    super('Title')
  }

  create(): void {
    this.audio = this.registry.get(AUDIO_KEY) as AudioKit
    const best = getBest()
    this.starting = false

    this.add.image(0, 0, 'bg').setOrigin(0).setDepth(0)
    this.add.image(WICK_X, GAME_H / 2, 'vignette').setDisplaySize(GAME_W, GAME_H).setAlpha(0.85).setDepth(2)

    this.ring = this.add.graphics().setDepth(4)
    this.glow = this.add.image(WICK_X, FLAME_Y - 76, 'glow').setBlendMode(ADD).setTint(0xff9a40).setAlpha(0.34).setDisplaySize(420, 420).setDepth(5)
    this.add.image(WICK_X, FLAME_Y - 60, 'glow').setBlendMode(ADD).setTint(0xff5a20).setAlpha(0.12).setDisplaySize(760, 760).setDepth(3)

    const candle = this.add.graphics().setDepth(7)
    candle.fillStyle(0x1b1422, 1)
    candle.fillRoundedRect(WICK_X - 17, FLAME_Y + 18, 34, 58, 7)
    candle.fillStyle(0x2a1f33, 1)
    candle.fillEllipse(WICK_X, FLAME_Y + 20, 34, 12)
    candle.lineStyle(2, 0x3a2c43, 1)
    candle.lineBetween(WICK_X, FLAME_Y + 16, WICK_X, FLAME_Y + 2)

    this.flame = this.add.image(WICK_X, FLAME_Y + 14, 'flame').setOrigin(0.5, 1).setBlendMode(ADD).setDepth(20)
    this.flame.setScale(1.22, 1.26)

    this.add.particles(WICK_X, FLAME_Y - 30, 'ember', {
      lifespan: { min: 700, max: 1500 },
      speedX: { min: -20, max: 20 },
      speedY: { min: -75, max: -20 },
      scale: { start: 0.28, end: 0 },
      alpha: { start: 0.7, end: 0 },
      frequency: 110,
      blendMode: ADD,
      tint: 0xffb060,
    }).setDepth(18)

    this.add.image(WICK_X, 238, 'glow').setBlendMode(ADD).setTint(0xff7a20).setAlpha(0.2).setDisplaySize(430, 190).setDepth(29)
    this.wordmark = this.add
      .text(WICK_X, 226, 'WICK', { fontFamily: FONT, fontSize: '72px', fontStyle: 'bold', color: '#ffe9c9' })
      .setOrigin(0.5)
      .setLetterSpacing(14)
      .setDepth(30)

    this.add
      .text(WICK_X, 300, 'HOLD TO GROW. RELEASE TO STRIKE.', { fontFamily: FONT, fontSize: '11px', color: '#e0c9a8' })
      .setOrigin(0.5)
      .setLetterSpacing(2)
      .setDepth(30)
    this.add
      .text(WICK_X, 322, 'BIGGER REACH BURNS YOUR LIFE FASTER', { fontFamily: FONT, fontSize: '9px', color: '#8f7f9c' })
      .setOrigin(0.5)
      .setLetterSpacing(1)
      .setDepth(30)

    this.add
      .text(WICK_X, 680, best > 0 ? `BEST  ${best}` : 'NO RECORD YET', {
        fontFamily: FONT,
        fontSize: '12px',
        color: best > 0 ? '#ffcf8a' : '#6f627a',
      })
      .setOrigin(0.5)
      .setLetterSpacing(2)
      .setDepth(30)

    this.prompt = this.add
      .text(WICK_X, 728, 'TAP TO LIGHT', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffe4b8' })
      .setOrigin(0.5)
      .setLetterSpacing(3)
      .setDepth(30)

    this.add
      .text(WICK_X, 760, 'TOUCH  ·  CLICK  ·  SPACE', { fontFamily: FONT, fontSize: '8px', color: '#6f627a' })
      .setOrigin(0.5)
      .setLetterSpacing(2)
      .setDepth(30)

    const kinds = ['slow', 'fast'] as const
    const radii = [236, 188]
    for (let i = 0; i < kinds.length; i++) {
      this.decos.push({
        sprite: this.add.image(0, 0, `moth-${kinds[i]}`).setDepth(12).setAlpha(0.5).setTint(0x9a90b8),
        radius: radii[i],
        angle: i === 0 ? -2.1 : 0.9,
        speed: i === 0 ? 0.00013 : -0.00019,
        phase: i * 2.4,
      })
    }

    this.input.once('pointerdown', () => this.begin())
    this.input.keyboard?.once('keydown-SPACE', () => this.begin())
    this.cameras.main.fadeIn(280, 0, 0, 0)
  }

  update(time: number): void {
    const t = time / 1000
    const pulse = 1 + Math.sin(t * 2.1) * 0.018 + Math.sin(t * 5.7) * 0.01
    this.flame.setScale(1.22 * pulse, 1.26 * pulse)
    this.glow.setAlpha(0.27 + Math.sin(t * 1.7) * 0.03)
    this.wordmark.setAlpha(0.94 + Math.sin(t * 3.3) * 0.04)
    this.prompt.setAlpha(0.55 + Math.abs(Math.sin(t * 1.9)) * 0.45)

    this.ring.clear()
    for (let i = 0; i < 2; i++) {
      const phase = (t * 0.28 + i * 0.5) % 1
      const r = 86 + phase * 250
      this.ring.lineStyle(1, 0xffc879, 0.14 * (1 - phase))
      this.ring.strokeCircle(WICK_X, FLAME_Y - 40, r)
    }

    for (const m of this.decos) {
      m.angle += m.speed * this.game.loop.delta
      const x = WICK_X + Math.cos(m.angle) * m.radius
      const y = FLAME_Y - 90 + Math.sin(m.angle) * m.radius * 0.52
      m.sprite.setPosition(x, y)
      m.sprite.rotation = m.angle + Math.PI / 2
      m.sprite.scaleX = 1 + Math.sin(t * 8 + m.phase) * 0.1
      m.sprite.setAlpha(0.45 + 0.25 * Math.abs(Math.sin(m.angle * 1.3)))
    }
  }

  private begin(): void {
    if (this.starting) return
    this.starting = true
    this.audio.unlock()
    this.audio.chime(523)
    this.cameras.main.fadeOut(200, 0, 0, 0)
    this.time.delayedCall(200, () => this.scene.start('Game'))
  }
}
