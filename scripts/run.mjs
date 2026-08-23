/**
 * Start Vite, then open EmerisShell or the IDE Simple Browser.
 */
import { execSync, spawn } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openShell } from "./shell.mjs";

const PORT = 5173;
const URL = `http://127.0.0.1:${PORT}/`;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const quiet = process.env.MEADOW_NO_OPEN === "1";
const forceExternal = process.env.MEADOW_OPEN_EXTERNAL === "1";

function wantShell() {
  if (quiet) return false;
  if (forceExternal) return true;
  return !(
    process.env.VSCODE_PID ||
    process.env.TERM_PROGRAM === "vscode" ||
    process.env.CURSOR_TRACE_ID ||
    process.env.CURSOR_AGENT
  );
}

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

function openWindow() {
  if (!wantShell()) return;
  openShell({
    url: URL,
    title: "Emeris",
    profile: "meadow",
  });
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
if (wantShell()) {
  console.log(`\nclose the app window to shut everything down.`);
} else {
  console.log(`\nIDE mode — stop the debug session to shut down.`);
}
