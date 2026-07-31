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
- Host/tests change the world only through `step` / `createWorld` / `deserialize`.

## Locked laws (short)

1. **World is the only citizen.** Plain state you could serialize and rebuild the picture from.
2. **Appearance is one idea; style is data.** Marks never mutate the world or use world RNG.
3. **No scene graph or asset pipeline in the first core.** Identities + style + immediate draw.
4. **Determinism.** World RNG in world state; fixed timestep. Same seed + same intents → same ticks.
5. **Serializability is a live canary.** Plain JSON.
6. **Identity is described data.** Behaviours hang off the registry, not switches in `step`.
7. **Grow from demand.** No ECS, editors, networking, or 3D “for completeness.”
8. **World/host boundary.** Viewport and camera are observer-only — never in World.

## Layout

| Path | Role |
|------|------|
| `src/sim/` | Sovereign world (path name ≠ vocabulary) |
| `src/style.ts` | Style (`frame` + Marks) — observer |
| `src/draw.ts` | Immediate render — observer |
| `src/main.ts` | Host: canvas, clock, Intent, draw, HMR |
| `scripts/` | Launch + lifeline + smoke |

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

Edit `src/style.ts` while running — HMR reinterprets; world state stays.

## This starter

You have a **blank** world — not the meadow. A few static landmarks and simple wanderers exist only so something moves on screen. Replace identities, `createWorld`, and Marks with your game. The spine stays — World, Entity, Identity, Style, Mark.

## AI-assisted development

This tree is ordinary TypeScript. Docs and structure are meant to help coding assistants orient quickly. Use AI, or ignore it — the runtime does not depend on it.
