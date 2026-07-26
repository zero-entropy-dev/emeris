# Emeris

Emeris is a small experimental game engine.
It explores simulation-first architecture, searching for the smallest collection of ideas that can produce rich, living worlds.

TypeScript, browser canvas, version **`0.0.1`**. Simulation stays sovereign; appearance is interpretation.

## Core ideas

| Concept | Role |
|---------|------|
| **World** | Sole serializable simulation citizen |
| **Entity** | Plain instance — identity + pose/motion + optional `local` |
| **Identity** | What something *is* (description + optional `behave`) |
| **Style** | Programmable interpretation — `frame` maps identities to Marks |
| **Mark** | One appearance call for one entity; may read the world, never mutate it |

## Slice (meadow)

Steer a walker across a fixed meadow. Bloom flowers, gather them, watch patches regrow, wake the beacon, reach it. Snapshot/restore, style cycling, and a hard sim/host boundary are already in.

## Run

```bash
npm install
npm run dev
```

Opens [http://127.0.0.1:5173/](http://127.0.0.1:5173/). In Cursor: **Run and Debug → Run meadow**.

Headless proof (no canvas): `npm run smoke`.

| Key | Action |
|-----|--------|
| WASD / arrows | Steer |
| Tab | Cycle controlled walker |
| Space | Cycle style |
| P / R | Snapshot / restore |
| N | New meadow |

## Docs

| Doc | Role |
|-----|------|
| [`AGENTS.md`](AGENTS.md) | Living law |
| [`CONTEXT.md`](CONTEXT.md) | Re-entry note |
| [`HISTORY.md`](HISTORY.md) | Changelog + session log |
| [`engine-notes.md`](engine-notes.md) | First principles |
| [`roadmap.md`](roadmap.md) | Sequence |
