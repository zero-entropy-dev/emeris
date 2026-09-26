import { Audio } from "./audio";
import { draw } from "./draw";
import { createFpsMeter, paintFps, sampleFps, toggleFps } from "./fps";
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
/** The meadow asks nothing of its observer — the crossing stays empty. */
const EMPTY_INTENT: Intent = {};
const audio = new Audio();

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
  hint.textContent = `meadow · Observing · Space style: ${activeStyle().name} · P snapshot${snap} · N new`;
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
  audio.reset();
  updateHint();
}

resizeCanvas();

// The world outlives the window. Resizing only re-fits the observer.
window.addEventListener("resize", resizeCanvas);
updateHint();

window.addEventListener("keydown", (e) => {
  audio.unlock();
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
    audio.reset();
    updateHint();
  } else if (e.code === "KeyN") {
    e.preventDefault();
    seedCounter += 1;
    newWorld(seedCounter);
  } else if (e.code === "F3") {
    e.preventDefault();
    toggleFps(fps);
  }
});

let last = performance.now();
const fps = createFpsMeter();

function frame(now: number): void {
  const frameDt = Math.min(0.05, (now - last) / 1000);
  last = now;

  accumulator += frameDt;
  while (accumulator >= STEP) {
    step(world, STEP, EMPTY_INTENT);
    accumulator -= STEP;
  }

  draw(ctx, world, activeStyle(), { width: viewW, height: viewH });
  audio.hear(world, activeStyle(), frameDt);
  sampleFps(fps, now);
  paintFps(ctx, fps, viewW);
  requestAnimationFrame(frame);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) audio.suspend();
  else audio.resume();
});

requestAnimationFrame(frame);

if (import.meta.hot) {
  import.meta.hot.accept("./style", (mod) => {
    if (!mod) return;
    activeStyles = mod.styles;
    if (styleIndex >= activeStyles.length) styleIndex = 0;
    updateHint();
  });
}
