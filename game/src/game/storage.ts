import { STORAGE_COMBO_KEY, STORAGE_KEY } from '../config.ts'

function read(key: string): number {
  try {
    const raw = window.localStorage.getItem(key)
    const n = raw ? Number.parseInt(raw, 10) : 0
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

function write(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(Math.floor(value)))
  } catch {
    /* storage blocked (private mode / iframe) — scores just don't persist */
  }
}

export function getBest(): number {
  return read(STORAGE_KEY)
}

export function setBest(value: number): void {
  write(STORAGE_KEY, value)
}

export function getBestCombo(): number {
  return read(STORAGE_COMBO_KEY)
}

export function setBestCombo(value: number): void {
  write(STORAGE_COMBO_KEY, value)
}
