import fs from "node:fs";
import path from "node:path";
import type { AuthProfile } from "../../store/types";

type CodexAuthJson = {
  tokens: {
    access_token: string;
    refresh_token: string;
    id_token?: string;
    account_id?: string;
  };
  last_refresh: string;
};

export function resolveCodexHomePath(): string {
  const env = process.env.CODEX_HOME;
  if (typeof env === "string" && env.trim().length > 0) {
    return env;
  }

  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    throw new Error("Cannot resolve home directory for Codex auth path");
  }

  return path.join(home, ".codex");
}

export function resolveCodexAuthPath(): string {
  return path.join(resolveCodexHomePath(), "auth.json");
}

export function writeCodexAuthFromProfile(profile: AuthProfile): string {
  if (profile.provider !== "codex" || profile.credentials.kind !== "codex_oauth") {
    throw new Error("Profile is not a Codex OAuth profile");
  }

  const authPath = resolveCodexAuthPath();
  const dir = path.dirname(authPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const payload: CodexAuthJson = {
    tokens: {
      access_token: profile.credentials.accessToken,
      refresh_token: profile.credentials.refreshToken,
      id_token: profile.credentials.idToken,
      account_id: profile.credentials.accountId
    },
    last_refresh: new Date().toISOString()
  };

  fs.writeFileSync(authPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  if (process.platform !== "win32") {
    fs.chmodSync(authPath, 0o600);
  }

  return authPath;
}
