import { select } from "@clack/prompts";
import type { AccountType, AuthProfile } from "../store/types";
import { normalizeEmailSelector } from "../utils/string-normalize";

export function filterProfilesByEmail<T extends AuthProfile>(
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

export async function promptSelectProfile<T extends AuthProfile>(message: string, candidates: T[]): Promise<T> {
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

