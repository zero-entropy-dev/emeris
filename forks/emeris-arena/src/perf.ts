/**
 * Arena line under the core F3 meter: step and draw cost plus render scale.
 * Host-only. Never writes World.
 */

export type PerfMeter = {
  stepMs: number;
  drawMs: number;
  scale: number;
  frames: number;
  windowStart: number;
  stepAccum: number;
  drawAccum: number;
};

export function createPerfMeter(scale: number): PerfMeter {
  return {
    stepMs: 0,
    drawMs: 0,
    scale,
    frames: 0,
    windowStart: 0,
    stepAccum: 0,
    drawAccum: 0,
  };
}

export function samplePerf(
  meter: PerfMeter,
  now: number,
  stepMs: number,
  drawMs: number,
): void {
  if (meter.windowStart === 0) {
    meter.windowStart = now;
    return;
  }
  meter.frames += 1;
  meter.stepAccum += stepMs;
  meter.drawAccum += drawMs;
  if (now - meter.windowStart >= 400) {
    meter.stepMs = meter.stepAccum / meter.frames;
    meter.drawMs = meter.drawAccum / meter.frames;
    meter.frames = 0;
    meter.stepAccum = 0;
    meter.drawAccum = 0;
    meter.windowStart = now;
  }
}

/** Painted just below the core meter box, right-aligned to match it. */
export function paintPerf(
  ctx: CanvasRenderingContext2D,
  meter: PerfMeter,
  viewW: number,
  top: number,
): void {
  const label = `step ${meter.stepMs.toFixed(2)} ms · draw ${meter.drawMs.toFixed(2)} ms · ${Math.round(meter.scale * 100)}%`;
  ctx.save();
  ctx.font = "12px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  const w = ctx.measureText(label).width + 14;
  ctx.fillStyle = "rgba(6, 10, 9, 0.55)";
  ctx.fillRect(viewW - w - 12, top, w, 22);
  ctx.fillStyle = "rgba(200, 220, 208, 0.78)";
  ctx.fillText(label, viewW - 19, top + 4);
  ctx.restore();
}
