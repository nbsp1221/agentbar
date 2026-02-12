import { describe, expect, test } from "vitest";
import { resolveCopilotLabelFromGitHub } from "../../../../src/providers/copilot/identity";

describe("copilot identity", () => {
  test("prefers primary verified email", () => {
    const label = resolveCopilotLabelFromGitHub({
      user: { login: "alice", email: null },
      emails: [
        { email: "alt@b.com", primary: false, verified: true },
        { email: "primary@b.com", primary: true, verified: true }
      ]
    });

    expect(label).toBe("primary@b.com");
  });

  test("falls back to login when no email is available", () => {
    const label = resolveCopilotLabelFromGitHub({
      user: { login: "alice", email: null },
      emails: []
    });

    expect(label).toBe("alice");
  });
});

