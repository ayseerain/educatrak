import { afterEach, describe, expect, it, vi } from "vitest";
import { mockIntegrityErrors } from "@/api/mock/integrity";
import { archiveMockFeeItem, archiveMockStaffUser, createMockBillingAccount, createMockFeeItem, createMockSection, createMockStaffUser, createMockStudent, getBillingAccount, getMockFeeSchedule, getMockGradeLevels, getMockSectionsForGrade, getMockState, listMockStudents, rawMockDatabase, recordMockBillingPayment, resetMockStore, restoreMockStaffUser, selectBillingAccounts, selectMockFollowUpAccounts, selectMockStaffUsers, selectPayments, selectStudents, setMockToday, updateMockFeeItem, updateMockSection, updateMockStaffUser, updateMockStudent } from "@/api/mock";

describe("central mock database", () => {
  afterEach(() => {
    vi.useRealTimers();
    resetMockStore();
  });

  it("accepts the committed synthetic seed", () => {
    expect(mockIntegrityErrors()).toEqual([]);
  });

  it("keeps missing personal fields compatible and adds fields without changing student identity or billing links", () => {
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
      const existing = getMockState().students.find((student) => student.id === "sample-1001")!;
      expect(existing).toMatchObject({ id: "sample-1001", lrn: "000000000001", dateOfBirth: "2012-06-15", gender: "Female", residentialAddress: "Demo Residence 1, Mendez, Cavite" });
      const existingAccounts = getMockState().billingAccounts.filter((account) => account.studentId === existing.id);
      const updated = updateMockStudent(existing.id, {
        lrn: existing.lrn, name: existing.name, grade: existing.grade, section: existing.section,
        dateOfBirth: "2012-06-15", gender: "Female", residentialAddress: "12 Sample Road, Cavite",
      });
      expect(updated).toMatchObject({ id: existing.id, lrn: "000000000001", dateOfBirth: "2012-06-15", gender: "Female", residentialAddress: "12 Sample Road, Cavite" });
      expect(getMockState().billingAccounts.filter((account) => account.studentId === existing.id)).toEqual(existingAccounts);

      const created = createMockStudent({
        lrn: "000000000901", name: "Taylor Sample (sample)", grade: "Grade 7", section: "Olive",
        dateOfBirth: "2012-06-15", gender: "Female", residentialAddress: "12 Sample Road, Cavite",
      });
      const saved = updateMockStudent(created.id, { lrn: created.lrn, name: created.name, grade: created.grade, section: created.section });
      expect(saved).toMatchObject({ id: created.id, lrn: "000000000901", dateOfBirth: "2012-06-15", gender: "Female", residentialAddress: "12 Sample Road, Cavite" });
      expect(getMockState().billingAccounts.every((account) => account.studentId !== created.id)).toBe(true);
      expect(window.localStorage.getItem("educatrak.mock-db.v1")).toContain("12 Sample Road, Cavite");
    } finally {
      if (originalLocalStorage) Object.defineProperty(window, "localStorage", originalLocalStorage);
      else Reflect.deleteProperty(window, "localStorage");
    }
  });

  it("migrates saved Student Numbers to synthetic LRNs without changing IDs or billing links", async () => {
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
      const savedState = JSON.parse(JSON.stringify(getMockState())) as ReturnType<typeof getMockState>;
      for (const student of savedState.students) {
        const legacy = student as typeof student & { number?: string };
        legacy.number = `S-${student.id}`;
        delete (legacy as Partial<typeof legacy>).lrn;
      }
      const missingDetails = savedState.students.find((student) => student.id === "sample-1001")!;
      missingDetails.dateOfBirth = null;
      missingDetails.gender = null;
      missingDetails.residentialAddress = null;
      const savedDetails = savedState.students.find((student) => student.id === "sample-1002")!;
      savedDetails.dateOfBirth = "2011-03-21";
      savedDetails.gender = "Female";
      savedDetails.residentialAddress = "Saved Demo Address, Mendez, Cavite";
      const savedAccounts = savedState.billingAccounts;
      const savedPayments = savedState.payments;
      window.localStorage.setItem("educatrak.mock-db.v1", JSON.stringify({ state: savedState }));
      vi.resetModules();

      const { getMockState: getRestoredState } = await import("@/api/mock/store");
      const restored = getRestoredState();
      expect(restored.students.find((student) => student.id === "sample-1001")).toMatchObject({
        dateOfBirth: "2012-06-15", gender: "Female", residentialAddress: "Demo Residence 1, Mendez, Cavite",
      });
      expect(restored.students.find((student) => student.id === "sample-1002")).toMatchObject({
        lrn: "000000000002", dateOfBirth: "2011-03-21", gender: "Female", residentialAddress: "Saved Demo Address, Mendez, Cavite",
      });
      expect(restored.students.find((student) => student.id === "sample-1001")).toMatchObject({ id: "sample-1001", lrn: "000000000001" });
      expect("number" in restored.students[0]!).toBe(false);
      expect(window.localStorage.getItem("educatrak.mock-db.v1")).not.toContain('"number"');
      expect(restored.billingAccounts).toEqual(savedAccounts);
      expect(restored.payments).toEqual(savedPayments);
      expect(new Set(restored.students.map((student) => student.lrn)).size).toBe(restored.students.length);
    } finally {
      if (originalLocalStorage) Object.defineProperty(window, "localStorage", originalLocalStorage);
      else Reflect.deleteProperty(window, "localStorage");
    }
  });

  it("rejects invalid, future, or unapproved personal values", () => {
    const base = { lrn: "000000000902", name: "Morgan Sample (sample)", grade: "Grade 7", section: "Olive" };
    expect(() => createMockStudent({ ...base, lrn: "00000000000x" })).toThrow("exactly 12 digits");
    expect(() => createMockStudent({ ...base, lrn: "000000000001" })).toThrow("already belongs");
    expect(createMockStudent({ ...base, lrn: "000000000009" }).lrn).toBe("000000000009");
    expect(() => createMockStudent({ ...base, dateOfBirth: "2025-02-29" })).toThrow("valid date of birth");
    expect(() => createMockStudent({ ...base, dateOfBirth: "2999-01-01" })).toThrow("not in the future");
    expect(() => createMockStudent({ ...base, gender: "Other" as never })).toThrow("Male or Female");
    expect(() => createMockStudent({ ...base, residentialAddress: "12 Sample Road\nCavite" })).toThrow("one line");
  });

  it("returns null personal values for older records with omitted fields", () => {
    const student = getMockState().students.find((item) => item.id === "sample-1001")!;
    const legacyStudent = student as unknown as Record<string, unknown>;
    delete legacyStudent.dateOfBirth;
    delete legacyStudent.gender;
    delete legacyStudent.residentialAddress;

    expect(selectStudents().find((item) => item.id === student.id)).toMatchObject({ dateOfBirth: null, gender: null, residentialAddress: null, age: null });
  });

  it("serves personal fields through the async MockDB student API", async () => {
    const previousUrl = window.location.href;
    window.history.replaceState({}, "", "?mockLatency=0");
    try {
      await expect(listMockStudents()).resolves.toEqual(expect.arrayContaining([
        expect.objectContaining({ id: "sample-1001", dateOfBirth: "2012-06-15", gender: "Female", residentialAddress: "Demo Residence 1, Mendez, Cavite", age: expect.any(Number) }),
      ]));
    } finally {
      window.history.replaceState({}, "", previousUrl);
    }
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
    Object.assign(invalid.students[0]!, { dateOfBirth: "2999-02-30", gender: "Other", residentialAddress: "Line one\nLine two" });
    invalid.payments[0]!.studentId = "student-missing";
    invalid.installments[0]!.due = "2026-10-25" as never;
    invalid.frontendOnly.devCredentials[0]!.password = "not-a-demo-password";
    invalid.students[1]!.lrn = invalid.students[0]!.lrn;

    expect(mockIntegrityErrors(invalid)).toEqual(expect.arrayContaining([
      expect.stringContaining("students.id duplicates"),
      expect.stringContaining("students.lrn"),
      expect.stringContaining("students.dateOfBirth"),
      expect.stringContaining("students.gender"),
      expect.stringContaining("students.residentialAddress"),
      expect.stringContaining("payments.studentId"),
      expect.stringContaining("installments.due"),
      expect.stringContaining("frontendOnly.devCredentials password"),
    ]));
  });

  it("keeps derived balances consistent and writes exactly one audit record", () => {
    setMockToday("2040-03-15");
    const beforeAuditCount = getMockState().auditLog.length;
    const payment = recordMockBillingPayment({ studentLrn: "000000000001", amount: 125_000, paidOn: "2040-03-15" });

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
    const student = createMockStudent({ lrn: "000000000924", name: "Harper Sample", grade: "Grade 7", section: "Olive" });
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

  it("keeps fixed grades while persisting section edits through the shared store", () => {
    expect(getMockGradeLevels()).toEqual(["Kinder", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"]);
    createMockSection("Grade 7", "Cedar (sample)");
    updateMockSection("Grade 7", "Cedar (sample)", "Cedar revised (sample)", false);

    expect(getMockSectionsForGrade("Grade 7")).toContainEqual({ name: "Cedar revised (sample)", active: false });
    expect((getMockState().auditLog as Array<{ action: string }>).map((item) => item.action)).toEqual(expect.arrayContaining(["section.created", "section.updated"]));
  });

  it.each(["2030-01-15", "2040-03-15", "2050-12-20"])("preserves key billing states on %s", (mockToday) => {
    setMockToday(mockToday);
    const statuses = selectBillingAccounts().map((account) => account.status);

    expect(statuses).toEqual(expect.arrayContaining(["Current", "Due soon", "Overdue"]));
    expect(getMockState().notificationAttempts.some((attempt) => attempt.sentAt.startsWith(mockToday))).toBe(true);
  });
});
