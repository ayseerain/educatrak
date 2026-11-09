import { describe, expect, it } from "vitest";
import { calculateStudentAge, isValidDateOfBirth } from "@/lib/studentAge";

describe("student age", () => {
  it("calculates age before and after the birthday", () => {
    expect(calculateStudentAge("2010-06-15", "2026-06-14")).toBe(15);
    expect(calculateStudentAge("2010-06-15", "2026-06-15")).toBe(16);
  });

  it("returns no age for missing, invalid, or future birth dates", () => {
    expect(calculateStudentAge(null, "2026-06-15")).toBeNull();
    expect(calculateStudentAge("2010-02-29", "2026-06-15")).toBeNull();
    expect(calculateStudentAge("2026-06-16", "2026-06-15")).toBeNull();
    expect(isValidDateOfBirth("2012-02-29")).toBe(true);
    expect(isValidDateOfBirth("2012-02-30")).toBe(false);
  });

  it("counts a leap-day birthday on March 1 in a non-leap year", () => {
    expect(calculateStudentAge("2000-02-29", "2025-02-28")).toBe(24);
    expect(calculateStudentAge("2000-02-29", "2025-03-01")).toBe(25);
  });
});
