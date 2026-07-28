import { draw } from "./draw";
import {
  SIDE_PLAYER,
  boardOf,
  canAttack,
  canMove,
  createWorld,
  currentActor,
  deserialize,
  serialize,
  step,
  unitAt,
  type Intent,
  type IntentAction,
} from "./sim";
import { boardOrigin, cellSize, styles } from "./style";

const canvasEl = document.querySelector<HTMLCanvasElement>("#view");
if (!canvasEl) throw new Error("missing #view canvas");
const canvas: HTMLCanvasElement = canvasEl;

const context = canvas.getContext("2d");
if (!context) throw new Error("2d context unavailable");
const ctx: CanvasRenderingContext2D = context;

const hint = document.querySelector<HTMLParagraphElement>("#hint");

const STEP = 1 / 60;
const EMPTY: Intent = { steerX: 0, steerY: 0, action: "none" };

let activeStyles = styles;
let styleIndex = 0;
let viewW = window.innerWidth;
let viewH = window.innerHeight;
let world = createWorld();
let snapshot: string | null = null;
let accumulator = 0;
let seedCounter = world.seed;
let lastFrame = 0;

/** Host-only Intent buffer — one commitment queued for the next step. */
let pending: Intent | null = null;

function activeStyle() {
  return activeStyles[styleIndex % activeStyles.length]!;
}

function syncFocus(): void {
  const actor = currentActor(world);
  if (actor) world.focusId = actor.id;
}

function updateHint(): void {
  if (!hint) return;
  const snap = snapshot ? " · R restore" : "";
  const board = boardOf(world);
  const turn = board?.local?.turnSide ?? 0;
  const winner = board?.local?.winner ?? -1;
  const round = board?.local?.turnIndex ?? 1;
  const actor = currentActor(world);

  let status: string;
  if (winner === SIDE_PLAYER) status = `you win · N new`;
  else if (winner >= 0) status = `enemy wins · N new`;
  else if (turn !== SIDE_PLAYER) status = `round ${round} · enemy order…`;
  else if (!actor) status = `round ${round} · no actor`;
  else
    status = `round ${round} · YOU acts now · blue move · red attack · W wait`;

  hint.textContent = `${status} · Space style: ${activeStyle().name} · P/R · N${snap}`;
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function newWorld(seed: number): void {
  world = createWorld(undefined, undefined, seed);
  pending = null;
  accumulator = 0;
  syncFocus();
  updateHint();
}

function sampleIntent(): Intent {
  if (pending) {
    const next = pending;
    pending = null;
    return next;
  }
  return EMPTY;
}

function cellFromPointer(clientX: number, clientY: number): {
  x: number;
  y: number;
} | null {
  const rect = canvas.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const view = { width: viewW, height: viewH };
  const s = cellSize(world, view);
  const origin = boardOrigin(world, view);
  const x = Math.floor((px - origin.x) / s);
  const y = Math.floor((py - origin.y) / s);
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return null;
  return { x, y };
}

function queueAction(
  action: IntentAction,
  unitId: number,
  cellX = 0,
  cellY = 0,
): void {
  pending = { steerX: 0, steerY: 0, action, unitId, cellX, cellY };
}

resizeCanvas();
syncFocus();
updateHint();

window.addEventListener("resize", () => {
  resizeCanvas();
  updateHint();
});

window.addEventListener("keydown", (ev) => {
  if (ev.code === "Space") {
    ev.preventDefault();
    styleIndex = (styleIndex + 1) % activeStyles.length;
    updateHint();
    return;
  }
  if (ev.code === "KeyP") {
    snapshot = serialize(world);
    updateHint();
    return;
  }
  if (ev.code === "KeyR" && snapshot) {
    world = deserialize(snapshot);
    pending = null;
    syncFocus();
    updateHint();
    return;
  }
  if (ev.code === "KeyN") {
    seedCounter += 1;
    newWorld(seedCounter);
    return;
  }
  if (ev.code === "KeyW") {
    const board = boardOf(world);
    if ((board?.local?.turnSide ?? -1) !== SIDE_PLAYER) return;
    const actor = currentActor(world);
    if (!actor || actor.local?.side !== SIDE_PLAYER) return;
    queueAction("wait", actor.id);
  }
});

canvas.addEventListener("click", (ev) => {
  const board = boardOf(world);
  if ((board?.local?.winner ?? -1) >= 0) return;
  if ((board?.local?.turnSide ?? -1) !== SIDE_PLAYER) return;

  const actor = currentActor(world);
  if (!actor || actor.local?.side !== SIDE_PLAYER) return;
  world.focusId = actor.id;

  const cell = cellFromPointer(ev.clientX, ev.clientY);
  if (!cell) return;

  const occupant = unitAt(world, cell.x, cell.y);
  // Clicking another unit does not change order — only the NOW actor may act.
  if (occupant && occupant.local?.side === SIDE_PLAYER) return;

  if (occupant && canAttack(world, actor, cell.x, cell.y)) {
    queueAction("attack", actor.id, cell.x, cell.y);
    return;
  }
  if (!occupant && canMove(world, actor, cell.x, cell.y)) {
    queueAction("move", actor.id, cell.x, cell.y);
  }
});

function frame(now: number): void {
  const last = lastFrame || now;
  lastFrame = now;
  let dt = (now - last) / 1000;
  if (dt > 0.05) dt = 0.05;
  accumulator += dt;

  while (accumulator >= STEP) {
    step(world, STEP, sampleIntent());
    syncFocus();
    accumulator -= STEP;
  }

  draw(ctx, world, activeStyle(), { width: viewW, height: viewH });
  updateHint();
  requestAnimationFrame(frame);
}

if (import.meta.hot) {
  import.meta.hot.accept("./style", (mod) => {
    if (!mod) return;
    activeStyles = mod.styles;
  });
}

requestAnimationFrame(frame);
