import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "vitest/config";

config({ path: [".env.local", ".env"] });

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "packages/cli/src/**/*.test.ts",
    ],
  },
});
