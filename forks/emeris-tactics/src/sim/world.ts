/** World state only. Nothing visual lives here. No platform APIs. */

import type { Identity } from "./identity";

export type { Identity };

/** Small tactics board (world units == cells). */
export const BOARD_COLS = 8;
export const BOARD_ROWS = 8;

/** Player side / enemy side. */
export const SIDE_PLAYER = 0;
export const SIDE_ENEMY = 1;

/**
 * Intent is a boundary for agency: host and tests submit it; only `step` applies it.
 * One commitment per Intent for this fork — not a sixth core name.
 */
export type IntentAction = "none" | "wait" | "move" | "attack";

export type Intent = {
  /** Kept for step-shape kinship with meadow; unused for tactics motion. */
  steerX: number;
  steerY: number;
  /** Committed act this tick (empty / none = no-op for match state). */
  action?: IntentAction;
  /** Unit performing the act (player side). */
  unitId?: number;
  /** Target cell for move / attack. */
  cellX?: number;
  cellY?: number;
};

export type EntityLocal = {
  cols?: number;
  rows?: number;
  cells?: number[];
  turnSide?: number;
  winner?: number;
  /** Player-act ordinal (1-based); bumps when play returns to you. */
  turnIndex?: number;
  /** 1 if this unit already acted in the current side phase. */
  acted?: number;
  side?: number;
  hp?: number;
  cellX?: number;
  cellY?: number;
  moveRange?: number;
  attackRange?: number;
};

export type Entity = {
  id: number;
  identity: Identity;
  x: number;
  y: number;
  facing: number;
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
  width: number;
  height: number;
  time: number;
  entities: Entity[];
  nextId: number;
  focusId: number;
  steerX: number;
  steerY: number;
  action: IntentAction;
  unitId: number;
  cellX: number;
  cellY: number;
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

function buildCells(cols: number, rows: number): number[] {
  const cells = new Array(cols * rows).fill(0);
  for (let x = 0; x < cols; x++) {
    cells[x] = 1;
    cells[(rows - 1) * cols + x] = 1;
  }
  for (let y = 0; y < rows; y++) {
    cells[y * cols] = 1;
    cells[y * cols + (cols - 1)] = 1;
  }
  cells[3 * cols + 3] = 1;
  cells[3 * cols + 4] = 1;
  cells[4 * cols + 3] = 1;
  cells[5 * cols + 5] = 1;
  return cells;
}

function placeUnit(
  world: World,
  identity: Identity,
  side: number,
  cellX: number,
  cellY: number,
): Entity {
  return addEntity(world, {
    identity,
    x: cellX + 0.5,
    y: cellY + 0.5,
    facing: side === SIDE_PLAYER ? 0 : Math.PI,
    speed: 0,
    local: {
      side,
      hp: 3,
      cellX,
      cellY,
      moveRange: 2,
      attackRange: 1,
      acted: 0,
    },
  });
}

export function createWorld(
  _width = BOARD_COLS,
  _height = BOARD_ROWS,
  seed = 1,
): World {
  const cols = BOARD_COLS;
  const rows = BOARD_ROWS;
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
    action: "none",
    unitId: 0,
    cellX: 0,
    cellY: 0,
  };

  addEntity(world, {
    identity: "board",
    x: 0,
    y: 0,
    facing: 0,
    speed: 0,
    local: {
      cols,
      rows,
      cells: buildCells(cols, rows),
      turnSide: SIDE_PLAYER,
      winner: -1,
      turnIndex: 1,
    },
  });

  const a = placeUnit(world, "soldier", SIDE_PLAYER, 1, 2);
  placeUnit(world, "soldier", SIDE_PLAYER, 1, 5);
  placeUnit(world, "enemy", SIDE_ENEMY, 6, 2);
  placeUnit(world, "enemy", SIDE_ENEMY, 6, 5);

  world.focusId = a.id;
  return world;
}

export function serialize(world: World): string {
  return JSON.stringify(world);
}

export function deserialize(text: string): World {
  return JSON.parse(text) as World;
}
