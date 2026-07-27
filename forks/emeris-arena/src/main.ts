import { draw } from "./draw";
import {
  createWorld,
  deserialize,
  serialize,
  step,
  type Intent,
} from "./sim";
import { styles } from "./style";

const canvasEl = document.querySelector<HTMLCanvasElement>("#view");
if (!canvasEl) throw new Error("missing #view canvas");
const canvas: HTMLCanvasElement = canvasEl;

const context = canvas.getContext("2d");
if (!context) throw new Error("2d context unavailable");
const ctx: CanvasRenderingContext2D = context;

const hint = document.querySelector<HTMLParagraphElement>("#hint");

const STEP = 1 / 60;
/** Radians per mouse pixel — tuned for pointer-lock feel. */
const LOOK_SENS = 0.0032;

let activeStyles = styles;
let styleIndex = 0;
let viewW = window.innerWidth;
let viewH = window.innerHeight;
let world = createWorld();
let snapshot: string | null = null;
let accumulator = 0;
let seedCounter = world.seed;

const keys = new Set<string>();
let lookAccum = 0;
let fireHeld = false;
/** Fire only while pointer-locked; lock-acquiring click must not shoot. */
let fireQueued = false;
let ignoreFireUntilUnlock = false;

function locked(): boolean {
  return document.pointerLockElement === canvas;
}

function activeStyle() {
  return activeStyles[styleIndex % activeStyles.length]!;
}

function updateHint(): void {
  if (!hint) return;
  const snap = snapshot ? " · R restore" : "";
  const lock = locked()
    ? "Esc unlock"
    : "click canvas to lock mouse";
  hint.textContent = `arena · WASD · mouse look · LMB fire · Space style: ${activeStyle().name} · P/R · N · ${lock}${snap}`;
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
  accumulator = 0;
  updateHint();
}

function sampleIntent(): Intent {
  let steerX = 0;
  let steerY = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) steerY += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) steerY -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) steerX += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) steerX -= 1;
  const len = Math.hypot(steerX, steerY);
  if (len > 1) {
    steerX /= len;
    steerY /= len;
  }

  const lookYaw = lookAccum;
  lookAccum = 0;

  const fire = locked() && (fireQueued || fireHeld);
  fireQueued = false;

  return { steerX, steerY, lookYaw, fire };
}

resizeCanvas();
updateHint();

window.addEventListener("resize", () => {
  resizeCanvas();
  updateHint();
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    if (locked()) document.exitPointerLock();
    return;
  }
  if (e.code === "Space") {
    e.preventDefault();
    styleIndex = (styleIndex + 1) % activeStyles.length;
    updateHint();
    return;
  }
  if (e.code === "KeyP") {
    e.preventDefault();
    snapshot = serialize(world);
    updateHint();
    return;
  }
  if (e.code === "KeyR") {
    e.preventDefault();
    if (!snapshot) return;
    world = deserialize(snapshot);
    accumulator = 0;
    updateHint();
    return;
  }
  if (e.code === "KeyN") {
    e.preventDefault();
    seedCounter += 1;
    newWorld(seedCounter);
    return;
  }
  if (
    e.code === "KeyW" ||
    e.code === "KeyA" ||
    e.code === "KeyS" ||
    e.code === "KeyD" ||
    e.code.startsWith("Arrow")
  ) {
    e.preventDefault();
  }
  keys.add(e.code);
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

canvas.addEventListener("click", () => {
  if (!locked()) {
    ignoreFireUntilUnlock = true;
    fireHeld = false;
    fireQueued = false;
    canvas.requestPointerLock();
    return;
  }
  if (!ignoreFireUntilUnlock) fireQueued = true;
});

document.addEventListener("pointerlockchange", () => {
  if (!locked()) {
    fireHeld = false;
    fireQueued = false;
    ignoreFireUntilUnlock = false;
  } else {
    // Next mousedown after lock is real fire; clear the acquire guard shortly.
    ignoreFireUntilUnlock = false;
  }
  updateHint();
});

document.addEventListener("mousemove", (e) => {
  if (!locked()) return;
  lookAccum += e.movementX * LOOK_SENS;
});

document.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (!locked() || ignoreFireUntilUnlock) return;
  fireHeld = true;
  fireQueued = true;
});

document.addEventListener("mouseup", (e) => {
  if (e.button === 0) fireHeld = false;
});

window.addEventListener("blur", () => {
  keys.clear();
  fireHeld = false;
  fireQueued = false;
});

let last = performance.now();

function frame(now: number): void {
  const frameDt = Math.min(0.05, (now - last) / 1000);
  last = now;

  accumulator += frameDt;
  while (accumulator >= STEP) {
    step(world, STEP, sampleIntent());
    accumulator -= STEP;
  }

  draw(ctx, world, activeStyle(), { width: viewW, height: viewH });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

if (import.meta.hot) {
  import.meta.hot.accept("./style", (mod) => {
    if (!mod) return;
    activeStyles = mod.styles;
    if (styleIndex >= activeStyles.length) styleIndex = 0;
    updateHint();
  });
}
