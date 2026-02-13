import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  intro: vi.fn(),
  note: vi.fn(),
  outro: vi.fn(),
  text: vi.fn(),
  spinnerStart: vi.fn(),
  spinnerStop: vi.fn(),
  randomUUID: vi.fn(),
  createPkceVerifier: vi.fn(),
  createOAuthState: vi.fn(),
  buildAuthorizeUrl: vi.fn(),
  parseOAuthRedirect: vi.fn(),
  exchangeCodeForTokens: vi.fn(),
  inferCodexEmail: vi.fn(),
  inferCodexPlanType: vi.fn(),
  inferCodexAccountId: vi.fn(),
  safeDecodeJwtPayload: vi.fn(),
  resolveStorePath: vi.fn(),
  upsertProfile: vi.fn(),
  setActiveProfile: vi.fn()
}));

vi.mock("@clack/prompts", () => ({
  intro: mocks.intro,
  note: mocks.note,
  outro: mocks.outro,
  text: mocks.text,
  spinner: () => ({
    start: mocks.spinnerStart,
    stop: mocks.spinnerStop
  })
}));

vi.mock("node:crypto", () => ({
  randomUUID: mocks.randomUUID
}));

vi.mock("@/providers/codex/oauth", () => ({
  createPkceVerifier: mocks.createPkceVerifier,
  createOAuthState: mocks.createOAuthState,
  buildAuthorizeUrl: mocks.buildAuthorizeUrl,
  parseOAuthRedirect: mocks.parseOAuthRedirect,
  exchangeCodeForTokens: mocks.exchangeCodeForTokens
}));

vi.mock("@/providers/codex/profile", () => ({
  inferCodexEmail: mocks.inferCodexEmail,
  inferCodexPlanType: mocks.inferCodexPlanType,
  inferCodexAccountId: mocks.inferCodexAccountId
}));

vi.mock("@/utils/jwt", () => ({
  safeDecodeJwtPayload: mocks.safeDecodeJwtPayload
}));

vi.mock("@/store/paths", () => ({
  resolveStorePath: mocks.resolveStorePath
}));

vi.mock("@/store/store", () => ({
  upsertProfile: mocks.upsertProfile,
  setActiveProfile: mocks.setActiveProfile
}));

import { loginCodex } from "@/services/login-codex";

describe("login codex active semantics", () => {
  const ttyDescriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true
    });

    mocks.randomUUID.mockReturnValue("codex-1");
    mocks.createPkceVerifier.mockReturnValue("verifier-1");
    mocks.createOAuthState.mockReturnValue("state-1");
    mocks.buildAuthorizeUrl.mockReturnValue("https://auth.example.test");
    mocks.text.mockResolvedValue("http://127.0.0.1:1455/auth/callback?code=abc&state=state-1");
    mocks.parseOAuthRedirect.mockReturnValue({ code: "abc", state: "state-1" });
    mocks.exchangeCodeForTokens.mockResolvedValue({
      access_token: "access-token",
      refresh_token: "refresh-token",
      id_token: "id-token",
      expires_in: 3600
    });
    mocks.safeDecodeJwtPayload.mockReturnValue({});
    mocks.inferCodexEmail.mockReturnValue("alice@example.com");
    mocks.inferCodexPlanType.mockReturnValue("plus");
    mocks.inferCodexAccountId.mockReturnValue("acct-1");
    mocks.resolveStorePath.mockReturnValue("/tmp/agentbar-store.json");
    mocks.upsertProfile.mockResolvedValue(undefined);
    mocks.setActiveProfile.mockResolvedValue(undefined);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (ttyDescriptor) {
      Object.defineProperty(process.stdin, "isTTY", ttyDescriptor);
    } else {
      delete (process.stdin as any).isTTY;
    }
    logSpy.mockRestore();
    vi.clearAllMocks();
  });

  test("does not set active profile during login", async () => {
    await loginCodex();

    expect(mocks.upsertProfile).toHaveBeenCalledWith(
      "/tmp/agentbar-store.json",
      expect.objectContaining({
        id: "codex-1",
        provider: "codex",
        email: "alice@example.com",
        planType: "plus"
      })
    );
    expect(mocks.setActiveProfile).not.toHaveBeenCalled();
  });
});
