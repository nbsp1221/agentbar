import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import {
  getSetting,
  readSettingValues,
  readSettings,
  setSetting,
  unsetSetting,
  writeSettings
} from "@/config/settings";

function writeJson(pathname: string, data: unknown): void {
  mkdirSync(path.dirname(pathname), { recursive: true });
  writeFileSync(pathname, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

describe("settings config", () => {
  const prevHome = process.env.HOME;

  afterEach(() => {
    process.env.HOME = prevHome;
  });

  test("returns defaults when config file is missing", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const settings = readSettings();
    expect(settings).toEqual({
      usage: {
        timeoutMs: 5000,
        ttlMs: 60000,
        errorTtlMs: 10000,
        concurrency: 4
      }
    });
  });

  test("reads normalized values from config.json and falls back per-field on invalid inputs", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    writeJson(path.join(homeDir, ".agentbar", "config.json"), {
      usage: {
        timeoutMs: 8000,
        ttlMs: -1,
        errorTtlMs: 12345.7,
        concurrency: 0
      }
    });

    const settings = readSettings();
    expect(settings).toEqual({
      usage: {
        timeoutMs: 8000,
        ttlMs: 60000,
        errorTtlMs: 12345,
        concurrency: 4
      }
    });
  });

  test("writes normalized settings while preserving unrelated config keys", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const configPath = path.join(homeDir, ".agentbar", "config.json");
    writeJson(configPath, { other: { keep: true } });

    const saved = writeSettings({
      usage: {
        timeoutMs: 9000.4,
        ttlMs: 0,
        errorTtlMs: 5000,
        concurrency: 8
      }
    });

    expect(saved).toEqual({
      usage: {
        timeoutMs: 9000,
        ttlMs: 0,
        errorTtlMs: 5000,
        concurrency: 8
      }
    });

    const onDisk = JSON.parse(readFileSync(configPath, "utf8")) as any;
    expect(onDisk.other?.keep).toBe(true);
    expect(onDisk.usage).toEqual(saved.usage);
  });

  test("reads flattened setting values", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    writeJson(path.join(homeDir, ".agentbar", "config.json"), {
      usage: {
        timeoutMs: 7200
      }
    });

    expect(readSettingValues()).toEqual({
      "usage.timeoutMs": 7200,
      "usage.ttlMs": 60000,
      "usage.errorTtlMs": 10000,
      "usage.concurrency": 4
    });
  });

  test("gets a single setting by key", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    writeJson(path.join(homeDir, ".agentbar", "config.json"), {
      usage: {
        timeoutMs: 7200
      }
    });

    expect(getSetting("usage.timeoutMs")).toBe(7200);
    expect(getSetting("usage.concurrency")).toBe(4);
  });

  test("sets one setting and preserves other keys", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const configPath = path.join(homeDir, ".agentbar", "config.json");
    writeJson(configPath, {
      usage: {
        timeoutMs: 5000
      },
      other: {
        keep: true
      }
    });

    const saved = setSetting("usage.ttlMs", 120000);
    expect(saved["usage.ttlMs"]).toBe(120000);

    const onDisk = JSON.parse(readFileSync(configPath, "utf8")) as any;
    expect(onDisk.other?.keep).toBe(true);
    expect(onDisk.usage.ttlMs).toBe(120000);
    expect(onDisk.usage.timeoutMs).toBe(5000);
  });

  test("normalizes invalid single-setting writes with current value fallback", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const configPath = path.join(homeDir, ".agentbar", "config.json");
    writeJson(configPath, {
      usage: {
        concurrency: 8
      }
    });

    const saved = setSetting("usage.concurrency", 0);
    expect(saved["usage.concurrency"]).toBe(8);

    const onDisk = JSON.parse(readFileSync(configPath, "utf8")) as any;
    expect(onDisk.usage.concurrency).toBe(8);
  });

  test("unsets one setting so it falls back to default", () => {
    const homeDir = path.join(tmpdir(), `agentbar-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    process.env.HOME = homeDir;

    const configPath = path.join(homeDir, ".agentbar", "config.json");
    writeJson(configPath, {
      usage: {
        timeoutMs: 7000,
        ttlMs: 70000
      }
    });

    const saved = unsetSetting("usage.timeoutMs");
    expect(saved["usage.timeoutMs"]).toBe(5000);
    expect(saved["usage.ttlMs"]).toBe(70000);

    const onDisk = JSON.parse(readFileSync(configPath, "utf8")) as any;
    expect(onDisk.usage.timeoutMs).toBeUndefined();
    expect(onDisk.usage.ttlMs).toBe(70000);
  });
});
