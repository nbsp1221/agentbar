import { select } from "@clack/prompts";
import type { AuthProfile } from "../store/types";
import { normalizeEmailSelector } from "../utils/string-normalize";
import { normalizePlanSelector } from "../utils/plan";

export function filterProfilesByEmail<T extends AuthProfile>(
  candidates: T[],
  selector: { email: string; plan?: string }
): T[] {
  const email = normalizeEmailSelector(selector.email);
  const byEmail = candidates.filter((c) => normalizeEmailSelector(c.email) === email);
  const normalizedPlan = normalizePlanSelector(selector.plan);
  if (!normalizedPlan) {
    return byEmail;
  }
  return byEmail.filter((c) => normalizePlanSelector(c.planType) === normalizedPlan);
}

export async function promptSelectProfile<T extends AuthProfile>(message: string, candidates: T[]): Promise<T> {
  const choice = await select({
    message,
    options: candidates.map((c) => ({
      value: c.id,
      label: c.planType ? `${c.email} (${c.planType})` : c.email,
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
