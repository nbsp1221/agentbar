import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

type PackageJson = {
  name?: string;
  description?: string;
  files?: string[];
  engines?: {
    bun?: string;
  };
};

describe("npm publish readiness", () => {
  test("has required package metadata for npm distribution", () => {
    const pkgPath = resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as PackageJson;

    expect(pkg.name).toBe("agentbar");
    expect(pkg.description).toBe("CLI to manage multiple AI auth profiles and usage in one place");
    expect(pkg.files).toEqual(expect.arrayContaining(["bin", "src", "README.md", "LICENSE"]));
    expect(pkg.engines?.bun).toBeDefined();
  });

  test("includes npm publish workflow triggered by v* tags", () => {
    const workflowPath = resolve(process.cwd(), ".github/workflows/publish-npm.yml");
    expect(existsSync(workflowPath)).toBe(true);

    const workflow = readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("tags:");
    expect(workflow).toContain("- 'v*'");
    expect(workflow).toContain("npm publish");
    expect(workflow).toContain("Validate tag matches package version");
    expect(workflow).toContain("actions/checkout@v6");
    expect(workflow).toContain("actions/setup-node@v6");
    expect(workflow).toContain("node-version: 24");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("npm publish --provenance");
    expect(workflow).toContain("trusted publishing (OIDC)");
    expect(workflow).not.toContain("NODE_AUTH_TOKEN");
    expect(workflow).not.toContain("secrets.NPM_TOKEN");
  });
});
