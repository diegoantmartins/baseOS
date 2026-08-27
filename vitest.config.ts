import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 30000,
    pool: "threads",
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
        isolate: true,
      },
    },
    maxWorkers: 2,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  assetsInclude: ["**/*.pdf"],
});
