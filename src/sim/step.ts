/** Advance the world one tick. Imports the identity registry; world state does not. */

import { identities } from "./registry";
import { type Intent, type World } from "./world";

function cycleFocus(world: World): void {
  const creatures = world.entities.filter((e) => e.identity === "creature");
  if (creatures.length === 0) return;
  const idx = creatures.findIndex((e) => e.id === world.focusId);
  const next = creatures[(idx + 1) % creatures.length]!;
  world.focusId = next.id;
}

function claimFocus(world: World, id: number): void {
  const target = world.entities.find(
    (e) => e.id === id && e.identity === "creature",
  );
  if (target) world.focusId = target.id;
}

export function step(world: World, dt: number, intent: Intent): void {
  if (intent.claimControl !== undefined) {
    claimFocus(world, intent.claimControl);
  } else if (intent.cycleControl) {
    cycleFocus(world);
  }
  world.steerX = intent.steerX;
  world.steerY = intent.steerY;

  world.time += dt;
  world.tick += 1;

  for (const e of [...world.entities]) {
    identities[e.identity]?.behave?.(e, world, dt);
  }
}
