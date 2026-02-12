import { describe, expect, test } from "vitest";
import { buildProgram } from "@/cli/program";

describe("cli program", () => {
  test("registers MVP commands", () => {
    const program = buildProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toEqual(["login", "accounts", "switch", "delete", "usage", "note"]);
  });

  test("usage command accepts optional provider argument", () => {
    const program = buildProgram();
    const usage = program.commands.find((c) => c.name() === "usage");
    const args = usage?.registeredArguments.map((arg) => arg.name());
    expect(args).toContain("provider");
  });
});
