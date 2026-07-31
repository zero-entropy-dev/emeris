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
/** Host submits empty intent — player agency deferred. */
const EMPTY_INTENT: Intent = { steerX: 0, steerY: 0 };

let activeStyles = styles;
let styleIndex = 0;
let viewW = window.innerWidth;
let viewH = window.innerHeight;
let world = createWorld(viewW, viewH);
let snapshot: string | null = null;
let accumulator = 0;
let seedCounter = world.seed;

function activeStyle() {
  return activeStyles[styleIndex % activeStyles.length]!;
}

function updateHint(): void {
  if (!hint) return;
  const snap = snapshot ? " · R restore" : "";
  hint.textContent = `blank · Observing · Space style: ${activeStyle().name} · P snapshot${snap} · N new`;
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** New world matching the current window (single screen). */
function newWorld(seed: number): void {
  world = createWorld(viewW, viewH, seed);
  accumulator = 0;
  updateHint();
}

resizeCanvas();
if (world.width !== viewW || world.height !== viewH) {
  newWorld(seedCounter);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  newWorld(world.seed);
});
updateHint();

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    styleIndex = (styleIndex + 1) % activeStyles.length;
    updateHint();
  } else if (e.code === "KeyP") {
    e.preventDefault();
    snapshot = serialize(world);
    updateHint();
  } else if (e.code === "KeyR") {
    e.preventDefault();
    if (!snapshot) return;
    world = deserialize(snapshot);
    accumulator = 0;
    updateHint();
  } else if (e.code === "KeyN") {
    e.preventDefault();
    seedCounter += 1;
    newWorld(seedCounter);
  }
});

let last = performance.now();

function frame(now: number): void {
  const frameDt = Math.min(0.05, (now - last) / 1000);
  last = now;

  accumulator += frameDt;
  while (accumulator >= STEP) {
    step(world, STEP, EMPTY_INTENT);
    accumulator -= STEP;
  }

  draw(ctx, world, activeStyle(), { width: viewW, height: viewH });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

if (import.meta.hot) {
  import.meta.hot.accept("./style", (mod) => {
    if (mod?.styles) activeStyles = mod.styles;
  });
}
