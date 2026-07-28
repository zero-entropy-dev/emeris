# Emeris Tactics

Turn-based grid pressure-test for Emeris. Small squad vs squad on an 8×8 board.

**Not** a tactics product — asks whether World / Entity / Identity / Style / Mark survive discrete turns. Parent law: root [`AGENTS.md`](../../AGENTS.md). Fork delta: [`AGENTS.md`](AGENTS.md).

## Run

```bash
cd forks/emeris-tactics
npm install
npm run dev
```

[http://127.0.0.1:5175/](http://127.0.0.1:5175/) · **Run and Debug → Run tactics**

Headless: `npm run smoke`

Green = your squad (Y1, Y2), red = enemy (F1, F2). Digit under label = HP.

**Fixed turn order:** YOU 1 → YOU 2 → FOE 1 → FOE 2 → repeat. The **NOW** chip and bright ring mark who must act; you cannot skip ahead.

| Input | Action |
|-------|--------|
| Blue cell | Move current unit |
| Red cell | Attack with current unit |
| W | Wait / skip current unit |
| Space | Cycle style |
| P / R | Snapshot / restore |
| N | New seed |
