# Emeris Arena — roadmap

Drafted 2026-09-26. The arena is now a game in its own right: a small, fast, moody first-person shooter built on Emeris. Five stages. Each stage improves all five focus areas (feedback, fun, performance, snappiness, atmosphere) and ends with a build worth playing. Each stage gets its own plan before any code.

## Where the arena is today

- Raycaster first-person view plus a top-down view (Space toggles).
- One fixed 24×18 map, hard-coded. The seed only changes enemy wandering.
- Three drones (wander) and three stalkers (chase when within 7.5 cells).
- Enemies can't hurt you. There is no health, no win, no loss, and no restart beyond N.
- The gun fires a slow bolt (9 cells/s) every 0.22s. One hit kills. Score counts kills.
- The only feedback is weapon kick and muzzle flash. No hit reaction, no death effect, no sound.
- Walls are flat-shaded columns drawn one `fillRect` per screen pixel column at full device resolution. No textures, floor, or lighting.
- Mouse look only updates 60 times a second, and frames are not blended between world updates, so it stutters on high-refresh screens.

## Engine rules that still hold

The arena is no longer limited to testing the engine, but it still runs on it:

- The world is the only saved state. Effects such as shake, flashes, particles, and sound belong to the observer. They read the world, never change it, and never use the world's random numbers.
- Anything the host sends in still goes through `step`.
- Snapshot and restore must keep working. If a feature breaks plain JSON save/restore, the design is wrong.
- Arena code stays in the arena. If the meadow or another game later needs the same thing, that's when it moves into the engine.

---

## Stage 1 — Smooth, and something can hurt you

**Landed 2026-09-26.**

- **Performance:** on-screen frame-time and step-time readout (F3, the core meter). Headless benchmark that times 10k steps. Draw the 3D view at a lower resolution (about 50–75%) and scale it up; the HUD stays sharp. Reuse the depth buffer and sprite list instead of making new ones each frame.
- **Snappiness:** blend drawing between world updates. Apply mouse look on screen immediately as a preview, while the world still changes only through `step`. Clicks between world updates are never lost.
- **Fun:** player health. Stalkers hit up close. Death shows a simple end screen, and one key restarts.
- **Feedback:** enemy flashes when hit, a hit marker on the crosshair, and a red edge flash when you take damage.
- **Atmosphere:** first-person style uses the root `LightingRecipe` for fog and fill instead of hard-coded numbers. Give it a colder, darker colour pass.

**Playable result:** smooth at 144 Hz, and you can die.

## Stage 2 — Waves and a gun that feels good

**Landed 2026-09-26.** First-guess balance: wave n brings 2 + n drones and 1 + ⌈n/2⌉ stalkers, 4s breather, drones fire every 2.4–3.6s, bolt 24 cells/s, 0.16s cooldown. Tune after play.

- **Performance:** draw walls into one reused pixel buffer, uploaded once per frame. This has to come before wall textures.
- **Snappiness:** faster bolt or near-instant shot, a shorter cooldown, and kick timed to the exact frame of the shot.
- **Fun:** enemies spawn in growing waves at fixed spawn points. Drones fire slow shots you can dodge. A short breather between waves. The score is the wave number plus kills.
- **Feedback:** enemies get knocked back and burst into particles on death. Bolt trails, and sparks where bolts hit walls. A cooldown ring on the crosshair replaces the "…" text.
- **Atmosphere:** wall textures generated in code, such as panels, grime, and warning stripes. No image files.

**Playable result:** a 2–5 minute run that escalates and ends.

## Stage 3 — Sound and movement

The game starts to feel physical.

- **Performance:** limit how many sounds play at once and check the frame cost of audio with the readout.
- **Snappiness:** quick acceleration and stopping with a little inertia. Slide along walls instead of sticking on corners.
- **Fun:** a short dash with a cooldown, so you can dodge through enemy shots.
- **Feedback:** sound effects for fire, hit, kill, footsteps, dash, and taking damage. Build them on the root audio code: PCM sound generation plus a host that plays buffers.
- **Atmosphere:** a low room drone and distant machinery sounds in the background.

**Playable result:** you can play by ear, and moving around feels good.

## Stage 4 — Variety

Stop each run from looking like the last.

- **Performance:** look up the player once per step and check bolt collisions against a simple grid, so larger waves stay fast. Confirm with the benchmark.
- **Snappiness:** mouse sensitivity and invert settings, kept in host memory.
- **Fun:** build the map from the seed (rooms plus corridors), so N or restart gives a new layout. Add one or two new enemy types that change how you move, such as a fast rusher or a shielded enemy that must be hit from the side.
- **Feedback:** small camera shake and a brief pause on kills. Markers showing which direction damage came from. Each enemy type gets a distinct silhouette and a sound when it spots you.
- **Atmosphere:** floor and ceiling textures drawn in perspective. Bolts and muzzle flash light up nearby walls. Wall lamps that flicker, using the observer's own random numbers.

**Playable result:** new layouts and enemies each run, lit by your own gunfire.

## Stage 5 — Polish and mood

Tie it together.

- **Performance:** hit the target of a steady 120+ fps at 1440p with 40+ enemies, textures, and lighting on. Fix whatever the readout shows.
- **Snappiness:** a final 144 Hz pass on turning, firing, and dash timing. Restart takes under a second.
- **Fun:** best score and last seed kept between runs. Tune difficulty across waves.
- **Feedback:** a clear wave-start and wave-clear moment, a low-health warning, and a louder, stronger feel for the last enemy in a wave.
- **Atmosphere:** background sound that gets tenser as waves rise. Space cycles two or three looks (for example cold industrial and red alert) on the same world.

**Playable result:** a screenshot with no HUD reads as a specific, moody place, and a run makes you want another.

---

## Why this order

- Stage 1 comes first because smooth drawing and the frame-time readout affect how every later effect looks and performs.
- Pixel buffer walls come before textures, and health comes before damage feedback. Each stage only builds on what earlier stages delivered.
- Every stage ends with something worth playing, so we playtest and adjust the next stage's plan instead of committing to all five up front.
