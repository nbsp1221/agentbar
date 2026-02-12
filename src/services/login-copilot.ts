import { intro, note, outro, spinner } from "@clack/prompts";
import { randomUUID } from "node:crypto";
import { pollForAccessToken, requestDeviceCode } from "../providers/copilot/device-flow";
import { fetchCopilotLabel } from "../providers/copilot/identity";
import { fetchCopilotUsageForProfile } from "../providers/copilot/usage";
import { resolveStorePath } from "../store/paths";
import { setActiveProfile, upsertProfile } from "../store/store";
import { normalizePersistedPlanType } from "../utils/plan";

export async function loginCopilot(): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new Error("copilot login requires an interactive TTY");
  }

  intro("Copilot device login");

  const spin = spinner();
  spin.start("Requesting GitHub device code...");
  const device = await requestDeviceCode();
  spin.stop("Device code ready");

  note(`Visit: ${device.verification_uri}\nCode: ${device.user_code}`, "Authorize");

  const polling = spinner();
  polling.start("Waiting for authorization...");
  const token = await pollForAccessToken({
    deviceCode: device.device_code,
    intervalMs: Math.max(1000, device.interval * 1000),
    expiresAt: Date.now() + device.expires_in * 1000
  });
  polling.stop("Authorization complete");

  const spinIdentity = spinner();
  spinIdentity.start("Fetching GitHub identity...");
  const email = await fetchCopilotLabel(token);
  spinIdentity.stop("Identity loaded");

  const now = new Date().toISOString();
  const id = randomUUID();
  const storePath = resolveStorePath();
  const baseProfile = {
    id,
    provider: "copilot" as const,
    email,
    createdAt: now,
    updatedAt: now,
    credentials: {
      kind: "copilot_token" as const,
      githubToken: token
    }
  };

  let planType: string | undefined;
  try {
    const usage = await fetchCopilotUsageForProfile(baseProfile);
    planType = normalizePersistedPlanType(usage.snapshot?.planType);
  } catch {
    // Ignore usage fetch failures during login. Credentials are already valid.
  }

  await upsertProfile(
    storePath,
    planType
      ? {
          ...baseProfile,
          planType
        }
      : baseProfile
  );

  await setActiveProfile(storePath, "copilot", id);
  outro(`Saved Copilot profile: ${email}${planType ? ` (${planType})` : ""}`);
}
