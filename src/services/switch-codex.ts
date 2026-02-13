import { outro } from "@clack/prompts";
import { writeCodexAuthFromProfile } from "../providers/codex/apply-auth";
import { ensureFreshCodexProfile } from "../providers/codex/refresh";
import { promptSelectProfile } from "./profile-select";
import { resolveStorePath } from "../store/paths";
import { readStore, setActiveProfile, upsertProfile } from "../store/store";
import type { AuthProfile } from "../store/types";
import { normalizeEmailSelector } from "../utils/string-normalize";
import { normalizePlanSelector } from "../utils/plan";
import { formatAmbiguousProfileCandidates } from "../utils/profile-candidate";

type SwitchTarget = {
  id: string;
  email: string;
  planType?: string;
};

export function resolveCodexSwitchTarget(
  candidates: SwitchTarget[],
  selector: { email: string; plan?: string }
): SwitchTarget {
  const email = normalizeEmailSelector(selector.email);
  const filteredByEmail = candidates.filter((c) => normalizeEmailSelector(c.email) === email);
  const normalizedPlan = normalizePlanSelector(selector.plan);
  const filtered = normalizedPlan
    ? filteredByEmail.filter((c) => normalizePlanSelector(c.planType) === normalizedPlan)
    : filteredByEmail;

  if (filtered.length === 0) {
    throw new Error("No matching Codex profile found");
  }
  if (filtered.length > 1) {
    const hints = formatAmbiguousProfileCandidates(filtered);
    throw new Error(`Ambiguous Codex selector. Candidates: ${hints}`);
  }
  return filtered[0]!;
}

export async function switchCodex(params: {
  email?: string;
  plan?: string;
  outputJson?: boolean;
}): Promise<{ id: string; email: string; planType?: string; authPath: string }> {
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
        planType: p.planType
      })),
      {
        email: params.email,
        plan: params.plan
      }
    );
    target = codexProfiles.find((p) => p.id === selected.id)!;
  } else {
    target = await promptSelectProfile("Select Codex account", codexProfiles);
  }

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
  await setActiveProfile(storePath, "codex", effectiveTarget.id);

  if (!params.outputJson) {
    outro(`Switched Codex: ${effectiveTarget.email}`);
  }

  return {
    id: effectiveTarget.id,
    email: effectiveTarget.email,
    planType: effectiveTarget.planType,
    authPath
  };
}
