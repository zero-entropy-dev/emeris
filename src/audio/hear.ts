/** Rising-edge collector. Reads World; never mutates it. Meadow locals only. */

import { dayOf, type Entity, type World } from "../sim";

export type Watch = {
  identity: string;
  fullness: number;
  speed: number;
  cycle: number;
};

export type Cue = {
  name: "rustle";
  x: number;
  y: number;
  id: number;
};

function watchOf(e: Entity, cycle: number): Watch {
  return {
    identity: e.identity,
    fullness: e.local?.fullness ?? -1,
    speed: e.speed,
    cycle,
  };
}

export function capture(world: World, last: Map<number, Watch>): void {
  last.clear();
  const cycle = dayOf(world)?.local?.cycle ?? 0.5;
  for (const e of world.entities) last.set(e.id, watchOf(e, cycle));
}

/** Creature starts moving, or fullness drops (a bite). */
export function collect(world: World, last: Map<number, Watch>): Cue[] {
  const cues: Cue[] = [];
  const cycle = dayOf(world)?.local?.cycle ?? 0.5;
  const seen = new Set<number>();

  for (const e of world.entities) {
    seen.add(e.id);
    const cur = watchOf(e, cycle);
    const prev = last.get(e.id);
    last.set(e.id, cur);
    if (!prev || e.identity !== "creature") continue;

    const woke = prev.speed < 0.2 && cur.speed > 0.55;
    const bit = prev.fullness >= 0 && cur.fullness >= 0 && cur.fullness < prev.fullness - 0.04;
    if (woke || bit) cues.push({ name: "rustle", x: e.x, y: e.y, id: e.id });
  }

  for (const id of [...last.keys()]) {
    if (!seen.has(id)) last.delete(id);
  }
  return cues;
}
