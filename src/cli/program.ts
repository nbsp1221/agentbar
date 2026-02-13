import { Command } from "commander";
import { parseProviderArg } from "./provider-arg";
import { listAccounts } from "../services/accounts-list";
import { formatAccounts } from "./render/accounts";
import { loginCodex } from "../services/login-codex";
import { loginCopilot } from "../services/login-copilot";
import { switchCodex } from "../services/switch-codex";
import { deleteCodexProfile, deleteCopilotProfile } from "../services/delete-profiles";
import { collectUsage } from "../services/usage";
import { formatUsageSections } from "./render/usage";
import { clearProfileNote, setProfileNote } from "../services/profile-notes";

function requireProvider(value: ReturnType<typeof parseProviderArg>, raw: string): NonNullable<ReturnType<typeof parseProviderArg>> {
  if (!value) {
    throw new Error(`Invalid provider: ${raw} (allowed: codex, copilot)`);
  }
  return value;
}

export function buildProgram(): Command {
  const program = new Command();

  program.name("agentbar").description("CLI for managing multi-provider auth profiles");

  const login = program.command("login").description("Login to a provider");
  login.command("codex").description("Login to Codex via OAuth").action(loginCodex);
  login.command("copilot").description("Login to Copilot via GitHub device flow").action(loginCopilot);
  program
    .command("accounts")
    .description("List stored accounts")
    .argument("[provider]", "Filter by provider (codex|copilot)")
    .option("--json", "Print JSON output")
    .action(async (providerArg?: string, cmdOpts?: { json?: boolean }) => {
      const provider = parseProviderArg(providerArg);
      const rows = await listAccounts({ provider });
      if (cmdOpts?.json) {
        console.log(JSON.stringify(rows, null, 2));
        return;
      }
      if (rows.length === 0) {
        console.log("No accounts found.");
        return;
      }
      console.log(formatAccounts(rows));
    });
  const switchCommand = program.command("switch").description("Switch active Codex account");
  switchCommand
    .command("codex")
    .description("Switch active Codex account and apply to Codex auth.json")
    .argument("[email]", "Email selector")
    .option("--plan <plan>", "Plan selector for same-email Codex profiles (e.g. plus, team)")
    .option("--json", "Print JSON output")
    .action(async (email?: string, cmdOpts?: { plan?: string; json?: boolean }) => {
      const result = await switchCodex({
        email,
        plan: cmdOpts?.plan,
        outputJson: Boolean(cmdOpts?.json)
      });
      if (cmdOpts?.json) {
        console.log(JSON.stringify(result, null, 2));
      }
    });

  const del = program.command("delete").description("Delete stored provider accounts");
  del
    .command("codex")
    .description("Delete a stored Codex profile")
    .argument("[email]", "Email selector")
    .option("--plan <plan>", "Plan selector for same-email Codex profiles (e.g. plus, team)")
    .option("-y, --yes", "Skip confirmation prompt (required for non-interactive runs)")
    .option("--json", "Print JSON output")
    .action(async (email?: string, cmdOpts?: { plan?: string; yes?: boolean; json?: boolean }) => {
      const result = await deleteCodexProfile({
        email,
        plan: cmdOpts?.plan,
        yes: Boolean(cmdOpts?.yes),
        outputJson: Boolean(cmdOpts?.json)
      });
      if (cmdOpts?.json) {
        console.log(JSON.stringify(result, null, 2));
      }
    });
  del
    .command("copilot")
    .description("Delete a stored Copilot profile")
    .argument("[email]", "Email selector")
    .option("--plan <plan>", "Plan selector for same-email Copilot profiles (e.g. individual, business)")
    .option("-y, --yes", "Skip confirmation prompt (required for non-interactive runs)")
    .option("--json", "Print JSON output")
    .action(async (email?: string, cmdOpts?: { plan?: string; yes?: boolean; json?: boolean }) => {
      const result = await deleteCopilotProfile({
        email,
        plan: cmdOpts?.plan,
        yes: Boolean(cmdOpts?.yes),
        outputJson: Boolean(cmdOpts?.json)
      });
      if (cmdOpts?.json) {
        console.log(JSON.stringify(result, null, 2));
      }
    });

  program
    .command("usage")
    .description("Show usage and reset windows")
    .argument("[provider]", "Filter by provider (codex|copilot)")
    .option("--provider <provider>", "Filter by provider (codex|copilot)")
    .option("--refresh", "Force fresh fetch")
    .option("--json", "Print JSON output")
    .action(async (providerArg?: string, cmdOpts?: { provider?: string; refresh?: boolean; json?: boolean }) => {
      const provider = parseProviderArg(cmdOpts?.provider ?? providerArg);
      const rows = await collectUsage({ provider, refresh: Boolean(cmdOpts?.refresh) });
      if (cmdOpts?.json) {
        console.log(JSON.stringify(rows, null, 2));
        return;
      }
      if (rows.length === 0) {
        console.log("No usage rows found.");
        return;
      }
      console.log(formatUsageSections(rows));
    });

  const noteCmd = program.command("note").description("Add or clear notes for stored profiles");
  noteCmd
    .command("set")
    .description("Set a note on a stored profile")
    .argument("<provider>", "Provider (codex|copilot)")
    .argument("[email]", "Email selector")
    .argument("[note...]", "Note text")
    .option("--plan <plan>", "Plan selector for same-email profiles")
    .option("--json", "Print JSON output")
    .action(async (providerArg: string, email?: string, noteParts?: string[], cmdOpts?: { plan?: string; json?: boolean }) => {
      const provider = requireProvider(parseProviderArg(providerArg), providerArg);
      const note = Array.isArray(noteParts) && noteParts.length > 0 ? noteParts.join(" ") : undefined;
      const result = await setProfileNote({
        provider,
        email,
        plan: cmdOpts?.plan,
        note,
        outputJson: Boolean(cmdOpts?.json)
      });
      if (cmdOpts?.json) {
        console.log(JSON.stringify(result, null, 2));
      }
    });

  noteCmd
    .command("clear")
    .description("Clear a note from a stored profile")
    .argument("<provider>", "Provider (codex|copilot)")
    .argument("[email]", "Email selector")
    .option("--plan <plan>", "Plan selector for same-email profiles")
    .option("--json", "Print JSON output")
    .action(async (providerArg: string, email?: string, cmdOpts?: { plan?: string; json?: boolean }) => {
      const provider = requireProvider(parseProviderArg(providerArg), providerArg);
      const result = await clearProfileNote({
        provider,
        email,
        plan: cmdOpts?.plan,
        outputJson: Boolean(cmdOpts?.json)
      });
      if (cmdOpts?.json) {
        console.log(JSON.stringify(result, null, 2));
      }
    });

  return program;
}
