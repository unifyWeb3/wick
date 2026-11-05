import Phaser from 'phaser'
import { AudioKit } from '../game/AudioKit.ts'
import { buildTextures } from '../game/Textures.ts'

export const AUDIO_KEY = 'wick.audio'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    buildTextures(this)

    const audio = new AudioKit()
    this.registry.set(AUDIO_KEY, audio)

    this.scene.start('Title')
  }
}
