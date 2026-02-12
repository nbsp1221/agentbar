import lockfile from "proper-lockfile";
import { loadJsonFile, saveJsonFile } from "../store/json-file";
import { resolveUsageCachePath } from "./paths";
import type { Provider } from "../store/types";
import type { UsageRow } from "../services/usage/types";

export type UsageCacheEntry = {
  provider: Provider;
  profileId: string;
  expiresAtMs: number;
  row: UsageRow;
};

export type UsageCacheData = {
  version: 1;
  entries: Record<string, UsageCacheEntry>;
};

function makeEmptyCache(): UsageCacheData {
  return { version: 1, entries: {} };
}

function coerceCache(value: unknown): UsageCacheData {
  if (!value || typeof value !== "object") {
    return makeEmptyCache();
  }
  const raw = value as Partial<UsageCacheData>;
  const entries = raw.entries && typeof raw.entries === "object" ? (raw.entries as Record<string, UsageCacheEntry>) : {};
  return {
    version: 1,
    entries
  };
}

export function usageCacheKey(provider: Provider, profileId: string): string {
  return `${provider}:${profileId}`;
}

export async function readUsageCache(pathname = resolveUsageCachePath()): Promise<UsageCacheData> {
  const raw = loadJsonFile(pathname);
  return coerceCache(raw);
}

export async function updateUsageCacheWithLock(
  pathname: string,
  updater: (cache: UsageCacheData) => UsageCacheData | void
): Promise<UsageCacheData> {
  // Ensure file exists so proper-lockfile can lock it reliably.
  const current = await readUsageCache(pathname);
  saveJsonFile(pathname, current);

  const release = await lockfile.lock(pathname, {
    retries: {
      retries: 5,
      factor: 1.3,
      minTimeout: 20,
      maxTimeout: 300
    }
  });

  try {
    const fresh = await readUsageCache(pathname);
    const next = updater(fresh) ?? fresh;
    saveJsonFile(pathname, next);
    return next;
  } finally {
    await release();
  }
}

