import { defineConfig } from "vite";
// @ts-expect-error - plain JS dev helper, no types needed
import { lifeline } from "./scripts/lifeline.mjs";

export default defineConfig({
  root: ".",
  plugins: [lifeline()],
  server: {
    // Bind all local interfaces so both localhost and 127.0.0.1 work
    // (Cursor Simple Browser is picky about which one resolves).
    host: true,
    port: 5174,
    strictPort: true,
    open: false,
  },
  preview: {
    host: true,
    port: 5174,
    strictPort: true,
  },
});
