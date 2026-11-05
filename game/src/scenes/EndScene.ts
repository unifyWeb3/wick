import Phaser from 'phaser'
import { GAME_H, GAME_W, WICK_X, WICK_Y } from '../config.ts'
import type { AudioKit } from '../game/AudioKit.ts'
import { AUDIO_KEY } from './BootScene.ts'
import type { EndPayload } from './GameScene.ts'

const FONT = 'monospace'
const ADD = Phaser.BlendModes.ADD
const CARD_TOP = 146
const CARD_BOTTOM = 700

export class EndScene extends Phaser.Scene {
  private audio!: AudioKit
  private prompt!: Phaser.GameObjects.Text
  private retrying = false
  private lockedUntil = 0

  constructor() {
    super('End')
  }

  create(data: EndPayload): void {
    this.audio = this.registry.get(AUDIO_KEY) as AudioKit
    this.retrying = false
    this.lockedUntil = performance.now() + 350

    this.add.image(0, 0, 'bg').setOrigin(0).setDepth(0)
    this.add.image(WICK_X, GAME_H / 2, 'vignette').setDisplaySize(GAME_W, GAME_H).setAlpha(0.9).setDepth(2)

    this.add.image(WICK_X, WICK_Y - 120, 'glow').setBlendMode(ADD).setTint(0xff6a30).setAlpha(0.1).setDisplaySize(500, 500).setDepth(3)
    this.add.particles(WICK_X, WICK_Y + 20, 'ember', {
      lifespan: { min: 900, max: 1800 },
      speedX: { min: -12, max: 12 },
      speedY: { min: -34, max: -12 },
      scale: { start: 0.16, end: 0 },
      alpha: { start: 0.22, end: 0 },
      frequency: 320,
      blendMode: ADD,
      tint: 0x7a627f,
    }).setDepth(4)

    this.add.image(WICK_X, 428, 'glow').setBlendMode(ADD).setTint(0xff8a30).setAlpha(0.06).setDisplaySize(520, 520).setDepth(10)

    const card = this.add.graphics().setDepth(20)
    card.fillStyle(0x0c0812, 0.94)
    card.fillRoundedRect(30, CARD_TOP, 330, CARD_BOTTOM - CARD_TOP, 18)
    card.lineStyle(1, 0xffb45c, 0.2)
    card.strokeRoundedRect(30, CARD_TOP, 330, CARD_BOTTOM - CARD_TOP, 18)
    card.lineStyle(1, 0xffb45c, 0.1)
    card.lineBetween(68, 356, 322, 356)

    this.add.text(WICK_X, 174, 'WICK', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#d8c2a0' }).setOrigin(0.5).setLetterSpacing(8).setDepth(25)
    this.add.text(WICK_X, 204, 'FLAME OUT', { fontFamily: FONT, fontSize: '9px', color: '#ff7a5a' }).setOrigin(0.5).setLetterSpacing(4).setDepth(25)
    this.add.text(WICK_X, 240, 'SCORE', { fontFamily: FONT, fontSize: '9px', color: '#8f7f9c' }).setOrigin(0.5).setLetterSpacing(3).setDepth(25)

    this.add.image(WICK_X, 292, 'glow').setBlendMode(ADD).setTint(0xff8a30).setAlpha(0.28).setDisplaySize(330, 160).setDepth(24)
    this.add
      .text(WICK_X, 256, String(data.score), { fontFamily: FONT, fontSize: '64px', fontStyle: 'bold', color: '#fff3dd' })
      .setOrigin(0.5, 0)
      .setDepth(25)

    const bestLabel = this.add.text(104, 378, 'BEST', { fontFamily: FONT, fontSize: '9px', color: '#8f7f9c' }).setOrigin(0.5).setLetterSpacing(2).setDepth(25)
    const comboLabel = this.add.text(286, 378, 'LONGEST COMBO', { fontFamily: FONT, fontSize: '9px', color: '#8f7f9c' }).setOrigin(0.5).setLetterSpacing(2).setDepth(25)
    this.add.text(104, 396, String(data.best), { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffcf8a' }).setOrigin(0.5, 0).setDepth(25)
    this.add.text(286, 396, `×${data.maxCombo}`, { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffcf8a' }).setOrigin(0.5, 0).setDepth(25)
    bestLabel.setY(378)
    comboLabel.setY(378)

    if (data.newBest) {
      const badge = this.add.graphics().setDepth(25)
      badge.fillStyle(0xffcf8a, 1)
      badge.fillRoundedRect(WICK_X - 66, 460, 132, 28, 14)
      const badgeText = this.add.text(WICK_X, 474, 'NEW BEST', { fontFamily: FONT, fontSize: '10px', fontStyle: 'bold', color: '#1a1018' }).setOrigin(0.5).setLetterSpacing(2).setDepth(26)
      badge.setScale(0.8)
      badgeText.setScale(0.8)
      this.tweens.add({ targets: [badge, badgeText], scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.out', delay: 180 })
      this.tweens.add({ targets: [badge, badgeText], alpha: 0.82, duration: 900, yoyo: true, repeat: -1, delay: 500 })
      this.time.delayedCall(260, () => this.audio.chime(659))
    } else {
      this.add.text(WICK_X, 474, 'BURN BRIGHTER NEXT TIME', { fontFamily: FONT, fontSize: '9px', color: '#6f627a' }).setOrigin(0.5).setLetterSpacing(2).setDepth(25)
    }

    this.prompt = this.add
      .text(WICK_X, 556, 'TAP TO RELIGHT', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffe4b8' })
      .setOrigin(0.5)
      .setLetterSpacing(3)
      .setDepth(25)
    this.add.text(WICK_X, 586, 'SPACE', { fontFamily: FONT, fontSize: '8px', color: '#6f627a' }).setOrigin(0.5).setLetterSpacing(2).setDepth(25)
    this.add.text(WICK_X, 664, 'ONE THUMB  ·  ENDLESS NIGHT', { fontFamily: FONT, fontSize: '8px', color: '#5d5168' }).setOrigin(0.5).setLetterSpacing(2).setDepth(25)

    this.input.once('pointerdown', () => this.retry())
    this.input.keyboard?.once('keydown-SPACE', () => this.retry())
    this.cameras.main.fadeIn(240, 0, 0, 0)
  }

  update(time: number): void {
    const t = time / 1000
    this.prompt.setAlpha(0.55 + Math.abs(Math.sin(t * 1.9)) * 0.45)
  }

  private retry(): void {
    if (this.retrying || performance.now() < this.lockedUntil) return
    this.retrying = true
    this.audio.unlock()
    this.audio.chime(392)
    this.cameras.main.fadeOut(160, 0, 0, 0)
    this.time.delayedCall(160, () => this.scene.start('Game'))
  }
}
