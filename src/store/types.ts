export type Provider = "codex" | "copilot";

export type CodexOAuthCredentials = {
  kind: "codex_oauth";
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  accountId?: string;
  expiresAt?: number;
  lastRefresh?: string;
};

export type CopilotCredentials = {
  kind: "copilot_token";
  githubToken: string;
  copilotToken?: string;
  copilotTokenExpiresAt?: number;
  copilotApiBaseUrl?: string;
};

export type ProfileCredentials = CodexOAuthCredentials | CopilotCredentials;

export type AuthProfile = {
  id: string;
  provider: Provider;
  email: string;
  planType?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  credentials: ProfileCredentials;
};

export type StoreData = {
  version: number;
  profiles: AuthProfile[];
  active: Partial<Record<Provider, string>>;
};

export const STORE_VERSION = 1;

export function makeEmptyStore(): StoreData {
  return {
    version: STORE_VERSION,
    profiles: [],
    active: {}
  };
}
