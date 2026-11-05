/**
 * WebAudio-only sound design. No audio files.
 * The crackle bed is a filtered noise loop whose brightness and volume track the hold,
 * so the sound itself communicates "the flame is growing".
 */
export class AudioKit {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private crackleSrc: AudioBufferSourceNode | null = null
  private crackleFilter: BiquadFilterNode | null = null
  private crackleGain: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private muted = false

  get ready(): boolean {
    return this.ctx !== null
  }

  /** Must be called from a user gesture (browsers block autoplay otherwise). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    type WithWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    const Ctor = window.AudioContext ?? (globalThis as WithWebkit).webkitAudioContext
    if (!Ctor) return
    try {
      this.ctx = new Ctor()
    } catch {
      this.ctx = null
      return
    }
    const ctx = this.ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.55
    this.master.connect(ctx.destination)

    // 2 seconds of white noise, reused everywhere.
    const len = Math.floor(ctx.sampleRate * 2)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuffer = buf
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.05)
    }
  }

  isMuted(): boolean {
    return this.muted
  }

  private now(): number {
    return this.ctx ? this.ctx.currentTime : 0
  }

  /** Continuous flame crackle. `intensity` 0..1 = how grown the flame is. */
  startCrackle(): void {
    if (!this.ctx || !this.master || !this.noiseBuffer || this.crackleSrc) return
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 420
    filter.Q.value = 0.9

    const gain = ctx.createGain()
    gain.gain.value = 0.0

    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    src.start()

    this.crackleSrc = src
    this.crackleFilter = filter
    this.crackleGain = gain
  }

  setCrackle(intensity: number): void {
    if (!this.ctx || !this.crackleGain || !this.crackleFilter) return
    const t = this.now()
    const i = Math.max(0, Math.min(1, intensity))
    this.crackleGain.gain.setTargetAtTime(0.05 + i * 0.3, t, 0.04)
    this.crackleFilter.frequency.setTargetAtTime(360 + i * 1900, t, 0.05)
  }

  stopCrackle(): void {
    if (!this.ctx || !this.crackleGain) return
    const t = this.now()
    this.crackleGain.gain.setTargetAtTime(0, t, 0.03)
    const src = this.crackleSrc
    this.crackleSrc = null
    this.crackleFilter = null
    this.crackleGain = null
    if (src) {
      window.setTimeout(() => {
        try {
          src.stop()
        } catch {
          /* already stopped */
        }
      }, 220)
    }
  }

  private burst(duration: number, filterType: BiquadFilterType, freqStart: number, freqEnd: number, gain: number): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return
    const ctx = this.ctx
    const t = this.now()
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = filterType
    filter.frequency.setValueAtTime(freqStart, t)
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + duration)
    const env = ctx.createGain()
    env.gain.setValueAtTime(gain, t)
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    src.connect(filter)
    filter.connect(env)
    env.connect(this.master)
    src.start(t)
    src.stop(t + duration + 0.02)
  }

  private tone(
    type: OscillatorType,
    freqStart: number,
    freqEnd: number,
    duration: number,
    gain: number,
    delay = 0,
  ): void {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const t = this.now() + delay
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freqStart, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(gain, t + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(env)
    env.connect(this.master)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  /** Flame release: whoosh + snap. */
  strike(): void {
    this.burst(0.26, 'bandpass', 2400, 380, 0.5)
    this.tone('triangle', 520, 130, 0.22, 0.18)
  }

  /** Target destroyed. */
  hit(): void {
    this.burst(0.16, 'highpass', 900, 2600, 0.4)
    this.tone('square', 660, 880, 0.1, 0.09)
  }

  /** PERFECT: bright bell stack. */
  perfect(): void {
    this.tone('sine', 1046, 1046, 0.42, 0.16)
    this.tone('sine', 1568, 1568, 0.34, 0.11, 0.02)
    this.tone('sine', 2093, 2093, 0.26, 0.07, 0.04)
    this.burst(0.3, 'highpass', 3000, 5200, 0.3)
  }

  /** Released with nothing in range. */
  miss(): void {
    this.tone('sawtooth', 180, 70, 0.22, 0.12)
    this.burst(0.18, 'lowpass', 700, 180, 0.22)
  }

  /** A moth reached the wick. */
  breach(): void {
    this.tone('sawtooth', 300, 55, 0.42, 0.2)
    this.burst(0.4, 'lowpass', 1400, 140, 0.45)
  }

  /** Flame dies. */
  flameOut(): void {
    this.stopCrackle()
    this.burst(0.9, 'lowpass', 1800, 90, 0.5)
    this.tone('sine', 220, 40, 0.9, 0.16)
  }

  /** UI: start / new best. */
  chime(base = 523): void {
    this.tone('sine', base, base, 0.28, 0.14)
    this.tone('sine', base * 1.5, base * 1.5, 0.36, 0.1, 0.07)
  }
}
