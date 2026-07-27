/**
 * Arena identities — what something *is*, and how it acts.
 */

import { random } from "./rng";
import type { ProcessDef } from "./process";
import {
  addEntity,
  localOf,
  removeEntity,
  type Entity,
  type EntityLocal,
  type World,
} from "./world";

export type Identity = string;

export type IdentityDef = {
  id: Identity;
  describes: string;
  behave?: (e: Entity, world: World, dt: number) => void;
  process?: ProcessDef;
};

export type LocalNumber = "age" | "cooldown" | "score" | "pc" | "cols" | "rows";

export function store(
  e: Entity,
  key: LocalNumber,
  delta: number,
  ceil = Infinity,
): number {
  const L = localOf(e);
  const next = Math.min(ceil, (L[key] ?? 0) + Math.max(0, delta));
  L[key] = next;
  return next;
}

export function decay(
  e: Entity,
  key: LocalNumber,
  delta: number,
  floor = 0,
): number {
  const L = localOf(e);
  const cur = L[key] ?? 0;
  const taken = Math.min(Math.max(0, delta), Math.max(0, cur - floor));
  L[key] = cur - taken;
  return taken;
}

export function emit(world: World, draft: Omit<Entity, "id">): Entity;
export function emit(
  target: Entity,
  key: LocalNumber,
  delta: number,
  ceil?: number,
): number;
export function emit(
  a: World | Entity,
  b: Omit<Entity, "id"> | LocalNumber,
  delta?: number,
  ceil = Infinity,
): Entity | number {
  if (typeof b === "string") {
    return store(a as Entity, b, delta ?? 0, ceil);
  }
  return addEntity(a as World, b);
}

export function transform(
  e: Entity,
  key: LocalNumber,
  map: (current: number, local: EntityLocal) => number,
): number {
  const L = localOf(e);
  const next = map(L[key] ?? 0, L);
  L[key] = next;
  return next;
}

/** The single level entity, if present. */
export function levelOf(world: World): Entity | undefined {
  return world.entities.find((e) => e.identity === "level");
}

/** True when the cell containing (x, y) is solid. Out of bounds = solid. */
export function solidAt(world: World, x: number, y: number): boolean {
  const level = levelOf(world);
  const cols = level?.local?.cols ?? 0;
  const rows = level?.local?.rows ?? 0;
  const cells = level?.local?.cells;
  if (!cells || cols < 1 || rows < 1) return true;
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return true;
  return cells[cy * cols + cx] !== 0;
}

/** Circle vs solid cells — samples center + cardinal offsets. */
export function blocked(
  world: World,
  x: number,
  y: number,
  radius: number,
): boolean {
  if (solidAt(world, x, y)) return true;
  if (solidAt(world, x - radius, y)) return true;
  if (solidAt(world, x + radius, y)) return true;
  if (solidAt(world, x, y - radius)) return true;
  if (solidAt(world, x, y + radius)) return true;
  return false;
}

export function isEnemy(identity: Identity): boolean {
  return identity === "drone" || identity === "stalker";
}

const PLAYER_RADIUS = 0.22;
const BOLT_RADIUS = 0.12;
const BOLT_HIT = 0.45;
const BOLT_SPEED = 9;
const BOLT_LIFE = 1.4;
const FIRE_COOLDOWN = 0.22;
const DRONE_RADIUS = 0.3;
const STALKER_RADIUS = 0.24;
const STALKER_AGGRO = 7.5;

function behavePlayer(e: Entity, world: World, dt: number): void {
  decay(e, "cooldown", dt);

  e.facing += world.lookYaw;

  const forward = world.steerY;
  const strafe = world.steerX;
  const fx = Math.cos(e.facing);
  const fy = Math.sin(e.facing);
  const rx = Math.cos(e.facing + Math.PI / 2);
  const ry = Math.sin(e.facing + Math.PI / 2);

  const dx = (fx * forward + rx * strafe) * e.speed * dt;
  const dy = (fy * forward + ry * strafe) * e.speed * dt;

  const nx = e.x + dx;
  if (!blocked(world, nx, e.y, PLAYER_RADIUS)) e.x = nx;
  const ny = e.y + dy;
  if (!blocked(world, e.x, ny, PLAYER_RADIUS)) e.y = ny;

  if (world.fire && (e.local?.cooldown ?? 0) <= 0) {
    transform(e, "cooldown", () => FIRE_COOLDOWN);
    emit(world, {
      identity: "bolt",
      x: e.x + fx * 0.35,
      y: e.y + fy * 0.35,
      facing: e.facing,
      speed: BOLT_SPEED,
      local: { age: 0 },
    });
  }
}

/** Wide wanderer — wall bounce, occasional turn. */
function behaveDrone(e: Entity, world: World, dt: number): void {
  transform(e, "age", (a) => a + dt);
  if (random(world) < 0.02) {
    e.facing += (random(world) - 0.5) * 1.8;
  }
  const nx = e.x + Math.cos(e.facing) * e.speed * dt;
  const ny = e.y + Math.sin(e.facing) * e.speed * dt;
  if (!blocked(world, nx, ny, DRONE_RADIUS)) {
    e.x = nx;
    e.y = ny;
  } else {
    e.facing += Math.PI * (0.4 + random(world) * 0.6);
  }
}

/** Tall seeker — approaches player when near, else idle drift. */
function behaveStalker(e: Entity, world: World, dt: number): void {
  transform(e, "age", (a) => a + dt);
  const player = world.entities.find((p) => p.identity === "player");
  if (player) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist < STALKER_AGGRO && dist > 0.01) {
      e.facing = Math.atan2(dy, dx);
      const nx = e.x + Math.cos(e.facing) * e.speed * dt;
      const ny = e.y + Math.sin(e.facing) * e.speed * dt;
      if (!blocked(world, nx, ny, STALKER_RADIUS)) {
        e.x = nx;
        e.y = ny;
      } else {
        e.facing += (random(world) - 0.5) * 1.2;
      }
      return;
    }
  }
  if (random(world) < 0.015) {
    e.facing += (random(world) - 0.5) * 1.2;
  }
  const nx = e.x + Math.cos(e.facing) * e.speed * 0.45 * dt;
  const ny = e.y + Math.sin(e.facing) * e.speed * 0.45 * dt;
  if (!blocked(world, nx, ny, STALKER_RADIUS)) {
    e.x = nx;
    e.y = ny;
  } else {
    e.facing += Math.PI * 0.5;
  }
}

function behaveBolt(e: Entity, world: World, dt: number): void {
  transform(e, "age", (a) => a + dt);
  if ((e.local?.age ?? 0) >= BOLT_LIFE) {
    removeEntity(world, e.id);
    return;
  }

  e.x += Math.cos(e.facing) * e.speed * dt;
  e.y += Math.sin(e.facing) * e.speed * dt;

  if (blocked(world, e.x, e.y, BOLT_RADIUS)) {
    removeEntity(world, e.id);
    return;
  }

  for (const t of world.entities) {
    if (!isEnemy(t.identity)) continue;
    const d = Math.hypot(t.x - e.x, t.y - e.y);
    if (d <= BOLT_HIT) {
      removeEntity(world, t.id);
      removeEntity(world, e.id);
      const player = world.entities.find((p) => p.identity === "player");
      if (player) store(player, "score", 1);
      return;
    }
  }
}

export const arenaIdentities: Record<Identity, IdentityDef> = {
  level: {
    id: "level",
    describes: "The arena map — one grid of solid and empty cells.",
  },
  player: {
    id: "player",
    describes: "The agent that moves, looks, and fires bolts under Intent.",
    behave: behavePlayer,
  },
  drone: {
    id: "drone",
    describes: "A wide drifting foe that wanders and dies to bolts.",
    behave: behaveDrone,
  },
  stalker: {
    id: "stalker",
    describes: "A tall foe that seeks the player when near.",
    behave: behaveStalker,
  },
  bolt: {
    id: "bolt",
    describes: "A short-lived projectile flying along facing.",
    behave: behaveBolt,
  },
};
