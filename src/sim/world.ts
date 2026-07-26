/** Simulation state only. Nothing visual lives here. No platform APIs. */

import { identities, nearest, type Identity } from "./identity";
import { random } from "./rng";

export type { Identity };
export { random };

/** Fixed meadow extent — not the browser viewport. */
export const MEADOW_WIDTH = 2200;
export const MEADOW_HEIGHT = 1500;

export type Phase = "playing" | "won";

/**
 * Probe hypothesis (World control):
 * `controlledId` / steer axes on World are honest applied slice state — not a
 * bag in disguise — as long as every command source (keys, test, future AI)
 * only submits Intent. If a second source needs new World keys, the pattern failed.
 *
 * Finding lives in HISTORY after the probe.
 */
/** Host (or test, AI, replay) submits this; only `step` applies it. Not a core vocabulary peer. */
export type Intent = {
  steerX: number;
  steerY: number;
  /** Cycle to the next walker (human Tab). */
  cycleControl?: boolean;
  /**
   * Claim a specific walker by entity id (second command source / scripted).
   * Applied before steer; ignored if missing or not a living walker.
   */
  claimControl?: number;
};

/**
 * Identity-specific plain data on an entity.
 * Prefer adding keys here over new top-level Entity fields — keeps Entity
 * irreducible while still serializing with plain JSON.
 */
export type EntityLocal = {
  /** Seconds of remaining skittishness after a startle (critters). */
  alarm?: number;
  /** Permanent visit latch (flowers). */
  bloomed?: boolean;
  /** Velocity for controlled-walker acceleration feel. */
  vx?: number;
  vy?: number;
};

export type Entity = {
  id: number;
  identity: Identity;
  x: number;
  y: number;
  /** Radians; walkers face / lean this way. */
  facing: number;
  /** Walkers move; trees ignore. */
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
  /** Sim extent in world units — independent of the observer viewport. */
  width: number;
  height: number;
  time: number;
  entities: Entity[];
  nextId: number;
  phase: Phase;
  /** Walker currently receiving steer intent. */
  controlledId: number;
  /** Last intent axes applied by step — serializable for snapshot/replay. */
  steerX: number;
  steerY: number;
  /** Flowers spawned at create — garden goal (survives gather/despawn). */
  flowerGoal: number;
  /** How many flowers have bloomed at least once. */
  flowerBloomed: number;
  /** How many bloomed flowers were gathered (despawned). */
  flowerGathered: number;
  /**
   * Spent patches waiting to become flowers again — applied slice state.
   * Not an event bus; Style may read these as an observer.
   */
  flowerRegrows: FlowerRegrow[];
};

/** Seconds after gather before a bud returns at the patch. */
export const FLOWER_REGROW_SECONDS = 5;

/** Pending flower spawn after gather (plain JSON). */
export type FlowerRegrow = {
  x: number;
  y: number;
  readyAt: number;
};

const REACH = 28;
const REGROW_JITTER = 18;

/** True when the garden goal is met (bloom count — works after flowers are gathered). */
export function gardenComplete(world: World): boolean {
  return world.flowerGoal > 0 && world.flowerBloomed >= world.flowerGoal;
}

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

function flushFlowerRegrows(world: World): void {
  const queue = (world.flowerRegrows ??= []);
  for (let i = queue.length - 1; i >= 0; i--) {
    const p = queue[i]!;
    if (p.readyAt > world.time) continue;
    const jx = (random(world) - 0.5) * 2 * REGROW_JITTER;
    const jy = (random(world) - 0.5) * 2 * REGROW_JITTER;
    const x = Math.min(world.width - 80, Math.max(80, p.x + jx));
    const y = Math.min(world.height - 80, Math.max(80, p.y + jy));
    addEntity(world, {
      identity: "flower",
      x,
      y,
      facing: 0,
      speed: 0,
      local: { bloomed: false },
    });
    queue.splice(i, 1);
  }
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
    phase: "playing",
    controlledId: 0,
    steerX: 0,
    steerY: 0,
    flowerGoal: 0,
    flowerBloomed: 0,
    flowerGathered: 0,
    flowerRegrows: [],
  };

  for (let i = 0; i < 18; i++) {
    world.entities.push({
      id: world.nextId++,
      identity: "tree",
      x: 80 + random(world) * (width - 160),
      y: 80 + random(world) * (height - 160),
      facing: 0,
      speed: 0,
    });
  }

  // Beacon far from the spawn corner so the larger meadow asks you to travel.
  world.entities.push({
    id: world.nextId++,
    identity: "beacon",
    x: width * (0.72 + random(world) * 0.18),
    y: height * (0.18 + random(world) * 0.28),
    facing: 0,
    speed: 0,
  });

  const playerId = world.nextId++;
  world.controlledId = playerId;
  world.entities.push({
    id: playerId,
    identity: "walker",
    x: width * 0.14,
    y: height * 0.78,
    facing: -Math.PI / 2,
    speed: 110,
    local: { vx: 0, vy: 0 },
  });

  for (let i = 0; i < 2; i++) {
    world.entities.push({
      id: world.nextId++,
      identity: "walker",
      x: width * (0.22 + i * 0.12),
      y: height * (0.62 + i * 0.06),
      facing: random(world) * Math.PI * 2,
      speed: 40 + random(world) * 25,
      local: { vx: 0, vy: 0 },
    });
  }

  for (let i = 0; i < 6; i++) {
    world.entities.push({
      id: world.nextId++,
      identity: "critter",
      x: 80 + random(world) * (width - 160),
      y: 80 + random(world) * (height - 160),
      facing: random(world) * Math.PI * 2,
      speed: 70 + random(world) * 40,
      local: { alarm: 0 },
    });
  }

  const flowerCount = 8;
  for (let i = 0; i < flowerCount; i++) {
    world.entities.push({
      id: world.nextId++,
      identity: "flower",
      x: 80 + random(world) * (width - 160),
      y: 80 + random(world) * (height - 160),
      facing: 0,
      speed: 0,
      local: { bloomed: false },
    });
  }
  world.flowerGoal = flowerCount;

  return world;
}

function cycleControlled(world: World): void {
  if (world.phase !== "playing") return;
  const walkers = world.entities.filter((e) => e.identity === "walker");
  if (walkers.length === 0) return;
  const idx = walkers.findIndex((e) => e.id === world.controlledId);
  const next = walkers[(idx + 1) % walkers.length]!;
  world.controlledId = next.id;
}

function claimControlled(world: World, id: number): void {
  if (world.phase !== "playing") return;
  const target = world.entities.find(
    (e) => e.id === id && e.identity === "walker",
  );
  if (target) world.controlledId = target.id;
}

function checkWin(world: World): void {
  if (world.phase !== "playing") return;
  if (!gardenComplete(world)) return;
  const player = world.entities.find((e) => e.id === world.controlledId);
  if (!player) return;
  const beacon = nearest(world, "beacon", player.x, player.y);
  if (!beacon) return;
  const dx = player.x - beacon.x;
  const dy = player.y - beacon.y;
  if (dx * dx + dy * dy <= REACH * REACH) {
    world.phase = "won";
    world.steerX = 0;
    world.steerY = 0;
  }
}

export function step(world: World, dt: number, intent: Intent): void {
  if (world.phase === "playing") {
    if (intent.claimControl !== undefined) {
      claimControlled(world, intent.claimControl);
    } else if (intent.cycleControl) {
      cycleControlled(world);
    }
    world.steerX = intent.steerX;
    world.steerY = intent.steerY;
  } else {
    world.steerX = 0;
    world.steerY = 0;
  }

  world.time += dt;
  world.tick += 1;

  if (world.phase === "playing") {
    // Snapshot the list so behave may despawn without skipping siblings.
    for (const e of [...world.entities]) {
      const def = identities[e.identity];
      def?.behave?.(e, world, dt);
    }
    // Spawn after behave so new entities do not run on the flush tick.
    flushFlowerRegrows(world);
    checkWin(world);
  }
}

/** Plain-data canary: if this needs custom logic, the architecture drifted. */
export function serialize(world: World): string {
  return JSON.stringify(world);
}

/** Restore simulation state. Viewport is host-only — never written into World. */
export function deserialize(text: string): World {
  return JSON.parse(text) as World;
}
