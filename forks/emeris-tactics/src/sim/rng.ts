/** Seeded stream. Lives in world state so snapshots capture position. */

export type RngHost = {
  rngState: number;
};

/** Mulberry32 — deterministic [0, 1). */
export function random(host: RngHost): number {
  let t = (host.rngState += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
