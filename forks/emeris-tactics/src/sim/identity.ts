/**
 * Tactics identities — board + units. Couplings in behave / helpers, not new peers.
 *
 * Squad phase: every living unit on a side gets one act (move XOR attack XOR wait),
 * then the other side's phase begins. Not one act for the whole squad.
 */

import {
  SIDE_ENEMY,
  SIDE_PLAYER,
  localOf,
  removeEntity,
  type Entity,
  type Intent,
  type IntentAction,
  type World,
} from "./world";

export type Identity = string;

export type IdentityDef = {
  id: Identity;
  describes: string;
  behave?: (e: Entity, world: World, dt: number) => void;
};

export function boardOf(world: World): Entity | undefined {
  return world.entities.find((e) => e.identity === "board");
}

export function isUnit(identity: string): boolean {
  return identity === "soldier" || identity === "enemy";
}

export function unitsOf(world: World, side?: number): Entity[] {
  return world.entities.filter((e) => {
    if (!isUnit(e.identity)) return false;
    if (side === undefined) return true;
    return (e.local?.side ?? -1) === side;
  });
}

/** Units on a side in fixed turn order (stable id ascending). */
export function squadOrder(world: World, side: number): Entity[] {
  return unitsOf(world, side).sort((a, b) => a.id - b.id);
}

/** Units on a side that still owe an act this phase (order preserved). */
export function readyUnits(world: World, side: number): Entity[] {
  return squadOrder(world, side).filter((e) => !(e.local?.acted));
}

/** Who must act now — first ready unit on the active side. */
export function currentActor(world: World): Entity | undefined {
  const board = boardOf(world);
  if (!board || (board.local?.winner ?? -1) >= 0) return undefined;
  const side = board.local?.turnSide ?? SIDE_PLAYER;
  return readyUnits(world, side)[0];
}

export function unitAt(world: World, cellX: number, cellY: number): Entity | undefined {
  return world.entities.find(
    (e) =>
      isUnit(e.identity) &&
      e.local?.cellX === cellX &&
      e.local?.cellY === cellY,
  );
}

export function solidAt(world: World, cellX: number, cellY: number): boolean {
  const board = boardOf(world);
  const L = board?.local;
  if (!L?.cells || L.cols == null || L.rows == null) return true;
  if (cellX < 0 || cellY < 0 || cellX >= L.cols || cellY >= L.rows) return true;
  return L.cells[cellY * L.cols + cellX] === 1;
}

export function manhattan(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function syncPose(e: Entity): void {
  const L = localOf(e);
  e.x = (L.cellX ?? 0) + 0.5;
  e.y = (L.cellY ?? 0) + 0.5;
}

function checkWinner(world: World): void {
  const board = boardOf(world);
  if (!board) return;
  const L = localOf(board);
  if ((L.winner ?? -1) >= 0) return;
  const players = unitsOf(world, SIDE_PLAYER);
  const enemies = unitsOf(world, SIDE_ENEMY);
  if (enemies.length === 0) L.winner = SIDE_PLAYER;
  else if (players.length === 0) L.winner = SIDE_ENEMY;
}

function clearActed(world: World, side: number): void {
  for (const u of unitsOf(world, side)) {
    localOf(u).acted = 0;
  }
}

/** End one side's phase; open the other with a fresh act budget. */
function passSide(world: World): void {
  const board = boardOf(world);
  if (!board) return;
  const L = localOf(board);
  if ((L.winner ?? -1) >= 0) return;
  const next =
    (L.turnSide ?? SIDE_PLAYER) === SIDE_PLAYER ? SIDE_ENEMY : SIDE_PLAYER;
  L.turnSide = next;
  clearActed(world, next);
  if (next === SIDE_PLAYER) L.turnIndex = (L.turnIndex ?? 1) + 1;

  const ready = readyUnits(world, next);
  if (ready[0]) world.focusId = ready[0].id;
}

/** After a unit acts: mark spent, focus next ready ally, or end the side phase. */
function finishUnitAct(world: World, unit: Entity): void {
  localOf(unit).acted = 1;
  checkWinner(world);
  const board = boardOf(world);
  if (!board || (board.local?.winner ?? -1) >= 0) return;

  const side = unit.local?.side ?? -1;
  const ready = readyUnits(world, side);
  if (ready.length === 0) {
    passSide(world);
    return;
  }
  world.focusId = ready[0]!.id;
}

export function canMove(
  world: World,
  unit: Entity,
  cellX: number,
  cellY: number,
): boolean {
  if (unit.local?.acted) return false;
  const L = localOf(unit);
  const fromX = L.cellX ?? 0;
  const fromY = L.cellY ?? 0;
  const range = L.moveRange ?? 2;
  if (manhattan(fromX, fromY, cellX, cellY) > range) return false;
  if (manhattan(fromX, fromY, cellX, cellY) === 0) return false;
  if (solidAt(world, cellX, cellY)) return false;
  if (unitAt(world, cellX, cellY)) return false;
  return true;
}

export function canAttack(
  world: World,
  unit: Entity,
  cellX: number,
  cellY: number,
): boolean {
  if (unit.local?.acted) return false;
  const L = localOf(unit);
  const fromX = L.cellX ?? 0;
  const fromY = L.cellY ?? 0;
  const range = L.attackRange ?? 1;
  if (manhattan(fromX, fromY, cellX, cellY) > range) return false;
  const target = unitAt(world, cellX, cellY);
  if (!target) return false;
  if ((target.local?.side ?? -1) === (L.side ?? -1)) return false;
  return true;
}

/** Apply one committed act for a unit. Returns true if the act resolved. */
export function applyCommitment(
  world: World,
  unit: Entity,
  action: IntentAction,
  cellX: number,
  cellY: number,
): boolean {
  const board = boardOf(world);
  if (!board) return false;
  const B = localOf(board);
  if ((B.winner ?? -1) >= 0) return false;

  const side = unit.local?.side ?? -1;
  if (side !== (B.turnSide ?? -1)) return false;
  if (!isUnit(unit.identity)) return false;
  if (unit.local?.acted) return false;
  const actor = currentActor(world);
  if (!actor || actor.id !== unit.id) return false;

  if (action === "wait") {
    finishUnitAct(world, unit);
    return true;
  }

  if (action === "move") {
    if (!canMove(world, unit, cellX, cellY)) return false;
    const L = localOf(unit);
    L.cellX = cellX;
    L.cellY = cellY;
    syncPose(unit);
    finishUnitAct(world, unit);
    return true;
  }

  if (action === "attack") {
    if (!canAttack(world, unit, cellX, cellY)) return false;
    const target = unitAt(world, cellX, cellY);
    if (!target) return false;
    const T = localOf(target);
    T.hp = (T.hp ?? 1) - 1;
    if ((T.hp ?? 0) <= 0) removeEntity(world, target.id);
    finishUnitAct(world, unit);
    return true;
  }

  return false;
}

/** Resolve player Intent commitment (if any) before the behave loop. */
export function applyPlayerIntent(world: World, intent: Intent): void {
  const action = intent.action ?? "none";
  if (action === "none") return;

  const board = boardOf(world);
  if (!board) return;
  if ((board.local?.turnSide ?? -1) !== SIDE_PLAYER) return;
  if ((board.local?.winner ?? -1) >= 0) return;

  const unitId = intent.unitId ?? 0;
  const unit = world.entities.find((e) => e.id === unitId);
  if (!unit || unit.local?.side !== SIDE_PLAYER) return;

  applyCommitment(
    world,
    unit,
    action,
    intent.cellX ?? 0,
    intent.cellY ?? 0,
  );
}

function tryEnemyCommitment(world: World, enemy: Entity): boolean {
  const L = localOf(enemy);
  const ex = L.cellX ?? 0;
  const ey = L.cellY ?? 0;
  const range = L.attackRange ?? 1;

  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (Math.abs(dx) + Math.abs(dy) === 0) continue;
      if (Math.abs(dx) + Math.abs(dy) > range) continue;
      const tx = ex + dx;
      const ty = ey + dy;
      if (canAttack(world, enemy, tx, ty)) {
        return applyCommitment(world, enemy, "attack", tx, ty);
      }
    }
  }

  const players = unitsOf(world, SIDE_PLAYER);
  const move = L.moveRange ?? 2;
  let best: { x: number; y: number; d: number } | null = null;
  for (let dy = -move; dy <= move; dy++) {
    for (let dx = -move; dx <= move; dx++) {
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist === 0 || dist > move) continue;
      const tx = ex + dx;
      const ty = ey + dy;
      if (!canMove(world, enemy, tx, ty)) continue;
      let nearest = Infinity;
      for (const p of players) {
        nearest = Math.min(
          nearest,
          manhattan(tx, ty, p.local?.cellX ?? 0, p.local?.cellY ?? 0),
        );
      }
      if (!best || nearest < best.d) best = { x: tx, y: ty, d: nearest };
    }
  }
  if (best) return applyCommitment(world, enemy, "move", best.x, best.y);

  return applyCommitment(world, enemy, "wait", 0, 0);
}

/** One ready enemy acts per step while it is the enemy phase. */
function enemyAct(world: World): void {
  const board = boardOf(world);
  if (!board) return;
  const B = localOf(board);
  if ((B.winner ?? -1) >= 0) return;
  if ((B.turnSide ?? -1) !== SIDE_ENEMY) return;

  const ready = readyUnits(world, SIDE_ENEMY);
  if (ready.length === 0) {
    passSide(world);
    return;
  }

  const pick = ready[0]!;
  world.focusId = pick.id;
  tryEnemyCommitment(world, pick);
}

function behaveBoard(e: Entity, world: World, _dt: number): void {
  void e;
  enemyAct(world);
}

export const tacticsIdentities: Record<string, IdentityDef> = {
  board: {
    id: "board",
    describes: "The tactics grid and match bookkeeping (turn side, winner).",
    behave: behaveBoard,
  },
  soldier: {
    id: "soldier",
    describes: "A player-side squad unit; each gets one act per your phase.",
  },
  enemy: {
    id: "enemy",
    describes: "An opposing squad unit; each gets one act per enemy phase.",
  },
};
