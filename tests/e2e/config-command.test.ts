import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

function runAgentbar(homeDir: string, args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("bun", ["run", "src/index.ts", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, HOME: homeDir },
    encoding: "utf8"
  });
}

function readConfig(homeDir: string): any {
  return JSON.parse(readFileSync(path.join(homeDir, ".agentbar", "config.json"), "utf8"));
}

function asText(value: string | NonSharedBuffer): string {
  return typeof value === "string" ? value : value.toString("utf8");
}

describe("config command (e2e)", () => {
  test("lists defaults and supports get/set/unset for usage keys", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    mkdirSync(path.join(homeDir, ".agentbar"), { recursive: true });

    const listProc = runAgentbar(homeDir, ["config", "list"]);
    expect(listProc.status).toBe(0);
    expect(listProc.stdout).toContain("usage.timeoutMs=10000");
    expect(listProc.stdout).toContain("usage.ttlMs=60000");

    const setProc = runAgentbar(homeDir, ["config", "set", "usage.timeoutMs", "8000"]);
    expect(setProc.status).toBe(0);
    expect(setProc.stdout).toContain("usage.timeoutMs=8000");

    const getProc = runAgentbar(homeDir, ["config", "get", "usage.timeoutMs"]);
    expect(getProc.status).toBe(0);
    expect(asText(getProc.stdout).trim()).toBe("8000");

    const configAfterSet = readConfig(homeDir);
    expect(configAfterSet.usage?.timeoutMs).toBe(8000);

    const unsetProc = runAgentbar(homeDir, ["config", "unset", "usage.timeoutMs"]);
    expect(unsetProc.status).toBe(0);
    expect(unsetProc.stdout).toContain("usage.timeoutMs=10000");

    const configAfterUnset = readConfig(homeDir);
    expect(configAfterUnset.usage?.timeoutMs).toBeUndefined();
  });

  test("fails on unknown setting key", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    mkdirSync(path.join(homeDir, ".agentbar"), { recursive: true });

    const proc = runAgentbar(homeDir, ["config", "get", "unknown.key"]);
    expect(proc.status).not.toBe(0);
    expect(`${asText(proc.stderr)}${asText(proc.stdout)}`).toContain("Unknown setting key: unknown.key");
  });
});
