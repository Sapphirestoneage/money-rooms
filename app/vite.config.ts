import { defineConfig } from "vite";

// The coach console: `npm run app:dev` from the repo root serves /app on port 5174.
export default defineConfig({
  root: __dirname,
  base: "/",
  server: { port: 5174, strictPort: true },
  build: { outDir: "../dist-app", emptyOutDir: true },
});
