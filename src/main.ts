import { draw } from "./draw";
import { bindInput, readSteer } from "./input";
import {
  MEADOW_HEIGHT,
  MEADOW_WIDTH,
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

let activeStyles = styles;
let styleIndex = 0;
/** Fixed meadow — viewport is observer-only. */
let world = createWorld();
let snapshot: string | null = null;
let accumulator = 0;
let seedCounter = world.seed;
/** One-shot: consumed on the next sim step. */
let pendingCycleControl = false;
let viewW = window.innerWidth;
let viewH = window.innerHeight;

function activeStyle() {
  return activeStyles[styleIndex % activeStyles.length]!;
}

function updateHint(): void {
  if (!hint) return;
  if (world.phase === "won") {
    hint.textContent = `Reached · N new · Space style: ${activeStyle().name}`;
    return;
  }
  const snap = snapshot ? " · R restore" : "";
  hint.textContent = `WASD move · Tab swap · bloom · gather · regrow · wake beacon · Space style: ${activeStyle().name} · P snapshot${snap}`;
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

bindInput();
window.addEventListener("resize", resize);
resize();
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
    pendingCycleControl = false;
    updateHint();
  } else if (e.code === "KeyN") {
    e.preventDefault();
    seedCounter += 1;
    world = createWorld(MEADOW_WIDTH, MEADOW_HEIGHT, seedCounter);
    accumulator = 0;
    pendingCycleControl = false;
    updateHint();
  } else if (e.code === "Tab") {
    e.preventDefault();
    pendingCycleControl = true;
  }
});

let last = performance.now();
let lastPhase = world.phase;

function frame(now: number): void {
  const frameDt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const steer = readSteer();

  accumulator += frameDt;
  while (accumulator >= STEP) {
    const intent: Intent = {
      steerX: steer.x,
      steerY: steer.y,
      cycleControl: pendingCycleControl,
    };
    pendingCycleControl = false;
    step(world, STEP, intent);
    accumulator -= STEP;
  }

  if (world.phase !== lastPhase) {
    lastPhase = world.phase;
    updateHint();
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
