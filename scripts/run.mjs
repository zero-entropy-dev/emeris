/** Start Vite, then open EmerisShell or the IDE Simple Browser. */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runDev } from "./dev.mjs";

await runDev({
  root: join(dirname(fileURLToPath(import.meta.url)), ".."),
  port: 5173,
  key: "meadow",
  title: "Emeris",
});
