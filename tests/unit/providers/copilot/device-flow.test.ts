import { describe, expect, test } from "vitest";
import { parseDeviceTokenResponse, requestDeviceCode } from "@/providers/copilot/device-flow";

describe("copilot device flow", () => {
  test("accepts access_token response", () => {
    const token = parseDeviceTokenResponse({
      access_token: "gho_abc",
      token_type: "bearer"
    });
    expect(token).toBe("gho_abc");
  });

  test("throws on pending response", () => {
    expect(() =>
      parseDeviceTokenResponse({
        error: "authorization_pending"
      })
    ).toThrow("authorization_pending");
  });

  test("requests device code with user:email scope", async () => {
    let capturedBody = "";
    const fetchImpl = async (_url: string, init?: RequestInit): Promise<Response> => {
      capturedBody = typeof init?.body === "string" ? init.body : String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          device_code: "dc",
          user_code: "uc",
          verification_uri: "https://example.com",
          expires_in: 10,
          interval: 5
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    await requestDeviceCode(fetchImpl as unknown as typeof fetch);

    expect(capturedBody).toContain("scope=");
    expect(decodeURIComponent(capturedBody)).toContain("user:email");
  });
});
