import { describe, expect, test } from "vitest";
import { parseProviderArg } from "@/cli/provider-arg";

describe("test import aliases", () => {
  test("resolves @/ to src/ in vitest", () => {
    expect(parseProviderArg("codex")).toBe("codex");
  });
});
