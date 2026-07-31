# Emeris

Emeris is a small experimental game engine — TypeScript, browser canvas, the world as source of truth.
A thin core (**World**, **Entity**, **Identity**, **Style**, **Mark**) that already carries a living meadow and forks that look nothing like it: first-person arena, discrete tactics. Add only what is necessary.

The **meadow** stays primary. Pressure-tests live under [`forks/`](forks/) and do not replace it.

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

Law + re-entry: [`AGENTS.md`](AGENTS.md) · Architecture: [`ENGINE.md`](ENGINE.md) · History: [`HISTORY.md`](HISTORY.md)

## Launcher

Scaffold a blank project or Demo Meadow (Windows): `npm run build:launcher` → `dist/EmerisLauncher.exe`. See [`launcher/README.md`](launcher/README.md). The launcher owns only project generation — then it exits. Packed starters ship **README.md + ENGINE.md** only (no AGENTS/HISTORY).
