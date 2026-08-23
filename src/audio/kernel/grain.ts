/** Appearance grain — never world RNG. Same seed, same waveform. */

export const SAMPLE_RATE = 44100;

export type Grain = {
  seed: number;
  intensity: number;
};

export function hash32(n: number): number {
  let t = (n >>> 0) * 0x9e3779b1;
  t = Math.imul(t ^ (t >>> 16), 0x85ebca6b);
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
  return (t ^ (t >>> 16)) >>> 0;
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic unit in [0, 1). Lane keeps independent streams off one seed. */
export function unit(seed: number, lane = 0): number {
  return hash32(seed ^ Math.imul(lane + 1, 0x9e3779b9)) / 4294967296;
}

export function samples(seconds: number): number {
  return Math.max(1, Math.ceil(seconds * SAMPLE_RATE));
}

export function grainOf(worldSeed: number, tick: number, id: number, recipe: string): Grain {
  return {
    seed: hash32(
      worldSeed ^ Math.imul(id, 0x85ebca6b) ^ Math.imul(tick + 1, 0xc2b2ae35) ^ hashStr(recipe),
    ),
    intensity: 1,
  };
}
