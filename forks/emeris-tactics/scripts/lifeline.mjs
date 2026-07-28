/**
 * Dev-only lifeline (browser host). Disposable with scripts/run.mjs + launch.json.
 */
import { cwd } from "node:process";

const BYE_GRACE_MS = 900;
const SILENT_GRACE_MS = 2500;
const CLIENT_TIMEOUT_MS = 2500;
const STARTUP_GRACE_MS = 30000;
const SWEEP_MS = 150;

const CLIENT = `(() => {
  const id = Math.random().toString(36).slice(2);
  const hit = (p) => {
    const u = '/__lifeline/' + p + '?id=' + id;
    if (p === 'bye' && navigator.sendBeacon) navigator.sendBeacon(u);
    else fetch(u, { cache: 'no-store' }).catch(() => {});
  };
  hit('ping');
  const t = setInterval(() => hit('ping'), 1000);
  addEventListener('pagehide', () => { clearInterval(t); hit('bye'); });
})();`;

export function lifeline() {
  const clients = new Map();
  const startedAt = Date.now();
  let sawClient = false;
  let emptySince = 0;
  let saidBye = false;
  let server;
  let timer;

  function shutdown(reason) {
    clearInterval(timer);
    console.log(`\nlifeline: ${reason} — closing dev server.`);
    const done = () => process.exit(0);
    try {
      const closing = server?.close?.();
      if (closing?.then) {
        closing.then(done, done);
        setTimeout(done, 1500);
      } else done();
    } catch {
      done();
    }
  }

  function sweep() {
    const now = Date.now();
    for (const [id, seen] of clients) {
      if (now - seen > CLIENT_TIMEOUT_MS) clients.delete(id);
    }

    if (clients.size > 0) {
      emptySince = 0;
      saidBye = false;
      return;
    }

    if (!sawClient) {
      if (now - startedAt > STARTUP_GRACE_MS) shutdown("no page ever connected");
      return;
    }

    if (!emptySince) {
      emptySince = now;
      return;
    }

    const grace = saidBye ? BYE_GRACE_MS : SILENT_GRACE_MS;
    if (now - emptySince > grace) shutdown("window closed");
  }

  return {
    name: "tactics-lifeline",
    apply: "serve",

    configureServer(s) {
      server = s;
      s.middlewares.use("/__lifeline", (req, res) => {
        const [path, query = ""] = (req.url ?? "/").split("?");
        const id = new URLSearchParams(query).get("id") ?? "anon";

        if (path === "/id") {
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ tactics: true, meadow: true, root: cwd() }));
          return;
        }

        if (path === "/bye") {
          clients.delete(id);
          if (clients.size === 0) saidBye = true;
        } else {
          clients.set(id, Date.now());
          sawClient = true;
        }

        res.statusCode = 204;
        res.setHeader("cache-control", "no-store");
        res.end();
      });

      timer = setInterval(sweep, SWEEP_MS);
    },

    transformIndexHtml() {
      return [{ tag: "script", children: CLIENT, injectTo: "body" }];
    },
  };
}
