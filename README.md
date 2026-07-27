# Emeris

Emeris is a small experimental game engine.
It explores world-first architecture — the smallest collection of ideas that can produce rich, living worlds.

One active world in the root tree: the **meadow**. TypeScript, browser canvas. Pressure-test forks live under [`forks/`](forks/) and do **not** replace the meadow.

## Core ideas

| Concept | Role |
|---------|------|
| **World** | Sole serializable citizen |
| **Entity** | Identity + pose/motion + optional `local` |
| **Identity** | What something *is* (optional `behave` / `process`) |
| **Style** | Programmable interpretation — `frame` maps identities to Marks |
| **Mark** | One appearance call; may read the world, never mutate it |

Described **process** is how Identity acts when present — not a sixth name.

## The meadow

Day and night. Grass regenerates, spreads, feeds creatures. Flowers bloom and wilt. Creatures show fullness. Trees stand. A living world you can watch; input may arrive when the world asks.

## Run

```bash
npm install
npm run dev
```

[http://127.0.0.1:5173/](http://127.0.0.1:5173/) · **Run and Debug → Run meadow**

Arena: **Run arena** → http://127.0.0.1:5174/ — [`forks/README.md`](forks/README.md)

Headless: `npm run smoke`

| Key | Action |
|-----|--------|
| Space | Cycle style |
| P / R | Snapshot / restore |
| N | New seed |

## Docs

Law + re-entry: [`AGENTS.md`](AGENTS.md) · History: [`HISTORY.md`](HISTORY.md)
