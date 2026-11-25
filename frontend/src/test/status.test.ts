import { describe, expect, it } from "vitest";
import { formatDisplayLabel, formatStatusLabel } from "@/lib/status";

describe("display labels", () => {
  it("presents stored enum values in sentence case without changing their source values", () => {
    expect(formatDisplayLabel("miscellaneous")).toBe("Miscellaneous");
    expect(formatDisplayLabel("void_pending")).toBe("Void pending");
    expect(formatStatusLabel("partially_paid")).toBe("Partially paid");
  });
});
