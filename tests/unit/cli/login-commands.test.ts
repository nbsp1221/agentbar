import { describe, expect, test } from "vitest";
import { buildProgram } from "../../../src/cli/program";

describe("login commands", () => {
  test("registers codex and copilot login subcommands", () => {
    const program = buildProgram();
    const login = program.commands.find((c) => c.name() === "login");
    const names = login?.commands.map((c) => c.name()) ?? [];
    expect(names).toEqual(["codex", "copilot"]);
  });
});
