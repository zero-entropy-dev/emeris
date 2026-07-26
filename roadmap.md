# Emeris — high-level roadmap

**Status:** Unparked — working irreducible vocabulary named (World / Entity / Identity / Style / Mark), 2026-07-25.

Companion: [`engine-notes.md`](engine-notes.md) (long-term questions and first principles). Runtime law: [`AGENTS.md`](AGENTS.md).

**Hard rule:** No Waymark transfer. Waymark stays in Godot. Do not grow this folder from adjacent games.

---

## North star

Do not build another general-purpose engine.

Discover the **irreducible vocabulary** of an engine for identity-and-style games — simulation as truth, appearance as interpretation, style as programmable identity — and only keep names that earn their place in contact with real play. Smallness follows; it is not the prize. Expand vocabulary only when a new name makes the set clearer, not larger.

---

## Now

| | |
|--|--|
| **Stack** | TypeScript, Vite, browser canvas 2D |
| **Proof so far** | Spine + style + slice; sim sovereignty (`src/sim/`, intent-at-step, headless smoke) |
| **Not yet** | Handmade launcher/UI (only from demand) |

---

## Suggested sequence

### Phase 1 — Name the irreducible vocabulary

Answer in writing before growing frameworks:

1. What is the game loop? (sim step → query state → draw) — *running stub exists*
2. What persists between frames? (simulation only, by default) — *honored in stub*
3. What is an "entity" without a scene graph?
4. What is "appearance" as one abstraction (procedural, sprite, vector, text, particles)?
5. What is the thinnest host (window, input, time, audio stub)?

Exit criterion: a short vocabulary you would still believe after a week away — names that feel unavoidable, not a feature inventory. *(Working set of five claimed in AGENTS.)*

### Phase 2 — Vertical slice (one tiny game)

Build a throwaway mini-game *on the candidate core*, not a platform for imagined future games. *(Beacon slice exists.)*

No Phase for harvesting Waymark — out of scope permanently.

Must prove:

- simulation is the source of truth
- rendering is immediate / rebuilt from state
- style rules can change the whole look without re-authoring assets
- hot reload or live tweak of rules/identity without a traditional editor

Exit criterion: the slice is fun enough to revisit, and the core still fits in one person's head.

### Phase 3 — Tooling over editing

Only after the slice works:

- in-game / companion inspectors for simulation state
- live reload of style/identity definitions
- semantic descriptions (what something *is*) before binary asset workflows
- AI as a consumer of those descriptions — not as a code-dump into a classic engine layout

Still no mandate for a visual scene editor.

### Phase 4 — Grow only from demand inside this project

Promote subsystems only when a second real game built *here* demands them. Candidate order is illustrative, not a backlog:

1. Input & time
2. Immediate 2D draw + programmable style
3. Audio as another appearance channel
4. Persistence / save of *simulation*, not of scene trees

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

---

## Revisit

Park again only by deliberate choice. Until then: keep the core small enough that one person still holds it.
