import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";

type PackageJson = {
  bin?: string | Record<string, string>;
  version?: string;
};

function readPackageJson(root: string): PackageJson {
  const pkgPath = resolve(root, "package.json");
  return JSON.parse(readFileSync(pkgPath, "utf8")) as PackageJson;
}

function packageVersion(pkg: PackageJson): string {
  if (!pkg.version) {
    throw new Error("Missing package version");
  }
  return pkg.version;
}

function agentbarBinPath(pkg: PackageJson): string {
  if (typeof pkg.bin === "string") {
    return pkg.bin;
  }
  if (typeof pkg.bin === "object" && pkg.bin !== null && typeof pkg.bin.agentbar === "string") {
    return pkg.bin.agentbar;
  }
  throw new Error("Missing agentbar bin path");
}

describe("package bin entry", () => {
  test("builds an executable Node agentbar bin that prints help", () => {
    const root = process.cwd();
    const pkg = readPackageJson(root);
    const binPath = agentbarBinPath(pkg);

    const build = spawnSync("bun", ["run", "build"], {
      cwd: root,
      encoding: "utf8"
    });

    expect(build.status).toBe(0);

    const resolvedBinPath = resolve(root, binPath ?? "");
    expect(existsSync(resolvedBinPath)).toBe(true);
    expect(readFileSync(resolvedBinPath, "utf8").startsWith("#!/usr/bin/env node")).toBe(true);

    const proc = spawnSync(resolvedBinPath, ["--help"], {
      cwd: root,
      encoding: "utf8"
    });

    expect(proc.status).toBe(0);
    expect(proc.stdout).toContain("agentbar");

    const version = spawnSync(resolvedBinPath, ["--version"], {
      cwd: root,
      encoding: "utf8"
    });

    expect(version.status).toBe(0);
    expect((version.stdout ?? "").trim()).toBe(packageVersion(pkg));
  });
});
