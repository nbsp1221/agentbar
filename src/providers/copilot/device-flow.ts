export const GITHUB_DEVICE_CLIENT_ID = "Iv1.b507a08c87ecfe98";
export const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
export const GITHUB_DEVICE_TOKEN_URL = "https://github.com/login/oauth/access_token";

export type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

export function parseDeviceTokenResponse(value: unknown): string {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid device token response");
  }

  const record = value as Record<string, unknown>;
  if (typeof record.access_token === "string" && record.access_token.length > 0) {
    return record.access_token;
  }

  const err = typeof record.error === "string" ? record.error : "unknown_device_flow_error";
  throw new Error(err);
}

export async function requestDeviceCode(
  fetchImpl: typeof fetch = fetch
): Promise<DeviceCodeResponse> {
  const body = new URLSearchParams({
    client_id: GITHUB_DEVICE_CLIENT_ID,
    scope: "read:user user:email"
  });

  const res = await fetchImpl(GITHUB_DEVICE_CODE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!res.ok) {
    throw new Error(`GitHub device code failed: HTTP ${res.status}`);
  }

  const json = (await res.json()) as Partial<DeviceCodeResponse>;
  if (!json.device_code || !json.user_code || !json.verification_uri || !json.expires_in) {
    throw new Error("GitHub device code response missing fields");
  }

  return {
    device_code: json.device_code,
    user_code: json.user_code,
    verification_uri: json.verification_uri,
    expires_in: json.expires_in,
    interval: json.interval ?? 5
  };
}

export async function pollForAccessToken(
  params: { deviceCode: string; intervalMs: number; expiresAt: number },
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const body = new URLSearchParams({
    client_id: GITHUB_DEVICE_CLIENT_ID,
    device_code: params.deviceCode,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code"
  });

  while (Date.now() < params.expiresAt) {
    const res = await fetchImpl(GITHUB_DEVICE_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (!res.ok) {
      throw new Error(`GitHub device token failed: HTTP ${res.status}`);
    }

    const json = (await res.json()) as unknown;
    try {
      return parseDeviceTokenResponse(json);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === "authorization_pending") {
        await Bun.sleep(params.intervalMs);
        continue;
      }
      if (msg === "slow_down") {
        await Bun.sleep(params.intervalMs + 2000);
        continue;
      }
      if (msg === "expired_token") {
        throw new Error("GitHub device code expired; run login again");
      }
      if (msg === "access_denied") {
        throw new Error("GitHub login cancelled");
      }
      throw error;
    }
  }

  throw new Error("GitHub device code expired; run login again");
}
