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

Build: `npm run shell:build` (once, needs .NET 8 SDK).

Dev launch: `scripts/run.mjs` starts Vite, then opens the shell. Lifeline still owns dev-server lifetime until the shell does.

## Web runtime

Everything that observes the world but is not the world itself:

- canvas / WebGL renderer sync
- audio unlock + hear loop
- pointer / keyboard → Intent translation
- clock, pause, camera, viewport
- host save envelope (localStorage, roster, etc.)

Asterion’s 3D renderer, ARPG HUD, and ruin atlas live here — in `games/asterion/src/`, not in Emeris.

## World

`src/sim/` — sovereign, serializable, no DOM/canvas/platform imports. Host and tests change it only through `step` / `createWorld` / `deserialize`.

## Sibling products

| Product | Shell profile | Runtime home |
|---------|---------------|--------------|
| Meadow (here) | `meadow` | `emeris/src/` |
| Asterion | `asterion` | `games/asterion/src/` |

Same shell binary. Different title, icon, profile, and web runtime bundle.
