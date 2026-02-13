import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { collectUsage } from "@/services/usage";

function writeJson(pathname: string, data: unknown): void {
  mkdirSync(path.dirname(pathname), { recursive: true });
  writeFileSync(pathname, JSON.stringify(data, null, 2), "utf8");
}

function writeUsageConfig(homeDir: string, usage: {
  timeoutMs?: number;
  ttlMs?: number;
  errorTtlMs?: number;
  concurrency?: number;
}): void {
  writeJson(path.join(homeDir, ".agentbar", "config.json"), { usage });
}

describe("usage TTL cache", () => {
  const prevHome = process.env.HOME;

  afterEach(() => {
    vi.useRealTimers();
    process.env.HOME = prevHome;
    delete process.env.AGENTBAR_USAGE_TTL_MS;
  });

  test("returns cached rows without hitting the network when cache is fresh", async () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const storePath = path.join(homeDir, ".agentbar", "store.json");
    writeJson(storePath, {
      version: 1,
      profiles: [
        {
          id: "p1",
          provider: "codex",
          email: "a@b.com",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        }
      ],
      active: {}
    });

    const cachePath = path.join(homeDir, ".agentbar", "usage-cache.json");
    writeJson(cachePath, {
      version: 1,
      entries: {
        "codex:p1": {
          provider: "codex",
          profileId: "p1",
          expiresAtMs: Date.now() + 60_000,
          row: {
            provider: "codex",
            email: "a@b.com",
            planType: "cached",
            primaryUsedPercent: 0,
            secondaryUsedPercent: 0
          }
        }
      }
    });

    const fetchImpl = async (): Promise<Response> => {
      throw new Error("network should not be called");
    };

    const rows = await collectUsage({
      provider: "codex",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.provider).toBe("codex");
    expect((rows[0] as any).planType).toBe("cached");
  });

  test("overrides cached note/email and drops legacy unknown fields from usage rows", async () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const storePath = path.join(homeDir, ".agentbar", "store.json");
    writeJson(storePath, {
      version: 1,
      profiles: [
        {
          id: "p1",
          provider: "codex",
          email: "new@b.com",
          note: "NEW NOTE",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        }
      ],
      active: {}
    });

    const cachePath = path.join(homeDir, ".agentbar", "usage-cache.json");
    writeJson(cachePath, {
      version: 1,
      entries: {
        "codex:p1": {
          provider: "codex",
          profileId: "p1",
          expiresAtMs: Date.now() + 60_000,
          row: {
            provider: "codex",
            email: "old@b.com",
            legacyField: "legacy",
            note: "OLD NOTE",
            planType: "cached",
            primaryUsedPercent: 0,
            secondaryUsedPercent: 0
          }
        }
      }
    });

    const fetchImpl = async (): Promise<Response> => {
      throw new Error("network should not be called");
    };

    const rows = await collectUsage({
      provider: "codex",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe("new@b.com");
    expect("legacyField" in (rows[0] as Record<string, unknown>)).toBe(false);
    expect((rows[0] as any).note).toBe("NEW NOTE");
    expect((rows[0] as any).planType).toBe("cached");
  });

  test("bypasses cache when refresh=true", async () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const storePath = path.join(homeDir, ".agentbar", "store.json");
    writeJson(storePath, {
      version: 1,
      profiles: [
        {
          id: "p1",
          provider: "codex",
          email: "a@b.com",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        }
      ],
      active: {}
    });

    const cachePath = path.join(homeDir, ".agentbar", "usage-cache.json");
    writeJson(cachePath, {
      version: 1,
      entries: {
        "codex:p1": {
          provider: "codex",
          profileId: "p1",
          expiresAtMs: Date.now() + 60_000,
          row: {
            provider: "codex",
            email: "a@b.com",
            planType: "cached",
            primaryUsedPercent: 0,
            secondaryUsedPercent: 0
          }
        }
      }
    });

    let called = 0;
    const fetchImpl = async (): Promise<Response> => {
      called++;
      return new Response("{}", { status: 500, headers: { "Content-Type": "application/json" } });
    };

    const rows = await collectUsage({
      provider: "codex",
      refresh: true,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    expect(called).toBeGreaterThan(0);
    expect(rows).toHaveLength(1);
  });

  test("bypasses cache reads when config usage.ttlMs=0", async () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;
    writeUsageConfig(homeDir, { ttlMs: 0 });

    const storePath = path.join(homeDir, ".agentbar", "store.json");
    writeJson(storePath, {
      version: 1,
      profiles: [
        {
          id: "p1",
          provider: "codex",
          email: "a@b.com",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        }
      ],
      active: {}
    });

    const cachePath = path.join(homeDir, ".agentbar", "usage-cache.json");
    writeJson(cachePath, {
      version: 1,
      entries: {
        "codex:p1": {
          provider: "codex",
          profileId: "p1",
          expiresAtMs: Date.now() + 60_000,
          row: {
            provider: "codex",
            email: "a@b.com",
            planType: "cached",
            primaryUsedPercent: 0,
            secondaryUsedPercent: 0
          }
        }
      }
    });

    let called = 0;
    const fetchImpl = async (): Promise<Response> => {
      called++;
      return new Response("{}", { status: 500, headers: { "Content-Type": "application/json" } });
    };

    const rows = await collectUsage({
      provider: "codex",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    expect(called).toBeGreaterThan(0);
    expect(rows).toHaveLength(1);
  });

  test("does not use AGENTBAR_USAGE_TTL_MS env var anymore", async () => {
    process.env.AGENTBAR_USAGE_TTL_MS = "0";

    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const storePath = path.join(homeDir, ".agentbar", "store.json");
    writeJson(storePath, {
      version: 1,
      profiles: [
        {
          id: "p1",
          provider: "codex",
          email: "a@b.com",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        }
      ],
      active: {}
    });

    const cachePath = path.join(homeDir, ".agentbar", "usage-cache.json");
    writeJson(cachePath, {
      version: 1,
      entries: {
        "codex:p1": {
          provider: "codex",
          profileId: "p1",
          expiresAtMs: Date.now() + 60_000,
          row: {
            provider: "codex",
            email: "a@b.com",
            planType: "cached",
            primaryUsedPercent: 0,
            secondaryUsedPercent: 0
          }
        }
      }
    });

    const fetchImpl = async (): Promise<Response> => {
      throw new Error("network should not be called");
    };

    const rows = await collectUsage({
      provider: "codex",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    expect(rows).toHaveLength(1);
    expect((rows[0] as any).planType).toBe("cached");
  });

  test("caches error rows using config usage.errorTtlMs (shorter TTL)", async () => {
    vi.useFakeTimers();
    const baseNow = new Date("2026-02-12T00:00:00.000Z");
    vi.setSystemTime(baseNow);

    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;
    writeUsageConfig(homeDir, { ttlMs: 60_000, errorTtlMs: 10_000 });

    const storePath = path.join(homeDir, ".agentbar", "store.json");
    writeJson(storePath, {
      version: 1,
      profiles: [
        {
          id: "p1",
          provider: "codex",
          email: "a@b.com",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "x", refreshToken: "y" }
        }
      ],
      active: {}
    });

    const fetchImpl = async (): Promise<Response> => {
      return new Response("{}", { status: 500, headers: { "Content-Type": "application/json" } });
    };

    const rows = await collectUsage({
      provider: "codex",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    expect(rows).toHaveLength(1);

    const cachePath = path.join(homeDir, ".agentbar", "usage-cache.json");
    const cache = JSON.parse(readFileSync(cachePath, "utf8")) as any;
    const entry = cache.entries["codex:p1"];
    expect(entry).toBeDefined();
    expect(entry.expiresAtMs).toBe(baseNow.getTime() + 10_000);
  });

  test("persists normalized planType from usage snapshots back into profile metadata", async () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const storePath = path.join(homeDir, ".agentbar", "store.json");
    writeJson(storePath, {
      version: 1,
      profiles: [
        {
          id: "cp1",
          provider: "copilot",
          email: "same@example.com",
          createdAt: "2026-02-11T00:00:00.000Z",
          updatedAt: "2026-02-11T00:00:00.000Z",
          credentials: { kind: "copilot_token", githubToken: "x" }
        }
      ],
      active: {}
    });

    const fetchImpl = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          copilot_plan: "Business ",
          quota_snapshots: {
            premium_interactions: { percent_remaining: 80, entitlement: 300, remaining: 240 }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const rows = await collectUsage({
      provider: "copilot",
      refresh: true,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    expect(rows).toHaveLength(1);

    const store = JSON.parse(readFileSync(storePath, "utf8")) as any;
    expect(store.profiles[0]?.planType).toBe("business");
  });
});
