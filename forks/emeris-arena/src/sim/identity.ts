/**
 * Arena identities — what something *is*, and how it acts.
 */

import { random } from "./rng";
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
};

export type LocalNumber =
  | "age"
  | "cooldown"
  | "score"
  | "cols"
  | "rows"
  | "health"
  | "hurt"
  | "hitMark"
  | "attack"
  | "fireBuffer"
  | "wave"
  | "pending"
  | "pendingStalkers"
  | "spawnTimer"
  | "breather";

export const PLAYER_HEALTH = 5;
export const DRONE_HEALTH = 1;
export const STALKER_HEALTH = 3;

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

/** The single wave entity, if present. */
export function waveOf(world: World): Entity | undefined {
  return world.entities.find((e) => e.identity === "wave");
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

/** No solid cell on the straight line between two points. */
export function lineOfSight(
  world: World,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  const dist = Math.hypot(bx - ax, by - ay);
  const n = Math.ceil(dist / 0.25);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (solidAt(world, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

export function isEnemy(identity: Identity): boolean {
  return identity === "drone" || identity === "stalker";
}

const PLAYER_RADIUS = 0.22;
const BOLT_RADIUS = 0.12;
const BOLT_HIT = 0.45;
const BOLT_SPEED = 24;
export const BOLT_LIFE = 1;
/** Longest bolt move checked in one go, so fast bolts can't skip past enemies. */
const BOLT_SUBSTEP = 0.2;
export const FIRE_COOLDOWN = 0.16;
const FIRE_BUFFER = 0.12;
export const HURT_TIME = 0.25;
export const HIT_MARK_TIME = 0.15;
const KNOCKBACK = 0.25;
const DRONE_RADIUS = 0.3;
const DRONE_RANGE = 9;
const DRONE_RELOAD = 2.4;
const STALKER_RADIUS = 0.24;
const STALKER_AGGRO = 7.5;
const STALKER_HIT = 0.6;
const STALKER_SWING = 0.9;
const SHOT_SPEED = 4.5;
export const SHOT_LIFE = 4;
const SHOT_RADIUS = 0.1;
const SHOT_HIT = 0.35;
export const WAVE_BREATHER = 4;
const SPAWN_GAP = 0.7;
const ALIVE_CAP = 18;

export function waveDrones(wave: number): number {
  return 2 + wave;
}

export function waveStalkers(wave: number): number {
  return 1 + Math.ceil(wave / 2);
}

function playerOf(world: World): Entity | undefined {
  return world.entities.find((p) => p.identity === "player");
}

function alive(e: Entity): boolean {
  return (e.local?.health ?? 0) > 0;
}

function enemiesAlive(world: World): number {
  let n = 0;
  for (const e of world.entities) if (isEnemy(e.identity)) n += 1;
  return n;
}

/** Place a fresh enemy. Wave spawns and tests both use this. */
export function spawnEnemy(
  world: World,
  identity: "drone" | "stalker",
  x: number,
  y: number,
): Entity {
  if (identity === "drone") {
    return addEntity(world, {
      identity,
      x,
      y,
      facing: random(world) * Math.PI * 2,
      speed: 1.15,
      local: {
        age: 0,
        health: DRONE_HEALTH,
        hurt: 0,
        attack: 1.5 + random(world),
      },
    });
  }
  return addEntity(world, {
    identity,
    x,
    y,
    facing: random(world) * Math.PI * 2,
    speed: 1.55,
    local: { age: 0, health: STALKER_HEALTH, hurt: 0, attack: 0 },
  });
}

function behavePlayer(e: Entity, world: World, dt: number): void {
  decay(e, "cooldown", dt);
  decay(e, "hurt", dt);
  decay(e, "hitMark", dt);

  if (!alive(e)) {
    decay(e, "fireBuffer", dt);
    return;
  }

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

  if (world.fire) transform(e, "fireBuffer", () => FIRE_BUFFER);
  else decay(e, "fireBuffer", dt);

  if ((e.local?.fireBuffer ?? 0) > 0 && (e.local?.cooldown ?? 0) <= 0) {
    transform(e, "fireBuffer", () => 0);
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

/** Wide wanderer — wall bounce, occasional turn, fires slow shots on sight. */
function behaveDrone(e: Entity, world: World, dt: number): void {
  transform(e, "age", (a) => a + dt);
  decay(e, "hurt", dt);
  decay(e, "attack", dt);

  const player = playerOf(world);
  if (player && alive(player) && (e.local?.attack ?? 0) <= 0) {
    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (
      dist < DRONE_RANGE &&
      lineOfSight(world, e.x, e.y, player.x, player.y)
    ) {
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      emit(world, {
        identity: "shot",
        x: e.x + Math.cos(aim) * 0.35,
        y: e.y + Math.sin(aim) * 0.35,
        facing: aim,
        speed: SHOT_SPEED,
        local: { age: 0 },
      });
      transform(e, "attack", () => DRONE_RELOAD + random(world) * 1.2);
    }
  }

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
  decay(e, "hurt", dt);
  decay(e, "attack", dt);

  const player = playerOf(world);
  if (player) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (alive(player) && dist < STALKER_HIT && (e.local?.attack ?? 0) <= 0) {
      decay(player, "health", 1);
      transform(player, "hurt", () => HURT_TIME);
      transform(e, "attack", () => STALKER_SWING);
    }
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

function radiusOf(e: Entity): number {
  return e.identity === "drone" ? DRONE_RADIUS : STALKER_RADIUS;
}

/** True when the bolt hit something and is gone. */
function boltHits(e: Entity, world: World): boolean {
  for (const t of world.entities) {
    if (!isEnemy(t.identity) || !alive(t)) continue;
    if (Math.hypot(t.x - e.x, t.y - e.y) > BOLT_HIT) continue;
    decay(t, "health", 1);
    transform(t, "hurt", () => HURT_TIME);
    const kx = t.x + Math.cos(e.facing) * KNOCKBACK;
    const ky = t.y + Math.sin(e.facing) * KNOCKBACK;
    if (!blocked(world, kx, ky, radiusOf(t))) {
      t.x = kx;
      t.y = ky;
    }
    const player = playerOf(world);
    if (player) transform(player, "hitMark", () => HIT_MARK_TIME);
    if (!alive(t)) {
      removeEntity(world, t.id);
      if (player) store(player, "score", 1);
    }
    removeEntity(world, e.id);
    return true;
  }
  return false;
}

function behaveBolt(e: Entity, world: World, dt: number): void {
  transform(e, "age", (a) => a + dt);
  if ((e.local?.age ?? 0) >= BOLT_LIFE) {
    removeEntity(world, e.id);
    return;
  }

  const travel = e.speed * dt;
  const steps = Math.max(1, Math.ceil(travel / BOLT_SUBSTEP));
  const sx = (Math.cos(e.facing) * travel) / steps;
  const sy = (Math.sin(e.facing) * travel) / steps;
  for (let i = 0; i < steps; i++) {
    e.x += sx;
    e.y += sy;
    if (blocked(world, e.x, e.y, BOLT_RADIUS)) {
      removeEntity(world, e.id);
      return;
    }
    if (boltHits(e, world)) return;
  }
}

/** Slow enemy projectile — dodgeable, stopped by walls. */
function behaveShot(e: Entity, world: World, dt: number): void {
  transform(e, "age", (a) => a + dt);
  if ((e.local?.age ?? 0) >= SHOT_LIFE) {
    removeEntity(world, e.id);
    return;
  }
  e.x += Math.cos(e.facing) * e.speed * dt;
  e.y += Math.sin(e.facing) * e.speed * dt;
  if (blocked(world, e.x, e.y, SHOT_RADIUS)) {
    removeEntity(world, e.id);
    return;
  }
  const player = playerOf(world);
  if (
    player &&
    alive(player) &&
    Math.hypot(player.x - e.x, player.y - e.y) <= SHOT_HIT
  ) {
    decay(player, "health", 1);
    transform(player, "hurt", () => HURT_TIME);
    removeEntity(world, e.id);
  }
}

/** Spawn point farthest from the player, lightly shuffled by world RNG. */
function pickSpawn(world: World, player: Entity | undefined): [number, number] {
  const spawns = levelOf(world)?.local?.spawns ?? [];
  let best: [number, number] = [spawns[0] ?? 1.5, spawns[1] ?? 1.5];
  let bestScore = -Infinity;
  for (let i = 0; i + 1 < spawns.length; i += 2) {
    const x = spawns[i]!;
    const y = spawns[i + 1]!;
    const d = player ? Math.hypot(x - player.x, y - player.y) : 0;
    const score = d + random(world) * 2;
    if (score > bestScore) {
      bestScore = score;
      best = [x, y];
    }
  }
  return best;
}

/** Runs the waves: breather, then spawns one enemy at a time. */
function behaveWave(e: Entity, world: World, dt: number): void {
  const player = playerOf(world);
  if (!player || !alive(player)) return;

  const L = localOf(e);
  if ((L.breather ?? 0) > 0) {
    decay(e, "breather", dt);
    if ((L.breather ?? 0) <= 0) {
      const next = store(e, "wave", 1);
      L.pending = waveDrones(next);
      L.pendingStalkers = waveStalkers(next);
      L.spawnTimer = 0;
    }
    return;
  }

  const pending = (L.pending ?? 0) + (L.pendingStalkers ?? 0);
  if (pending > 0) {
    decay(e, "spawnTimer", dt);
    if ((L.spawnTimer ?? 0) > 0 || enemiesAlive(world) >= ALIVE_CAP) return;
    const stalker = random(world) < (L.pendingStalkers ?? 0) / pending;
    if (stalker) decay(e, "pendingStalkers", 1);
    else decay(e, "pending", 1);
    const [x, y] = pickSpawn(world, player);
    spawnEnemy(world, stalker ? "stalker" : "drone", x, y);
    L.spawnTimer = SPAWN_GAP;
    return;
  }

  if (enemiesAlive(world) === 0) L.breather = WAVE_BREATHER;
}

export const arenaIdentities: Record<Identity, IdentityDef> = {
  level: {
    id: "level",
    describes: "The arena map — one grid of solid and empty cells, plus spawn points.",
  },
  wave: {
    id: "wave",
    describes: "The run — which wave it is, who is still to arrive, and the breather between waves.",
    behave: behaveWave,
  },
  player: {
    id: "player",
    describes: "The agent that moves, looks, and fires bolts under Intent.",
    behave: behavePlayer,
  },
  drone: {
    id: "drone",
    describes: "A wide drifting foe that fires slow shots when it can see the player.",
    behave: behaveDrone,
  },
  stalker: {
    id: "stalker",
    describes: "A tall foe that seeks the player when near and hits up close.",
    behave: behaveStalker,
  },
  bolt: {
    id: "bolt",
    describes: "The player's fast projectile.",
    behave: behaveBolt,
  },
  shot: {
    id: "shot",
    describes: "A drone's slow projectile.",
    behave: behaveShot,
  },
};
