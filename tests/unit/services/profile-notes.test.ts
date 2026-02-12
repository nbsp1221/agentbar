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

  test("fails when codex same-email profiles are ambiguous in non-interactive mode", async () => {
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
          planType: "plus",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        },
        {
          id: "c2",
          provider: "codex",
          email: "alice@example.com",
          planType: "team",
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

  test("uses plan selector when codex same-email profiles exist in non-interactive mode", async () => {
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
          planType: "plus",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        },
        {
          id: "c2",
          provider: "codex",
          email: "alice@example.com",
          planType: "team",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        }
      ],
      active: {}
    });

    const result = await setProfileNote({
      provider: "codex",
      email: "alice@example.com",
      plan: "team",
      note: "work profile",
      outputJson: true
    });

    expect(result.id).toBe("c2");

    const store = readJson(storePath);
    expect(store.profiles.find((p: any) => p.id === "c1")?.note).toBeUndefined();
    expect(store.profiles.find((p: any) => p.id === "c2")?.note).toBe("work profile");
  });

  test("uses plan selector when copilot same-email profiles exist in non-interactive mode", async () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const storePath = path.join(homeDir, ".agentbar", "store.json");
    writeJson(storePath, {
      version: 1,
      profiles: [
        {
          id: "p1",
          provider: "copilot",
          email: "same@example.com",
          planType: "individual",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "copilot_token", githubToken: "x" }
        },
        {
          id: "p2",
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

    const result = await setProfileNote({
      provider: "copilot",
      email: "same@example.com",
      plan: "business",
      note: "corp",
      outputJson: true
    });

    expect(result.id).toBe("p2");

    const store = readJson(storePath);
    expect(store.profiles.find((p: any) => p.id === "p1")?.note).toBeUndefined();
    expect(store.profiles.find((p: any) => p.id === "p2")?.note).toBe("corp");
  });
});
