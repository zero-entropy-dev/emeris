# Forks

In-workspace experiments. **They do not replace the primary world** (meadow on :5173).

Inherit philosophy from root [`AGENTS.md`](../AGENTS.md). Each fork keeps only **AGENTS** (aims / watches / deltas) + **README** (run). Session notes go in root [`HISTORY.md`](../HISTORY.md).

| Fork | Port | Run and Debug | Notes |
|------|------|---------------|-------|
| [`emeris-arena`](emeris-arena/) | 5174 | **Run arena** | Intent + Style-as-FPS — [`AGENTS.md`](emeris-arena/AGENTS.md) |
| [`emeris-tactics`](emeris-tactics/) | 5175 | **Run tactics** | Discrete turns pressure-test — [`AGENTS.md`](emeris-tactics/AGENTS.md) |

`cd forks/<name> && npm install && npm run dev`
