import { describe, expect, test } from "vitest";
import { CliError, toReportedError } from "@/cli/error-reporting";

describe("cli error reporting", () => {
  test("formats CliError with exitCode", () => {
    const err = new CliError("nope", { exitCode: 7 });
    const out = toReportedError(err, { debugStack: false });
    expect(out.message).toBe("nope");
    expect(out.exitCode).toBe(7);
    expect(out.stack).toBeUndefined();
  });

  test("includes stack when debugStack=true", () => {
    const err = new Error("boom");
    err.stack = "STACK";
    const out = toReportedError(err, { debugStack: true });
    expect(out.message).toBe("boom");
    expect(out.exitCode).toBe(1);
    expect(out.stack).toBe("STACK");
  });

  test("stringifies unknown values", () => {
    const out = toReportedError({ a: 1 }, { debugStack: false });
    expect(out.exitCode).toBe(1);
    expect(out.message).toContain("\"a\"");
  });
});

