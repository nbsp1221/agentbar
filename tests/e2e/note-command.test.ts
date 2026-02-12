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

describe("note command (e2e)", () => {
  test("sets note for same-email copilot profiles using --plan in non-interactive mode", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const storePath = writeStore(homeDir, {
      version: 1,
      profiles: [
        {
          id: "cp1",
          provider: "copilot",
          email: "same@example.com",
          planType: "individual",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "copilot_token", githubToken: "x" }
        },
        {
          id: "cp2",
          provider: "copilot",
          email: "same@example.com",
          planType: "business",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "copilot_token", githubToken: "y" }
        }
      ],
      active: {}
    });

    const proc = spawnSync(
      "bun",
      ["run", "src/index.ts", "note", "set", "copilot", "same@example.com", "--plan", "business", "work", "profile", "--json"],
      {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
        encoding: "utf8"
      }
    );

    expect(proc.status).toBe(0);

    const out = JSON.parse(proc.stdout || "{}");
    expect(out.id).toBe("cp2");
    expect(out.note).toBe("work profile");

    const next = readStore(storePath);
    expect(next.profiles.find((p: any) => p.id === "cp1")?.note).toBeUndefined();
    expect(next.profiles.find((p: any) => p.id === "cp2")?.note).toBe("work profile");
  });

  test("clears note for same-email copilot profiles using --plan in non-interactive mode", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const storePath = writeStore(homeDir, {
      version: 1,
      profiles: [
        {
          id: "cp1",
          provider: "copilot",
          email: "same@example.com",
          planType: "individual",
          note: "keep",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "copilot_token", githubToken: "x" }
        },
        {
          id: "cp2",
          provider: "copilot",
          email: "same@example.com",
          planType: "business",
          note: "remove-me",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "copilot_token", githubToken: "y" }
        }
      ],
      active: {}
    });

    const proc = spawnSync(
      "bun",
      ["run", "src/index.ts", "note", "clear", "copilot", "same@example.com", "--plan", "business", "--json"],
      {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
        encoding: "utf8"
      }
    );

    expect(proc.status).toBe(0);

    const out = JSON.parse(proc.stdout || "{}");
    expect(out.id).toBe("cp2");

    const next = readStore(storePath);
    expect(next.profiles.find((p: any) => p.id === "cp1")?.note).toBe("keep");
    expect(next.profiles.find((p: any) => p.id === "cp2")?.note).toBeUndefined();
  });
});
