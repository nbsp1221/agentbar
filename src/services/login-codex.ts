import { intro, note, outro, spinner, text } from "@clack/prompts";
import { randomUUID } from "node:crypto";
import {
  buildAuthorizeUrl,
  createOAuthState,
  createPkceVerifier,
  exchangeCodeForTokens,
  parseOAuthRedirect
} from "../providers/codex/oauth";
import { inferCodexAccountId, inferCodexEmail, inferCodexPlanType } from "../providers/codex/profile";
import { DEFAULT_FALLBACK_TTL_MS } from "../providers/codex/refresh";
import { resolveStorePath } from "../store/paths";
import { upsertProfile } from "../store/store";
import { safeDecodeJwtPayload } from "../utils/jwt";

export function buildCodexAuthorizeOutput(url: string): {
  boxedMessage: string;
  rawUrl: string;
} {
  return {
    boxedMessage: "Open the URL below in your browser.",
    rawUrl: url
  };
}

export async function loginCodex(): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new Error("codex login requires an interactive TTY");
  }

  intro("Codex OAuth login");

  const verifier = createPkceVerifier();
  const state = createOAuthState();
  const url = buildAuthorizeUrl({ state, verifier });
  const authorizeOutput = buildCodexAuthorizeOutput(url);

  note(authorizeOutput.boxedMessage, "Authorize");
  console.log(authorizeOutput.rawUrl);
  const redirectUrl = await text({
    message: "Paste redirected callback URL"
  });

  if (typeof redirectUrl !== "string" || redirectUrl.trim().length === 0) {
    throw new Error("No redirect URL provided");
  }

  const parsed = parseOAuthRedirect(redirectUrl.trim());
  if (parsed.state !== state) {
    throw new Error("OAuth state mismatch");
  }

  const spin = spinner();
  spin.start("Exchanging auth code...");
  const tokens = await exchangeCodeForTokens({ code: parsed.code, verifier });
  spin.stop("Token exchange complete");

  const idPayload = safeDecodeJwtPayload(tokens.id_token);
  const accessPayload = safeDecodeJwtPayload(tokens.access_token);

  const email = inferCodexEmail({ idPayload, accessPayload });
  if (!email) {
    throw new Error("Could not extract email from token; ensure email scope is granted and retry login");
  }

  const planType = inferCodexPlanType({ idPayload, accessPayload });
  const accountId = inferCodexAccountId({ idPayload, accessPayload });
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const expSeconds = typeof accessPayload?.exp === "number" ? accessPayload.exp : undefined;
  const expiresAt = typeof expSeconds === "number" && Number.isFinite(expSeconds) ? Math.floor(expSeconds) * 1000 : undefined;
  const expiresAtFallback =
    typeof tokens.expires_in === "number" && Number.isFinite(tokens.expires_in) && tokens.expires_in > 0
      ? nowMs + Math.floor(tokens.expires_in) * 1000
      : nowMs + DEFAULT_FALLBACK_TTL_MS;
  const id = randomUUID();
  const storePath = resolveStorePath();

  await upsertProfile(storePath, {
    id,
    provider: "codex",
    email,
    planType,
    createdAt: now,
    updatedAt: now,
    credentials: {
      kind: "codex_oauth",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      accountId,
      expiresAt: expiresAt ?? expiresAtFallback,
      lastRefresh: now
    }
  });

  outro(`Saved Codex profile: ${email}${planType ? ` (${planType})` : ""}`);
}
