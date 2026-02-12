import { resolveStorePath } from "../../store/paths";
import { readStore, upsertProfile } from "../../store/store";
import type { AuthProfile, Provider } from "../../store/types";
import { codexUsageCollector } from "./collectors/codex";
import { copilotUsageCollector } from "./collectors/copilot";
import type { UsageCollector, UsageCollectorContext, UsageRow } from "./types";
import { makeTimeoutFetch } from "../../utils/fetch-timeout";
import { resolveUsageCachePath } from "../../cache/paths";
import { readUsageCache, updateUsageCacheWithLock, usageCacheKey } from "../../cache/usage-cache";
import { normalizePersistedPlanType } from "../../utils/plan";

const collectors: UsageCollector[] = [codexUsageCollector, copilotUsageCollector];

function findCollector(profile: AuthProfile): UsageCollector | undefined {
  return collectors.find((collector) => collector.canCollect(profile));
}

function applyProfileMetadataToRow(row: UsageRow, profile: AuthProfile): UsageRow {
  // Usage cache entries may go stale for display-only fields (email/note).
  // Always prefer the latest profile metadata from the store.
  // Rebuild provider-specific rows so legacy/unknown keys are not propagated.
  const common = {
    email: profile.email,
    planType: row.planType,
    note: profile.note,
    error: row.error
  } as const;

  switch (row.provider) {
    case "codex":
      return {
        provider: "codex",
        ...common,
        primaryLabel: row.primaryLabel,
        primaryUsedPercent: row.primaryUsedPercent,
        primaryResetAtMs: row.primaryResetAtMs,
        secondaryLabel: row.secondaryLabel,
        secondaryUsedPercent: row.secondaryUsedPercent,
        secondaryResetAtMs: row.secondaryResetAtMs
      };
    case "copilot":
      return {
        provider: "copilot",
        ...common,
        metrics: row.metrics,
        resetAtMs: row.resetAtMs
      };
  }
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
        rows.push(applyProfileMetadataToRow(entry.row, profile));
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

    let persistedProfile = entry.out.updatedProfile;
    const persistedPlanType = normalizePersistedPlanType(entry.out.row.planType);
    if (persistedPlanType) {
      const base = persistedProfile ?? entry.profile;
      const currentPlanType = normalizePersistedPlanType(base.planType);
      if (currentPlanType !== persistedPlanType) {
        persistedProfile = {
          ...base,
          planType: persistedPlanType,
          updatedAt: new Date().toISOString()
        };
      }
    }

    if (persistedProfile) {
      await upsertProfile(storePath, persistedProfile);
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
