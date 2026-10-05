import { defineConfig } from "vitest/config";

// The v1 tests, apart from v2's: `npm run app:test` from the repo root.
export default defineConfig({
  test: {
    root: __dirname,
    include: ["tests/**/*.test.ts", "core/**/*.test.ts"],
    environment: "node",
    testTimeout: 20000,
  },
});
