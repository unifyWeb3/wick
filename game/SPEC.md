# WICK — SPEC

> **"Hold to grow your flame, release to strike. Bigger reach burns your life faster."**

Mobile-first portrait web game. One-thumb. 30–60s endless rounds.
Logical canvas **390 × 844**, Phaser 3 `Scale.FIT` + `CENTER_BOTH`.

## Core loop

A candle wick burns at bottom-centre. Moths drift in from the screen edges toward it.
The flame is the only light source **and** your only weapon.

| Action | Result |
|---|---|
| **Hold** (touch / mouse / `Space`) | Flame radius eases **60px → 320px** over ~1.2s. Fuel drain scales **×1 → ×3** as radius grows. A faint ring marks the *perfect band*. |
| **Release** | Flame snaps into a fireball that strikes the **nearest threat inside the radius**; radius resets to 60px. |
| **Hit** | Refund **12** fuel, combo **+1**, screen shake, score. |
| **Perfect** | Target was in the **outer 15%** band of the radius at release. Refund **24**, combo **+2**, white flash + bloom, 80ms slow-mo. |
| **Miss** (nothing in radius on release) | **−5** fuel, combo resets, fizzle burst. |
| **Breach** (moth reaches the wick) | **−20** fuel, moth dies, heavy shake. |
| **Fuel 0** | Flame dies → game over → retry in <1s. |

Fuel starts at **100**, base drain **4/s**.
**Self-balancing:** fuel scales the light radius too (`×0.72` at empty, `×1.0` at full),
so low fuel = short reach = forced precision, and no extra content is needed to ramp difficulty.

## Threat types (exactly three)

| Type | Size | Speed | HP | Points | Behaviour |
|---|---|---|---|---|---|
| **Slow moth** | 16 | 38 px/s | 1 | 10 | Steady drift, wide wing beat |
| **Fast moth** | 11 | 88 px/s | 1 | 12 | Small, quick, sharp weave |
| **Tanky moth** | 22 | 28 px/s | 2 | 25 | Takes 2 hits, armoured, slow |

**Ramp (endless, driven by elapsed time):** spawn interval `2.2s → 0.55s`, speed `×1 → ×1.7`
by 60s, tanky chance unlocks at 25s and climbs to 30%, fast chance climbs to 45%.

## Game feel (mandatory)

- Flame is the only light: radial additive glow whose **radius and brightness shrink with fuel**.
- Ambient dim glow so moths are visible as silhouettes before lit.
- Ember particles rising from the wick; burst particles on hit/death.
- Screen shake on hit (small) and breach (large).
- **PERFECT**: white additive bloom at the target, camera flash, 80ms slow-mo (0.25×).
- **Red vignette** fades in under 25 fuel.
- **Combo counter** scale-pops on every increment.
- **WebAudio synth only** — no audio files. Crackle bed whose brightness/volume rises with hold,
  plus strike / hit / perfect / miss / breach / flame-out sounds.
- Procedural shapes only — no image assets, no external files.

## Screens

1. **Title** — one-tap start, `WICK` wordmark, animated flame, best score.
2. **Game** — HUD: fuel bar, score, combo counter.
3. **End card** — score, best (localStorage, `try/catch`), longest combo, `NEW BEST` badge,
   tap to retry. Composed as a clean, screenshot-ready card.

## Scope — CUT LIST (not built, deliberately)

| Cut | Why |
|---|---|
| Multiplayer / online scoreboard | No backend allowed; adds netcode risk |
| AI/LLM opponent or narrator | Backend + latency + unpredictable behaviour |
| Steam demo, level editor, workshop | Out of one-session budget |
| More than 3 threat types | Ramp already handles difficulty |
| Crafting / upgrades / meta economy | Needs persistence + balance beyond 6h |
| Realistic 3D lighting / shaders | 2D additive glow reads better on phones |
| Third-party art, fonts, SFX packs | No assets; keeps load instant |
| Accounts, analytics, social login | Not needed to judge |
| Pause / settings menus | Not needed to judge; cuts session length |

**Rule of cuts:** if it is not in the table above, it does not get built.
