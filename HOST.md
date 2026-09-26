# Emeris — host architecture

Three layers. Product-specific code stays in the product tree; the shell is shared.

```
native shell          emeris/shell/
  → window, WebView2, lifecycle, packaging, native boundary

web runtime           src/main.ts · src/draw.ts · src/audio/ · src/view.ts (when present)
  → renderer, audio, input translation, timing, host-side persistence/services

world                 src/sim/
  → simulation, entities, behaviour, identity, marks, world-defined Intent
```

## Native shell (`emeris/shell/`)

**EmerisShell.exe** — generic WebView2 window. Not a game client. Not the Go project bootstrapper in `launcher/`.

| Flag | Role |
|------|------|
| `--url` | Dev server or packaged entry (default `http://127.0.0.1:5173/`) |
| `--title` | Window + taskbar label |
| `--profile` | Isolated WebView2 profile dir under `%LOCALAPPDATA%\Emeris\shell\` |
| `--icon` | Optional `.ico` for taskbar |

Every 250 ms the shell posts `emeris-host-perf` to the page: CPU % and working set for **this window’s process tree** (shell + WebView2 browser / GPU / renderer). That is the global machine cost. It is not Adreno occupancy. Pages that do not listen can ignore it. Rebuild the shell after this changes (`npm run shell:build`).

Build: `npm run shell:build` (once, needs .NET 8 SDK).

Dev launch: `scripts/run.mjs` calls `runDev` in `scripts/dev.mjs`, which starts Vite, then opens the shell. Lifeline still owns dev-server lifetime until the shell does.

## Web runtime

Everything that observes the world but is not the world itself:

- canvas / WebGL renderer sync
- audio unlock + hear loop
- pointer / keyboard → Intent translation
- clock, pause, camera, viewport
- host save envelope (localStorage, roster, etc.)

A game's own renderer, HUD, and maps live here — in that game's `src/`, not in Emeris.

## World

`src/sim/` — sovereign, serializable, no DOM/canvas/platform imports. Host and tests change it only through `step` / `createWorld` / `deserialize`.

## Sibling products

| Product | Shell profile | Runtime home |
|---------|---------------|--------------|
| Meadow (here) | `meadow` | `emeris/src/` |
| Sibling game | its own key | `<game>/src/` |
| Arena (fork) | `arena` | `emeris/forks/emeris-arena/src/` |

Sibling games import `emeris/scripts/dev.mjs` (their `run.mjs` is one `runDev({ root, port, key, title, icon })` call), `emeris/scripts/lifeline.mjs` (from `vite.config.ts`, with the same `key`), `emeris/src/sim/spine.ts`, `emeris/src/fps.ts` and `emeris/src/audio/kernel/` by relative path during development. Their Vite configs allow `../../emeris/src`. A release build bundles those files into the game, so a shipped game does not need this folder.

Same shell binary. Different title, icon, profile, and web runtime bundle.
