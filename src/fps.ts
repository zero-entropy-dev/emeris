/**
 * Host-only frame meter. Reads the requestAnimationFrame clock, plus the
 * Emeris shell's process-tree sample when running inside EmerisShell.
 * Never writes World. Sibling games import this file by relative path.
 */

/** CPU share of all cores and working set for this window's process tree. */
export type HostPerf = {
  cpuPct: number;
  ramMb: number;
  procs: number;
  cores: number;
  /** performance.now() when the sample arrived. */
  at: number;
};

export type FpsMeter = {
  shown: boolean;
  fps: number;
  frames: number;
  windowStart: number;
  host: HostPerf | null;
};

/** Samples older than this are dropped — the shell posts every 250 ms. */
const HOST_STALE_MS = 1500;

type WebViewBridge = {
  addEventListener: (type: string, fn: (e: { data: unknown }) => void) => void;
};

function listenHostPerf(meter: FpsMeter): void {
  if (typeof window === "undefined") return;
  const wv = (window as unknown as { chrome?: { webview?: WebViewBridge } }).chrome
    ?.webview;
  if (!wv) return;
  wv.addEventListener("message", (e) => {
    let d: unknown = e.data;
    if (typeof d === "string") {
      try {
        d = JSON.parse(d) as unknown;
      } catch {
        return;
      }
    }
    if (!d || typeof d !== "object") return;
    const rec = d as Record<string, unknown>;
    if (rec.type !== "emeris-host-perf") return;
    const cpuPct = Number(rec.cpuPct);
    const ramMb = Number(rec.ramMb);
    if (!Number.isFinite(cpuPct) || !Number.isFinite(ramMb)) return;
    const procs = Number(rec.procs);
    const cores = Number(rec.cores);
    meter.host = {
      cpuPct,
      ramMb,
      procs: Number.isFinite(procs) ? procs : 0,
      cores: Number.isFinite(cores) ? cores : 0,
      at: performance.now(),
    };
  });
}

export function createFpsMeter(shown = true): FpsMeter {
  const meter: FpsMeter = { shown, fps: 0, frames: 0, windowStart: 0, host: null };
  listenHostPerf(meter);
  return meter;
}

/** Latest shell sample, or null in a plain browser tab or when stale. */
export function hostPerf(meter: FpsMeter, now = performance.now()): HostPerf | null {
  const h = meter.host;
  if (!h || now - h.at > HOST_STALE_MS) return null;
  return h;
}

/** "CPU 12% · 410 MB", or null outside the shell. */
export function hostPerfLabel(meter: FpsMeter, now = performance.now()): string | null {
  const h = hostPerf(meter, now);
  if (!h) return null;
  return `CPU ${Math.round(h.cpuPct)}% · ${Math.round(h.ramMb)} MB`;
}

export function sampleFps(meter: FpsMeter, now: number): void {
  if (meter.windowStart === 0) {
    meter.windowStart = now;
    return;
  }
  meter.frames += 1;
  const elapsed = now - meter.windowStart;
  if (elapsed >= 400) {
    meter.fps = (meter.frames * 1000) / elapsed;
    meter.frames = 0;
    meter.windowStart = now;
  }
}

export function toggleFps(meter: FpsMeter): void {
  meter.shown = !meter.shown;
}

export function paintFps(
  ctx: CanvasRenderingContext2D,
  meter: FpsMeter,
  viewW: number,
): void {
  if (!meter.shown) return;
  const lines = [meter.fps > 0 ? `${Math.round(meter.fps)} fps` : "— fps"];
  const host = hostPerfLabel(meter);
  if (host) lines.push(host);
  ctx.save();
  ctx.font = "12px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14;
  ctx.fillStyle = "rgba(6, 10, 9, 0.55)";
  ctx.fillRect(viewW - w - 12, 12, w, 6 + lines.length * 16);
  ctx.fillStyle = "rgba(200, 220, 208, 0.78)";
  lines.forEach((l, i) => ctx.fillText(l, viewW - 19, 16 + i * 16));
  ctx.restore();
}
