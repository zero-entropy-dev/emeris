/** World state only. Nothing visual lives here. No platform APIs. */

import type { Identity } from "./identity";

export type { Identity };
export { random } from "./rng";

/** Grid cell count for the default arena (world units == cells). */
export const ARENA_COLS = 24;
export const ARENA_ROWS = 18;

/** Seconds before wave 1 arrives. */
export const FIRST_WAVE_DELAY = 1.5;

/** Spawn points around the edges of the default map, as flat x, y pairs. */
const SPAWNS = [
  1.5, 16.5,
  22.5, 16.5,
  22.5, 1.5,
  10.5, 1.5,
  11.5, 16.5,
  1.5, 10.5,
];

/**
 * Intent is a boundary for agency: host and tests submit it; only `step` applies it.
 * Not a core vocabulary peer.
 */
export type Intent = {
  steerX: number;
  steerY: number;
  /** Yaw delta (radians) for this tick — usually from mouse. */
  lookYaw?: number;
  /** Fire request this tick; player behave owns cooldown. */
  fire?: boolean;
  cycleControl?: boolean;
  claimControl?: number;
};

/**
 * Identity-specific plain data on an entity.
 * Prefer adding keys here over new top-level Entity fields.
 */
export type EntityLocal = {
  /** Level grid width in cells. */
  cols?: number;
  /** Level grid height in cells. */
  rows?: number;
  /** Row-major cells: 0 empty, 1 solid. */
  cells?: number[];
  /** Age in seconds (bolt lifetime; enemy bookkeeping). */
  age?: number;
  /** Player fire cooldown remaining (seconds). */
  cooldown?: number;
  /** Hits scored (player) — optional chrome. */
  score?: number;
  /** Hit points. 0 means dead. */
  health?: number;
  /** Seconds left on the hurt flash. */
  hurt?: number;
  /** Seconds left on the player's hit marker. */
  hitMark?: number;
  /** Seconds until this stalker can hit again. */
  attack?: number;
  /** Seconds a fire request stays queued. */
  fireBuffer?: number;
  /** Level spawn points as flat x, y pairs. */
  spawns?: number[];
  /** Current wave number (wave entity). 0 before the first wave. */
  wave?: number;
  /** Drones still to spawn this wave. */
  pending?: number;
  /** Stalkers still to spawn this wave. */
  pendingStalkers?: number;
  /** Seconds until the next spawn. */
  spawnTimer?: number;
  /** Seconds left before the next wave starts. */
  breather?: number;
};

export type Entity = {
  id: number;
  identity: Identity;
  x: number;
  y: number;
  /** Radians; mobile identities face this way. */
  facing: number;
  /** Motion speed in world units per second. */
  speed: number;
  local?: EntityLocal;
};

export function localOf(e: Entity): EntityLocal {
  if (!e.local) e.local = {};
  return e.local;
}

export type World = {
  seed: number;
  rngState: number;
  tick: number;
  /** World extent in world units (matches level cols/rows). */
  width: number;
  height: number;
  time: number;
  entities: Entity[];
  nextId: number;
  /** Observer focus (player id). */
  focusId: number;
  /** Last intent axes applied by step — serializable for snapshot/replay. */
  steerX: number;
  steerY: number;
  lookYaw: number;
  fire: boolean;
};

export function removeEntity(world: World, id: number): boolean {
  const i = world.entities.findIndex((e) => e.id === id);
  if (i < 0) return false;
  world.entities.splice(i, 1);
  return true;
}

export function addEntity(world: World, draft: Omit<Entity, "id">): Entity {
  const e: Entity = { ...draft, id: world.nextId++ };
  world.entities.push(e);
  return e;
}

function fillRect(
  cells: number[],
  cols: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  v: number,
): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x > 0 && y > 0 && x < cols - 1) {
        cells[y * cols + x] = v;
      }
    }
  }
}

/** Hard-coded map — border, rooms, corridors, pillars. */
function buildCells(cols: number, rows: number): number[] {
  const cells = new Array(cols * rows).fill(0);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      cells[y * cols + x] = border ? 1 : 0;
    }
  }

  // Horizontal / vertical wall runs with door gaps
  fillRect(cells, cols, 6, 1, 6, 7, 1);
  cells[4 * cols + 6] = 0; // door
  fillRect(cells, cols, 1, 8, 10, 8, 1);
  cells[8 * cols + 3] = 0;
  cells[8 * cols + 9] = 0;
  fillRect(cells, cols, 12, 1, 12, 10, 1);
  cells[5 * cols + 12] = 0;
  cells[9 * cols + 12] = 0;
  fillRect(cells, cols, 12, 10, 22, 10, 1);
  cells[10 * cols + 16] = 0;
  fillRect(cells, cols, 17, 1, 17, 6, 1);
  cells[3 * cols + 17] = 0;

  // Pillar clusters / room furniture
  const solids: [number, number][] = [
    [3, 3],
    [4, 3],
    [3, 4],
    [9, 3],
    [10, 3],
    [10, 4],
    [8, 12],
    [9, 12],
    [8, 13],
    [9, 13],
    [14, 4],
    [15, 4],
    [19, 3],
    [20, 3],
    [20, 4],
    [14, 13],
    [15, 13],
    [15, 14],
    [19, 14],
    [20, 14],
    [4, 14],
    [5, 14],
    [21, 7],
    [21, 8],
  ];
  for (const [x, y] of solids) {
    if (x > 0 && y > 0 && x < cols - 1 && y < rows - 1) {
      cells[y * cols + x] = 1;
    }
  }
  return cells;
}

export function createWorld(
  _viewW = ARENA_COLS,
  _viewH = ARENA_ROWS,
  seed = 1,
): World {
  const cols = ARENA_COLS;
  const rows = ARENA_ROWS;
  const world: World = {
    seed,
    rngState: seed >>> 0 || 1,
    tick: 0,
    width: cols,
    height: rows,
    time: 0,
    entities: [],
    nextId: 1,
    focusId: 0,
    steerX: 0,
    steerY: 0,
    lookYaw: 0,
    fire: false,
  };

  world.entities.push({
    id: world.nextId++,
    identity: "level",
    x: 0,
    y: 0,
    facing: 0,
    speed: 0,
    local: {
      cols,
      rows,
      cells: buildCells(cols, rows),
      spawns: [...SPAWNS],
    },
  });

  world.entities.push({
    id: world.nextId++,
    identity: "wave",
    x: 0,
    y: 0,
    facing: 0,
    speed: 0,
    local: {
      wave: 0,
      pending: 0,
      pendingStalkers: 0,
      spawnTimer: 0,
      breather: FIRST_WAVE_DELAY,
    },
  });

  const focusId = world.nextId++;
  world.focusId = focusId;
  world.entities.push({
    id: focusId,
    identity: "player",
    x: 2.5,
    y: 2.5,
    facing: 0,
    speed: 3.8,
    local: { cooldown: 0, score: 0, health: 5, hurt: 0, hitMark: 0, fireBuffer: 0 },
  });

  return world;
}

export function serialize(world: World): string {
  return JSON.stringify(world);
}

export function deserialize(text: string): World {
  return JSON.parse(text) as World;
}
