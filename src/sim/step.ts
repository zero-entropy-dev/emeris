/** Advance the world one tick. Imports the identity registry; world state does not. */

import { identities } from "./registry";
import { type Intent, type World } from "./world";

/**
 * One valid transition. The meadow transitions because time elapsed, and reads
 * nothing from Intent — the crossing stays in the signature so a world that
 * asks for influence has somewhere to ask.
 */
export function step(world: World, dt: number, _intent: Intent): void {
  world.time += dt;
  world.tick += 1;

  for (const e of [...world.entities]) {
    identities[e.identity]?.behave?.(e, world, dt);
  }
}
