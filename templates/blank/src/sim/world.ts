/** World state only. Nothing visual lives here. No platform APIs. */

import type { Identity } from "./identity";
import { random } from "./rng";

export type { Identity };
export { random };

/** Default world size when host/tests omit extent (single-screen scale). */
export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 600;

/**
 * Intent is a boundary for deferred agency: tests and a future player/agent
 * submit it; only `step` applies it. The human host currently submits empty intent.
 */
export type Intent = {
  steerX: number;
  steerY: number;
  cycleControl?: boolean;
  claimControl?: number;
};

/**
 * Identity-specific plain data on an entity.
 * Prefer adding keys here over new top-level Entity fields.
 */
export type EntityLocal = {
  /** Wander phase 0..1 (creature). */
  phase?: number;
};

export type Entity = {
  id: number;
  identity: Identity;
  x: number;
  y: number;
  /** Radians; mobile identities face / lean this way. */
  facing: number;
  /** Motion speed; landmarks ignore. */
  speed: number;
  /** Identity-specific state; omit when unused. */
  local?: EntityLocal;
};

/** Ensure `e.local` exists for writers in behave(). */
export function localOf(e: Entity): EntityLocal {
  if (!e.local) e.local = {};
  return e.local;
}

export type World = {
  seed: number;
  /** Advances with every random() from the stream. */
  rngState: number;
  tick: number;
  /** World extent in world units — independent of the observer viewport. */
  width: number;
  height: number;
  time: number;
  entities: Entity[];
  nextId: number;
  /** Observer camera focus (creature id) — not player control. */
  focusId: number;
  /** Last intent axes applied by step — serializable for snapshot/replay. */
  steerX: number;
  steerY: number;
};

/** Remove an entity by id. Returns true if something was removed. */
export function removeEntity(world: World, id: number): boolean {
  const i = world.entities.findIndex((e) => e.id === id);
  if (i < 0) return false;
  world.entities.splice(i, 1);
  return true;
}

/** Assign nextId and push — sibling of removeEntity. */
export function addEntity(world: World, draft: Omit<Entity, "id">): Entity {
  const e: Entity = { ...draft, id: world.nextId++ };
  world.entities.push(e);
  return e;
}

export function createWorld(
  width = WORLD_WIDTH,
  height = WORLD_HEIGHT,
  seed = 1,
): World {
  const world: World = {
    seed,
    rngState: seed >>> 0 || 1,
    tick: 0,
    width,
    height,
    time: 0,
    entities: [],
    nextId: 1,
    focusId: 0,
    steerX: 0,
    steerY: 0,
  };

  for (let i = 0; i < 5; i++) {
    world.entities.push({
      id: world.nextId++,
      identity: "landmark",
      x: 120 + random(world) * (width - 240),
      y: 100 + random(world) * (height - 200),
      facing: 0,
      speed: 0,
    });
  }

  const focusId = world.nextId++;
  world.focusId = focusId;
  world.entities.push({
    id: focusId,
    identity: "creature",
    x: width * 0.45,
    y: height * 0.5,
    facing: random(world) * Math.PI * 2,
    speed: 40 + random(world) * 20,
    local: { phase: 0 },
  });

  for (let i = 0; i < 3; i++) {
    world.entities.push({
      id: world.nextId++,
      identity: "creature",
      x: 80 + random(world) * (width - 160),
      y: 80 + random(world) * (height - 160),
      facing: random(world) * Math.PI * 2,
      speed: 28 + random(world) * 24,
      local: { phase: random(world) },
    });
  }

  return world;
}

export function serialize(world: World): string {
  return JSON.stringify(world);
}

export function deserialize(text: string): World {
  return JSON.parse(text) as World;
}
