# Emeris Arena

A small, fast first-person shooter (raycaster) built on Emeris world-first law. Survive growing waves of drones and stalkers; each run ends when your health does. Direction: [`ROADMAP.md`](ROADMAP.md).

The meadow in the parent tree stays the primary world.

## Run

```bash
cd forks/emeris-arena
npm install
npm run dev
```

**Run and Debug → Run arena** opens the game in its own Emeris window (the shared native shell) with the arena icon. Closing the window stops the dev server. Without the shell built, it falls back to an Edge app window. Browser: [http://127.0.0.1:5174/](http://127.0.0.1:5174/)

Headless: `npm run smoke` · step cost: `npm run bench` · regenerate icon: `npm run icon`

| Input | Action |
|-------|--------|
| WASD | Move |
| Mouse | Look (click canvas to lock) |
| Click | Fire |
| Enter | Restart the same seed |
| Space | Cycle style |
| P / R | Snapshot / restore |
| N | New seed |
| F2 | Screenshot (PNG download + clipboard) |
| F3 | Frame meter |
