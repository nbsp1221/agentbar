import { describe, expect, test } from "vitest";
import { writeFileSync } from "node:fs";
import { makeTempStore, upsertProfile, readStore } from "@/store/store";

describe("secure store", () => {
  test("writes and reads profiles", async () => {
    const ctx = await makeTempStore();

    await upsertProfile(ctx.path, {
      id: "p1",
      provider: "codex",
      email: "a@b.com",
      createdAt: "2026-02-11T00:00:00.000Z",
      updatedAt: "2026-02-11T00:00:00.000Z",
      credentials: {
        kind: "codex_oauth",
        accessToken: "a",
        refreshToken: "r"
      }
    });

    const next = await readStore(ctx.path);
    expect(next.profiles).toHaveLength(1);
    expect(next.profiles[0]?.email).toBe("a@b.com");
  });

  test("drops non-codex active pointers from legacy store data", async () => {
    const ctx = await makeTempStore();
    writeFileSync(
      ctx.path,
      JSON.stringify(
        {
          version: 1,
          profiles: [],
          active: {
            codex: "cx-1",
            copilot: "cp-1"
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const next = await readStore(ctx.path);
    expect(next.active).toEqual({ codex: "cx-1" });
  });
});
