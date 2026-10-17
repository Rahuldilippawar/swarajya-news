import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@swarajya/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)) },
  },
  test: { testTimeout: 20_000, fileParallelism: false },
});
