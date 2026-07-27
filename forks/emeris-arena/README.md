# Emeris Arena

Emeris is a small experimental game engine.
This tree’s one active world is a tiny **raycaster arena** — the simplest playable FPS that still honors world-first law (World / Entity / Identity / Style / Mark).

## Core ideas

| Concept | Role |
|---------|------|
| **World** | Sole serializable citizen |
| **Entity** | Plain instance — identity + pose/motion + optional `local` |
| **Identity** | What something *is* (description + optional `behave` / `process`) |
| **Style** | Programmable interpretation — first person and top-down reinterpret the same world |
| **Mark** | One appearance call for one entity; may read the world, never mutate it |

Intent (steer / look / fire) is a boundary mechanism — not a sixth name. The map lives on one `level` entity’s `local`, not on World fields.

## The arena

Move, look, shoot drifting targets. Walls are solid cells on the level grid. First-person is a Style; Space flips to top-down of the same world.

## Run

```bash
npm install
npm run dev
```

Opens [http://127.0.0.1:5173/](http://127.0.0.1:5173/). In Cursor: **Run and Debug → Run arena**.

Headless proof (no canvas): `npm run smoke`.

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look (click canvas to lock pointer) |
| Click | Fire |
| Space | Cycle style |
| P / R | Snapshot / restore |
| N | New seed |

## Docs

Law: [`AGENTS.md`](AGENTS.md). Re-entry: [`CONTEXT.md`](CONTEXT.md). History: [`HISTORY.md`](HISTORY.md).
