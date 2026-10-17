// Bundles the functions with esbuild so code from ../shared is inlined.
// `firebase deploy` uploads only this directory, so workspace packages
// cannot be resolved at deploy time; npm dependencies stay external.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

await build({
  entryPoints: {
    index: "src/index.ts",
    "scripts/setRole": "src/scripts/setRole.ts",
    "scripts/seed": "src/scripts/seed.ts",
  },
  outdir: "lib",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  tsconfig: "tsconfig.json",
  external: Object.keys(pkg.dependencies),
  logLevel: "info",
});
