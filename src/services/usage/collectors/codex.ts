import { fetchCodexUsageForProfile } from "../../../providers/codex/usage";
import type { AuthProfile } from "../../../store/types";
import type { UsageCollector, UsageCollectorContext, UsageCollectorResult } from "../types";

function codexWindowLabel(seconds: number | undefined, fallback: "primary" | "secondary"): string {
  if (seconds === 18_000) {
    return "5h";
  }
  if (seconds === 604_800) {
    return "weekly";
  }
  if (typeof seconds === "number" && seconds > 0) {
    if (seconds % 86_400 === 0) {
      return `${Math.floor(seconds / 86_400)}d`;
    }
    if (seconds % 3600 === 0) {
      return `${Math.floor(seconds / 3600)}h`;
    }
  }
  return fallback;
}

export const codexUsageCollector: UsageCollector = {
  canCollect(profile: AuthProfile): boolean {
    return profile.provider === "codex" && profile.credentials.kind === "codex_oauth";
  },
  async collect(profile: AuthProfile, ctx: UsageCollectorContext): Promise<UsageCollectorResult> {
    const result = await fetchCodexUsageForProfile(profile as AuthProfile & { provider: "codex" }, ctx.fetchImpl);
    if (result.snapshot) {
      return {
        row: {
          provider: "codex",
          email: profile.email,
          planType: result.snapshot.planType,
          note: profile.note,
          primaryLabel: codexWindowLabel(result.snapshot.primaryWindowSeconds, "primary"),
          primaryUsedPercent: result.snapshot.primaryUsedPercent,
          primaryResetAtMs: result.snapshot.primaryResetAtMs,
          secondaryLabel: codexWindowLabel(result.snapshot.secondaryWindowSeconds, "secondary"),
          secondaryUsedPercent: result.snapshot.secondaryUsedPercent,
          secondaryResetAtMs: result.snapshot.secondaryResetAtMs
        },
        updatedProfile: result.updatedProfile
      };
    }

    return {
      row: {
        provider: "codex",
        email: profile.email,
        planType: "unknown",
        note: profile.note,
        primaryLabel: "5h",
        primaryUsedPercent: 0,
        secondaryLabel: "weekly",
        error: result.error ?? "codex_usage_error"
      },
      updatedProfile: result.updatedProfile
    };
  }
};
