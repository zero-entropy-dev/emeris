/**
 * World helpers every Emeris-shaped world shares. Generic over the world's own
 * Entity and World types; no meadow meaning lives here. No platform APIs.
 * Sibling games import this file by relative path instead of copying it.
 */

/** Anything that carries the world's random stream. */
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

/** Integer in [lo, hi], inclusive. */
export function randInt(host: RngHost, lo: number, hi: number): number {
  return lo + Math.floor(random(host) * (hi - lo + 1));
}

/** Float in [lo, hi). */
export function randRange(host: RngHost, lo: number, hi: number): number {
  return lo + random(host) * (hi - lo);
}

/** The part of a world these helpers touch. */
export type EntityList<E extends { id: number }> = {
  entities: E[];
  nextId: number;
};

/** Assign nextId and push — sibling of removeEntity. */
export function addEntity<E extends { id: number }>(
  world: EntityList<E>,
  draft: Omit<E, "id">,
): E {
  const e = { ...draft, id: world.nextId++ } as E;
  world.entities.push(e);
  return e;
}

/** Remove an entity by id. Returns true if something was removed. */
export function removeEntity<E extends { id: number }>(
  world: EntityList<E>,
  id: number,
): boolean {
  const i = world.entities.findIndex((e) => e.id === id);
  if (i < 0) return false;
  world.entities.splice(i, 1);
  return true;
}

/** Ensure `e.local` exists for writers in behave(). */
export function localOf<L extends object>(e: { local?: L }): L {
  if (!e.local) e.local = {} as L;
  return e.local;
}

/** Plain JSON. If a world needs more than this to save, it has drifted. */
export function serialize(world: object): string {
  return JSON.stringify(world);
}

/**
 * Exact restore of a snapshot taken this session. No backfill, no migration —
 * saves from older builds go through the world's own `loadWorld`.
 */
export function deserialize<W>(text: string): W {
  return JSON.parse(text) as W;
}
