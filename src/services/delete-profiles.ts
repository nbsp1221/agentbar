import { confirm, outro } from "@clack/prompts";
import { filterProfilesByEmail, promptSelectProfile } from "./profile-select";
import { resolveStorePath } from "../store/paths";
import { readStore, updateStoreWithLock } from "../store/store";
import type { AccountType, AuthProfile } from "../store/types";
import { normalizeAccountType } from "../utils/account-type";

type DeleteResult = {
  id: string;
  provider: AuthProfile["provider"];
  email: string;
  accountType?: AccountType;
  wasActive: boolean;
};

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
    const matches = filterProfilesByEmail(codexProfiles, {
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
      target = await promptSelectProfile("Select Codex account to delete", matches);
    } else {
      target = matches[0]!;
    }
  } else {
    if (!process.stdin.isTTY) {
      throw new Error("codex delete requires an interactive TTY when email is omitted");
    }
    target = await promptSelectProfile("Select Codex account to delete", codexProfiles);
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
    const matches = filterProfilesByEmail(copilotProfiles, { email: params.email });
    if (matches.length === 0) {
      throw new Error("No matching Copilot profile found");
    }
    if (matches.length > 1) {
      if (!process.stdin.isTTY) {
        const hints = matches.map((m) => m.id).join(", ");
        throw new Error(`Ambiguous Copilot selector. Candidates: ${hints}`);
      }
      target = await promptSelectProfile("Select Copilot account to delete", matches);
    } else {
      target = matches[0]!;
    }
  } else {
    if (!process.stdin.isTTY) {
      throw new Error("copilot delete requires an interactive TTY when email is omitted");
    }
    target = await promptSelectProfile("Select Copilot account to delete", copilotProfiles);
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
