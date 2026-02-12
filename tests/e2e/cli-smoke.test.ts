import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";

describe("cli smoke", () => {
  test("prints help", async () => {
    const proc = spawnSync("bun", ["run", "src/index.ts", "--help"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    expect(proc.status).toBe(0);
    const stdout = proc.stdout ?? "";
    expect(stdout).toContain("agentbar");
  });
});
