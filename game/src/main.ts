import Phaser from 'phaser'
import './style.css'
import { GAME_H, GAME_W } from './config.ts'
import { BootScene } from './scenes/BootScene.ts'
import { EndScene } from './scenes/EndScene.ts'
import { GameScene } from './scenes/GameScene.ts'
import { TitleScene } from './scenes/TitleScene.ts'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#05040a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W,
    height: GAME_H,
  },
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: 'high-performance',
  },
  audio: {
    disableWebAudio: false,
  },
  scene: [BootScene, TitleScene, GameScene, EndScene],
}

const game = new Phaser.Game(config)
// Exposed for debugging and automated playtesting.
Object.assign(window, { wick: game })
