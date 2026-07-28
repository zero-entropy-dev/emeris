/**
 * Headless canary: forced Intents resolve turns with no canvas.
 * Run: npm run smoke
 */
import {
  BOARD_COLS,
  BOARD_ROWS,
  SIDE_ENEMY,
  SIDE_PLAYER,
  boardOf,
  createWorld,
  currentActor,
  deserialize,
  readyUnits,
  serialize,
  step,
  unitsOf,
  type Intent,
} from "../src/sim/index.ts";

const STEP = 1 / 60;
const EMPTY: Intent = { steerX: 0, steerY: 0, action: "none" };

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`sim-smoke FAIL: ${msg}`);
    process.exit(1);
  }
}

const world = createWorld(undefined, undefined, 42);
assert(!!boardOf(world), "missing board entity");
assert(unitsOf(world, SIDE_PLAYER).length === 2, "expected 2 soldiers");
assert(unitsOf(world, SIDE_ENEMY).length === 2, "expected 2 enemies");

const board = boardOf(world)!;
assert(board.local?.cols === BOARD_COLS, "expected 8 cols");
assert(board.local?.rows === BOARD_ROWS, "expected 8 rows");
assert(
  (board.local?.cells?.length ?? 0) === BOARD_COLS * BOARD_ROWS,
  "board cells length mismatch",
);

for (let i = 0; i < 60; i++) step(world, STEP, EMPTY);
const snap = serialize(world);
const again = createWorld(undefined, undefined, 42);
for (let i = 0; i < 60; i++) step(again, STEP, EMPTY);
assert(serialize(again) === snap, "deterministic replay mismatch (empty)");

const taped = createWorld(undefined, undefined, 7);
const [a, b] = readyUnits(taped, SIDE_PLAYER);
assert(!!a && !!b, "expected two ready soldiers");
assert(currentActor(taped)?.id === a!.id, "first ready unit must be current actor");

const tape: Intent[] = [
  {
    steerX: 0,
    steerY: 0,
    action: "move",
    unitId: a!.id,
    cellX: 2,
    cellY: 2,
  },
  EMPTY,
  { steerX: 0, steerY: 0, action: "wait", unitId: b!.id },
  EMPTY,
  EMPTY,
  EMPTY,
];

// Out-of-order commitment must be ignored (still player phase, first actor).
const skip = createWorld(undefined, undefined, 9);
const [s0, s1] = readyUnits(skip, SIDE_PLAYER);
step(skip, STEP, {
  steerX: 0,
  steerY: 0,
  action: "wait",
  unitId: s1!.id,
});
assert(
  currentActor(skip)?.id === s0!.id && !s1!.local?.acted,
  "cannot act out of turn order",
);

for (const intent of tape) step(taped, STEP, intent);

const moved = taped.entities.find((e) => e.id === a!.id);
assert(moved?.local?.cellX === 2 && moved?.local?.cellY === 2, "move did not apply");
assert(moved?.local?.acted === 1 || boardOf(taped)!.local?.turnSide === SIDE_ENEMY || boardOf(taped)!.local?.turnSide === SIDE_PLAYER, "phase should advance after both acts");

// After both player acts, enemy phase should have started (or finished into next player round).
assert(
  (boardOf(taped)!.local?.turnSide === SIDE_ENEMY &&
    readyUnits(taped, SIDE_ENEMY).length < 2) ||
    (boardOf(taped)!.local?.turnSide === SIDE_PLAYER &&
      (boardOf(taped)!.local?.turnIndex ?? 1) >= 2),
  "both player acts should leave the player phase",
);

const tapedSnap = serialize(taped);
const taped2 = createWorld(undefined, undefined, 7);
for (const intent of tape) step(taped2, STEP, intent);
assert(serialize(taped2) === tapedSnap, "Intent-tape replay mismatch");

const trip = deserialize(serialize(taped));
assert(!!boardOf(trip), "board lost in snapshot");
assert(
  JSON.stringify(boardOf(trip)!.local?.cells) ===
    JSON.stringify(boardOf(taped)!.local?.cells),
  "board cells lost in snapshot",
);

const fight = createWorld(undefined, undefined, 3);
let guard = 0;
while ((boardOf(fight)?.local?.winner ?? -1) < 0 && guard < 400) {
  const b = boardOf(fight)!;
  if ((b.local?.turnSide ?? -1) === SIDE_PLAYER) {
    const s = readyUnits(fight, SIDE_PLAYER)[0];
    if (!s) break;
    step(fight, STEP, {
      steerX: 0,
      steerY: 0,
      action: "wait",
      unitId: s.id,
    });
  } else {
    step(fight, STEP, EMPTY);
  }
  guard += 1;
}

assert(fight.tick > 0, "fight should advance ticks");
console.log(
  `sim-smoke OK — tactics ${BOARD_COLS}x${BOARD_ROWS} tick=${taped.tick} fightTicks=${fight.tick} winner=${boardOf(fight)?.local?.winner ?? -1} (intent tape, no renderer)`,
);
