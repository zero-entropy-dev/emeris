/** Meadow-authored recipes. Air bed + one rustle. Not a catalog. */

import { isNight, type World } from "../sim";
import { gain, grainOf, jitter, mix, noise, osc, type Grain, type Sample } from "./kernel";

const AIR_SECONDS = 2.4;

export function airBed(worldSeed: number): Sample {
  const g = grainOf(worldSeed, 0, 0, "air");
  const raw = noise(AIR_SECONDS, g.seed, true, 0.22);
  return gain(raw, 1);
}

export function rustlePcm(grain: Grain): Sample {
  const dur = 0.16 * jitter(grain.seed, 1, 0.12);
  const hiss = noise(dur, grain.seed, false, 0.14 * grain.intensity);
  const tick = osc("triangle", 420 * jitter(grain.seed, 2, 0.08), dur, 0.05 * grain.intensity, 0.004);
  return mix([hiss, tick]);
}

/** Night hushes the bed. Day is the louder air. */
export function bedAmp(world: World, styleName: string): number {
  const night = isNight(world);
  const ink = styleName === "night ink" ? 0.85 : 1;
  return (night ? 0.28 : 0.72) * ink;
}
