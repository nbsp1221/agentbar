import { afterEach, describe, expect, test } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setProfileNote, clearProfileNote } from "@/services/profile-notes";

function writeJson(pathname: string, data: unknown): void {
  mkdirSync(path.dirname(pathname), { recursive: true });
  writeFileSync(pathname, JSON.stringify(data, null, 2), "utf8");
}

function readJson(pathname: string): any {
  return JSON.parse(readFileSync(pathname, "utf8"));
}

describe("profile notes", () => {
  const prevHome = process.env.HOME;

  afterEach(() => {
    process.env.HOME = prevHome;
  });

  test("sets and clears a note by provider+email (non-interactive)", async () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const storePath = path.join(homeDir, ".agentbar", "store.json");
    writeJson(storePath, {
      version: 1,
      profiles: [
        {
          id: "p1",
          provider: "copilot",
          email: "a@b.com",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "copilot_token", githubToken: "x" }
        }
      ],
      active: {}
    });

    const set = await setProfileNote({
      provider: "copilot",
      email: "a@b.com",
      note: "hello world",
      outputJson: true
    });

    expect(set.id).toBe("p1");
    expect(set.note).toBe("hello world");

    const cleared = await clearProfileNote({
      provider: "copilot",
      email: "a@b.com",
      outputJson: true
    });

    expect(cleared.id).toBe("p1");

    const store = readJson(storePath);
    expect(store.profiles[0].note).toBeUndefined();
  });

  test("requires --account when codex same-email profiles are ambiguous in non-interactive mode", async () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const storePath = path.join(homeDir, ".agentbar", "store.json");
    writeJson(storePath, {
      version: 1,
      profiles: [
        {
          id: "c1",
          provider: "codex",
          email: "alice@example.com",
          accountType: "personal",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        },
        {
          id: "c2",
          provider: "codex",
          email: "alice@example.com",
          accountType: "business",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        }
      ],
      active: {}
    });

    await expect(
      setProfileNote({
        provider: "codex",
        email: "alice@example.com",
        note: "hi",
        outputJson: true
      })
    ).rejects.toThrow(/Ambiguous selector/i);

    const store = readJson(storePath);
    expect(store.profiles[0].note).toBeUndefined();
    expect(store.profiles[1].note).toBeUndefined();
  });

  test("rejects invalid --account values", async () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const storePath = path.join(homeDir, ".agentbar", "store.json");
    writeJson(storePath, {
      version: 1,
      profiles: [
        {
          id: "c1",
          provider: "codex",
          email: "alice@example.com",
          accountType: "personal",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        }
      ],
      active: {}
    });

    await expect(
      setProfileNote({
        provider: "codex",
        email: "alice@example.com",
        account: "wat",
        note: "hi",
        outputJson: true
      })
    ).rejects.toThrow(/Invalid --account/i);
  });
});
