import { describe, expect, test } from "vitest";
import { formatDurationShort } from "@/utils/duration";

describe("duration formatter", () => {
  test("formats multi-day durations as d/h", () => {
    expect(formatDurationShort(25 * 60 * 60 * 1000)).toBe("1d 1h");
  });

  test("formats hour/minute durations", () => {
    expect(formatDurationShort(4 * 60 * 60 * 1000 + 50 * 60 * 1000)).toBe("4h 50m");
  });

  test("formats under 1h as minutes", () => {
    expect(formatDurationShort(59 * 60 * 1000)).toBe("59m");
  });
});
