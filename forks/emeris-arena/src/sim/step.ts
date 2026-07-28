/** Advance the world one tick. Imports the identity registry; world state does not. */

import { identities } from "./registry";
import { type Intent, type World } from "./world";

function cycleFocus(world: World): void {
  const players = world.entities.filter((e) => e.identity === "player");
  if (players.length === 0) return;
  const idx = players.findIndex((e) => e.id === world.focusId);
  const next = players[(idx + 1) % players.length]!;
  world.focusId = next.id;
}

function claimFocus(world: World, id: number): void {
  const target = world.entities.find(
    (e) => e.id === id && e.identity === "player",
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
  world.lookYaw = intent.lookYaw ?? 0;
  world.fire = intent.fire === true;

  world.time += dt;
  world.tick += 1;

  for (const e of [...world.entities]) {
    identities[e.identity]?.behave?.(e, world, dt);
  }
}
