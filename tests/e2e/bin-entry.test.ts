import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";

describe("package bin entry", () => {
  test("exposes an executable agentbar bin that prints help", () => {
    const root = process.cwd();
    const pkgPath = resolve(root, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      bin?: string | Record<string, string>;
    };

    expect(pkg.bin).toBeDefined();

    const binPath =
      typeof pkg.bin === "string"
        ? pkg.bin
        : typeof pkg.bin === "object" && pkg.bin !== null
          ? pkg.bin.agentbar
          : undefined;

    expect(binPath).toBeDefined();

    const resolvedBinPath = resolve(root, binPath ?? "");
    expect(existsSync(resolvedBinPath)).toBe(true);

    const proc = spawnSync("bun", [resolvedBinPath, "--help"], {
      cwd: root,
      encoding: "utf8"
    });

    expect(proc.status).toBe(0);
    expect(proc.stdout).toContain("agentbar");
  });
});
