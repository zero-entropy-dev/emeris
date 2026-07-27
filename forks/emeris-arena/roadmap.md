# Emeris — high-level roadmap

**Status:** Arena FPS — one active world (raycaster); working core named (World / Entity / Identity / Style / Mark), 2026-07-27.

Companion: [`engine-notes.md`](engine-notes.md) (long-term questions and first principles). Runtime law: [`AGENTS.md`](AGENTS.md).

**Hard rule:** No Waymark transfer. Waymark stays in Godot. Do not grow this folder from adjacent games.

---

## North star

Do not build another general-purpose engine.

Discover the smallest clear vocabulary for rich living worlds through repeated observation of **one** active world — not upfront architecture, not parallel demos. Conceptual clarity is the primary constraint. World as truth; appearance as interpretation; player agency deferred until a world already exists to enter. Expand the core only when a new name makes the set clearer, not larger.

---

## Now

| | |
|--|--|
| **Stack** | TypeScript, Vite, browser canvas 2D |
| **Proof so far** | Spine + style; arena (level / player / target / bolt); Intent agency; first-person + top-down Style; Intent-tape smoke |
| **Not yet** | Handmade launcher/UI (only from demand); richer arena under observation pressure |

---

## Suggested sequence

### Phase 1 — Name the smallest useful core

Answer in writing before growing frameworks:

1. What is the game loop? (world step → query state → draw) — *running stub exists*
2. What persists between frames? (the world only, by default) — *honored in stub*
3. What is an "entity" without a scene graph?
4. What is "appearance" as one abstraction (procedural, sprite, vector, text, particles)?
5. What is the thinnest host (window, input, time, audio stub)?

Exit criterion: a short set of ideas you would still believe after a week away — not a feature inventory. *(Working set of five claimed in AGENTS.)*

### Phase 2 — One living world

Sustain a single observation world on the candidate core. Dual-chamber comparison is closed.

- Living meadow — *exists* (`behave`; day / grass / flower / creature / tree)

Must prove:

- the world is the source of truth
- rendering is immediate / rebuilt from state
- style rules can change the whole look without re-authoring assets
- hot reload or live tweak of rules/identity without a traditional editor
- **the world stays interesting unattended** — *in progress*

No Phase for harvesting Waymark — out of scope permanently. A future different world *replaces* the meadow; it does not sit beside it.

### Phase 3 — Tooling over editing

Only after sustained observation asks:

- in-game / companion inspectors for world state
- live reload of style/identity definitions
- semantic descriptions (what something *is*) before binary asset workflows
- AI as a consumer of those descriptions — not as a code-dump into a classic engine layout

Still no mandate for a visual scene editor.

### Phase 4 — Grow only from demand inside this project

Promote subsystems only when observation (or a later replacement world) demands them. Candidate order is illustrative, not a backlog:

1. Input & time
2. Immediate 2D draw + programmable style
3. Audio as another appearance channel
4. Persistence / save of the *world*, not of scene trees
5. Ambient fields — only if observation finds pairwise coupling too thin

Anything else waits.

---

## Explicit non-goals (until overturned)

- Competing with Godot / Unity / Unreal on breadth
- Full 3D / PBR / animation pipelines "for completeness"
- A traditional WYSIWYG editor as a phase gate
- ECS, scene graphs, or asset databases chosen because they are industry default
- Speculative multiplayer, networking, or platform abstraction layers
- Continuous extraction or mirroring from adjacent project folders
- Waymark transfer / port (Waymark stays in Godot)
- Parallel observation worlds maintained for “generality”
- Relations-as-primitive engine (parked in notes)

---

## Revisit

Park again only by deliberate choice. Until then: keep the core small enough that one person still holds it.
