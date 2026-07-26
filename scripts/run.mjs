/**
 * One button: start the meadow, open a chromeless window, leave nothing behind.
 * Single process — Vite runs in here, so there is nothing to spawn or reap.
 *
 * Browser-host launch layer — disposable. If the host stops being a browser,
 * delete this, scripts/lifeline.mjs, and .vscode/launch.json.
 */
import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 5173;
const URL = `http://127.0.0.1:${PORT}/`;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const quiet = process.env.MEADOW_NO_OPEN === "1";

const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function reachable(timeoutMs = 120) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port: PORT }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/** True only when the listener on this port is this project's dev server. */
async function ours() {
  try {
    const res = await fetch(`${URL}__lifeline/id`, {
      signal: AbortSignal.timeout(400),
    });
    const info = res.ok ? await res.json() : null;
    return info?.meadow === true && info?.root === root;
  } catch {
    return false;
  }
}

/** Chromeless app window: feels like an app, and closing it ends the session. */
function openWindow() {
  if (quiet) return;
  const browser = BROWSERS.find((p) => existsSync(p));
  const child = browser
    ? spawn(browser, [`--app=${URL}`, "--window-size=1280,800"], {
        detached: true,
        stdio: "ignore",
      })
    : spawn("cmd", ["/c", "start", "", URL], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
  child.unref();
}

/** Only used when something foreign squats the port — never on the fast path. */
function freePort() {
  try {
    const out = execSync("netstat -ano", { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING") || !line.includes(`:${PORT}`)) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (/^\d+$/.test(pid ?? "") && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* nothing listening */
  }
}

if ((await reachable()) && (await ours())) {
  openWindow();
  process.exit(0);
}

async function serve() {
  // Imported here so the warm path never pays Vite's module load.
  const { createServer } = await import("vite");
  const server = await createServer({ root });
  await server.listen();
  return server;
}

let server;
try {
  server = await serve();
} catch {
  freePort();
  server = await serve();
}

openWindow();
server.printUrls();
console.log(`\nclose the window to shut everything down.`);
