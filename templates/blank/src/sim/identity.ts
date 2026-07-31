/**
 * Blank identities — minimal scaffold for a new world.
 * Replace these with what your game *is*.
 */

import { random } from "./rng";
import {
  localOf,
  type Entity,
  type EntityLocal,
  type World,
} from "./world";

/** Extensible semantic identity — what something *is*, not how it looks. */
export type Identity = string;

export type IdentityDef = {
  id: Identity;
  /** What this is, in words. For you, and for an AI reading the world. */
  describes: string;
  /** How it acts each tick. Absent means inert. */
  behave?: (e: Entity, world: World, dt: number) => void;
};

/** Numeric locals the state transforms may touch. */
export type LocalNumber = "phase";

/**
 * Caller-blind state transforms — tiny composable ops on Entity.local.
 * They must not know why they are called; Identity supplies meaning.
 */

/** Increase a numeric local toward ceil. Returns the new value. */
export function store(
  e: Entity,
  key: LocalNumber,
  delta: number,
  ceil = Infinity,
): number {
  const L = localOf(e);
  const next = Math.min(ceil, ((L[key] as number | undefined) ?? 0) + Math.max(0, delta));
  (L as Record<string, number>)[key] = next;
  return next;
}

/** Decrease a numeric local toward floor. Returns how much was taken. */
export function decay(
  e: Entity,
  key: LocalNumber,
  delta: number,
  floor = 0,
): number {
  const L = localOf(e);
  const cur = (L[key] as number | undefined) ?? 0;
  const taken = Math.min(Math.max(0, delta), Math.max(0, cur - floor));
  (L as Record<string, number>)[key] = cur - taken;
  return taken;
}

/** Remap a numeric local in place. Returns the new value. */
export function transform(
  e: Entity,
  key: LocalNumber,
  map: (current: number, local: EntityLocal) => number,
): number {
  const L = localOf(e);
  const next = map((L[key] as number | undefined) ?? 0, L);
  (L as Record<string, number>)[key] = next;
  return next;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function keepInBounds(e: Entity, world: World): void {
  const pad = 40;
  if (e.x < pad || e.x > world.width - pad) {
    e.facing = Math.PI - e.facing;
    e.x = clamp(e.x, pad, world.width - pad);
  }
  if (e.y < pad || e.y > world.height - pad) {
    e.facing = -e.facing;
    e.y = clamp(e.y, pad, world.height - pad);
  }
}

function behaveLandmark(_e: Entity, _world: World, _dt: number): void {
  /* inert scenery */
}

function behaveCreature(e: Entity, world: World, dt: number): void {
  const L = localOf(e);
  L.phase = ((L.phase ?? 0) + dt) % 1;
  if (random(world) < 0.02) {
    e.facing += (random(world) - 0.5) * 1.2;
  }
  e.x += Math.cos(e.facing) * e.speed * dt;
  e.y += Math.sin(e.facing) * e.speed * dt;
  keepInBounds(e, world);
}

export const blankIdentities: Record<Identity, IdentityDef> = {
  landmark: {
    id: "landmark",
    describes: "A fixed point in the world — scenery for the blank scaffold.",
    behave: behaveLandmark,
  },
  creature: {
    id: "creature",
    describes: "A simple wanderer — replace with your mobile life.",
    behave: behaveCreature,
  },
};
