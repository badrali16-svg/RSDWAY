import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rm } from "node:fs/promises";
import { build } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(artifactDir, "test-dist");

await rm(outdir, { recursive: true, force: true });
await build({
  entryPoints: [path.join(artifactDir, "test/session-concurrency.test.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outdir,
  outExtension: { ".js": ".mjs" },
  sourcemap: "linked",
  external: ["pg-native"],
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: {
    js: `import { createRequire as __createRequire } from "node:module";
import __path from "node:path";
import __url from "node:url";
globalThis.require = __createRequire(import.meta.url);
globalThis.__filename = __url.fileURLToPath(import.meta.url);
globalThis.__dirname = __path.dirname(globalThis.__filename);`,
  },
});