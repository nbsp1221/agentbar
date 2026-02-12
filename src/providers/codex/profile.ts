import type { AccountType } from "../../store/types";

const OPENAI_AUTH_CLAIM = "https://api.openai.com/auth";
const OPENAI_PROFILE_CLAIM = "https://api.openai.com/profile";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeCodexAccountType(value: unknown): AccountType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (
    normalized.includes("business") ||
    normalized.includes("team") ||
    normalized.includes("enterprise") ||
    normalized.includes("workspace")
  ) {
    return "business";
  }

  if (
    normalized.includes("personal") ||
    normalized.includes("plus") ||
    normalized.includes("pro") ||
    normalized.includes("free") ||
    normalized.includes("individual")
  ) {
    return "personal";
  }

  return undefined;
}

export function inferCodexAccountType(params: {
  idPayload?: Record<string, unknown> | null;
  accessPayload?: Record<string, unknown> | null;
}): AccountType {
  const candidates: unknown[] = [];

  const accessAuth = asRecord(params.accessPayload?.[OPENAI_AUTH_CLAIM]);
  const idAuth = asRecord(params.idPayload?.[OPENAI_AUTH_CLAIM]);

  candidates.push(
    accessAuth?.chatgpt_account_type,
    accessAuth?.account_type,
    accessAuth?.workspace_type,
    // Some tokens expose only plan-type, not explicit account-type. We treat team/workspace plans as business.
    accessAuth?.chatgpt_plan_type,
    accessAuth?.plan_type,
    params.accessPayload?.chatgpt_account_type,
    params.accessPayload?.account_type,
    params.accessPayload?.workspace_type,
    params.accessPayload?.chatgpt_plan_type,
    params.accessPayload?.plan_type,
    idAuth?.chatgpt_account_type,
    idAuth?.account_type,
    idAuth?.workspace_type,
    idAuth?.chatgpt_plan_type,
    idAuth?.plan_type,
    params.idPayload?.chatgpt_account_type,
    params.idPayload?.account_type,
    params.idPayload?.workspace_type,
    params.idPayload?.chatgpt_plan_type,
    params.idPayload?.plan_type
  );

  for (const candidate of candidates) {
    const inferred = normalizeCodexAccountType(candidate);
    if (inferred) {
      return inferred;
    }
  }

  return "personal";
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
