import type { AuthProfile } from "../../store/types";
import { CODEX_OAUTH_CLIENT_ID } from "./oauth";
import { ensureFreshCodexProfile } from "./refresh";

const BASE_URL = "https://chatgpt.com/backend-api";
const RATE_LIMIT_URL = `${BASE_URL}/wham/usage`;
const REFRESH_TOKEN_URL = "https://auth.openai.com/oauth/token";
const USER_AGENT = "agentbar/0.1.0";

type RateLimitPayload = {
  plan_type?: string;
  rate_limit?: {
    primary_window?: {
      used_percent?: number;
      reset_at?: number;
      limit_window_seconds?: number;
    };
    secondary_window?: {
      used_percent?: number;
      reset_at?: number;
      limit_window_seconds?: number;
    };
  };
};

type RefreshTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
};

type CodexOAuthProfile = AuthProfile & {
  provider: "codex";
  credentials: {
    kind: "codex_oauth";
    accessToken: string;
    refreshToken: string;
    idToken?: string;
    accountId?: string;
    expiresAt?: number;
    lastRefresh?: string;
  };
};

export type CodexUsageSnapshot = {
  planType: string;
  primaryUsedPercent: number;
  primaryResetAtMs?: number;
  primaryWindowSeconds?: number;
  secondaryUsedPercent: number;
  secondaryResetAtMs?: number;
  secondaryWindowSeconds?: number;
};

export function snapshotFromPayload(payload: RateLimitPayload): CodexUsageSnapshot {
  return {
    planType: payload.plan_type ?? "unknown",
    primaryUsedPercent: payload.rate_limit?.primary_window?.used_percent ?? 0,
    primaryResetAtMs: payload.rate_limit?.primary_window?.reset_at
      ? payload.rate_limit.primary_window.reset_at * 1000
      : undefined,
    primaryWindowSeconds: payload.rate_limit?.primary_window?.limit_window_seconds,
    secondaryUsedPercent: payload.rate_limit?.secondary_window?.used_percent ?? 0,
    secondaryResetAtMs: payload.rate_limit?.secondary_window?.reset_at
      ? payload.rate_limit.secondary_window.reset_at * 1000
      : undefined,
    secondaryWindowSeconds: payload.rate_limit?.secondary_window?.limit_window_seconds
  };
}

async function refreshAccessToken(
  refreshToken: string,
  fetchImpl: typeof fetch
): Promise<RefreshTokenResponse | null> {
  const body = new URLSearchParams({
    client_id: CODEX_OAUTH_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const res = await fetchImpl(REFRESH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT
    },
    body: body.toString()
  });

  if (!res.ok) {
    return null;
  }
  return (await res.json()) as RefreshTokenResponse;
}

async function fetchRateLimit(
  accessToken: string,
  accountId: string | undefined,
  fetchImpl: typeof fetch
): Promise<{ status: number | null; payload?: RateLimitPayload; timedOut?: boolean }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": USER_AGENT
  };
  if (accountId) {
    headers["ChatGPT-Account-Id"] = accountId;
  }

  try {
    const res = await fetchImpl(RATE_LIMIT_URL, {
      method: "GET",
      headers
    });
    if (!res.ok) {
      return { status: res.status };
    }
    return {
      status: res.status,
      payload: (await res.json()) as RateLimitPayload
    };
  } catch (error) {
    const name = (error as Error | undefined)?.name;
    if (name === "AbortError") {
      return { status: null, timedOut: true };
    }
    return { status: null };
  }
}

export async function fetchCodexUsageForProfile(
  profile: AuthProfile & { provider: "codex" },
  fetchImpl: typeof fetch = fetch
): Promise<{
  snapshot?: CodexUsageSnapshot;
  updatedProfile?: AuthProfile;
  error?: string;
}> {
  if (profile.credentials.kind !== "codex_oauth") {
    return { error: "invalid_codex_credentials" };
  }
  let codexProfile = profile as CodexOAuthProfile;

  // Proactive refresh: avoid writing/using an expired access token whenever we have enough metadata.
  const fresh = await ensureFreshCodexProfile(codexProfile, { fetchImpl });
  if (fresh.updatedProfile && fresh.updatedProfile.credentials.kind === "codex_oauth") {
    codexProfile = fresh.updatedProfile as CodexOAuthProfile;
  }

  const first = await fetchRateLimit(
    codexProfile.credentials.accessToken,
    codexProfile.credentials.accountId,
    fetchImpl
  );
  if (first.payload) {
    return { snapshot: snapshotFromPayload(first.payload), updatedProfile: fresh.updatedProfile };
  }
  if (first.timedOut) {
    return { updatedProfile: fresh.updatedProfile, error: "timeout" };
  }

  if (first.status === 401 && codexProfile.credentials.refreshToken) {
    const refreshed = await refreshAccessToken(codexProfile.credentials.refreshToken, fetchImpl);
    if (!refreshed?.access_token) {
      return { updatedProfile: fresh.updatedProfile, error: "refresh_failed" };
    }

    const updated: CodexOAuthProfile = {
      ...codexProfile,
      updatedAt: new Date().toISOString(),
      credentials: {
        ...codexProfile.credentials,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? codexProfile.credentials.refreshToken,
        idToken: refreshed.id_token ?? codexProfile.credentials.idToken,
        lastRefresh: new Date().toISOString()
      }
    };

    const retry = await fetchRateLimit(
      updated.credentials.accessToken,
      updated.credentials.accountId,
      fetchImpl
    );
    if (retry.payload) {
      return {
        snapshot: snapshotFromPayload(retry.payload),
        updatedProfile: updated
      };
    }
    if (retry.timedOut) {
      return { updatedProfile: updated, error: "timeout" };
    }

    return { updatedProfile: updated, error: "usage_retry_failed" };
  }

  return { updatedProfile: fresh.updatedProfile, error: "usage_fetch_failed" };
}
