# Emeris — version history

Broad log: **what shipped** (changelog) and **what sessions did** (implementation journal) in one place. Complements git; does not replace it.

Version scheme: `0.0.x` = early core. Bump when a coherent bar is verified. No fixed ladder beyond that.

**Maintain:** after a successful implementation session, add a short session entry under the date and, if the bar moved, a bullet under the version section. Update **Stats**. Skip analysis-only threads. No file paths, diffs, or line counts — git holds those.

---

## `0.0.4` — arena FPS (2026-07-27)

Meadow replaced as the one active world by a raycaster arena. Sacred five names kept; agency via Intent; map on one level entity.

### Shipped

- Arena identities: `level` (grid in local), `player`, `target`, `bolt`
- Intent widened: lookYaw + fire; host samples WASD / mouse / click each fixed step
- Styles: first-person raycaster (default) and top-down (Space)
- Smoke: empty-intent replay + Intent-tape determinism
- In-tree only — sibling folder abandoned for workspace approval friction

### Sessions

#### 2026-07-27

##### Arena charter + light expansion
Logged: 2026-07-28
Summary: Filed Arena pressure-test charter; Style-only weapon; 24×18 level; drone + stalker replace target; presentation fog/contrast; smoke updated.
Notes: Fork-local only — no new core names; weapon is Style presentation.

##### Arena graphics / controls pass
Logged: 2026-07-27
Summary: Pointer-lock no longer fires on acquire; snappier look/move/fire; first-person fill columns, fish-eye fix, floor gradient, vignette, clearer targets.
Notes: Host/Style only.

##### Sacred FPS arena (in-tree)
Logged: 2026-07-27
Summary: Replaced the meadow with the simplest playable FPS that still honors Emeris law — planar World, one level entity, Intent agency, first-person as Style.
Notes: Sibling emeris-arena tree dropped so all edits stay inside the open workspace.

---

## `0.0.3` — one living meadow (2026-07-27)

Dual-chamber development ends. One active world: an unattended meadow ecology.

### Shipped

- Removed tide pool from the runtime; host no longer cycles chambers
- Living meadow: `day` cycle, grass (conditions helper), creatures (food-source seek / eat / reproduce / die), trees
- Dropped beacon / garden / flower gather / World.phase dusk gate
- Smoke covers ecology + day cycle; docs claim one-active-world law
- Creature `fullness` (was energy) with per-Mark tell; full-bleed ground; denser grass + day/night growth contrast + spread; flower life cycle (spawn → grow → bloom → die)
- Caller-blind state transforms (`store` / `decay` / `emit` / `transform`); spawn cost, wilt return, age frailty

### Sessions

#### 2026-07-27

##### Caller-blind state transforms
Logged: 2026-07-27
Summary: Added store / decay / emit / transform as tiny composable meadow helpers that never know why they are called; rewrote grass, flower, and creature to compose them; flower spawn costs patch amount, wilt returns amount to a neighbor, older creatures drain fullness faster.
Notes: Identity supplies meaning; interdependence stays cheap without a sixth core name or ecology vocabulary.

##### Fullness, ground, plants-first
Logged: 2026-07-27
Summary: Renamed creature energy to fullness with visible Mark state; filled the frame with ground (no ellipse); strengthened day/night growth contrast; denser grass with light spread; added flower spawn/grow/bloom/wilt cycle (not food).
Notes: Plants-first before hunger retune; food sources stay grass-only.

##### One living meadow
Logged: 2026-07-27
Summary: Retired the tide chamber; rewrote the meadow as a living ecology observed without a player; grass regenerates from local conditions; creatures seek food sources; continuous day/night on a day entity.
Notes: Identities stay general — meadow helpers hold daylight and “grass is food” couplings.

---

## `0.0.2` — described processes + tide pool (2026-07-27)

Second observation chamber proves behavior-as-sequence without a sixth core name.

### Shipped

- Described processes on Identity (`process` + `advanceProcess`); `Entity.local.pc` / `vars`; meadow keeps `behave`
- Tide pool chamber: tide / crab / anemone / drift / rock; tide level on tide entity (no World furniture)
- Host **C** cycles meadow ↔ tide; Style marks + waterline chrome for tide identities
- Headless smoke covers tide determinism and process pc/vars
- Meadow garden counters and flower regrows moved onto `garden` / `patch` entities (World furniture cleared)
- Identity registry module — merged table separate from world state; breaks world↔chamber import cycle
- Prefer **world** over “simulation” in living prose (folder `src/sim/` stays as layout)

### Sessions

#### 2026-07-27

##### Prefer world over simulation
Logged: 2026-07-27
Summary: Living docs and key comments now say world / world sovereignty / world RNG instead of simulation; AGENTS notes the preference; `src/sim/` path unchanged.
Notes: Aligns everyday language with the five-name claim — World is the citizen.

##### Identity registry (cycle break)
Logged: 2026-07-27
Summary: Split meadow identities from the merged registry; moved step out of world so world state no longer imports the identity table; tide identities join via registry only.
Notes: Registry is how Identity is looked up — not a sixth core name.

##### Garden and patches on entities
Logged: 2026-07-27
Summary: Moved meadow bloom/gather counters onto a garden entity and spent flower sites onto patch entities with readyAt; removed flushFlowerRegrows from step; frame draws patches as Marks; tide no longer carries dead meadow World fields.
Notes: Chamber names stay demo-local; the generic win is bookkeeping on entities, not new core vocabulary.

##### Described processes and tide pool
Logged: 2026-07-27
Summary: Added a minimal process runner; left meadow on stateless behave; built an autonomous tide pool that stores life-cycle memory as pc + vars; host C switches chambers; smoke green for both worlds.
Notes: Process is how Identity acts — not a sixth name. Fields and relations stay parked until observation asks.

---

## `0.0.1` — constitutional core + beacon slice (2026-07-25)

First coherent engine bar the director played end-to-end (2026-07-24 evening → 2026-07-25).

### Shipped

- TypeScript + Vite + canvas 2D host; stable local URL and dev helper
- Deterministic sim: seeded RNG in world state, fixed timestep, plain JSON snapshot/restore
- Identity registry (description + optional behaviour); entities carry `identity`
- Style as programmable appearance: Marks per identity; `frame` owns full picture; glyphs backend; style HMR
- Mini-slice: steer walker to beacon; win as world phase; Tab cycles control
- Critter identity: flees walkers, stays skittish after a startle (first inter-entity behaviour)
- Flower identity: permanent bloom latch on visit (second identity-specific memory, non-timer)
- `Entity.local`: single optional bag for identity-specific state (alarm, bloomed, vx/vy) — not a sixth vocabulary name
- Deepened slice: fixed world extent, camera follow, garden-gated beacon
- Entity lifecycle: gather despawns bloomed flowers; spent patches queue delayed regrow (`addEntity` in `step`); World flower bloom/gather counters + `flowerRegrows`
- Living docs: AGENTS (lean living law + five core ideas), engine-notes, roadmap, CONTEXT, this history
- Hard perimeter: hand-built host only; Waymark stays in Godot (no transfer)
- Simulation sovereignty: `src/sim/` boundary; intent-at-step; headless `npm run smoke`
- One-button launch that self-destructs with the window; launch layer quarantined as disposable host tooling

### Sessions

#### 2026-07-24

##### Unpark and baby TypeScript stub
Logged: 2026-07-24 ~23:00
Summary: Unparked the sealed notes folder into a Vite/canvas stub with sim step, immediate draw, and Space-cycled style palettes; lean project AGENTS established.
Notes: Early proof that simulation is the only citizen and style can recolour without rewriting entities.

##### Dev URL reliability
Logged: 2026-07-24 ~23:40
Summary: Pinned host/port and a small dev script so Cursor Simple Browser can reliably reach the demo.
Notes: Prefer 127.0.0.1 over localhost (IPv6 mismatch).

#### 2026-07-25

##### Spine then style owns appearance
Logged: 2026-07-25 ~00:01
Summary: Locked determinism, snapshot canary, and identity registry; then made Style an identity→Mark table with a glyphs backend and style HMR.
Notes: Marks must not mutate the world or consume sim RNG.

##### Beacon mini-slice
Logged: 2026-07-25 ~00:43
Summary: Added playable reach-the-beacon loop with WASD steer, Tab to swap walkers, win as plain world phase, snapshot key moved to P.
Notes: Slice pressure over more infrastructure.

##### Constitutional vocabulary
Logged: 2026-07-25 ~00:51
Summary: Named World / Entity / Identity / Style / Mark as the only core vocabulary; renamed entity field to `identity`; locked governing direction against premature abstraction.
Notes: Waymark transfer ruled out permanently — stays in Godot.

##### Style owns the frame
Logged: 2026-07-25 ~00:56
Summary: Folded background, ground, and chrome into Style.`frame` so appearance is one composition path; draw only sorts entities and looks up Marks.
Notes: Refinement of Style, not a sixth concept.

##### Founding docs close
Logged: 2026-07-25 ~00:57
Summary: Added founding CONTEXT note and this combined version history; refreshed project zip drop.
Notes: End of initial unpark session.

##### Irreducible vocabulary framing
Logged: 2026-07-25 ~01:00
Summary: Reframes the goal from “smallest engine” to discovering the irreducible vocabulary of an engine; docs now treat the five names as a working claim under that pressure.
Notes: Smallness is a symptom, not the prize.

##### Simulation sovereignty boundary
Logged: 2026-07-25 ~01:35
Summary: Moved simulation behind `src/sim/` with no platform imports; host submits intent that only `step` applies; added headless smoke canary proving the world advances without a renderer.
Notes: Intent stays a boundary mechanism, not a sixth vocabulary name.

##### Critter identity probe
Logged: 2026-07-25 ~02:00
Summary: Added a fleeing `critter` identity as a two-stage vocabulary probe — stage one flee from nearest walker with no Entity change; stage two persistent startle memory; styles gained a critter Mark (procedural family + glyphs); smoke asserts flee, alarm decay, and snapshot round trip.
Notes: Hypothesis was that inter-entity behavior fits the five names until something must be remembered, and then Entity, World slice fields, or Style marks would bend first. Finding: stage one held cleanly (Identity.behave + nearest helper + Marks reading the world). Stage two needed memory that Marks cannot own; an optional `alarm` on Entity carried it without a sixth name and without custom serialize logic. Style coupling is real but cheap while procedural styles share one factory — glyphs still needs a hand Mark or falls through to unknown. Five names still hold; Entity's fixed-vs-optional tension is the crack to watch next.

##### Cursor Run meadow
Logged: 2026-07-25 ~02:05
Summary: Added a one-click Cursor launch config that starts the existing Vite helper and opens the pinned meadow URL in the system browser.
Notes: Host tooling from demand — not a product launcher or app shell.

##### Snappy meadow launch
Logged: 2026-07-25 ~02:10
Summary: Cut npm/npx out of the Run meadow path; warm click opens the URL and exits, cold start spawns local Vite and opens on first port bind.
Notes: Folder-open task carried the same direct Vite spawn (later removed).

##### One button, no traces
Logged: 2026-07-25 ~02:25
Summary: Made the launch self-cleaning — a dev-only lifeline plugin keeps the server alive only while a page pings it, so closing the window shuts Vite down and frees the port; launcher verifies any live server is ours and reaps its child on exit. Removed the folder-open auto task so nothing starts invisibly.
Notes: Hot reload untouched; lifeline is host/dev tooling only, never sim.

##### Tidy and close day 1
Logged: 2026-07-25 ~02:30
Summary: Collapsed the launch tooling to two dev files and pushed the browser heartbeat into the plugin, so `src/` holds no launch code and builds carry none; pruned the stray-hunting and duplicate dev entry points.
Notes: Launch layer is explicitly disposable — a future custom or headless host deletes it without touching the engine.

##### Instant launch and close
Logged: 2026-07-25 ~02:35
Summary: Dropped the debugger from the run button, moved port scanning off the fast path, and opened the meadow as a chromeless app window; shutdown now reacts to the page's close beacon instead of a fixed grace. Measured warm launch ~0.2s, cold ~0.5s, full teardown ~1s.
Notes: Kept the browser host — a native shell would cost style hot reload and break the hand-built-host law for no speed gain.

##### One process, no debugger
Logged: 2026-07-25 ~02:45
Summary: Disabled the editor's JS auto-attach for this workspace (it was injecting a debug bootloader and inflating server boot by ~200ms) and folded the dev server into the launcher process via Vite's API, so a click is one Node start instead of two with nothing to reap. Vite import is deferred so an already-running meadow reopens in ~0.13s.
Notes: Boot to listening measured at ~0.34s; warm reopen 0.13-0.2s, near Node's own startup floor.

##### Entity memory probe #2 — flower latch
Logged: 2026-07-25 ~11:45
Summary: Added a `flower` identity that permanently blooms on first walker visit — lasting boolean state, not a timer — with Marks across styles and smoke covering bloom, persistence after the walker leaves, and JSON round trip.
Notes: Hypothesis was that a second identity-specific memory of a different kind would either still fit as an optional Entity field or prove the bag was sneaking in. Finding: `bloomed?: boolean` alongside `alarm?: number` still serializes with plain JSON and needs no sixth name. Two optionals is still Entity, not a bag — but the pattern is now unmistakable; a third top-level field should force a home.

##### Entity.local — home for identity-specific state
Logged: 2026-07-25 ~11:50
Summary: Collapsed stacked top-level optionals into one optional `Entity.local` plain object (`alarm`, `bloomed`); `localOf` helper for writers; smoke and Marks updated; day-cadence framing dropped from living docs — steer by demand, not day numbers.
Notes: Finding: one optional bag is *more* irreducible than N named optionals on Entity — same JSON canary, clearer law (“new identity state goes in local”). Still five vocabulary names; `local` is a field, not a peer of World/Entity/Identity/Style/Mark. Dropped artificial day gates.

##### World control probe
Logged: 2026-07-25 ~11:55
Summary: Stressed `controlledId` / steer as World slice state by adding a second command path — `Intent.claimControl` claims a walker by id — so a scripted source can take over without new World keys; smoke asserts two sources, movement, and snapshot of `controlledId`.
Notes: Hypothesis was that control/steer on World are either honest applied slice data or a bag in disguise. Finding: they stay on World as *applied* state (what step last resolved); command sources grow Intent (`cycleControl` / `claimControl`), not World. No `World.local`, no Controller/Player name. Twin lesson to Entity.local: put variety at the boundary (Intent / local), keep citizens (World / Entity) as applied plain data. No AGENTS law change.

##### Playable flower garden loop
Logged: 2026-07-25 ~12:00
Summary: Made blooming a soft playable loop — chrome shows Flowers n/m and “walk near buds,” bloomed flowers pulse, meadow palette restored to greens; win is still the beacon.
Notes: Playable pressure on Style reading Entity.local without owning it. Director can verify by eye: buds open, tally ticks up, garden full line when all bloomed.

##### Movement feel — accelerate and coast
Logged: 2026-07-25 ~12:35
Summary: Controlled walker now accelerates into steer and coasts with friction when keys release; velocity lives in `Entity.local` (`vx`/`vy`); smoke asserts accelerate, coast, and friction decay.
Notes: Playable use of Entity.local beyond timers/latches. Wanderers stay simple step motion. Director test: WASD should feel pushy, not on/off.

##### Meadow slice deepen — world, camera, garden gate
Logged: 2026-07-25 ~12:45
Summary: Fixed meadow extent independent of the window; camera follows the controlled walker in the host/draw path; win requires a full garden then beacon reach; beacon Mark dormant until awake; removed `setBounds` so resize never rewrites World; smoke covers gate + extent round trip.
Notes: Finding: World/viewport were conflated — splitting them sharpened the observer boundary without a sixth name. Garden gate made the soft flower loop load-bearing for the slice. Camera is pure observer transform.

##### Entity lifecycle — gather despawn
Logged: 2026-07-25 ~13:25
Summary: Bloomed flowers can be gathered by the controlled walker and leave the entity list; `removeEntity` + snapshot iteration in `step`; garden gate uses World bloom counters so completeness survives despawn; smoke asserts count drop, counters, and JSON round trip.
Notes: Finding: dynamic `entities` fits the five names — no sixth name. Goal counters on World are applied slice state (like controlledId), not a bag. Despawn is plain splice; serialize stays `JSON.stringify`.

##### Refinement note pressure-tested
Logged: 2026-07-25 ~15:05
Summary: External “AI-native simulation framework” memo (ECS/systems/events as core, optional AI layer, Spore-scale as non-flagship inspiration) was weighed against the living claim; compatible identity (simulation engine with optional AI tooling) affirmed in engine-notes and AGENTS; ECS/completeness pivot rejected for this tree.
Notes: No runtime change. AI stays non-defining and outside sim. Next play pressure when steered remains spawn-under-play, not framework expansion.

##### Spawn under play — bidirectional lifecycle
Logged: 2026-07-25 ~23:35
Summary: Gathering a bloom queues a spent patch; after a short delay `step` flushes with `addEntity` so a bud returns; Style draws faint patches and regrowing chrome; smoke covers despawn, queue snapshot, spawn, and round trip.
Notes: Finding: entity list can grow during `step` without a sixth name or event bus. Delayed spawn is applied World slice state (sibling of gather counters). Garden goal stays create-time; slightly larger coherent play beats are now the preferred step size.

#### 2026-07-26

##### Named Catalyst
Logged: 2026-07-26
Summary: Project identity set to Catalyst across living docs, package metadata, page title, and workspace roster.
Notes: No runtime change. Slice still the meadow; launch button still Run meadow.

##### Renamed to Emeris
Logged: 2026-07-26
Summary: Project renamed Emeris (Catalyst was likely taken); living docs, package metadata, page title, and roster updated; remote points at emeris; folder on disk is `emeris/`.
Notes: No runtime change.

##### Post-win dusk beat
Logged: 2026-07-26
Summary: Reaching the awake beacon sets phase to dusk instead of freezing; Style tints and chrome settle; critters and wander walkers calm while the meadow keeps stepping; smoke covers gate, living dusk, and snapshot.
Notes: Finding: an after-state is still plain World phase plus observers — Style and behave both read it; no sixth name, no freeze-as-architecture.

##### Observer-first simulation
Logged: 2026-07-26
Summary: Governing direction shifted to observation over gameplay; host no longer steers; meadow runs as an observation chamber; gather/dusk use any walker; camera focus renamed; Intent kept for deferred agency; smoke covers empty-intent autonomy.
Notes: Finding: player agency can be deferred without deleting the Intent edge — the world already lives; input would later be another influence upon it.

##### Single-screen chamber
Logged: 2026-07-26
Summary: World extent matches the window; camera fixed at origin — no scroll, nothing outside the viewport; resize/N rebuilds the chamber to the current size.
Notes: Observation chamber stays one frame of world; large-world camera follow deferred with player agency.

---

## Next target (when steered)

Observe the meadow unattended. Note food pressure, birth/death, night. Ambient fields only if emergence feels thin. Relations notes-only. Agency deferred. No second world. No ECS pivot. No Waymark work in this tree.

---

## Stats

| Metric | Value |
|--------|-------|
| Current version | `0.0.4` |
| Sessions logged | 34 |
