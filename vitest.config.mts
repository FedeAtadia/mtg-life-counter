import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * One environment for the whole suite. The pure-logic tests under `lib/` do not
 * need a DOM, but jsdom costs little here and a single environment means a new
 * test file never has to declare which half of the app it belongs to.
 *
 * `resolve.tsconfigPaths` is what makes the `@/` imports in components resolve
 * the same way they do in `next build`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["{app,components,lib}/**/*.test.{ts,tsx}"],
  },
});
