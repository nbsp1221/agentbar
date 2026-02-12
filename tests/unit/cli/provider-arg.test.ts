import { describe, expect, test } from "vitest";
import { parseProviderArg } from "../../../src/cli/provider-arg";

describe("provider arg parser", () => {
  test("returns provider when value is supported", () => {
    expect(parseProviderArg("codex")).toBe("codex");
    expect(parseProviderArg("copilot")).toBe("copilot");
  });

  test("returns undefined for unsupported or empty values", () => {
    expect(parseProviderArg(undefined)).toBeUndefined();
    expect(parseProviderArg("")).toBeUndefined();
    expect(parseProviderArg("claude")).toBeUndefined();
  });
});
