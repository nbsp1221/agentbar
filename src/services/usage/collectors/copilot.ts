import { fetchCopilotUsageForProfile } from "../../../providers/copilot/usage";
import type { AuthProfile } from "../../../store/types";
import type { UsageCollector, UsageCollectorContext, UsageCollectorResult } from "../types";

export const copilotUsageCollector: UsageCollector = {
  canCollect(profile: AuthProfile): boolean {
    return profile.provider === "copilot" && profile.credentials.kind === "copilot_token";
  },
  async collect(profile: AuthProfile, ctx: UsageCollectorContext): Promise<UsageCollectorResult> {
    const result = await fetchCopilotUsageForProfile(profile as AuthProfile & { provider: "copilot" }, ctx.fetchImpl);
    if (result.snapshot) {
      return {
        row: {
          provider: "copilot",
          email: profile.email,
          accountType: profile.accountType,
          planType: result.snapshot.planType,
          note: profile.note,
          metrics: result.snapshot.metrics,
          resetAtMs: result.snapshot.resetAtMs
        }
      };
    }

    return {
      row: {
        provider: "copilot",
        email: profile.email,
        accountType: profile.accountType,
        planType: "unknown",
        note: profile.note,
        metrics: [],
        error: result.error ?? "copilot_usage_error"
      }
    };
  }
};
