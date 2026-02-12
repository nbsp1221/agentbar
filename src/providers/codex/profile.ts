import { normalizePlanSelector } from "../../utils/plan";

const OPENAI_AUTH_CLAIM = "https://api.openai.com/auth";
const OPENAI_PROFILE_CLAIM = "https://api.openai.com/profile";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function inferCodexPlanType(params: {
  idPayload?: Record<string, unknown> | null;
  accessPayload?: Record<string, unknown> | null;
}): string | undefined {
  const accessAuth = asRecord(params.accessPayload?.[OPENAI_AUTH_CLAIM]);
  const idAuth = asRecord(params.idPayload?.[OPENAI_AUTH_CLAIM]);

  const candidates: unknown[] = [
    accessAuth?.chatgpt_plan_type,
    accessAuth?.plan_type,
    params.accessPayload?.chatgpt_plan_type,
    params.accessPayload?.plan_type,
    idAuth?.chatgpt_plan_type,
    idAuth?.plan_type,
    params.idPayload?.chatgpt_plan_type,
    params.idPayload?.plan_type
  ];

  for (const candidate of candidates) {
    const plan = normalizePlanSelector(candidate);
    if (plan) {
      return plan;
    }
  }

  return undefined;
}

export function inferCodexEmail(params: {
  idPayload?: Record<string, unknown> | null;
  accessPayload?: Record<string, unknown> | null;
}): string | undefined {
  const accessProfile = asRecord(params.accessPayload?.[OPENAI_PROFILE_CLAIM]);
  const idProfile = asRecord(params.idPayload?.[OPENAI_PROFILE_CLAIM]);

  const candidates: unknown[] = [
    params.idPayload?.email,
    idProfile?.email,
    params.accessPayload?.email,
    accessProfile?.email
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return undefined;
}

export function inferCodexAccountId(params: {
  idPayload?: Record<string, unknown> | null;
  accessPayload?: Record<string, unknown> | null;
}): string | undefined {
  const accessAuth = asRecord(params.accessPayload?.[OPENAI_AUTH_CLAIM]);
  const idAuth = asRecord(params.idPayload?.[OPENAI_AUTH_CLAIM]);

  const candidates: unknown[] = [
    accessAuth?.chatgpt_account_id,
    accessAuth?.account_id,
    params.accessPayload?.chatgpt_account_id,
    params.accessPayload?.account_id,
    idAuth?.chatgpt_account_id,
    idAuth?.account_id,
    params.idPayload?.chatgpt_account_id,
    params.idPayload?.account_id
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return undefined;
}
