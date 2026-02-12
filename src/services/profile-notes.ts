import { intro, outro, text } from "@clack/prompts";
import { resolveStorePath } from "../store/paths";
import { readStore, updateStoreWithLock } from "../store/store";
import type { AuthProfile, Provider } from "../store/types";
import { filterProfilesByEmail, promptSelectProfile } from "./profile-select";
import { formatAmbiguousProfileCandidates } from "../utils/profile-candidate";

type NoteTarget = AuthProfile & { id: string; provider: Provider };

function ensureInteractiveIfMissing(message: string): void {
  if (!process.stdin.isTTY) {
    throw new Error(message);
  }
}

async function updateNote(profileId: string, note: string | undefined): Promise<AuthProfile> {
  const storePath = resolveStorePath();
  let updated: AuthProfile | undefined;
  const now = new Date().toISOString();

  await updateStoreWithLock(storePath, (store) => {
    const idx = store.profiles.findIndex((p) => p.id === profileId);
    if (idx < 0) {
      throw new Error("Profile not found");
    }

    const next = { ...store.profiles[idx] } as AuthProfile;
    next.note = note;
    next.updatedAt = now;
    store.profiles[idx] = next;
    updated = next;
    return store;
  });

  if (!updated) {
    throw new Error("Profile not found");
  }
  return updated;
}

function normalizeNoteInput(value: string): string {
  // Store a trimmed note. CLI rendering will normalize whitespace further.
  return value.trim();
}

export async function setProfileNote(params: {
  provider: Provider;
  email?: string;
  plan?: string;
  note?: string;
  outputJson?: boolean;
}): Promise<{ id: string; provider: Provider; email: string; note?: string }> {
  const storePath = resolveStorePath();
  const store = await readStore(storePath);

  const profiles = store.profiles.filter((p): p is NoteTarget => p.provider === params.provider);
  if (profiles.length === 0) {
    throw new Error(`No ${params.provider} profiles found`);
  }

  let target: NoteTarget;
  if (params.email) {
    const matches = filterProfilesByEmail(profiles, { email: params.email, plan: params.plan });

    if (matches.length === 0) {
      throw new Error(`No matching ${params.provider} profile found`);
    }
    if (matches.length > 1) {
      if (!process.stdin.isTTY) {
        const hints = formatAmbiguousProfileCandidates(matches);
        throw new Error(`Ambiguous selector. Candidates: ${hints}`);
      }
      target = await promptSelectProfile(`Select ${params.provider} account`, matches);
    } else {
      target = matches[0]!;
    }
  } else {
    ensureInteractiveIfMissing("note set requires an interactive TTY when email is omitted");
    intro("Set note");
    target = await promptSelectProfile(`Select ${params.provider} account`, profiles);
  }

  let noteValue = params.note;
  if (typeof noteValue !== "string" || noteValue.trim().length === 0) {
    ensureInteractiveIfMissing("note set requires note text in non-interactive mode");
    const entered = await text({
      message: "Note",
      initialValue: target.note ?? ""
    });
    if (typeof entered !== "string" || entered.trim().length === 0) {
      throw new Error("No note provided");
    }
    noteValue = entered;
  }

  const normalized = normalizeNoteInput(noteValue);
  const updated = await updateNote(target.id, normalized);

  if (!params.outputJson) {
    outro(`Saved note: ${updated.email}`);
  }

  return {
    id: updated.id,
    provider: updated.provider,
    email: updated.email,
    note: updated.note
  };
}

export async function clearProfileNote(params: {
  provider: Provider;
  email?: string;
  plan?: string;
  outputJson?: boolean;
}): Promise<{ id: string; provider: Provider; email: string }> {
  const storePath = resolveStorePath();
  const store = await readStore(storePath);

  const profiles = store.profiles.filter((p): p is NoteTarget => p.provider === params.provider);
  if (profiles.length === 0) {
    throw new Error(`No ${params.provider} profiles found`);
  }

  let target: NoteTarget;
  if (params.email) {
    const matches = filterProfilesByEmail(profiles, { email: params.email, plan: params.plan });

    if (matches.length === 0) {
      throw new Error(`No matching ${params.provider} profile found`);
    }
    if (matches.length > 1) {
      if (!process.stdin.isTTY) {
        const hints = formatAmbiguousProfileCandidates(matches);
        throw new Error(`Ambiguous selector. Candidates: ${hints}`);
      }
      target = await promptSelectProfile(`Select ${params.provider} account`, matches);
    } else {
      target = matches[0]!;
    }
  } else {
    ensureInteractiveIfMissing("note clear requires an interactive TTY when email is omitted");
    intro("Clear note");
    target = await promptSelectProfile(`Select ${params.provider} account`, profiles);
  }

  const updated = await updateNote(target.id, undefined);
  if (!params.outputJson) {
    outro(`Cleared note: ${updated.email}`);
  }

  return {
    id: updated.id,
    provider: updated.provider,
    email: updated.email
  };
}
