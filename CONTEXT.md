# Emeris — founding / re-entry context

**Status:** Unparked `0.0.1` — constitutional core + beacon/critter/flower slice; one-button launch; Entity.local for identity-specific state.

This note is for re-entry. Law lives in [`AGENTS.md`](AGENTS.md). First principles in [`engine-notes.md`](engine-notes.md). What shipped: [`HISTORY.md`](HISTORY.md).

## What we were doing

Unpark a sealed notes folder and take early TypeScript steps that make the locked insights *true in code* — not a Godot clone, not a Waymark port. The deeper aim: discover the **irreducible vocabulary** of an engine, not merely the smallest one.

## What landed

1. **Baby host** — Vite + canvas 2D; chromeless app window via **Run meadow**.
2. **Spine** — seeded RNG in world state, fixed timestep, JSON snapshot (P/R), identity registry with `behave`.
3. **Appearance** — Style maps Identity → Mark; glyphs as a second backend; HMR on style; Style.`frame` owns backdrop + entity pass + chrome.
4. **Slice** — steer a walker to a beacon; win is `world.phase`; Tab cycles control; critters flee; flowers bloom once.
5. **Constitution** — working vocabulary named (World, Entity, Identity, Style, Mark); grow by refining irreducibility; lean LCD; hand-built host only (no Electron/Tauri).
6. **Perimeter** — Waymark stays in Godot; no transfer/harvest into this tree.
7. **Sim/host split** — `src/sim/` is sovereign (no DOM/canvas); host submits intent to `step` and observes via Style/Mark. Headless: `npm run smoke`.
8. **Entity.local** — identity-specific state (alarm, bloomed, vx/vy) lives in one optional plain object on Entity; still five names, plain JSON.
9. **Deepened slice** — fixed meadow extent, camera follows controlled walker (host), garden must be full before the beacon can be won.
10. **Launch layer** — one button, dies with the window, quarantined in `scripts/` as disposable browser-host tooling.

## How to run

```text
npm install
npm run dev
```

Or in Cursor: Run and Debug → **Run meadow**. Either way the browser opens **http://127.0.0.1:5173/** and the server dies with the window.

## Controls (quick)

WASD move · Tab swap walker · Space style · P/R snapshot · N new meadow

## Next session (when steered)

Identity is **Emeris** (`0.0.1`). Bidirectional flower lifecycle held. Pick **one** coherent play beat that pressures World / Entity / Identity / Style / Mark — not a micro-probe and not a framework expansion.

Candidate beats (choose by itch, not backlog order):

1. **Post-win / second phase** — something after the beacon that Style and `behave` both read from world state (still no sixth name).
2. **Second command source** — same Intent edge as keys (e.g. replayed or scripted steer); proves Intent is the boundary, not a special walker.
3. **Richer `Entity.local`** on an existing identity — deeper memory/motion without new World bags.

Constraints: prefer Intent / `Entity.local` over new World keys; resist new vocabulary; launcher/UI waits; no Waymark transfer; no ECS pivot.

## What not to do next by default

Do not expand vocabulary for completeness. Do not add a launcher/UI until a slice demands it. Do not open a Waymark transfer pass. Prefer pressure-testing the five names — or stop until a real itch appears. No day-cadence gates; steer by demand and findings.
