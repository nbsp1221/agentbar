import type { AuthProfile, Provider } from "../../store/types";

export type CopilotUsageMetric = {
  label: string;
  usedPercent?: number;
  remaining?: number;
  entitlement?: number;
  unlimited?: boolean;
  overageCount?: number;
  resetAtMs?: number;
};

type UsageRowBase = {
  provider: Provider;
  email: string;
  accountType?: string;
  planType: string;
  note?: string;
  error?: string;
};

export type CodexUsageRow = UsageRowBase & {
  provider: "codex";
  primaryLabel?: string;
  primaryUsedPercent: number;
  primaryResetAtMs?: number;
  secondaryLabel?: string;
  secondaryUsedPercent?: number;
  secondaryResetAtMs?: number;
};

export type CopilotUsageRow = UsageRowBase & {
  provider: "copilot";
  metrics: CopilotUsageMetric[];
  resetAtMs?: number;
};

export type UsageRow = CodexUsageRow | CopilotUsageRow;

export type UsageCollectorResult = {
  row: UsageRow;
  updatedProfile?: AuthProfile;
};

export type UsageCollectorContext = {
  fetchImpl: typeof fetch;
};

export type UsageCollector = {
  canCollect(profile: AuthProfile): boolean;
  collect(profile: AuthProfile, ctx: UsageCollectorContext): Promise<UsageCollectorResult>;
};
