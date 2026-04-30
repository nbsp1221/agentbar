import { readFileSync } from "node:fs";
import { chmod, rm } from "node:fs/promises";

type PackageJson = {
  version?: unknown;
};

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as PackageJson;
const version = typeof pkg.version === "string" ? pkg.version.trim() : "";

if (version.length === 0) {
  throw new Error("package.json version is required for build");
}

await rm(new URL("../dist", import.meta.url), { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  target: "node",
  format: "esm",
  banner: "#!/usr/bin/env node",
  define: {
    AGENTBAR_VERSION: JSON.stringify(version)
  }
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

await chmod(new URL("../dist/index.js", import.meta.url), 0o755);
