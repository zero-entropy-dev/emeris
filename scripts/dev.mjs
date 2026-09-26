/**
 * Dev launch shared by the meadow and sibling games: start Vite, then open
 * EmerisShell (or the browser fallback). Dev only — a release build bundles the
 * game and never touches this file.
 */
import { execSync } from "node:child_process";
import { createConnection } from "node:net";
import { openShell } from "./shell.mjs";

function inIde() {
  return !!(
    process.env.VSCODE_PID ||
    process.env.TERM_PROGRAM === "vscode" ||
    process.env.CURSOR_TRACE_ID ||
    process.env.CURSOR_AGENT
  );
}

/**
 * `<KEY>_OPEN_EXTERNAL=1` forces the product window (Cursor Run buttons set it);
 * `<KEY>_NO_OPEN=1` suppresses it. MEADOW_* still work for every product.
 */
function wantWindow(key) {
  const K = key.toUpperCase();
  const env = process.env;
  if (env[`${K}_OPEN_EXTERNAL`] === "1" || env.MEADOW_OPEN_EXTERNAL === "1") return true;
  if (env[`${K}_NO_OPEN`] === "1" || env.MEADOW_NO_OPEN === "1") return false;
  return !inIde();
}

function reachable(port, timeoutMs = 120) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port }, () => {
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
async function ours(url, key, root) {
  try {
    const res = await fetch(`${url}__lifeline/id`, { signal: AbortSignal.timeout(400) });
    const info = res.ok ? await res.json() : null;
    return info?.[key] === true && info?.root === root;
  } catch {
    return false;
  }
}

/** Only used when something foreign squats the port — never on the fast path. */
function freePort(port) {
  try {
    const out = execSync("netstat -ano", { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING") || !line.includes(`:${port}`)) continue;
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

/**
 * @param {{ root: string, port: number, key: string, title: string, profile?: string, icon?: string }} opts
 * `key` must match the key passed to `lifeline()` in the project's vite.config.
 */
export async function runDev(opts) {
  const { root, port, key, title, profile = key, icon } = opts;
  const url = `http://127.0.0.1:${port}/`;
  const windowed = wantWindow(key);
  const open = () => {
    if (windowed) openShell({ url, title, profile, icon });
  };

  if ((await reachable(port)) && (await ours(url, key, root))) {
    open();
    process.exit(0);
  }

  const serve = async () => {
    const { createServer } = await import("vite");
    const server = await createServer({ root });
    await server.listen();
    return server;
  };

  let server;
  try {
    server = await serve();
  } catch {
    freePort(port);
    server = await serve();
  }

  open();
  server.printUrls();
  if (windowed) {
    console.log(`\nclose the ${title} window to shut everything down.`);
  } else {
    console.log(
      `\nIDE mode — server ready at ${url}` +
        `\nUse Run ${title} for EmerisShell, or open the Local URL.` +
        `\nStop the debug session to shut down.`,
    );
  }
}
