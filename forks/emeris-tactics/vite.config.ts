import { defineConfig } from "vite";
// @ts-expect-error - plain JS dev helper, no types needed
import { lifeline } from "./scripts/lifeline.mjs";

export default defineConfig({
  root: ".",
  plugins: [lifeline()],
  server: {
    host: true,
    port: 5175,
    strictPort: true,
    open: false,
  },
  preview: {
    host: true,
    port: 5175,
    strictPort: true,
  },
});
