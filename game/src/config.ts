export const GAME_W = 390
export const GAME_H = 844

/** Wick (and therefore flame) sits at the bottom centre of the portrait screen. */
export const WICK_X = GAME_W / 2
export const WICK_Y = 742

export const FUEL_MAX = 100
/** Base fuel burn per second while doing nothing. */
export const FUEL_DRAIN_BASE = 4

export const FLAME_MIN_RADIUS = 60
export const FLAME_MAX_RADIUS = 320
/** Seconds of holding to go from min to max radius. */
export const FLAME_GROW_TIME = 1.2
/** Drain multiplier at max radius. */
export const DRAIN_MULT_MAX = 3

/** Fuel scale applied to the radius: full fuel = 1.0, empty = 0.72. */
export const FUEL_RADIUS_MIN_SCALE = 0.72

export const HIT_REFUND = 12
export const PERFECT_REFUND = 24
export const MISS_PENALTY = 5
export const BREACH_PENALTY = 20

/** Outer band of the radius, as a fraction, that counts as PERFECT. */
export const PERFECT_BAND = 0.15

/** Distance from the wick at which a moth breaches it. */
export const BREACH_RADIUS = 28

export const SLOWMO_FACTOR = 0.25
export const SLOWMO_MS = 80

export const DANGER_FUEL = 25

export type MothKind = 'slow' | 'fast' | 'tanky'

export interface MothDef {
  kind: MothKind
  /** Collision radius in px. */
  radius: number
  /** Base speed in px/sec. */
  speed: number
  hp: number
  points: number
  /** Body colour used for the sprite tint. */
  color: number
  /** Wing-beat frequency. */
  flap: number
  /** How much the flight path weaves, in radians. */
  weave: number
}

export const MOTHS: Record<MothKind, MothDef> = {
  slow: { kind: 'slow', radius: 16, speed: 38, hp: 1, points: 10, color: 0x6f5f8a, flap: 7, weave: 0.22 },
  fast: { kind: 'fast', radius: 11, speed: 88, hp: 1, points: 12, color: 0x8a6f6f, flap: 15, weave: 0.45 },
  tanky: { kind: 'tanky', radius: 22, speed: 28, hp: 2, points: 25, color: 0x5f7a8a, flap: 5, weave: 0.12 },
}

export interface Ramp {
  spawnInterval: number
  speedMul: number
  fastChance: number
  tankyChance: number
}

/** Difficulty ramp driven purely by elapsed seconds. */
export function rampAt(t: number): Ramp {
  return {
    spawnInterval: Math.max(0.55, 2.2 - t * 0.03),
    speedMul: 1 + Math.min(t, 90) * 0.008,
    fastChance: Math.min(0.45, 0.18 + t * 0.004),
    tankyChance: Math.min(0.3, Math.max(0, (t - 25) / 220)),
  }
}

export const STORAGE_KEY = 'wick.best.v1'
export const STORAGE_COMBO_KEY = 'wick.bestCombo.v1'
