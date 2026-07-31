# Emeris Launcher

Bootstrapper only — scaffolds a project from an embedded template, shows a welcome message, and exits.

**Law:** the launcher owns only project generation. Once generation succeeds, it has no further relationship with the created project.

## Build

From the emeris repo root (requires Go + Node):

```bash
npm run build:launcher
```

This runs the authoritative pack (`launcher/pack.mjs` — fails if archives are incomplete), then compiles with Go:

```bash
go build -C launcher -ldflags="-s -w" -o ../dist/EmerisLauncher.exe .
```

Output: [`dist/EmerisLauncher.exe`](../dist/EmerisLauncher.exe)

## CLI (headless / smoke)

`--dest` is the project folder itself (files are written there, not into a nested name folder).

```bash
./dist/EmerisLauncher.exe --name MyGame --dest C:\Projects\MyGame --template blank
./dist/EmerisLauncher.exe --name MeadowDemo --dest C:\Projects\MeadowDemo --template meadow
```

## Templates

| Id | Role |
|----|------|
| `blank` (default) | Engine + README/ENGINE + minimal world |
| `meadow` | Demo Meadow from the living tree + README/ENGINE |

Markdown in packs: **README.md** and **ENGINE.md** only. Pack always reads the living meadow — not a hand-maintained snapshot.
