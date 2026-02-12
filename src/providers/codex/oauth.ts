import { createHash, randomBytes } from "node:crypto";

export const CODEX_OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
export const CODEX_OAUTH_AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
export const CODEX_OAUTH_TOKEN_URL = "https://auth.openai.com/oauth/token";
export const CODEX_OAUTH_REDIRECT_URI = "http://localhost:1455/auth/callback";

function toBase64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createPkceVerifier(): string {
  return toBase64Url(randomBytes(32));
}

export function createCodeChallenge(verifier: string): string {
  const digest = createHash("sha256").update(verifier).digest();
  return toBase64Url(digest);
}

export function createOAuthState(): string {
  // Align with openclaw/pi-ai codex flow which uses hex state.
  return randomBytes(16).toString("hex");
}

export function buildAuthorizeUrl(params: {
  state: string;
  verifier: string;
  redirectUri?: string;
  clientId?: string;
  originator?: string;
}): string {
  const redirectUri = params.redirectUri ?? CODEX_OAUTH_REDIRECT_URI;
  const clientId = params.clientId ?? CODEX_OAUTH_CLIENT_ID;
  const originator = params.originator ?? "pi";
  const challenge = createCodeChallenge(params.verifier);

  const url = new URL(CODEX_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid profile email offline_access");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("id_token_add_organizations", "true");
  url.searchParams.set("codex_cli_simplified_flow", "true");
  url.searchParams.set("originator", originator);

  return url.toString();
}

export function parseOAuthRedirect(redirectUrl: string): { code: string; state: string } {
  const parsed = new URL(redirectUrl);
  const code = parsed.searchParams.get("code");
  const state = parsed.searchParams.get("state");

  if (!code || !state) {
    throw new Error("Invalid redirect URL: missing code/state");
  }

  return { code, state };
}

export type CodexTokenResponse = {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
};

export async function exchangeCodeForTokens(params: {
  code: string;
  verifier: string;
  redirectUri?: string;
  clientId?: string;
  fetchImpl?: typeof fetch;
}): Promise<CodexTokenResponse> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri ?? CODEX_OAUTH_REDIRECT_URI,
    client_id: params.clientId ?? CODEX_OAUTH_CLIENT_ID,
    code_verifier: params.verifier
  });

  const res = await fetchImpl(CODEX_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  if (!res.ok) {
    throw new Error(`Codex OAuth token exchange failed: HTTP ${res.status}`);
  }

  const json = (await res.json()) as Partial<CodexTokenResponse>;
  if (!json.access_token || !json.refresh_token) {
    throw new Error("Codex OAuth token exchange returned invalid payload");
  }

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    id_token: json.id_token,
    expires_in: json.expires_in,
    token_type: json.token_type
  };
}
