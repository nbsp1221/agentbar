import { confirm, outro, select } from "@clack/prompts";
import { resolveStorePath } from "../store/paths";
import { readStore, updateStoreWithLock } from "../store/store";
import type { AccountType, AuthProfile } from "../store/types";
import { normalizeEmailSelector } from "../utils/string-normalize";

type DeleteResult = {
  id: string;
  provider: AuthProfile["provider"];
  email: string;
  accountType?: AccountType;
  wasActive: boolean;
};

function normalizeAccountType(value?: string): AccountType | undefined {
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

function resolveByEmail<T extends AuthProfile>(
  candidates: T[],
  selector: { email: string; accountType?: AccountType }
): T[] {
  const email = normalizeEmailSelector(selector.email);
  const byEmail = candidates.filter((c) => normalizeEmailSelector(c.email) === email);
  if (!selector.accountType) {
    return byEmail;
  }
  return byEmail.filter((c) => c.accountType === selector.accountType);
}

async function resolveInteractiveTarget<T extends AuthProfile>(message: string, candidates: T[]): Promise<T> {
  const choice = await select({
    message,
    options: candidates.map((c) => ({
      value: c.id,
      label: `${c.email} (${c.accountType ?? "-"})`,
      hint: c.id
    }))
  });

  if (typeof choice !== "string") {
    throw new Error("No account selected");
  }

  const picked = candidates.find((c) => c.id === choice);
  if (!picked) {
    throw new Error("Selected account not found");
  }
  return picked;
}

async function deleteProfileById(profileId: string): Promise<DeleteResult> {
  const storePath = resolveStorePath();
  let deleted: AuthProfile | undefined;
  let wasActive = false;

  await updateStoreWithLock(storePath, (store) => {
    const idx = store.profiles.findIndex((p) => p.id === profileId);
    if (idx < 0) {
      throw new Error("Profile not found");
    }

    deleted = store.profiles[idx]!;
    store.profiles.splice(idx, 1);

    const provider = deleted.provider;
    if (store.active[provider] === deleted.id) {
      wasActive = true;
      delete store.active[provider];
    }

    return store;
  });

  if (!deleted) {
    throw new Error("Profile not found");
  }

  return {
    id: deleted.id,
    provider: deleted.provider,
    email: deleted.email,
    accountType: deleted.accountType,
    wasActive
  };
}

async function requireYesOrConfirm(params: { yes?: boolean; message: string }): Promise<void> {
  if (params.yes) {
    return;
  }

  if (!process.stdin.isTTY) {
    throw new Error("Refusing to delete without --yes (non-interactive mode)");
  }

  const ok = await confirm({ message: params.message });
  if (ok !== true) {
    throw new Error("Delete cancelled");
  }
}

export async function deleteCodexProfile(params: {
  email?: string;
  account?: string;
  yes?: boolean;
  outputJson?: boolean;
}): Promise<DeleteResult> {
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
    const matches = resolveByEmail(codexProfiles, {
      email: params.email,
      accountType: normalizeAccountType(params.account)
    });

    if (matches.length === 0) {
      throw new Error("No matching Codex profile found");
    }

    if (matches.length > 1) {
      if (!process.stdin.isTTY) {
        const hints = matches.map((m) => `${m.id} (${m.accountType ?? "-"})`).join(", ");
        throw new Error(`Ambiguous Codex selector. Candidates: ${hints}`);
      }
      target = await resolveInteractiveTarget("Select Codex account to delete", matches);
    } else {
      target = matches[0]!;
    }
  } else {
    if (!process.stdin.isTTY) {
      throw new Error("codex delete requires an interactive TTY when email is omitted");
    }
    target = await resolveInteractiveTarget("Select Codex account to delete", codexProfiles);
  }

  await requireYesOrConfirm({
    yes: params.yes,
    message: `Delete Codex profile ${target.email} (${target.accountType ?? "-"})?`
  });

  const result = await deleteProfileById(target.id);
  if (!params.outputJson) {
    outro(`Deleted Codex: ${result.email} (${result.accountType ?? "-"})`);
  }
  return result;
}

export async function deleteCopilotProfile(params: {
  email?: string;
  yes?: boolean;
  outputJson?: boolean;
}): Promise<DeleteResult> {
  const storePath = resolveStorePath();
  const store = await readStore(storePath);
  const copilotProfiles = store.profiles.filter(
    (p): p is AuthProfile & { provider: "copilot" } =>
      p.provider === "copilot" && p.credentials.kind === "copilot_token"
  );

  if (copilotProfiles.length === 0) {
    throw new Error("No Copilot profiles found");
  }

  let target: AuthProfile;
  if (params.email) {
    const matches = resolveByEmail(copilotProfiles, { email: params.email });
    if (matches.length === 0) {
      throw new Error("No matching Copilot profile found");
    }
    if (matches.length > 1) {
      if (!process.stdin.isTTY) {
        const hints = matches.map((m) => m.id).join(", ");
        throw new Error(`Ambiguous Copilot selector. Candidates: ${hints}`);
      }
      target = await resolveInteractiveTarget("Select Copilot account to delete", matches);
    } else {
      target = matches[0]!;
    }
  } else {
    if (!process.stdin.isTTY) {
      throw new Error("copilot delete requires an interactive TTY when email is omitted");
    }
    target = await resolveInteractiveTarget("Select Copilot account to delete", copilotProfiles);
  }

  await requireYesOrConfirm({
    yes: params.yes,
    message: `Delete Copilot profile ${target.email}?`
  });

  const result = await deleteProfileById(target.id);
  if (!params.outputJson) {
    outro(`Deleted Copilot: ${result.email}`);
  }
  return result;
}

