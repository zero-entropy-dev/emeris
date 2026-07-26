# Emeris — notes (long-term)

**Status:** Unparked for baby steps (TypeScript stub). Still not a full project plan — questions and first principles. Runtime law lives in [`AGENTS.md`](AGENTS.md); sequence in [`roadmap.md`](roadmap.md).

---

## Motivation

The idea is **not** "I want to write my own engine."

Writing another Godot, Unity or Unreal would have very little appeal. Modern engines are excellent and continue to improve.

The interesting question is different.

> **If game engines were invented today, alongside AI, modern hardware, hot reload and code-first workflows, what would their first principles be?**

Most engines still carry assumptions that originated decades ago.

Many of those assumptions may still be correct.

Some may simply never have been reconsidered.

---

## Observation

While developing Waymark, procedural `_draw()` consistently produced results that felt more coherent than conventional sprite workflows.

This wasn't because sprites are bad.

It was because procedural drawing naturally encouraged thinking about **identity** instead of individual assets.

Rather than asking:

> "Which sprite should this tree use?"

the question became:

> "What makes something feel like a Waymark tree?"

That subtle shift changed the design process.

---

## Simulation as reality

One recurring idea is that perhaps only the simulation should truly exist.

Everything visual could be an interpretation.

Instead of treating graphics as persistent objects, rendering becomes something that is recreated continuously from the current simulation state.

Not because this is necessarily faster.

Because it feels philosophically cleaner.

The world exists.

The renderer observes it.

The picture is transient.

---

## Representation

Perhaps visual assets should not be the fundamental abstraction.

This does **not** mean eliminating sprites.

Sprites remain useful.

Fonts remain useful.

Audio remain useful.

Instead, every form of representation should exist on equal footing.

A procedural object.

A sprite.

A vector drawing.

Text.

Particles.

All become different implementations of appearance rather than fundamentally different concepts.

---

## Programmable style

One particularly interesting direction is making visual style itself programmable.

Rather than storing thousands of independent visual assets, encode the rules that define the world's aesthetic.

Changing those rules updates the entire world consistently.

This feels much closer to describing a visual language than managing an asset library.

---

## Immediate rendering

The `_draw()` approach suggests a broader rendering philosophy.

Instead of retaining visual hierarchies, perhaps rendering should simply answer one question every frame:

> "Given the current world state, what should appear on screen?"

Nothing more.

---

## Semantic development

Perhaps the engine should increasingly understand *meaning* rather than implementation.

Instead of editing images, describe identities.

Instead of tweaking pixels, describe style.

Instead of manually wiring systems together, describe intent.

This feels especially relevant in an era where AI operates far more effectively on semantic descriptions than opaque binary assets.

---

## The editor

An intentionally provocative question:

> Does a modern engine actually require a traditional editor?

Perhaps the game itself becomes the editor.

Perhaps debugging tools, inspectors and live reload replace large visual editing environments.

This is not necessarily better.

It is simply worth questioning whether visual editors were largely responses to the technological limitations of their era.

---

## AI

AI changes the economics of engine development.

Boilerplate is dramatically cheaper.

Architecture becomes relatively more important than implementation.

This also raises a broader question:

Should AI merely write code inside an engine?

Or should an engine itself be designed around semantic understanding from the beginning?

---

## Constraints

If this project ever exists, it should remain opinionated.

It should not become:

> "Godot, but written by me."

Every subsystem should justify its existence.

Features should emerge from actual games rather than anticipated future requirements.

The engine should remain small enough that a single person can understand the whole system.

---

## Questions worth revisiting

- What assumptions do modern engines inherit without questioning?
- What genuinely deserves to persist between frames?
- What should be recomputed?
- Is the scene graph fundamental?
- Is the asset pipeline fundamental?
- What is the smallest useful abstraction for describing a game?
- How should AI change engine architecture rather than simply generating code?
- Can visual identity become programmable?
- Can tooling become more important than editing?
- Can the simulation become the sole source of truth?

---

## Guiding principle

If this idea is ever revisited, start from first principles.

Do not ask:

> "How do I build an engine?"

Ask:

> "What is the smallest collection of ideas that can produce rich, living worlds — for games like Waymark to exist?"

Everything else should emerge from that.

---

## Locked insights (early prototype)

1. **Simulation is the only citizen.** The world is plain state you could serialize and still rebuild the picture from. The frame answers one question — given current state (and style), what appears? — and is a consequence, not something that lives in the world.

2. **Appearance is one idea; style is data.** Procedural, sprite, vector, text, particles are backends of the same “how this looks” call, not separate universes. A style table (palette, rules, motifs) reinterprets the whole world without rewriting entity data. The first prototype earns its keep with identities + style + immediate draw — not with a scene graph or asset pipeline.

3. **Smallest useful core.** Pressure-test World, Entity, Identity, Style, and Mark. A new name earns entry only by making that set clearer (fewer special cases), not more complete.

4. **Simulation sovereignty.** The world is source of truth; renderers and other consumers are observers. Input becomes intent applied at `step`. The simulation must never know observers exist.

---

## External refinement pressure (2026-07-25)

A memo framed an “AI-native simulation framework”: modular core (runtime, ECS/components, systems, events, persistence, rendering hooks, inspectors) plus optional AI tooling, flexible project memory, and Spore-scale systems-evolution as a possible test case — explicitly *not* locked as flagship.

**Wanted identity (compatible):** a modular simulation engine with optional AI-native tooling — not “an AI game engine,” not “a Spore successor engine.”

**Aligns with this experiment**

- The runtime must stay useful without AI; AI must not define the engine
- Project memory / living docs when useful — not a mandatory documentation religion
- Multiple authoring workflows (code, AI-assisted, data, hybrid) — not AI-only
- Large systems-emergence worlds as inspiration only, not product direction

**Rejected for this tree**

- ECS / components / system schedulers as the core — contradicts grow-from-demand and the five names under play (World, Entity, Identity, Style, Mark; `Entity.local`; Identity.`behave`)
- Event bus, persistence module, rendering-hook layer, and inspectors as *first-class core* — serialize canary + Style/Mark observers already exist; tooling waits on demand
- Framing the engine as “systems create worlds” completeness — here the frame is a small core under a real slice; don’t pre-build a Spore chassis

AI may later *consume* identity descriptions and world snapshots. It stays outside `src/sim/` and never becomes a hard dependency of the runtime.

---

## Current conclusion

A TypeScript core now exists — sim → identity registry → style marks → a deepened playable meadow slice. Waymark inspired the questions and stays in Godot; this folder does not receive a port or harvest. It stays small on purpose.

If these ideas have merit, they should keep revealing themselves in contact with playable slices — not from anticipated platform requirements or product-sheet module lists.

The engine should remain the accumulated result of discovering that certain assumptions can be replaced by simpler, more coherent ones.
