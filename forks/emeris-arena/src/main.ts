import { draw } from "./draw";
import { observeFx, resetFx } from "./fx";
import {
  createFpsMeter,
  hostPerfLabel,
  paintFps,
  sampleFps,
  toggleFps,
} from "../../../src/fps";
import { createPerfMeter, paintPerf, samplePerf } from "./perf";
import { RENDER_SCALE, styles } from "./style";
import {
  createWorld,
  deserialize,
  serialize,
  step,
  type Entity,
  type Intent,
  type World,
} from "./sim";

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
const fps = createFpsMeter(false);
const meter = createPerfMeter(RENDER_SCALE);

const keys = new Set<string>();
let lookAccum = 0;
let fireHeld = false;
/** Fire only while pointer-locked; lock-acquiring click must not shoot. */
let fireQueued = false;
let ignoreFireUntilUnlock = false;

type Pose = { x: number; y: number; facing: number };
const prevPoses = new Map<number, Pose>();

function locked(): boolean {
  return document.pointerLockElement === canvas;
}

function activeStyle() {
  return activeStyles[styleIndex % activeStyles.length]!;
}

function updateHint(): void {
  if (!hint) return;
  const snap = snapshot ? " · R restore" : "";
  const lock = locked() ? "Esc unlock" : "click canvas to lock mouse";
  hint.textContent = `arena · WASD · mouse look · LMB fire · Enter restart · Space style: ${activeStyle().name} · P/R · N · F2 screenshot · F3 meter · ${lock}${snap}`;
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resetView(): void {
  accumulator = 0;
  prevPoses.clear();
  lookAccum = 0;
  resetFx(world);
}

function newWorld(seed: number): void {
  world = createWorld(undefined, undefined, seed);
  resetView();
  updateHint();
}

function capturePoses(current: World): void {
  prevPoses.clear();
  for (const e of current.entities) {
    prevPoses.set(e.id, { x: e.x, y: e.y, facing: e.facing });
  }
}

function lerpAngle(from: number, to: number, t: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}

/** Throwaway world for drawing. Does not replace the stepped world. */
function viewWorld(alpha: number): World {
  const focus = world.focusId;
  const entities = world.entities.map((e): Entity => {
    const prev = prevPoses.get(e.id);
    let facing = prev ? lerpAngle(prev.facing, e.facing, alpha) : e.facing;
    const alive = (e.local?.health ?? 1) > 0;
    if (e.id === focus && e.identity === "player" && alive && locked()) {
      facing = e.facing + lookAccum;
    }
    if (!prev) return { ...e, facing };
    return {
      ...e,
      x: prev.x + (e.x - prev.x) * alpha,
      y: prev.y + (e.y - prev.y) * alpha,
      facing,
    };
  });
  return { ...world, entities };
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
  if (e.code === "Enter") {
    e.preventDefault();
    newWorld(world.seed);
    return;
  }
  if (e.code === "F3") {
    e.preventDefault();
    toggleFps(fps);
    return;
  }
  if (e.code === "F2") {
    e.preventDefault();
    saveScreenshot();
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
    resetView();
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
  // Windows only reports Print Screen on key up. Free the mouse so the
  // screen-capture overlay can be used instead of fighting pointer lock.
  if (e.code === "PrintScreen" && locked()) document.exitPointerLock();
});

/** Save the current frame as a PNG and copy it to the clipboard. */
function saveScreenshot(): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arena-seed${world.seed}-tick${world.tick}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    navigator.clipboard
      ?.write?.([new ClipboardItem({ "image/png": blob })])
      .catch(() => {});
  }, "image/png");
}

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
  const stepStart = performance.now();
  while (accumulator >= STEP) {
    capturePoses(world);
    step(world, STEP, sampleIntent());
    accumulator -= STEP;
  }
  const stepMs = performance.now() - stepStart;
  observeFx(world, frameDt);

  const alpha = Math.min(1, accumulator / STEP);
  const drawStart = performance.now();
  draw(ctx, viewWorld(alpha), activeStyle(), { width: viewW, height: viewH });
  const drawMs = performance.now() - drawStart;

  sampleFps(fps, now);
  samplePerf(meter, now, stepMs, drawMs);
  paintFps(ctx, fps, viewW);
  if (fps.shown) {
    const coreLines = hostPerfLabel(fps) ? 2 : 1;
    paintPerf(ctx, meter, viewW, 18 + coreLines * 16 + 4);
  }
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
