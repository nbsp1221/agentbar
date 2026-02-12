import { describe, expect, test } from "vitest";
import { buildProgram } from "@/cli/program";

describe("switch commands", () => {
  test("registers codex switch subcommand", () => {
    const program = buildProgram();
    const switchCommand = program.commands.find((c) => c.name() === "switch");
    const names = switchCommand?.commands.map((c) => c.name()) ?? [];
    expect(names).toEqual(["codex"]);
  });
});
