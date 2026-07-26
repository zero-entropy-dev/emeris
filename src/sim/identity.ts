import { random } from "./rng";
import {
  FLOWER_REGROW_SECONDS,
  localOf,
  removeEntity,
  type Entity,
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

/**
 * Probe hypothesis (critter):
 * A new identity with inter-entity behavior fits the existing five names with
 * no structural change — until it needs to *remember* something. The finding
 * is what breaks first: Entity's fixed struct, World's slice fields, or
 * Style's identity-keyed marks.
 *
 * Probe hypothesis (flower / Entity memory #2):
 * A second identity-specific memory that is *not* a timer still fits as an
 * optional Entity field — or the second optional proves the bag is sneaking in.
 *
 * Resolution (Entity.local): stacking top-level optionals is the bag in disguise.
 * One optional `local` object is more irreducible — same JSON canary, fewer Entity keys.
 */

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

function wanderWalker(e: Entity, world: World, dt: number): void {
  e.x += Math.cos(e.facing) * e.speed * dt;
  e.y += Math.sin(e.facing) * e.speed * dt;
  keepInBounds(e, world);
  e.facing += (random(world) - 0.5) * 1.2 * dt;
}

/** Acceleration toward intent; coast + friction when released — playable feel. */
const STEER_ACCEL = 520;
const STEER_FRICTION = 5.2;

function steerWalker(e: Entity, world: World, dt: number): void {
  const L = localOf(e);
  let vx = L.vx ?? 0;
  let vy = L.vy ?? 0;
  const { steerX, steerY } = world;
  const len = Math.hypot(steerX, steerY);
  if (len > 1e-3) {
    const tx = steerX / len;
    const ty = steerY / len;
    e.facing = Math.atan2(ty, tx);
    vx += tx * STEER_ACCEL * dt;
    vy += ty * STEER_ACCEL * dt;
  } else {
    const damp = Math.max(0, 1 - STEER_FRICTION * dt);
    vx *= damp;
    vy *= damp;
    if (Math.hypot(vx, vy) < 4) {
      vx = 0;
      vy = 0;
    }
  }
  const sp = Math.hypot(vx, vy);
  if (sp > e.speed) {
    vx = (vx / sp) * e.speed;
    vy = (vy / sp) * e.speed;
  }
  e.x += vx * dt;
  e.y += vy * dt;
  const nx = e.x;
  const ny = e.y;
  keepInBounds(e, world);
  if (e.x !== nx) vx = 0;
  if (e.y !== ny) vy = 0;
  L.vx = vx;
  L.vy = vy;
}

function behaveWalker(e: Entity, world: World, dt: number): void {
  if (e.id === world.controlledId) steerWalker(e, world, dt);
  else wanderWalker(e, world, dt);
}

/** Nearest entity of an identity to a point. Helper, not a vocabulary name. */
export function nearest(
  world: World,
  identity: Identity,
  x: number,
  y: number,
): Entity | undefined {
  let best: Entity | undefined;
  let bestD = Infinity;
  for (const e of world.entities) {
    if (e.identity !== identity) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/** Distance at which a critter begins to flee (stage 1 — derived from pose). */
const FLEE_RADIUS = 100;
/** Closer than this: startle into persistent skittishness (stage 2). */
const STARTLE_RADIUS = 72;
/** How long skittishness lasts after a startle, in seconds. */
const SKITTISH_DURATION = 2.4;

/**
 * Stage 1: flee the nearest walker using only x/y/facing/speed.
 * Stage 2: once startled, stay skittish via `local.alarm`.
 */
function behaveCritter(e: Entity, world: World, dt: number): void {
  const L = localOf(e);
  const threat = nearest(world, "walker", e.x, e.y);
  if (!threat) {
    if ((L.alarm ?? 0) > 0) L.alarm = Math.max(0, (L.alarm ?? 0) - dt);
    return;
  }

  const dx = e.x - threat.x;
  const dy = e.y - threat.y;
  const dist = Math.hypot(dx, dy);

  if (dist < STARTLE_RADIUS) {
    L.alarm = SKITTISH_DURATION;
  }

  const skittish = (L.alarm ?? 0) > 0;
  if (skittish) {
    L.alarm = Math.max(0, (L.alarm ?? 0) - dt);
  }

  if (dist < FLEE_RADIUS || skittish) {
    if (dist > 1e-3) {
      e.facing = Math.atan2(dy, dx);
    }
    e.x += Math.cos(e.facing) * e.speed * dt;
    e.y += Math.sin(e.facing) * e.speed * dt;
    keepInBounds(e, world);
  }
}

/** Walker this close permanently blooms a flower (latch — not a timer). */
const VISIT_RADIUS = 36;
/** Controlled walker this close gathers a bloomed flower (despawn). */
const GATHER_RADIUS = 30;

function behaveFlower(e: Entity, world: World, _dt: number): void {
  const L = localOf(e);
  if (!L.bloomed) {
    const visitor = nearest(world, "walker", e.x, e.y);
    if (!visitor) return;
    const dx = e.x - visitor.x;
    const dy = e.y - visitor.y;
    if (dx * dx + dy * dy <= VISIT_RADIUS * VISIT_RADIUS) {
      L.bloomed = true;
      world.flowerBloomed += 1;
    }
    return;
  }

  // Lifecycle: gather despawns; a spent patch queues a later bud (flush in step).
  const player = world.entities.find((x) => x.id === world.controlledId);
  if (!player) return;
  const dx = e.x - player.x;
  const dy = e.y - player.y;
  if (dx * dx + dy * dy <= GATHER_RADIUS * GATHER_RADIUS) {
    const x = e.x;
    const y = e.y;
    if (removeEntity(world, e.id)) {
      world.flowerGathered += 1;
      (world.flowerRegrows ??= []).push({
        x,
        y,
        readyAt: world.time + FLOWER_REGROW_SECONDS,
      });
    }
  }
}

export const identities: Record<Identity, IdentityDef> = {
  tree: {
    id: "tree",
    describes: "A rooted plant that stands and shades the meadow.",
  },
  beacon: {
    id: "beacon",
    describes: "A place to reach — the walker's purpose for this slice.",
  },
  walker: {
    id: "walker",
    describes:
      "A creature of the meadow. One may be steered; the others wander.",
    behave: behaveWalker,
  },
  critter: {
    id: "critter",
    describes:
      "A small meadow animal that flees walkers and stays skittish after a startle.",
    behave: behaveCritter,
  },
  flower: {
    id: "flower",
    describes:
      "A small plant that blooms when visited, can be gathered by the controlled walker, then regrows at the spent patch.",
    behave: behaveFlower,
  },
};
