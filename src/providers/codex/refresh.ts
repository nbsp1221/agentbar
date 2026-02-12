import type { AuthProfile } from "../../store/types";
import { safeDecodeJwtPayload } from "../../utils/jwt";
import { CODEX_OAUTH_CLIENT_ID, CODEX_OAUTH_TOKEN_URL } from "./oauth";

const USER_AGENT = "agentbar/0.1.0";

export const DEFAULT_EXPIRES_BUFFER_MS = 5 * 60 * 1000;
export const DEFAULT_FALLBACK_TTL_MS = 60 * 60 * 1000;

type RefreshTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
};

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseIsoMs(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

function decodeJwtExpMs(token?: string): number | undefined {
  const payload = safeDecodeJwtPayload(token);
  const exp = payload?.exp;
  const expSeconds = numberOrUndefined(exp);
  if (typeof expSeconds === "number" && expSeconds > 0) {
    return Math.floor(expSeconds) * 1000;
  }
  return undefined;
}

function coerceExpiresAtMs(params: {
  accessToken?: string;
  expiresInSeconds?: number;
  lastRefreshMs: number;
}): number {
  const fromJwt = decodeJwtExpMs(params.accessToken);
  if (typeof fromJwt === "number") {
    return fromJwt;
  }

  if (typeof params.expiresInSeconds === "number" && params.expiresInSeconds > 0) {
    return params.lastRefreshMs + Math.floor(params.expiresInSeconds) * 1000;
  }

  return params.lastRefreshMs + DEFAULT_FALLBACK_TTL_MS;
}

function isExpiredOrStale(params: {
  expiresAtMs?: number;
  lastRefreshMs?: number;
  updatedAtMs?: number;
  nowMs: number;
  bufferMs: number;
}): boolean {
  const effectiveExpiresAt =
    params.expiresAtMs ??
    (typeof params.lastRefreshMs === "number"
      ? params.lastRefreshMs + DEFAULT_FALLBACK_TTL_MS
      : typeof params.updatedAtMs === "number"
        ? params.updatedAtMs + DEFAULT_FALLBACK_TTL_MS
        : undefined);

  if (typeof effectiveExpiresAt !== "number") {
    // No metadata; avoid spamming refresh, let 401 fallback handle it.
    return false;
  }

  return params.nowMs >= effectiveExpiresAt - params.bufferMs;
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

  const res = await fetchImpl(CODEX_OAUTH_TOKEN_URL, {
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

export async function ensureFreshCodexProfile(
  profile: AuthProfile,
  options?: {
    nowMs?: number;
    bufferMs?: number;
    fetchImpl?: typeof fetch;
    requireFresh?: boolean;
  }
): Promise<{ updatedProfile?: AuthProfile; error?: string }> {
  if (profile.provider !== "codex" || profile.credentials.kind !== "codex_oauth") {
    return {};
  }

  const nowMs = options?.nowMs ?? Date.now();
  const bufferMs = options?.bufferMs ?? DEFAULT_EXPIRES_BUFFER_MS;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const requireFresh = options?.requireFresh === true;

  const lastRefreshMs = parseIsoMs(profile.credentials.lastRefresh);
  const updatedAtMs = parseIsoMs(profile.updatedAt);
  const expiresAtMs = profile.credentials.expiresAt;

  const stale = isExpiredOrStale({
    expiresAtMs,
    lastRefreshMs,
    updatedAtMs,
    nowMs,
    bufferMs
  });

  if (!stale) {
    return {};
  }

  const refreshed = await refreshAccessToken(profile.credentials.refreshToken, fetchImpl);
  if (!refreshed?.access_token) {
    if (requireFresh) {
      return { error: "refresh_failed" };
    }
    return { error: "refresh_failed" };
  }

  const refreshedAtIso = new Date(nowMs).toISOString();
  const nextExpiresAt = coerceExpiresAtMs({
    accessToken: refreshed.access_token,
    expiresInSeconds: refreshed.expires_in,
    lastRefreshMs: nowMs
  });

  const updated: AuthProfile = {
    ...profile,
    updatedAt: refreshedAtIso,
    credentials: {
      ...profile.credentials,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? profile.credentials.refreshToken,
      idToken: refreshed.id_token ?? profile.credentials.idToken,
      expiresAt: nextExpiresAt,
      lastRefresh: refreshedAtIso
    }
  };

  return { updatedProfile: updated };
}

