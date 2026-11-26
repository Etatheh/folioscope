// Run from the project root with npx vitest@4.1.0 run --config tests/vitest.config.mjs
import { fileURLToPath } from "node:url";

const config = {
  resolve: { alias: { "@": fileURLToPath(new URL("../", import.meta.url)) } },
  test: { include: ["tests/*.test.mjs"] },
};

export default config;
