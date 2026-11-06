import { afterEach, describe, expect, it, vi } from "vitest";
import { mockIntegrityErrors } from "@/api/mock/integrity";
import { archiveMockFeeItem, archiveMockGradeLevel, archiveMockStaffUser, createMockBillingAccount, createMockFeeItem, createMockGradeLevel, createMockStaffUser, createMockStudent, getBillingAccount, getMockFeeSchedule, getMockGradeLevels, getMockState, rawMockDatabase, recordMockBillingPayment, resetMockStore, restoreMockStaffUser, selectBillingAccounts, selectMockFollowUpAccounts, selectMockStaffUsers, selectPayments, setMockToday, updateMockFeeItem, updateMockGradeLevel, updateMockStaffUser } from "@/api/mock";

describe("central mock database", () => {
  afterEach(() => {
    vi.useRealTimers();
    resetMockStore();
  });

  it("accepts the committed synthetic seed", () => {
    expect(mockIntegrityErrors()).toEqual([]);
  });

  it("does not reuse a legacy persisted business date after Manila advances", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T11:51:41+08:00"));
    const originalLocalStorage = Object.getOwnPropertyDescriptor(window, "localStorage");
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    try {
      window.localStorage.setItem("educatrak.mock-db.v1", JSON.stringify({
        today: "2026-11-02",
        state: { meta: { notice: "Synthetic test state" }, students: [], payments: [] },
      }));
      vi.resetModules();

      const { getMockToday } = await import("@/api/mock/store");

      expect(getMockToday()).toBe("2026-11-05");
    } finally {
      if (originalLocalStorage) Object.defineProperty(window, "localStorage", originalLocalStorage);
      else Reflect.deleteProperty(window, "localStorage");
    }
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

  it("includes newly created due-soon accounts in the shared follow-up queue", () => {
    const student = createMockStudent({ number: "S-FOLLOW-UP-NEW", name: "Harper Sample", grade: "Grade 7", section: "Olive" });
    const account = createMockBillingAccount(student.id, {
      schoolYearId: "school-year-2026-2027",
      gradeLevel: "Grade 7",
      feeItemIds: ["tuition", "miscellaneous"],
      paymentPlanId: "plan-full",
    });

    expect(selectMockFollowUpAccounts()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: account.id, student: "Harper Sample", status: "Due soon", daysOverdue: 0, amountDue: account.balance }),
    ]));
  });

  it("exposes seeded guardian email contacts in the follow-up queue", () => {
    expect(selectMockFollowUpAccounts()).toEqual(expect.arrayContaining([
      expect.objectContaining({ student: "Cora Navarro (sample)", guardianEmail: "sky.navarro@example.test" }),
    ]));
  });

  it("blocks duplicate renewals and non-Cashier account creation in the MockDB service", () => {
    const input = { schoolYearId: "school-year-2027-2028", gradeLevel: "Grade 9", feeItemIds: ["tuition", "miscellaneous"], paymentPlanId: "plan-quarterly" };
    createMockBillingAccount("sample-1002", input);

    expect(() => createMockBillingAccount("sample-1002", input)).toThrow(/already exists/i);
    expect(() => createMockBillingAccount("sample-1003", input, "user-accounting")).toThrow(/only an active cashier/i);
  });

  it("adds a grade fee to matching existing accounts once and supports all grades", () => {
    createMockFeeItem({
      schoolYearId: "school-year-2026-2027",
      gradeLevel: "Grade 8",
      name: "Laboratory fee (sample)",
      category: "Other",
      amountCents: 50_000,
      required: true,
    });

    expect(getBillingAccount("account-1002-2026")).toMatchObject({
      totalDue: 1_050_000,
      balance: 470_000,
      feeItems: expect.arrayContaining([expect.objectContaining({ name: "Laboratory fee (sample)", amount: 50_000 })]),
      schedule: expect.arrayContaining([expect.objectContaining({ label: "Fee: Laboratory fee (sample)", amount: 50_000 })]),
    });
    expect(() => createMockFeeItem({
      schoolYearId: "school-year-2026-2027", gradeLevel: "Grade 8", name: "laboratory FEE (sample)", category: "Other", amountCents: 50_000, required: true,
    })).toThrow(/already configured/i);
    expect(getBillingAccount("account-1002-2026")?.feeItems.filter((item) => item.name === "Laboratory fee (sample)")).toHaveLength(1);

    createMockFeeItem({
      schoolYearId: "school-year-2026-2027", gradeLevel: "All", name: "School supply fee (sample)", category: "Other", amountCents: 10_000, required: false,
    });

    expect(getMockFeeSchedule("school-year-2026-2027", "Grade 7")).toEqual(expect.arrayContaining([expect.objectContaining({ name: "School supply fee (sample)" })]));
    expect(getMockFeeSchedule("school-year-2026-2027", "Grade 8")).toEqual(expect.arrayContaining([expect.objectContaining({ name: "School supply fee (sample)" })]));
    expect(getBillingAccount("account-1002-2026")?.feeItems.filter((item) => item.name === "School supply fee (sample)")).toHaveLength(1);
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

  it("updates and archives future fee configuration without changing account snapshots", () => {
    const existingAccount = getBillingAccount("account-1002-2026");
    const updated = updateMockFeeItem("fees-2026-kinder", "activity", { name: "Activity fee (updated)", category: "Other", amountCents: 60_000, required: false });

    expect(updated).toMatchObject({ name: "Activity fee (updated)", amount: 60_000, active: true });
    archiveMockFeeItem("fees-2026-kinder", "activity");

    expect(getMockFeeSchedule("school-year-2026-2027", "Kinder")?.some((item) => item.id === "activity")).toBe(false);
    expect(getBillingAccount("account-1002-2026")).toEqual(existingAccount);
    expect((getMockState().auditLog as Array<{ action: string }>).map((item) => item.action)).toEqual(expect.arrayContaining(["fee_item.updated", "fee_item.archived"]));
  });

  it("renames and archives a configured grade without deleting its records", () => {
    createMockGradeLevel("Preparatory (sample)");
    updateMockGradeLevel("Preparatory (sample)", "Preparatory level (sample)");
    archiveMockGradeLevel("Preparatory level (sample)");

    expect(getMockState().config.grades).toContain("Preparatory level (sample)");
    expect(getMockGradeLevels()).not.toContain("Preparatory level (sample)");
    expect((getMockState().auditLog as Array<{ action: string }>).map((item) => item.action)).toEqual(expect.arrayContaining(["grade_level.updated", "grade_level.archived"]));
  });

  it.each(["2030-01-15", "2040-03-15", "2050-12-20"])("preserves key billing states on %s", (mockToday) => {
    setMockToday(mockToday);
    const statuses = selectBillingAccounts().map((account) => account.status);

    expect(statuses).toEqual(expect.arrayContaining(["Current", "Due soon", "Overdue"]));
    expect(getMockState().notificationAttempts.some((attempt) => attempt.sentAt.startsWith(mockToday))).toBe(true);
  });
});
