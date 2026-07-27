# Emeris Arena — founding / re-entry context

**Status:** FPS fork under `forks/emeris-arena` — does **not** replace the root meadow.

Fork law: [`AGENTS.md`](AGENTS.md). Parent law: root [`AGENTS.md`](../../AGENTS.md).

## Why this fork

Pressure-test Emeris; feed successful ideas back. World-specific code stays here unless it earns promotion. Already shown: a small FPS on **World / Entity / Identity / Style / Mark** (optional `behave` / `process`) without cameras, scene graphs, physics engines, or renderer abstractions as core peers. Intent is a boundary, not a sixth name.

Success criterion is **not** “build a better FPS” — it is a stronger Emeris vocabulary. When helpers appear: (1) Arena-only? (2) Plausible elsewhere? (3) Promote, or keep fork-local?

**Avoid** content systems whose job is game depth: inventory, pickups, progression, scripting, quests, menus, audio.

## Shipped (light expansion)

- Style-only first-person weapon (cooldown recoil)
- Larger level grid (24×18) on one `level` entity
- `drone` + `stalker` (distinct behave + silhouettes); `target` removed
- Presentation polish (fog, contrast, readability)

## Run

**Run and Debug → Run arena**, or:

```text
cd forks/emeris-arena
npm install
npm run dev
```

http://127.0.0.1:5174/ (meadow :5173)

**Controls:** WASD · mouse look · LMB fire · Esc unlock · Space style · P/R · N
