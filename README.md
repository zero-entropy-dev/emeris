# Emeris

Emeris is a small experimental game engine.
It explores world-first architecture — add only what is necessary to produce rich, living worlds.

The living world here is the **meadow**. TypeScript, browser canvas. Pressure-test forks live under [`forks/`](forks/) and do not replace it.

## Core ideas

| Concept | Role |
|---------|------|
| **World** | Sole serializable citizen |
| **Entity** | Identity + pose/motion + optional `local` |
| **Identity** | What something *is* (optional `behave`) |
| **Style** | Programmable interpretation — `frame` maps identities to Marks |
| **Mark** | One appearance call; may read the world, never mutate it |

Intent is the host→world boundary — not a sixth name.

## The meadow

Day and night shape the living meadow. Grass regenerates by day, spreads, feeds creatures. Flowers bloom and wilt. Creatures slow and rest at night; fullness and hunger drive the day. Watch it; Intent may cross the boundary when a world asks for influence.

## Run

```bash
npm install
npm run dev
```

[http://127.0.0.1:5173/](http://127.0.0.1:5173/) · **Run and Debug → Run meadow**

Arena: **Run arena** → http://127.0.0.1:5174/ · Tactics: **Run tactics** → http://127.0.0.1:5175/ — [`forks/README.md`](forks/README.md)

Headless: `npm run smoke`

| Key | Action |
|-----|--------|
| Space | Cycle style |
| P / R | Snapshot / restore |
| N | New seed |

## Docs

Law + re-entry: [`AGENTS.md`](AGENTS.md) · History: [`HISTORY.md`](HISTORY.md)
