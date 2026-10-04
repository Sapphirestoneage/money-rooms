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
    // The optimizer and ratio tests run whole plan searches; the GitHub runner is about twice as slow as a laptop.
    testTimeout: 20000,
  },
});
