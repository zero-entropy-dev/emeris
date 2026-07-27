/** World state only. Nothing visual lives here. No platform APIs. */

import type { Identity } from "./identity";
import { random } from "./rng";

export type { Identity };
export { random };

/** Default world size when host/tests omit extent (single-screen scale). */
export const MEADOW_WIDTH = 960;
export const MEADOW_HEIGHT = 600;

/**
 * Intent is a boundary for deferred agency: tests and a future player/agent
 * submit it; only `step` applies it. The human host currently submits empty intent.
 * Not a core vocabulary peer.
 */
export type Intent = {
  steerX: number;
  steerY: number;
  /** Cycle camera focus to the next creature (future / scripted). */
  cycleControl?: boolean;
  /**
   * Claim a specific creature by entity id as focus (second command source).
   * Applied before steer axes; ignored if missing or not a living creature.
   */
  claimControl?: number;
};

/**
 * Identity-specific plain data on an entity.
 * Prefer adding keys here over new top-level Entity fields — keeps Entity
 * small while still serializing with plain JSON.
 */
export type EntityLocal = {
  /** Day cycle 0..1 (day entity). */
  cycle?: number;
  /** Plant biomass / growth 0..1 (grass, flower). */
  amount?: number;
  /** Flower: open bloom latch. */
  bloomed?: boolean;
  /** Creature how well-fed 0..1 (1 = full, 0 = starve). */
  fullness?: number;
  /** Age in seconds (creature life; flower time-since-bloom when bloomed). */
  age?: number;
  /** Creature reproduction cooldown remaining (seconds). */
  cooldown?: number;
  /** Described-process program counter (when Identity uses process). */
  pc?: number;
  /** Described-process numeric locals (when Identity uses process). */
  vars?: Record<string, number>;
};

export type Entity = {
  id: number;
  identity: Identity;
  x: number;
  y: number;
  /** Radians; mobile identities face / lean this way. */
  facing: number;
  /** Motion speed; trees / grass ignore. */
  speed: number;
  /** Identity-specific state; omit when unused. Still Entity — not a sixth name. */
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
  width = MEADOW_WIDTH,
  height = MEADOW_HEIGHT,
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

  world.entities.push({
    id: world.nextId++,
    identity: "day",
    x: 0,
    y: 0,
    facing: 0,
    speed: 0,
    local: { cycle: 0.3 },
  });

  for (let i = 0; i < 14; i++) {
    world.entities.push({
      id: world.nextId++,
      identity: "tree",
      x: 80 + random(world) * (width - 160),
      y: 80 + random(world) * (height - 160),
      facing: 0,
      speed: 0,
    });
  }

  for (let i = 0; i < 48; i++) {
    world.entities.push({
      id: world.nextId++,
      identity: "grass",
      x: 40 + random(world) * (width - 80),
      y: 40 + random(world) * (height - 80),
      facing: 0,
      speed: 0,
      local: { amount: 0.25 + random(world) * 0.75 },
    });
  }

  for (let i = 0; i < 5; i++) {
    world.entities.push({
      id: world.nextId++,
      identity: "flower",
      x: 60 + random(world) * (width - 120),
      y: 60 + random(world) * (height - 120),
      facing: 0,
      speed: 0,
      local: {
        amount: 0.2 + random(world) * 0.5,
        bloomed: false,
        age: 0,
      },
    });
  }

  const focusId = world.nextId++;
  world.focusId = focusId;
  world.entities.push({
    id: focusId,
    identity: "creature",
    x: width * 0.4,
    y: height * 0.55,
    facing: random(world) * Math.PI * 2,
    speed: 32 + random(world) * 12,
    local: { fullness: 0.7, age: 5, cooldown: 0 },
  });

  for (let i = 0; i < 5; i++) {
    world.entities.push({
      id: world.nextId++,
      identity: "creature",
      x: 80 + random(world) * (width - 160),
      y: 80 + random(world) * (height - 160),
      facing: random(world) * Math.PI * 2,
      speed: 28 + random(world) * 18,
      local: {
        fullness: 0.5 + random(world) * 0.4,
        age: random(world) * 20,
        cooldown: random(world) * 6,
      },
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
