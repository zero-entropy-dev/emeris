/**
 * Lighting as Style data — 2D first, same terms later for a 3D backend.
 * Not a sixth spine name. Not World state.
 */

import { dayOf, isNight, type World } from "./sim";

export type LightingRecipe = {
  /** Backdrop / sky ink. */
  fill: string;
  /** World ground. */
  ground: string;
  /** Veil over the picture (night / dusk). Transparent when unused. */
  fog: string;
  /** Optional key direction. Canvas may ignore it. */
  key?: { x: number; y: number };
};

export const CLEAR_FOG = "rgba(0, 0, 0, 0)";

/** Meadow day/night veil. Fill and ground stay palette; fog follows the cycle. */
export function meadowLight(world: World, fill: string, ground: string): LightingRecipe {
  const cycle = dayOf(world)?.local?.cycle ?? 0.5;
  const night = isNight(world);
  const dusk = !night && (cycle < 0.28 || cycle >= 0.68);
  const angle = cycle * Math.PI * 2;
  return {
    fill,
    ground,
    fog: night ? "rgba(12, 16, 36, 0.42)" : dusk ? "rgba(36, 24, 48, 0.22)" : CLEAR_FOG,
    key: { x: Math.cos(angle), y: Math.sin(angle) },
  };
}
