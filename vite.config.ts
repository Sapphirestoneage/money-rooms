import { defineConfig } from "vitest/config";

// GitHub Pages serves a project site from /<repo-name>/.
// Local dev and preview use "/" so the app runs at the root.
const base = process.env.GITHUB_ACTIONS ? "/money-rooms/" : "/";

export default defineConfig({
  base,
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    include: ["engine/**/*.test.ts", "tests/**/*.test.ts", "ui/**/*.test.ts"],
    environment: "node",
  },
});
