import type { AuthProfile } from "../../store/types";

const COPILOT_USER_URL = "https://api.github.com/copilot_internal/user";

type CopilotQuota = {
  percent_remaining?: number | null;
  percentRemaining?: number;
  remaining?: number | null;
  quota_remaining?: number | null;
  quotaRemaining?: number;
  entitlement?: number | null;
  unlimited?: boolean;
  overage_count?: number | null;
  overageCount?: number;
  timestamp_utc?: string;
  timestampUtc?: string;
};

type CopilotUserPayload = {
  copilot_plan?: string;
  copilotPlan?: string;
  quota_reset_date_utc?: string;
  quotaResetDateUtc?: string;
  quota_snapshots?: {
    premium_interactions?: CopilotQuota;
    chat?: CopilotQuota;
    completions?: CopilotQuota;
  };
  quotaSnapshots?: {
    premiumInteractions?: CopilotQuota;
    chat?: CopilotQuota;
    completions?: CopilotQuota;
  };
};

export type CopilotUsageMetric = {
  label: "premium" | "chat" | "completions";
  usedPercent?: number;
  remaining?: number;
  entitlement?: number;
  unlimited?: boolean;
  overageCount?: number;
  resetAtMs?: number;
};

export type CopilotUsageSnapshot = {
  planType: string;
  primaryUsedPercent: number;
  secondaryUsedPercent: number;
  metrics: CopilotUsageMetric[];
  resetAtMs?: number;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

function numberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

function resolveQuotaRemaining(value: CopilotQuota): number | undefined {
  return numberOrUndefined(value.remaining) ?? numberOrUndefined(value.quota_remaining) ?? numberOrUndefined(value.quotaRemaining);
}

function resolveQuotaPercentUsed(value: CopilotQuota): number | undefined {
  const remaining = numberOrUndefined(value.percent_remaining) ?? numberOrUndefined(value.percentRemaining);
  if (typeof remaining !== "number") {
    return undefined;
  }
  return clampPercent(100 - remaining);
}

function resolveQuotaTimestamp(value: CopilotQuota): number | undefined {
  const raw = value.timestamp_utc ?? value.timestampUtc;
  if (!raw) {
    return undefined;
  }
  const epoch = Date.parse(raw);
  return Number.isFinite(epoch) ? epoch : undefined;
}

function buildMetric(label: CopilotUsageMetric["label"], quota?: CopilotQuota): CopilotUsageMetric | undefined {
  if (!quota) {
    return undefined;
  }
  return {
    label,
    usedPercent: resolveQuotaPercentUsed(quota),
    remaining: resolveQuotaRemaining(quota),
    entitlement: numberOrUndefined(quota.entitlement),
    unlimited: quota.unlimited,
    overageCount: numberOrUndefined(quota.overage_count) ?? numberOrUndefined(quota.overageCount),
    resetAtMs: resolveQuotaTimestamp(quota)
  };
}

function resolvePremiumQuota(payload: CopilotUserPayload): CopilotQuota | undefined {
  if (payload.quota_snapshots?.premium_interactions) {
    return payload.quota_snapshots.premium_interactions;
  }
  return payload.quotaSnapshots?.premiumInteractions;
}

function resolveChatQuota(payload: CopilotUserPayload): CopilotQuota | undefined {
  return payload.quota_snapshots?.chat ?? payload.quotaSnapshots?.chat;
}

function resolveCompletionsQuota(payload: CopilotUserPayload): CopilotQuota | undefined {
  return payload.quota_snapshots?.completions ?? payload.quotaSnapshots?.completions;
}

export function snapshotFromCopilotUser(payload: CopilotUserPayload): CopilotUsageSnapshot {
  const premium = buildMetric("premium", resolvePremiumQuota(payload));
  const chat = buildMetric("chat", resolveChatQuota(payload));
  const completions = buildMetric("completions", resolveCompletionsQuota(payload));
  const metrics = [premium, chat, completions].filter((m): m is CopilotUsageMetric => Boolean(m));

  const resetRaw = payload.quota_reset_date_utc ?? payload.quotaResetDateUtc;
  const resetAtMs = resetRaw ? Date.parse(resetRaw) : undefined;

  return {
    planType: payload.copilot_plan ?? payload.copilotPlan ?? "unknown",
    primaryUsedPercent: premium?.usedPercent ?? 0,
    secondaryUsedPercent: chat?.usedPercent ?? 0,
    metrics,
    resetAtMs: typeof resetAtMs === "number" && Number.isFinite(resetAtMs) ? resetAtMs : undefined
  };
}

export async function fetchCopilotUsageForProfile(
  profile: AuthProfile & { provider: "copilot" },
  fetchImpl: typeof fetch = fetch
): Promise<{ snapshot?: CopilotUsageSnapshot; error?: string }> {
  if (profile.credentials.kind !== "copilot_token") {
    return { error: "invalid_copilot_credentials" };
  }

  let res: Response;
  try {
    res = await fetchImpl(COPILOT_USER_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `token ${profile.credentials.githubToken}`,
        "Editor-Version": "vscode/1.96.2",
        "Editor-Plugin-Version": "copilot-chat/0.26.7",
        "User-Agent": "GitHubCopilotChat/0.26.7",
        "X-Github-Api-Version": "2025-04-01"
      }
    });
  } catch (error) {
    const name = (error as Error | undefined)?.name;
    if (name === "AbortError") {
      return { error: "timeout" };
    }
    return { error: "network_error" };
  }

  if (!res.ok) {
    return { error: `http_${res.status}` };
  }

  const json = (await res.json()) as CopilotUserPayload;
  return { snapshot: snapshotFromCopilotUser(json) };
}
