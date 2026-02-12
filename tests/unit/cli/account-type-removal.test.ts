import { describe, expect, test } from "vitest";
import { buildProgram } from "@/cli/program";
import { formatAccounts } from "@/cli/render/accounts";

function findCommand(program: ReturnType<typeof buildProgram>, name: string) {
  const cmd = program.commands.find((c) => c.name() === name);
  if (!cmd) {
    throw new Error(`Command not found: ${name}`);
  }
  return cmd;
}

describe("account-type removal", () => {
  test("does not expose --account selector flags and exposes --plan for codex disambiguation", () => {
    const program = buildProgram();
    const switchCodex = findCommand(findCommand(program, "switch") as any, "codex");
    const deleteCodex = findCommand(findCommand(program, "delete") as any, "codex");
    const deleteCopilot = findCommand(findCommand(program, "delete") as any, "copilot");
    const noteSet = findCommand(findCommand(program, "note") as any, "set");
    const noteClear = findCommand(findCommand(program, "note") as any, "clear");

    const optionNames = [
      ...switchCodex.options.map((o) => o.long),
      ...deleteCodex.options.map((o) => o.long),
      ...deleteCopilot.options.map((o) => o.long),
      ...noteSet.options.map((o) => o.long),
      ...noteClear.options.map((o) => o.long)
    ];

    expect(optionNames).not.toContain("--account");
    expect(switchCodex.options.map((o) => o.long)).toContain("--plan");
    expect(deleteCodex.options.map((o) => o.long)).toContain("--plan");
    expect(deleteCopilot.options.map((o) => o.long)).toContain("--plan");
    expect(noteSet.options.map((o) => o.long)).toContain("--plan");
    expect(noteClear.options.map((o) => o.long)).toContain("--plan");
  });

  test("accounts table does not include account column", () => {
    const out = formatAccounts([{ provider: "codex", email: "a@b.com", id: "1", active: true, note: "short" }]);

    expect(out.toLowerCase()).not.toContain("account");
  });
});
