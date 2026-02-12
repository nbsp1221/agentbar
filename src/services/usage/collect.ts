import { resolveStorePath } from "../../store/paths";
import { readStore, upsertProfile } from "../../store/store";
import type { AuthProfile, Provider } from "../../store/types";
import { codexUsageCollector } from "./collectors/codex";
import { copilotUsageCollector } from "./collectors/copilot";
import type { UsageCollector, UsageCollectorContext, UsageRow } from "./types";
import { makeTimeoutFetch } from "../../utils/fetch-timeout";
import { resolveUsageCachePath } from "../../cache/paths";
import { readUsageCache, updateUsageCacheWithLock, usageCacheKey } from "../../cache/usage-cache";

const collectors: UsageCollector[] = [codexUsageCollector, copilotUsageCollector];

function findCollector(profile: AuthProfile): UsageCollector | undefined {
  return collectors.find((collector) => collector.canCollect(profile));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const safeLimit = Math.max(1, Math.floor(limit));
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) {
        return;
      }
      results[idx] = await fn(items[idx]!);
    }
  };

  const workers = Array.from({ length: Math.min(safeLimit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function collectUsage(options?: {
  provider?: Provider;
  refresh?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<UsageRow[]> {
  const debugTiming = process.env.AGENTBAR_DEBUG_TIMING === "1";
  const startedAt = Date.now();
  const now = Date.now();
  const storePath = resolveStorePath();
  const store = await readStore(storePath);

  const profiles = store.profiles.filter((p) => (options?.provider ? p.provider === options.provider : true));

  const readNumberEnv = (name: string): number | undefined => {
    const raw = process.env[name];
    if (!raw) {
      return undefined;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const concurrency = readNumberEnv("AGENTBAR_USAGE_CONCURRENCY") ?? 4;
  const timeoutMs = readNumberEnv("AGENTBAR_USAGE_TIMEOUT_MS") ?? 5000;
  const ttlMs = readNumberEnv("AGENTBAR_USAGE_TTL_MS") ?? 60_000;
  const errorTtlMs = readNumberEnv("AGENTBAR_USAGE_ERROR_TTL_MS") ?? 10_000;

  const refresh = options?.refresh === true;
  const fetchOverride = options?.fetchImpl;

  const cachePath = resolveUsageCachePath();
  const cache = refresh || ttlMs <= 0 ? undefined : await readUsageCache(cachePath);

  const rows: UsageRow[] = [];
  const toFetch: AuthProfile[] = [];
  for (const profile of profiles) {
    const collector = findCollector(profile);
    if (!collector) {
      continue;
    }

    if (cache) {
      const key = usageCacheKey(profile.provider, profile.id);
      const entry = cache.entries[key];
      if (entry && entry.expiresAtMs > now) {
        rows.push(entry.row);
        continue;
      }
    }

    toFetch.push(profile);
  }

  const fetchImpl = makeTimeoutFetch(fetchOverride ?? fetch, timeoutMs);
  const ctx: UsageCollectorContext = { fetchImpl };

  const collected = await mapWithConcurrency(
    toFetch,
    Number.isFinite(concurrency) ? concurrency : 4,
    async (profile) => {
      const collector = findCollector(profile);
      if (!collector) {
        return undefined;
      }

      const t0 = Date.now();
      const out = await collector.collect(profile, ctx);
      const dt = Date.now() - t0;
      if (debugTiming) {
        const suffix = out.updatedProfile ? " (updatedProfile)" : "";
        console.error(`[timing] ${profile.provider}:${profile.email} collect=${dt}ms${suffix}`);
      }
      return { profile, out };
    }
  );

  const cacheUpdates: Array<{ provider: Provider; profileId: string; row: UsageRow; expiresAtMs: number }> = [];
  for (const entry of collected) {
    if (!entry) {
      continue;
    }

    if (entry.out.updatedProfile) {
      await upsertProfile(storePath, entry.out.updatedProfile);
    }

    rows.push(entry.out.row);

    if (ttlMs > 0) {
      const expiresAtMs = now + (entry.out.row.error ? Math.min(errorTtlMs, ttlMs) : ttlMs);
      cacheUpdates.push({
        provider: entry.profile.provider,
        profileId: entry.profile.id,
        row: entry.out.row,
        expiresAtMs
      });
    }
  }

  rows.sort((a, b) => a.provider.localeCompare(b.provider) || a.email.localeCompare(b.email));
  if (debugTiming) {
    console.error(`[timing] total=${Date.now() - startedAt}ms profiles=${profiles.length}`);
  }

  if (cacheUpdates.length > 0) {
    await updateUsageCacheWithLock(cachePath, (current) => {
      for (const update of cacheUpdates) {
        current.entries[usageCacheKey(update.provider, update.profileId)] = {
          provider: update.provider,
          profileId: update.profileId,
          expiresAtMs: update.expiresAtMs,
          row: update.row
        };
      }
      return current;
    });
  }

  return rows;
}
