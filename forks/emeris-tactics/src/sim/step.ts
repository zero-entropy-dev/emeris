/** Advance the world one tick. Imports the identity registry; world state does not. */

import { applyPlayerIntent } from "./identity";
import { identities } from "./registry";
import { type Intent, type World } from "./world";

export function step(world: World, dt: number, intent: Intent): void {
  world.steerX = intent.steerX;
  world.steerY = intent.steerY;
  world.action = intent.action ?? "none";
  world.unitId = intent.unitId ?? 0;
  world.cellX = intent.cellX ?? 0;
  world.cellY = intent.cellY ?? 0;

  applyPlayerIntent(world, intent);

  world.time += dt;
  world.tick += 1;

  // Registry entity order is today's mechanism — not constitutional law.
  for (const e of [...world.entities]) {
    identities[e.identity]?.behave?.(e, world, dt);
  }
}
