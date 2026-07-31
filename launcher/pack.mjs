/**
 * Authoritative launcher pack — living tree + blank overlay → embedded zips.
 * Fails (non-zero) if inputs or archive manifests are incomplete.
 *
 * Usage: node launcher/pack.mjs
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const blankOverlay = join(root, "templates", "blank");
const meadowOverlay = join(root, "templates", "meadow");
const outDir = join(__dirname, "embedded");
const staging = join(__dirname, ".pack-staging");

/** Paths that must exist in the living tree before packing. */
const LIVING_REQUIRED = [
  "src/sim/index.ts",
  "src/sim/world.ts",
  "src/sim/identity.ts",
  "src/sim/registry.ts",
  "src/sim/step.ts",
  "src/sim/rng.ts",
  "src/main.ts",
  "src/style.ts",
  "src/draw.ts",
  "scripts/run.mjs",
  "scripts/lifeline.mjs",
  "scripts/sim-smoke.ts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  "ENGINE.md",
  "README.md",
  ".vscode/launch.json",
  ".gitignore",
];

/** Blank overlay paths that must exist. */
const BLANK_REQUIRED = [
  "ENGINE.md",
  "README.md",
  "package.json",
  "index.html",
  ".vscode/launch.json",
  "src/sim/identity.ts",
  "src/sim/world.ts",
  "src/sim/registry.ts",
  "src/sim/index.ts",
  "src/style.ts",
  "src/main.ts",
  "scripts/sim-smoke.ts",
];

/** Meadow overlay (starter-facing docs only). */
const MEADOW_OVERLAY_REQUIRED = ["README.md"];

/** Every packed archive must contain these (zip entry paths, forward slashes). */
const ARCHIVE_MANIFEST = [
  "package.json",
  "package-lock.json",
  "ENGINE.md",
  "README.md",
  "index.html",
  "tsconfig.json",
  "vite.config.ts",
  "src/main.ts",
  "src/style.ts",
  "src/draw.ts",
  "src/sim/index.ts",
  "src/sim/world.ts",
  "src/sim/identity.ts",
  "src/sim/registry.ts",
  "src/sim/step.ts",
  "src/sim/rng.ts",
  "scripts/run.mjs",
  "scripts/lifeline.mjs",
  "scripts/sim-smoke.ts",
  ".vscode/launch.json",
  ".gitignore",
];

/** Must not ship to generated projects (engine-dev only). */
const PACK_STRIP = ["AGENTS.md", "HISTORY.md"];

const EXCLUDE_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  ".git",
  ".cursor",
  "forks",
  "launcher",
  "templates",
]);

function fail(msg) {
  console.error(`pack FAIL: ${msg}`);
  process.exit(1);
}

function assertExists(abs, label) {
  if (!existsSync(abs)) fail(`missing required ${label}: ${abs}`);
}

function validateInputs() {
  for (const rel of LIVING_REQUIRED) {
    assertExists(join(root, rel), `living ${rel}`);
  }
  assertExists(blankOverlay, "templates/blank");
  for (const rel of BLANK_REQUIRED) {
    assertExists(join(blankOverlay, rel), `blank overlay ${rel}`);
  }
  assertExists(meadowOverlay, "templates/meadow");
  for (const rel of MEADOW_OVERLAY_REQUIRED) {
    assertExists(join(meadowOverlay, rel), `meadow overlay ${rel}`);
  }
}

function stripEngineDevDocs(destRoot) {
  for (const name of PACK_STRIP) {
    const p = join(destRoot, name);
    if (existsSync(p)) rmSync(p);
  }
}

function shouldSkip(relPosix) {
  const parts = relPosix.split("/");
  if (parts.some((p) => EXCLUDE_DIR_NAMES.has(p))) return true;
  if (relPosix.endsWith(".zip")) return true;
  if (relPosix.endsWith(".local")) return true;
  if (parts.includes(".pack-staging")) return true;
  return false;
}

/** Collect relative posix paths under `dir` (files only). */
function walkFiles(dir, base = dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const rel = relative(base, abs).split(sep).join("/");
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(name)) continue;
      walkFiles(abs, base, out);
    } else if (st.isFile()) {
      if (!shouldSkip(rel)) out.push(rel);
    }
  }
  return out;
}

function copyFile(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, readFileSync(src));
}

function copyTreeFiltered(fromRoot, toRoot) {
  const files = walkFiles(fromRoot);
  for (const rel of files) {
    // Only take living-root files we care about — walk already excludes dirs
    copyFile(join(fromRoot, rel), join(toRoot, rel));
  }
  return files.length;
}

function applyOverlay(overlayRoot, destRoot) {
  const files = walkFiles(overlayRoot);
  for (const rel of files) {
    copyFile(join(overlayRoot, rel), join(destRoot, rel));
  }
  return files.length;
}

/** Meadow launch.json: meadow-only (drop arena/tactics). */
function writeMeadowLaunch(destRoot) {
  const launch = {
    version: "0.2.0",
    configurations: [
      {
        name: "Run meadow",
        type: "node",
        request: "launch",
        program: "${workspaceFolder}/scripts/run.mjs",
        cwd: "${workspaceFolder}",
        noDebug: true,
        console: "integratedTerminal",
        env: {
          NODE_OPTIONS: null,
          VSCODE_INSPECTOR_OPTIONS: null,
        },
      },
    ],
  };
  mkdirSync(join(destRoot, ".vscode"), { recursive: true });
  writeFileSync(
    join(destRoot, ".vscode", "launch.json"),
    JSON.stringify(launch, null, 2) + "\n",
  );
}

/** Inject placeholder tokens into meadow known paths for post-extract replace. */
function injectMeadowPlaceholders(destRoot) {
  const pkgPath = join(destRoot, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = "{{PACKAGE_NAME}}";
  pkg.description =
    "{{PROJECT_TITLE}} - Emeris demo meadow (TypeScript + canvas, world sovereign).";
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  let html = readFileSync(join(destRoot, "index.html"), "utf8");
  html = html.replace(/<title>[^<]*<\/title>/, "<title>{{PROJECT_TITLE}}</title>");
  writeFileSync(join(destRoot, "index.html"), html);
}

async function zipDirectory(srcDir, zipPath) {
  // Prefer system zip via archiver if available as dependency; else use pure JS.
  // No archiver in package.json — use Node zlib + manual zip (store/deflate) via `fflate`?
  // Keep zero new deps: use PowerShell Compress-Archive on Windows, or `zip` CLI.
  const entries = walkFiles(srcDir);
  if (entries.length === 0) fail(`nothing to zip under ${srcDir}`);

  // Try `npx` free approach: write a minimal ZIP with zlib deflate (stored locally).
  await writeZip(srcDir, entries, zipPath);
  return entries.length;
}

/** Minimal ZIP writer (stored + deflated) — no extra dependencies. */
async function writeZip(srcDir, entries, zipPath) {
  const { deflateRawSync } = await import("node:zlib");
  const files = [];
  for (const rel of entries) {
    const data = readFileSync(join(srcDir, rel));
    const name = rel.split(sep).join("/");
    const compressed = deflateRawSync(data);
    const useStore = compressed.length >= data.length;
    files.push({
      name,
      data,
      compressed: useStore ? data : compressed,
      method: useStore ? 0 : 8,
    });
  }

  const parts = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const crc = crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(f.method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(f.compressed.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, nameBuf, f.compressed);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(f.method, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(f.compressed.length, 20);
    cen.writeUInt32LE(f.data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);

    offset += local.length + nameBuf.length + f.compressed.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  writeFileSync(zipPath, Buffer.concat([...parts, centralBuf, end]));
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function listZipNames(zipPath) {
  const buf = readFileSync(zipPath);
  const names = new Set();
  let i = 0;
  while (i + 30 <= buf.length) {
    const sig = buf.readUInt32LE(i);
    if (sig !== 0x04034b50) break;
    const method = buf.readUInt16LE(i + 8);
    const comp = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString("utf8");
    names.add(name);
    i += 30 + nameLen + extraLen + comp;
    void method;
  }
  return names;
}

function validateArchive(zipPath, label) {
  assertExists(zipPath, label);
  const st = statSync(zipPath);
  if (st.size < 64) fail(`${label} is empty or too small (${st.size} bytes)`);
  const names = listZipNames(zipPath);
  if (names.size === 0) fail(`${label} has no local file headers`);
  const missing = ARCHIVE_MANIFEST.filter((m) => !names.has(m));
  if (missing.length) {
    fail(`${label} incomplete — missing: ${missing.join(", ")}`);
  }
  const leaked = PACK_STRIP.filter((m) => names.has(m));
  if (leaked.length) {
    fail(`${label} must not include engine-dev docs: ${leaked.join(", ")}`);
  }
  console.log(`pack OK — ${label}: ${names.size} entries, ${st.size} bytes`);
}

async function packOne(kind) {
  const dest = join(staging, kind);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });

  const n = copyTreeFiltered(root, dest);
  if (n < 10) fail(`${kind}: too few living files copied (${n})`);

  if (kind === "blank") {
    const o = applyOverlay(blankOverlay, dest);
    if (o < BLANK_REQUIRED.length) {
      fail(`blank overlay applied too few files (${o})`);
    }
  } else if (kind === "meadow") {
    const o = applyOverlay(meadowOverlay, dest);
    if (o < MEADOW_OVERLAY_REQUIRED.length) {
      fail(`meadow overlay applied too few files (${o})`);
    }
    writeMeadowLaunch(dest);
    injectMeadowPlaceholders(dest);
  } else {
    fail(`unknown kind ${kind}`);
  }

  stripEngineDevDocs(dest);

  // Ensure .gitignore present
  if (!existsSync(join(dest, ".gitignore"))) {
    writeFileSync(
      join(dest, ".gitignore"),
      "node_modules/\ndist/\n*.local\n.DS_Store\n*.zip\n.cursor/\n",
    );
  }

  const zipPath = join(outDir, `${kind}.zip`);
  await zipDirectory(dest, zipPath);
  validateArchive(zipPath, `${kind}.zip`);
}

async function main() {
  console.log("Emeris launcher pack — validating inputs…");
  validateInputs();

  rmSync(staging, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // Remove stale zips so a failed mid-run cannot leave one good + one bad.
  for (const name of ["blank.zip", "meadow.zip"]) {
    const p = join(outDir, name);
    if (existsSync(p)) rmSync(p);
  }

  await packOne("meadow");
  await packOne("blank");

  rmSync(staging, { recursive: true, force: true });

  // Final gate: both must exist and pass manifest again.
  validateArchive(join(outDir, "meadow.zip"), "meadow.zip (final)");
  validateArchive(join(outDir, "blank.zip"), "blank.zip (final)");

  console.log("pack complete — launcher/embedded/{blank,meadow}.zip ready");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
