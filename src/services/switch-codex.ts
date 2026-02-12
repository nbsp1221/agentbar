import { outro, select } from "@clack/prompts";
import { writeCodexAuthFromProfile } from "../providers/codex/apply-auth";
import { ensureFreshCodexProfile } from "../providers/codex/refresh";
import { resolveStorePath } from "../store/paths";
import { readStore, setActiveProfile, upsertProfile } from "../store/store";
import type { AccountType, AuthProfile } from "../store/types";
import { normalizeEmailSelector } from "../utils/string-normalize";

type SwitchTarget = {
  id: string;
  email: string;
  accountType?: AccountType;
};

export function normalizeAccountType(value?: string): AccountType | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === "team") {
    return "business";
  }
  if (normalized === "personal" || normalized === "business") {
    return normalized;
  }
  throw new Error("Invalid --account value (allowed: personal, business, team)");
}

export function resolveCodexSwitchTarget(
  candidates: SwitchTarget[],
  selector: { email: string; accountType?: AccountType }
): SwitchTarget {
  const email = normalizeEmailSelector(selector.email);
  const filteredByEmail = candidates.filter((c) => normalizeEmailSelector(c.email) === email);
  const filtered = selector.accountType
    ? filteredByEmail.filter((c) => c.accountType === selector.accountType)
    : filteredByEmail;

  if (filtered.length === 0) {
    throw new Error("No matching Codex profile found");
  }
  if (filtered.length > 1) {
    const hints = filtered.map((f) => `${f.id} (${f.accountType ?? "-"})`).join(", ");
    throw new Error(`Ambiguous Codex selector. Candidates: ${hints}`);
  }
  return filtered[0]!;
}

async function resolveInteractiveTarget(candidates: AuthProfile[]): Promise<AuthProfile> {
  const choice = await select({
    message: "Select Codex account",
    options: candidates.map((c) => ({
      value: c.id,
      label: `${c.email} (${c.accountType ?? "-"})`,
      hint: c.id
    }))
  });

  if (typeof choice !== "string") {
    throw new Error("No Codex account selected");
  }

  const picked = candidates.find((c) => c.id === choice);
  if (!picked) {
    throw new Error("Selected account not found");
  }
  return picked;
}

export async function switchCodex(params: {
  email?: string;
  account?: string;
  outputJson?: boolean;
}): Promise<{ id: string; email: string; accountType?: string; authPath: string }> {
  const storePath = resolveStorePath();
  const store = await readStore(storePath);
  const codexProfiles = store.profiles.filter(
    (p): p is AuthProfile & { provider: "codex" } =>
      p.provider === "codex" && p.credentials.kind === "codex_oauth"
  );

  if (codexProfiles.length === 0) {
    throw new Error("No Codex profiles found");
  }

  let target: AuthProfile;
  if (params.email) {
    const selected = resolveCodexSwitchTarget(
      codexProfiles.map((p) => ({
        id: p.id,
        email: p.email,
        accountType: p.accountType
      })),
      {
        email: params.email,
        accountType: normalizeAccountType(params.account)
      }
    );
    target = codexProfiles.find((p) => p.id === selected.id)!;
  } else {
    target = await resolveInteractiveTarget(codexProfiles);
  }

  await setActiveProfile(storePath, "codex", target.id);

  // Ensure we don't write an already-expired access token into ~/.codex/auth.json.
  const refreshed = await ensureFreshCodexProfile(target, { requireFresh: true });
  if (refreshed.error && !refreshed.updatedProfile) {
    throw new Error("Codex token refresh failed; please run `agentbar login codex` again");
  }
  const effectiveTarget = refreshed.updatedProfile ?? target;
  if (refreshed.updatedProfile) {
    await upsertProfile(storePath, effectiveTarget);
  }

  const authPath = writeCodexAuthFromProfile(effectiveTarget);

  if (!params.outputJson) {
    outro(`Switched Codex: ${effectiveTarget.email} (${effectiveTarget.accountType ?? "-"})`);
  }

  return {
    id: effectiveTarget.id,
    email: effectiveTarget.email,
    accountType: effectiveTarget.accountType,
    authPath
  };
}
