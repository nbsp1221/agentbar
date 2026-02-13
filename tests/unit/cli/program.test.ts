import { describe, expect, test } from "vitest";
import { buildProgram } from "@/cli/program";

describe("cli program", () => {
  test("registers MVP commands", () => {
    const program = buildProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toEqual(["login", "accounts", "switch", "delete", "usage", "note", "config"]);
  });

  test("usage command accepts optional provider argument", () => {
    const program = buildProgram();
    const usage = program.commands.find((c) => c.name() === "usage");
    const args = usage?.registeredArguments.map((arg) => arg.name());
    expect(args).toContain("provider");
  });

  test("config command registers settings subcommands", () => {
    const program = buildProgram();
    const config = program.commands.find((c) => c.name() === "config");
    const configNames = config?.commands.map((c) => c.name()) ?? [];
    expect(configNames).toEqual(["list", "get", "set", "unset"]);
  });
});
