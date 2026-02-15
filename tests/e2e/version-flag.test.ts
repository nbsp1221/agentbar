import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

function packageVersion(): string {
  const pkgPath = resolve(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
  if (!pkg.version) {
    throw new Error("Missing package version");
  }
  return pkg.version;
}

describe("version flags", () => {
  test("prints version with --version", () => {
    const expectedVersion = packageVersion();
    const proc = spawnSync("bun", ["run", "src/index.ts", "--version"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(proc.status).toBe(0);
    expect((proc.stdout ?? "").trim()).toBe(expectedVersion);
  });

  test("prints version with -v", () => {
    const expectedVersion = packageVersion();
    const proc = spawnSync("bun", ["run", "src/index.ts", "-v"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(proc.status).toBe(0);
    expect((proc.stdout ?? "").trim()).toBe(expectedVersion);
  });
});
