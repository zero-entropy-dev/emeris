/**
 * Start Vite, then open Emeris native shell (or browser fallback).
 * Cursor "Run arena" sets ARENA_OPEN_EXTERNAL=1 so the product window opens from the IDE.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runDev } from "../../../scripts/dev.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

await runDev({
  root,
  port: 5174,
  key: "arena",
  title: "Emeris Arena",
  icon: join(root, "public", "favicon.ico"),
});
