import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

function writeStore(homeDir: string, store: unknown): string {
  const dir = path.join(homeDir, ".agentbar");
  mkdirSync(dir, { recursive: true });
  const pathname = path.join(dir, "store.json");
  writeFileSync(pathname, JSON.stringify(store, null, 2), "utf8");
  return pathname;
}

function readStore(pathname: string): any {
  return JSON.parse(readFileSync(pathname, "utf8"));
}

describe("delete command (e2e)", () => {
  test("deletes a codex profile by email and clears active pointer", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const storePath = writeStore(homeDir, {
      version: 1,
      profiles: [
        {
          id: "p1",
          provider: "codex",
          email: "a@b.com",
          accountType: "personal",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        }
      ],
      active: { codex: "p1" }
    });

    const proc = spawnSync("bun", ["run", "src/index.ts", "delete", "codex", "a@b.com", "--yes"], {
      cwd: process.cwd(),
      env: { ...process.env, HOME: homeDir },
      encoding: "utf8"
    });

    expect(proc.status).toBe(0);

    const next = readStore(storePath);
    expect(next.profiles).toHaveLength(0);
    expect(next.active?.codex).toBeUndefined();
  });

  test("requires --yes in non-interactive mode", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    writeStore(homeDir, {
      version: 1,
      profiles: [
        {
          id: "p1",
          provider: "codex",
          email: "a@b.com",
          accountType: "personal",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        }
      ],
      active: { codex: "p1" }
    });

    const proc = spawnSync("bun", ["run", "src/index.ts", "delete", "codex", "a@b.com"], {
      cwd: process.cwd(),
      env: { ...process.env, HOME: homeDir },
      encoding: "utf8"
    });

    expect(proc.status).not.toBe(0);
  });
});

