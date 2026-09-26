# Emeris — engine

Emeris is a small deterministic engine for simulation-first games. TypeScript, browser canvas, ordinary code. The world is the source of truth.

## Core vocabulary

| Concept | Role |
|---------|------|
| **World** | Sole serializable citizen — extent, seed, tick, entities |
| **Entity** | Identity + pose/motion + optional `local` |
| **Identity** | What something *is* — registry with optional `behave` |
| **Style** | Programmable interpretation — `frame` owns the picture; maps identities to Marks |
| **Mark** | One appearance call; may read the world, never mutate it or use world RNG |

**Intent** is one boundary crossing from host (or test) into the world — not a sixth peer. What Intent *means* is world-defined. Only `step` applies it.

## World sovereignty

- The world exists without an observer. Observers read; they never own state.
- `step` advances the world by one valid transition (often time `dt`; sometimes a discrete commitment).
- Marks / `frame` may read the world; never mutate it or draw from world RNG.
- `src/sim/` must not import canvas, DOM, or platform APIs.
- World extent is fixed at creation. The observer fits itself to the world — resizing a window never rebuilds it.
- Host/tests change the world only through `step` / `createWorld` / `deserialize`, plus `loadWorld` for worlds that keep saves.

## Locked laws (short)

1. **World is the only citizen.** Plain state you could serialize and rebuild the picture from.
2. **Appearance is one idea; style is data.** Marks never mutate the world or use world RNG. Audio is the same idea: a PCM kernel plus a host that plays buffers. Recipes stay world-authored, like Marks. Lighting is Style data (fill, fog, optional key) — not a sixth name.
3. **No scene graph or asset pipeline in the first core.** Identities + style + immediate draw.
4. **Determinism.** World RNG in world state; fixed timestep. Same seed + same intents → same ticks.
5. **Serializability is a live canary.** Plain JSON. `deserialize` restores a snapshot exactly. Saves from older builds go through a separate `loadWorld` that migrates them.
6. **Identity is described data.** Behaviours hang off the registry, not switches in `step`. A rule for the whole world lives on one holder entity with its own identity (the meadow's `day`), not as a pass inside `step`.
7. **Grow from demand.** No ECS, editors, networking, or 3D “for completeness.”
8. **World/host boundary.** Viewport and camera are observer-only — never in World.

## Host stack

Three layers — see [`HOST.md`](HOST.md):

| Layer | Where |
|-------|--------|
| Native shell | `shell/` — WebView2 window, lifecycle, packaging |
| Web runtime | `src/main.ts`, `src/draw.ts`, `src/audio/` — observer services |
| World | `src/sim/` — sovereign simulation |

## Layout

| Path | Role |
|------|------|
| `shell/` | Native WebView2 shell (`EmerisShell.exe`) — shared with sibling products |
| `src/sim/` | Sovereign world (path name ≠ vocabulary) |
| `src/sim/spine.ts` | World helpers shared by every Emeris world — rng, add/remove entity, `localOf`, serialize |
| `src/style.ts` | Style (`frame` + Marks + lighting recipe) — observer |
| `src/light.ts` | `LightingRecipe` — fill / fog / optional key |
| `src/draw.ts` | Immediate render — observer |
| `src/audio/` | PCM kernel + host; world-authored recipes. The kernel (`src/audio/kernel/`) is shared with sibling games |
| `src/fps.ts` | Host frame meter — **F3**; adds shell CPU / RAM inside EmerisShell. Never World |
| `src/main.ts` | Host: canvas, clock, Intent, draw, hear, HMR |
| `scripts/` | Launch (`dev.mjs` `runDev`, `shell.mjs`, `lifeline.mjs` — shared with sibling games) + smoke |

## Run

```bash
npm install
npm run dev
```

Headless canary: `npm run smoke`.

| Key | Action |
|-----|--------|
| **Space** | Cycle style |
| **P** / **R** | Snapshot / restore |
| **N** | New seed |
| **F3** | Frame counter (host only) |

Edit `src/style.ts` while running — HMR reinterprets; world state stays.

## AI-assisted development

This tree is ordinary TypeScript. Docs and structure are meant to help coding assistants orient quickly. Use AI, or ignore it — the runtime does not depend on it.
