# WICK

**Hold to grow your flame, release to strike. Bigger reach burns your life faster.**

▶ **Play now: <https://wick-oxunify.vercel.app>**

A one-thumb, portrait web game. Moths drift out of the dark toward your candle.
Your flame is the only light in the game — and the only weapon.

## How to play

1. **Hold** anywhere to grow the flame (60px → 320px over ~1.2s). A bigger flame reaches farther, but fuel burns up to **3× faster**.
2. **Release** to fire a fireball at the nearest moth inside your reach. Fuel is life: hits refund +12, misses cost you.
3. **Land PERFECT strikes** — hit a moth in the outer 15% band of your flame for +24 fuel, +2 combo and a slow-mo flash. Don't let anything reach the wick.

Touch, mouse and `Space` all work. Fuel hits 0 → the flame dies → tap to relight in under a second.

## Run it locally

```bash
cd game
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in dist/
```

No backend, no API keys, no assets. Every sprite is drawn to a canvas at boot and every sound is WebAudio synthesis.

## How it is built

- **Phaser 3 + TypeScript + Vite**, logical canvas 390 × 844, `Scale.FIT` portrait.
- **Procedural art only** — `src/game/Textures.ts` paints the flame, glow, embers and all three moths into canvas textures at boot.
- **Procedural audio only** — `src/game/AudioKit.ts` runs a filtered-noise crackle bed whose brightness/volume tracks how big your flame is, plus synth strike/hit/perfect/miss/breach cues.
- **Self-balancing difficulty** — fuel scales your reach (`×0.72` when empty), so low fuel forces precision; spawn rate and speed ramp with elapsed time, and tanky moths unlock after 25s.
- Persistence is `localStorage` only (`wick.best.v1`, `wick.bestCombo.v1`), wrapped in `try/catch`.

## Roadmap

### Now (shipped)
- [x] Core loop: hold-to-grow, release-to-strike, fuel economy, combo, PERFECT band
- [x] Three threat types (slow / fast / tanky 2-HP) + endless time-based ramp
- [x] Full game feel: embers, camera shake, bloom, 80ms slow-mo, red danger vignette, combo pops
- [x] WebAudio synth: crackle bed + six cues, no audio files
- [x] Title / Game / End-card flow, best score + longest combo saved locally
- [x] Mobile-first input: touch, mouse, `Space`; 60fps on a mid-range phone

### Next
- [ ] Seeded **daily run** — same moth pattern for everyone, shareable score
- [ ] One unlockable flame colour earned by a first PERFECT chain of 10
- [ ] Feathered edge on the light so the PERFECT band reads even brighter

### Later
- [ ] Boss moth every 90s (armoured, telegraphed dive)
- [ ] Ghost replay of your best run
- [ ] Optional haptics on hit/breach (Android)

**Cut list lives in [SPEC.md](./SPEC.md).** If it is not in the spec, it does not ship.
