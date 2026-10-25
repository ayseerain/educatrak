import { afterEach, describe, expect, it } from "vitest";
import { mockIntegrityErrors } from "@/api/mock/integrity";
import { getBillingAccount, getMockState, getStudentById, rawMockDatabase, recordMockBillingPayment, resetMockStore, selectBillingAccounts, selectPayments, setMockToday } from "@/api/mock";

describe("central mock database", () => {
  afterEach(() => resetMockStore());

  it("accepts the committed synthetic seed", () => {
    expect(mockIntegrityErrors()).toEqual([]);
  });

  it("names dangling references, duplicate ids, absolute dates, and unsafe credentials", () => {
    const invalid = JSON.parse(JSON.stringify(rawMockDatabase)) as typeof rawMockDatabase;
    invalid.students.push({ ...invalid.students[0]! });
    invalid.payments[0]!.studentId = "student-missing";
    invalid.installments[0]!.due = "2026-10-25" as never;
    invalid.frontendOnly.devCredentials[0]!.password = "not-a-demo-password";

    expect(mockIntegrityErrors(invalid)).toEqual(expect.arrayContaining([
      expect.stringContaining("students.id duplicates"),
      expect.stringContaining("payments.studentId"),
      expect.stringContaining("installments.due"),
      expect.stringContaining("frontendOnly.devCredentials password"),
    ]));
  });

  it("keeps derived balances consistent and writes exactly one audit record", () => {
    setMockToday("2040-03-15");
    const beforeAuditCount = getMockState().auditLog.length;
    const payment = recordMockBillingPayment({ studentNumber: "S-1001", amount: 125_000, paidOn: "2040-03-15" });

    expect(payment.balanceAfter).toBe(0);
    expect(getBillingAccount("account-1001-2026")?.balance).toBe(0);
    expect(getStudentById("sample-1001")?.clearanceStatus).toBe("Cleared");
    expect(selectPayments().some((candidate) => candidate.id === payment.id)).toBe(true);
    expect(getMockState().auditLog).toHaveLength(beforeAuditCount + 1);
  });

  it.each(["2030-01-15", "2040-03-15", "2050-12-20"])("preserves key billing states on %s", (mockToday) => {
    setMockToday(mockToday);
    const statuses = selectBillingAccounts().map((account) => account.status);

    expect(statuses).toEqual(expect.arrayContaining(["Current", "Due soon", "Overdue"]));
    expect(getMockState().notificationAttempts.some((attempt) => attempt.sentAt.startsWith(mockToday))).toBe(true);
  });
});
