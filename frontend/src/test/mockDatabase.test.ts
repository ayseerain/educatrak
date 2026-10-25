import { afterEach, describe, expect, it } from "vitest";
import { mockIntegrityErrors } from "@/api/mock/integrity";
import { archiveMockStaffUser, createMockBillingAccount, createMockFeeItem, createMockStaffUser, getBillingAccount, getMockFeeSchedule, getMockState, getStudentById, rawMockDatabase, recordMockBillingPayment, resetMockStore, restoreMockStaffUser, selectBillingAccounts, selectMockStaffUsers, selectPayments, setMockToday, updateMockStaffUser } from "@/api/mock";

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

  it("keeps development user administration on the shared mock store", () => {
    const created = createMockStaffUser({
      name: "Jordan Example (sample)",
      username: "jordan.example",
      role: "auditor",
    });
    const updated = updateMockStaffUser(created.id, { active: false, role: "registrar" });

    expect(selectMockStaffUsers()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: created.id, username: "jordan.example", role: "registrar", active: false }),
    ]));
    expect(updated).toMatchObject({ id: created.id, role: "registrar", active: false });
  });

  it("archives and restores staff users in the shared mock store", () => {
    setMockToday("2040-03-15");
    const archived = archiveMockStaffUser("user-cashier");

    expect(archived).toMatchObject({ id: "user-cashier", active: false, archivedAt: "2040-03-15T12:00:00+08:00", anonymizeAt: "2040-04-14T12:00:00+08:00" });
    expect(selectMockStaffUsers()).toEqual(expect.arrayContaining([expect.objectContaining({ id: "user-cashier", archivedAt: "2040-03-15T12:00:00+08:00" })]));

    expect(restoreMockStaffUser("user-cashier")).toMatchObject({ id: "user-cashier", active: true, archivedAt: null, anonymizeAt: null });
  });

  it("creates a separate renewal snapshot without changing the earlier account", () => {
    const earlierAccount = getBillingAccount("account-1002-2026");
    const account = createMockBillingAccount("sample-1002", {
      schoolYearId: "school-year-2027-2028",
      gradeLevel: "Grade 9",
      feeItemIds: ["tuition", "miscellaneous"],
      paymentPlanId: "plan-quarterly",
    });

    expect(account).toMatchObject({ studentId: "sample-1002", schoolYearId: "school-year-2027-2028", gradeLevel: "Grade 9", planName: "Quarterly" });
    expect(account.feeItems).toHaveLength(2);
    expect(account.schedule.reduce((sum, installment) => sum + installment.amount, 0)).toBe(account.totalDue);
    expect(getBillingAccount("account-1002-2026")).toEqual(earlierAccount);
    expect(getMockState().auditLog).toEqual(expect.arrayContaining([expect.objectContaining({ action: "billing_account.created", entityId: account.id, actorId: "user-cashier" })]));
  });

  it("blocks duplicate renewals and non-Cashier account creation in the MockDB service", () => {
    const input = { schoolYearId: "school-year-2027-2028", gradeLevel: "Grade 9", feeItemIds: ["tuition", "miscellaneous"], paymentPlanId: "plan-quarterly" };
    createMockBillingAccount("sample-1002", input);

    expect(() => createMockBillingAccount("sample-1002", input)).toThrow(/already exists/i);
    expect(() => createMockBillingAccount("sample-1003", input, "user-accounting")).toThrow(/only an active cashier/i);
  });

  it("uses a newly configured fee only in the selected grade's next billing-account snapshot", () => {
    const existingAccount = getBillingAccount("account-1002-2026");
    createMockFeeItem({
      schoolYearId: "school-year-2027-2028",
      gradeLevel: "Grade 11",
      name: "Laboratory fee (sample)",
      category: "Other",
      amountCents: 50_000,
      required: true,
    });

    const account = createMockBillingAccount("sample-1002", {
      schoolYearId: "school-year-2027-2028",
      gradeLevel: "Grade 11",
      feeItemIds: ["mock-fee-item-1"],
      paymentPlanId: "plan-full",
    });

    expect(account.feeItems).toEqual([expect.objectContaining({ name: "Laboratory fee (sample)", amount: 50_000 })]);
    expect(getMockFeeSchedule("school-year-2027-2028", "Grade 10")).toBeUndefined();
    expect(getBillingAccount("account-1002-2026")).toEqual(existingAccount);
  });

  it.each(["2030-01-15", "2040-03-15", "2050-12-20"])("preserves key billing states on %s", (mockToday) => {
    setMockToday(mockToday);
    const statuses = selectBillingAccounts().map((account) => account.status);

    expect(statuses).toEqual(expect.arrayContaining(["Current", "Due soon", "Overdue"]));
    expect(getMockState().notificationAttempts.some((attempt) => attempt.sentAt.startsWith(mockToday))).toBe(true);
  });
});
