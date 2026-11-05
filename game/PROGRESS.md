# WICK — build log

Jam: **Loadout AI Game Competition** — deadline **Nov 6 2026, 15:00 UTC**.
Rules: one core mechanic, mobile-first, juice mandatory, shareable end card, **no features past SPEC.md**.
Commit after every step below.

## Steps

| # | Step | State | Commit |
|---|---|---|---|
| 0 | Research → concept verdict + SPEC + CUT list | done | `9b82fa3` (bundled) |
| 1 | Core loop: fuel, hold/release, moths, strike/miss/breach, game over | done | `9b82fa3` |
| 2 | Controls + scaling: pointer & Space, 390×844 FIT portrait | done | `9b82fa3` |
| 3 | Juice: embers, shake, bloom, slow-mo, danger vignette, combo pop, synth audio | done | `9b82fa3` |
| 4 | Threats + ramp: slow / fast / tanky (2 HP), time-based spawn ramp | done | `9b82fa3` |
| 5 | Title + end card, best score, NEW BEST badge | done | `9b82fa3` |
| 6 | Balance pass, deploy, README, clip, submission pack | done | see log |

## What was verified (headless Chromium, 390×844)

- `npm run build` is clean (`tsc && vite build`).
- Boot → Title → tap → Game → hold grows radius and drains fuel faster → release
  strikes the nearest moth in range → hit refunds fuel and raises combo.
- PERFECT path: target in outer 15% band → double refund, combo +2, flash,
  80 ms slow-mo, `PERFECT` pop.
- Miss path: release with nothing in range → −5 fuel, combo reset.
- Breach: moth reaches the wick → −20 fuel, combo reset, red flash, shake.
- Fuel 0 → flame-out sound, fade, **End card in ~0.43s**, tap → new run in ~0.16s.
- Retry resets all run state (bug found & fixed: Phaser reuses scene instances).
- `localStorage` best score + longest combo persist across runs.
- No console errors across the whole flow.

## Known limitations

- Headless test box is CPU-starved (≈6 fps in software GL); frame-time clamping
  (`min(delta, 50ms)`) keeps the sim stable there. Real-device target is 60 fps.
- Audio cannot be asserted headlessly; the synth graph was written against the
  WebAudio spec and unlocked on first gesture.

## Next

1. Upload `clip/wick-clip.mp4` (37s, 780×1688) to X, tagging `@loadoutprotocol`.
2. Submit the form with <https://wick-oxunify.vercel.app> + the post.
3. Stop. No features after the spec.

## Clip log

| Take | Length | Result |
|---|---|---|
| 1 (first balance) | 22.5s | score 280, combo ×6, early game felt sparse |
| 2 (after balance pass) | 37.1s | score **6448**, longest combo **×34**, full ramp + NEW BEST card |
