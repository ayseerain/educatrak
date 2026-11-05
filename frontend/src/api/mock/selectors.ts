import { centavos, type Centavos } from "@/lib/money";
import { getMockState, getMockToday, updateMockState } from "./store";

const runtimePaymentIds = new Set<string>();

export interface Student {
  id: string;
  number: string;
  name: string;
  grade: string;
  section: string;
  studentStatus: string;
  billingStatus: "Current" | "Due soon" | "Overdue";
  balance: Centavos;
}

export interface MockInstallment {
  id: string;
  label: string;
  dueDate: string;
  amount: Centavos;
  paid: Centavos;
  status: "paid" | "current" | "due_soon" | "overdue";
}

export interface MockFeeItem {
  id: string;
  name: string;
  category: string;
  amount: Centavos;
  required: boolean;
  active?: boolean;
}

export interface MockPaymentPlan {
  id: string;
  name: string;
  downPayment: Centavos;
  installmentCount: number;
}

export interface MockBillingAccount {
  id: string;
  studentId: string;
  schoolYearId: string;
  schoolYear: string;
  gradeLevel: string;
  feeItems: MockFeeItem[];
  planName: string | null;
  totalDue: Centavos;
  totalPaid: Centavos;
  balance: Centavos;
  status: "Current" | "Due soon" | "Overdue";
  schedule: MockInstallment[];
}

export interface MockPayment {
  id: string;
  accountId: string;
  studentId: string;
  receiptNo: string;
  paidOn: string;
  amount: Centavos;
  status: "Posted" | "Void pending" | "Voided";
  balanceAfter: Centavos;
  allocations: { installmentId: string; amount: Centavos }[];
}

export interface MockNotificationRow {
  id: string;
  student: string;
  type: string;
  channel: string;
  recipient: string;
  loadFee: string;
  status: string;
  attempts: string;
  sentAt: string;
}

export interface MockStaffUser {
  id: string;
  name: string;
  username: string;
  role: "super_admin" | "cashier" | "accounting" | "administrator" | "auditor" | "registrar";
  active: boolean;
  archivedAt: string | null;
  anonymizeAt: string | null;
}

export interface MockCloseOut {
  id: string;
  businessDate: string;
  cashierId: string;
  systemCashCents: number;
  countedCashCents: number;
  varianceCents: number;
  varianceReason: string | null;
  status: "open" | "closed";
  signedOffBy?: string;
}

export interface MockStudentInput {
  number: string;
  name: string;
  grade: string;
  section: string;
  studentStatus?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianEmail?: string;
  guardianMobile?: string;
}

export interface MockBillingAccountInput {
  schoolYearId: string;
  gradeLevel: string;
  feeItemIds: string[];
  paymentPlanId: string;
}

export interface MockFeeItemInput {
  schoolYearId: string;
  gradeLevel: string;
  name: string;
  category: string;
  amountCents: number;
  required: boolean;
}

export interface MockFeeItemUpdate {
  name: string;
  category: string;
  amountCents: number;
  required: boolean;
  applyToAll?: boolean;
}

function nextId(prefix: string, rows: ReadonlyArray<{ id: string }>): string {
  let value = rows.length + 1;
  while (rows.some((row) => row.id === `${prefix}-${value}`)) value += 1;
  return `${prefix}-${value}`;
}

function gradeLevelOrder(label: string): number | undefined {
  if (label.trim().toLocaleLowerCase() === "kinder") return 0;
  const grade = /^grade\s+(\d+)$/i.exec(label.trim());
  return grade ? Number(grade[1]) : undefined;
}

/** Returns the configured active grade labels once, in the school's natural grade order. */
export function getMockGradeLevels(): string[] {
  const archived = new Set(((getMockState().config as { archivedGrades?: string[] }).archivedGrades ?? []).map((grade) => grade.toLocaleLowerCase()));
  const seen = new Set<string>();
  return getMockState().config.grades
    .map((grade) => grade.trim())
    .filter((grade) => {
      const key = grade.toLocaleLowerCase();
      if (!grade || archived.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const leftOrder = gradeLevelOrder(left);
      const rightOrder = gradeLevelOrder(right);
      if (leftOrder !== undefined && rightOrder !== undefined) return leftOrder - rightOrder;
      if (leftOrder !== undefined) return -1;
      if (rightOrder !== undefined) return 1;
      return left.localeCompare(right);
    });
}

function appendAudit(action: string, entityId: string, actorId: string): void {
  const state = getMockState();
  (state.auditLog as Array<Record<string, unknown>>).unshift({
    id: nextId("audit", state.auditLog as Array<{ id: string }>),
    action,
    entityId,
    actorId,
    occurredAt: `${getMockToday()}T12:00:00+08:00`,
  });
}

function day(value: string): string {
  return value.slice(0, 10);
}

function dateWithDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day!));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function paymentStatus(paymentId: string): MockPayment["status"] {
  const request = getMockState().voidRequests.find((item) => item.paymentId === paymentId);
  return request?.status === "pending" ? "Void pending" : request?.status === "approved" ? "Voided" : "Posted";
}

function paymentAllocations(paymentId: string): { installmentId: string; amount: Centavos }[] {
  return getMockState().paymentAllocations
    .filter((item) => item.paymentId === paymentId)
    .map((item) => ({ installmentId: item.installmentId, amount: centavos(item.amountCents) }));
}

function paidForInstallment(installmentId: string): number {
  const state = getMockState();
  return state.paymentAllocations
    .filter((allocation) => allocation.installmentId === installmentId)
    .filter((allocation) => paymentStatus(allocation.paymentId) !== "Voided")
    .reduce((sum, allocation) => sum + allocation.amountCents, 0);
}

function installmentStatus(dueDate: string, amount: number, paid: number): MockInstallment["status"] {
  if (paid >= amount) return "paid";
  const current = getMockToday();
  if (day(dueDate) < current) return "overdue";
  if (day(dueDate) <= dateWithDays(current, getMockState().config.dueSoonDays)) return "due_soon";
  return "current";
}

export function selectBillingAccounts(): MockBillingAccount[] {
  const state = getMockState();
  return state.billingAccounts.map((account) => {
    const schedule = state.installments
      .filter((installment) => installment.accountId === account.id)
      .map((installment) => {
        const paid = paidForInstallment(installment.id);
        return {
          id: installment.id,
          label: installment.label,
          dueDate: installment.dueDate,
          amount: centavos(installment.amountCents),
          paid: centavos(paid),
          status: installmentStatus(installment.dueDate, installment.amountCents, paid),
        };
      });
    const totalPaid = schedule.reduce((sum, installment) => sum + installment.paid, 0);
    const balance = account.totalDueCents - totalPaid;
    const status = balance === 0 ? "Current" : schedule.some((item) => item.status === "overdue") ? "Overdue" : schedule.some((item) => item.status === "due_soon") ? "Due soon" : "Current";
    const stored = account as typeof account & { gradeLevel?: string; feeItems?: Array<{ id: string; name: string; category: string; amountCents: number; required: boolean }>; paymentPlanName?: string };
    const schoolYear = state.schoolYears.find((item) => item.id === account.schoolYearId)?.label ?? "Unavailable school year";
    const student = state.students.find((item) => item.id === account.studentId);
    return {
      id: account.id,
      studentId: account.studentId,
      schoolYearId: account.schoolYearId,
      schoolYear,
      gradeLevel: stored.gradeLevel ?? student?.grade ?? "Unavailable grade",
      feeItems: (stored.feeItems ?? []).map((item) => ({ ...item, amount: centavos(item.amountCents) })),
      planName: stored.paymentPlanName ?? null,
      totalDue: centavos(account.totalDueCents), totalPaid: centavos(totalPaid), balance: centavos(balance), status, schedule,
    };
  });
}

export function selectStudents(): Student[] {
  return getMockState().students.map((student) => {
    const account = getCurrentBillingAccount(student.id);
    return {
      ...student,
      billingStatus: account?.status ?? "Current",
      balance: account?.balance ?? centavos(0),
    };
  });
}

export function selectPayments(): MockPayment[] {
  return getMockState().payments.map((payment) => {
    const account = getBillingAccount(payment.accountId);
    const allocated = paymentAllocations(payment.id).reduce((sum, item) => sum + item.amount, 0);
    const balanceBefore = account ? account.totalDue - selectPaymentsBefore(payment.accountId, payment.id) : 0;
    return {
      id: payment.id,
      accountId: payment.accountId,
      studentId: payment.studentId,
      receiptNo: payment.receiptNo,
      paidOn: day(payment.paidOn),
      amount: centavos(payment.amountCents),
      status: paymentStatus(payment.id),
      balanceAfter: centavos(balanceBefore - allocated),
      allocations: paymentAllocations(payment.id),
    };
  });
}

function selectPaymentsBefore(accountId: string, throughPaymentId: string): number {
  if (runtimePaymentIds.has(throughPaymentId)) {
    return getMockState().payments
      .filter((payment) => payment.accountId === accountId && payment.id !== throughPaymentId && paymentStatus(payment.id) !== "Voided")
      .reduce((sum, payment) => sum + payment.amountCents, 0);
  }
  let total = 0;
  for (const payment of getMockState().payments) {
    if (payment.accountId === accountId && paymentStatus(payment.id) !== "Voided") total += payment.amountCents;
    if (payment.id === throughPaymentId) break;
  }
  return total;
}

export function getStudentById(id?: string): Student | undefined {
  return selectStudents().find((student) => student.id === id);
}

export function getBillingAccount(id?: string): MockBillingAccount | undefined {
  return selectBillingAccounts().find((account) => account.id === id);
}

export function getStudentBillingAccounts(studentId: string): MockBillingAccount[] {
  return selectBillingAccounts().filter((account) => account.studentId === studentId);
}

export function getCurrentBillingAccount(studentId: string): MockBillingAccount | undefined {
  const currentId = getMockState().config.currentSchoolYearId;
  const label = getMockState().schoolYears.find((year) => year.id === currentId)?.label;
  return getStudentBillingAccounts(studentId).find((account) => account.schoolYear === label);
}

export function getRenewalSchoolYears(studentId: string) {
  const accountYearIds = new Set(getMockState().billingAccounts
    .filter((account) => account.studentId === studentId)
    .map((account) => account.schoolYearId));
  return [...getMockState().schoolYears]
    .filter((year) => !accountYearIds.has(year.id))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function getSuggestedRenewalSchoolYear(studentId: string) {
  const existing = getStudentBillingAccounts(studentId)
    .map((account) => account.schoolYear)
    .sort();
  return getRenewalSchoolYears(studentId).find((year) => !existing.length || year.label > existing[existing.length - 1]!)
    ?? getRenewalSchoolYears(studentId)[0];
}

export function getMockFeeSchedule(schoolYearId: string, gradeLevel: string): MockFeeItem[] | undefined {
  const schedule = getMockState().feeSchedules.find((item) => item.schoolYearId === schoolYearId && item.gradeLevel === gradeLevel);
  return schedule?.items
    .filter((item) => (item as { active?: boolean }).active !== false)
    .map((item) => ({ ...item, amount: centavos(item.amountCents), active: (item as { active?: boolean }).active !== false }));
}

export function createMockFeeItem(input: MockFeeItemInput, actorId = "user-accounting"): MockFeeItem {
  const name = input.name.trim();
  const category = input.category.trim();
  const gradeLevel = input.gradeLevel.trim();
  const actor = getMockState().staffUsers.find((user) => user.id === actorId);
  if (!actor || !actor.active || actor.role !== "accounting") throw new Error("Only an active Accounting Officer can manage fee items.");
  if (!getMockState().schoolYears.some((year) => year.id === input.schoolYearId)) throw new Error("Select a configured school year.");
  const targetGrades = gradeLevel === "All" ? getMockGradeLevels() : [gradeLevel];
  if (!targetGrades.length || targetGrades.some((grade) => !getMockGradeLevels().includes(grade))) throw new Error("Select a configured grade level.");
  if (!name || !category || !Number.isInteger(input.amountCents) || input.amountCents < 1) throw new Error("Enter a fee name, category, and amount greater than zero.");

  let created: MockFeeItem | undefined;
  updateMockState((state) => {
    const schedules = targetGrades.map((targetGrade) => state.feeSchedules.find((item) => item.schoolYearId === input.schoolYearId && item.gradeLevel === targetGrade));
    if (schedules.some((schedule) => schedule?.items.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase()))) throw new Error("A fee item with this name is already configured for at least one selected grade.");

    targetGrades.forEach((targetGrade, index) => {
      let schedule = schedules[index];
      if (!schedule) {
        schedule = {
          id: nextId("mock-fee-schedule", state.feeSchedules),
          schoolYearId: input.schoolYearId,
          gradeLevel: targetGrade,
          items: [],
        };
        state.feeSchedules.push(schedule);
      }
      const feeItem = {
        id: nextId("mock-fee-item", schedule.items),
        name,
        category,
        amount: centavos(input.amountCents),
        required: input.required,
        active: true,
      };
      schedule.items.push({ ...feeItem, amountCents: feeItem.amount });
      syncMockFeeItemToBillingAccounts(state, input.schoolYearId, targetGrade, feeItem);
      created ??= feeItem;
    });
    appendAudit("fee_item.created", created!.id, actorId);
  });
  return created!;
}

export function updateMockFeeItem(scheduleId: string, itemId: string, input: MockFeeItemUpdate, actorId = "user-accounting"): MockFeeItem {
  const name = input.name.trim();
  const category = input.category.trim();
  const actor = getMockState().staffUsers.find((user) => user.id === actorId);
  if (!actor || !actor.active || actor.role !== "accounting") throw new Error("Only an active Accounting Officer can manage fee items.");
  if (!name || !category || !Number.isInteger(input.amountCents) || input.amountCents < 1) throw new Error("Enter a fee name, category, and amount greater than zero.");

  let updated: MockFeeItem | undefined;
  updateMockState((state) => {
    const schedule = state.feeSchedules.find((candidate) => candidate.id === scheduleId);
    const item = schedule?.items.find((candidate) => candidate.id === itemId) as ({ id: string; name: string; category: string; amountCents: number; required: boolean; active?: boolean } | undefined);
    if (!schedule || !item || item.active === false) throw new Error("That fee item is no longer available.");
    const targetSchedules = input.applyToAll
      ? state.feeSchedules.filter((candidate) => candidate.schoolYearId === schedule.schoolYearId && getMockGradeLevels().includes(candidate.gradeLevel))
      : [schedule];
    const matchingItems = targetSchedules.map((targetSchedule) => targetSchedule.items.find((candidate) => (candidate as { active?: boolean }).active !== false && candidate.name.toLocaleLowerCase() === item.name.toLocaleLowerCase()));
    if (targetSchedules.some((targetSchedule, index) => targetSchedule.items.some((candidate) => candidate.id !== matchingItems[index]?.id && candidate.name.toLocaleLowerCase() === name.toLocaleLowerCase()))) throw new Error("A fee item with this name is already configured for at least one selected grade.");
    targetSchedules.forEach((targetSchedule, index) => {
      const targetItem = matchingItems[index];
      if (targetItem) Object.assign(targetItem, { name, category, amountCents: input.amountCents, required: input.required });
      else targetSchedule.items.push({ id: nextId("mock-fee-item", targetSchedule.items), name, category, amountCents: input.amountCents, required: input.required, active: true } as typeof targetSchedule.items[number]);
    });
    updated = { id: item.id, name, category, amount: centavos(item.amountCents), required: item.required, active: true };
    appendAudit("fee_item.updated", item.id, actorId);
  });
  return updated!;
}

function syncMockFeeItemToBillingAccounts(
  state: ReturnType<typeof getMockState>,
  schoolYearId: string,
  gradeLevel: string,
  feeItem: MockFeeItem,
): void {
  (state.billingAccounts as Array<{ id: string; schoolYearId: string; totalDueCents: number; gradeLevel?: string; studentId: string; feeItems?: Array<{ id: string; name: string; category: string; amountCents: number; required: boolean }> }>).forEach((account) => {
    const accountGrade = account.gradeLevel ?? state.students.find((student) => student.id === account.studentId)?.grade;
    if (account.schoolYearId !== schoolYearId || accountGrade !== gradeLevel || account.feeItems?.some((item) => item.name.toLocaleLowerCase() === feeItem.name.toLocaleLowerCase())) return;
    (account.feeItems ??= []).push({ id: feeItem.id, name: feeItem.name, category: feeItem.category, amountCents: feeItem.amount, required: feeItem.required });
    account.totalDueCents += feeItem.amount;
    state.installments.push({ id: nextId("mock-fee-installment", state.installments), accountId: account.id, label: `Fee: ${feeItem.name}`, dueDate: getMockToday(), amountCents: feeItem.amount });
  });
}

export function archiveMockFeeItem(scheduleId: string, itemId: string, actorId = "user-accounting"): void {
  const actor = getMockState().staffUsers.find((user) => user.id === actorId);
  if (!actor || !actor.active || actor.role !== "accounting") throw new Error("Only an active Accounting Officer can manage fee items.");
  updateMockState((state) => {
    const schedule = state.feeSchedules.find((item) => item.id === scheduleId);
    const item = schedule?.items.find((candidate) => candidate.id === itemId) as ({ id: string; active?: boolean } | undefined);
    if (!item || item.active === false) throw new Error("That fee item is already archived or unavailable.");
    item.active = false;
    appendAudit("fee_item.archived", item.id, actorId);
  });
}

export function createMockGradeLevel(label: string, actorId = "user-admin"): string {
  const name = label.trim();
  const actor = getMockState().staffUsers.find((user) => user.id === actorId);
  if (!actor || !actor.active || actor.role !== "administrator") throw new Error("Only an active Administrator can manage grade levels.");
  if (!name) throw new Error("Enter a grade-level name.");
  if (getMockGradeLevels().some((grade) => grade.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error("That grade level is already configured.");
  updateMockState((state) => {
    state.config.grades.push(name);
    appendAudit("grade_level.created", name, actorId);
  });
  return name;
}

export function updateMockGradeLevel(previousLabel: string, label: string, actorId = "user-admin"): string {
  const previous = previousLabel.trim();
  const name = label.trim();
  const actor = getMockState().staffUsers.find((user) => user.id === actorId);
  if (!actor || !actor.active || actor.role !== "administrator") throw new Error("Only an active Administrator can manage grade levels.");
  if (!previous || !name) throw new Error("Enter a grade-level name.");
  if (!getMockState().config.grades.includes(previous)) throw new Error("That grade level is no longer available.");
  if (previous.toLocaleLowerCase() !== name.toLocaleLowerCase() && getMockState().config.grades.some((grade) => grade.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error("That grade level is already configured.");
  updateMockState((state) => {
    const index = state.config.grades.indexOf(previous);
    state.config.grades[index] = name;
    state.students.forEach((student) => { if (student.grade === previous) student.grade = name; });
    state.feeSchedules.forEach((schedule) => { if (schedule.gradeLevel === previous) schedule.gradeLevel = name; });
    (state.billingAccounts as Array<{ gradeLevel?: string }>).forEach((account) => { if (account.gradeLevel === previous) account.gradeLevel = name; });
    const sections = state.config.sectionsByGrade as Record<string, string[]>;
    if (sections[previous]) {
      sections[name] = sections[previous];
      delete sections[previous];
    }
    const config = state.config as typeof state.config & { archivedGrades?: string[] };
    if (config.archivedGrades) config.archivedGrades = config.archivedGrades.map((grade) => grade === previous ? name : grade);
    appendAudit("grade_level.updated", name, actorId);
  });
  return name;
}

export function archiveMockGradeLevel(label: string, actorId = "user-admin"): void {
  const name = label.trim();
  const actor = getMockState().staffUsers.find((user) => user.id === actorId);
  if (!actor || !actor.active || actor.role !== "administrator") throw new Error("Only an active Administrator can manage grade levels.");
  if (!getMockState().config.grades.includes(name)) throw new Error("That grade level is no longer available.");
  updateMockState((state) => {
    const config = state.config as typeof state.config & { archivedGrades?: string[] };
    const archived = config.archivedGrades ?? [];
    if (archived.some((grade) => grade.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error("That grade level is already archived.");
    config.archivedGrades = [...archived, name];
    appendAudit("grade_level.archived", name, actorId);
  });
}

export function createMockSchoolYear(label: string, current: boolean, actorId = "user-admin"): { id: string; label: string; current: boolean } {
  const name = label.trim();
  const actor = getMockState().staffUsers.find((user) => user.id === actorId);
  if (!actor || !actor.active || actor.role !== "administrator") throw new Error("Only an active Administrator can manage school years.");
  if (!name) throw new Error("Enter a school-year label.");
  if (getMockState().schoolYears.some((year) => year.label.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error("That school year is already configured.");
  const year = { id: nextId("mock-school-year", getMockState().schoolYears), label: name, current };
  updateMockState((state) => {
    year.current = current || state.schoolYears.length === 0;
    if (year.current) {
      state.schoolYears.forEach((item) => { item.current = false; });
      state.config.currentSchoolYearId = year.id;
    }
    state.schoolYears.push(year);
    appendAudit("school_year.created", year.id, actorId);
  });
  return year;
}

export function getMockPaymentPlans(): MockPaymentPlan[] {
  return getMockState().paymentPlans
    .filter((plan) => plan.active)
    .map((plan) => ({ id: plan.id, name: plan.name, downPayment: centavos(plan.downPaymentCents), installmentCount: plan.installmentCount }));
}

function scheduleForPlan(totalDueCents: number, planId: string): Array<Omit<MockInstallment, "id" | "paid" | "status">> {
  const plan = getMockState().paymentPlans.find((item) => item.id === planId && item.active);
  if (!plan) throw new Error("Select an active installment plan.");
  if (!Number.isInteger(totalDueCents) || totalDueCents < 1 || !Number.isInteger(plan.downPaymentCents) || plan.downPaymentCents < 0 || plan.downPaymentCents > totalDueCents || !Number.isInteger(plan.installmentCount) || plan.installmentCount < 1) {
    throw new Error("The selected installment plan is not configured correctly.");
  }
  const remaining = totalDueCents - plan.downPaymentCents;
  const baseInstallment = Math.floor(remaining / plan.installmentCount);
  const remainder = remaining % plan.installmentCount;
  const schedule: Array<Omit<MockInstallment, "id" | "paid" | "status">> = [];
  if (plan.downPaymentCents > 0) schedule.push({ label: "Down payment", dueDate: getMockToday(), amount: centavos(plan.downPaymentCents) });
  for (let index = 0; index < plan.installmentCount; index += 1) {
    schedule.push({
      label: plan.installmentCount === 1 ? "Full payment" : `Installment ${index + 1}`,
      dueDate: dateWithDays(getMockToday(), plan.firstDueDays + (index * plan.intervalDays)),
      amount: centavos(baseInstallment + (index < remainder ? 1 : 0)),
    });
  }
  if (schedule.reduce((sum, installment) => sum + installment.amount, 0) !== totalDueCents) throw new Error("The installment schedule does not equal the billing total.");
  return schedule;
}

export function previewMockInstallmentSchedule(totalDueCents: number, paymentPlanId: string): MockInstallment[] {
  return scheduleForPlan(totalDueCents, paymentPlanId).map((installment, index) => ({ ...installment, id: `preview-installment-${index + 1}`, paid: centavos(0), status: "current" }));
}

export function getPaymentsForStudent(studentId: string): MockPayment[] {
  return selectPayments().filter((payment) => payment.studentId === studentId);
}

export function getMockPayment(id?: string): MockPayment | undefined {
  return selectPayments().find((payment) => payment.id === id);
}

export function getDueInstallments(studentId: string) {
  return getStudentBillingAccounts(studentId).flatMap((account) => account.schedule
    .filter((installment) => installment.status !== "paid" && installment.paid < installment.amount)
    .map((installment) => ({ account, installment, amountDue: centavos(installment.amount - installment.paid) })));
}

export function getNextDueRecord(studentId: string) {
  const due = getDueInstallments(studentId)[0];
  if (!due) return undefined;
  return { account: `${due.account.schoolYear} tuition`, installment: due.installment.label, dueDate: due.installment.dueDate, status: due.installment.status.replace("_", " "), amountDue: due.amountDue };
}

export function getMockGuardianContact(studentId: string): { email: string | null; mobile: string | null } | undefined {
  const state = getMockState();
  const guardianId = state.studentGuardianLinks.find((link) => link.studentId === studentId)?.guardianId;
  const guardian = state.guardians.find((candidate) => candidate.id === guardianId);
  return guardian ? { email: guardian.email, mobile: guardian.mobile } : undefined;
}

export function selectMockNotificationRows(): MockNotificationRow[] {
  return getMockState().notificationAttempts.map((attempt) => ({
    id: attempt.id,
    student: getStudentById(attempt.studentId)?.name ?? "Unavailable student",
    type: attempt.type,
    channel: attempt.channel,
    recipient: attempt.recipient,
    loadFee: "—",
    status: attempt.status,
    attempts: String(attempt.attempts),
    sentAt: attempt.sentAt,
  }));
}

export function selectMockStaffUsers(): MockStaffUser[] {
  return getMockState().staffUsers.map((user) => ({
    ...user,
    role: user.role as MockStaffUser["role"],
    archivedAt: (user as Partial<MockStaffUser>).archivedAt ?? null,
    anonymizeAt: (user as Partial<MockStaffUser>).anonymizeAt ?? null,
  }));
}

export function createMockStaffUser(input: Omit<MockStaffUser, "id" | "active" | "archivedAt" | "anonymizeAt">): MockStaffUser {
  const username = input.username.trim();
  if (!username) throw new Error("A username is required.");
  if (getMockState().staffUsers.some((user) => user.username.toLocaleLowerCase() === username.toLocaleLowerCase())) {
    throw new Error("That username is already in use.");
  }
  const user: MockStaffUser = {
    id: `user-${username.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: input.name.trim(),
    username,
    role: input.role,
    active: true,
    archivedAt: null,
    anonymizeAt: null,
  };
  updateMockState((state) => {
    state.staffUsers.push(user);
  });
  return user;
}

export function updateMockStaffUser(userId: string, updates: Partial<Pick<MockStaffUser, "name" | "role" | "active">>): MockStaffUser {
  let updated: MockStaffUser | undefined;
  updateMockState((state) => {
    const user = state.staffUsers.find((candidate) => candidate.id === userId) as MockStaffUser | undefined;
    if (!user) return;
    if (user.archivedAt) throw new Error("Restore an archived user before changing the account.");
    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.active !== undefined) user.active = updates.active;
    updated = { ...user, role: user.role as MockStaffUser["role"] };
  });
  if (!updated) throw new Error("This sample user is no longer available.");
  return updated as MockStaffUser;
}

export function archiveMockStaffUser(userId: string, actorId = "user-admin"): MockStaffUser {
  let archived: MockStaffUser | undefined;
  updateMockState((state) => {
    const user = state.staffUsers.find((candidate) => candidate.id === userId) as MockStaffUser | undefined;
    if (!user) throw new Error("This sample user is no longer available.");
    if (user.archivedAt) throw new Error("This sample user is already archived.");
    if (user.id === actorId) throw new Error("You cannot archive your own account.");
    if (user.role === "administrator" && user.active && state.staffUsers.filter((candidate) => candidate.role === "administrator" && candidate.active && !(candidate as Partial<MockStaffUser>).archivedAt).length <= 1) {
      throw new Error("The last active administrator cannot be archived.");
    }
    user.active = false;
    user.archivedAt = `${getMockToday()}T12:00:00+08:00`;
    user.anonymizeAt = `${dateWithDays(getMockToday(), 30)}T12:00:00+08:00`;
    archived = { ...user };
    appendAudit("user.archived", user.id, actorId);
  });
  return archived!;
}

export function restoreMockStaffUser(userId: string, actorId = "user-admin"): MockStaffUser {
  let restored: MockStaffUser | undefined;
  updateMockState((state) => {
    const user = state.staffUsers.find((candidate) => candidate.id === userId) as MockStaffUser | undefined;
    if (!user || !user.archivedAt) throw new Error("This sample user is not archived.");
    user.active = true;
    user.archivedAt = null;
    user.anonymizeAt = null;
    restored = { ...user };
    appendAudit("user.restored", user.id, actorId);
  });
  return restored!;
}

export function createMockStudent(input: MockStudentInput, actorId = "user-registrar"): Student {
  const number = input.number.trim();
  if (!number || !input.name.trim() || !input.grade || !input.section) throw new Error("Complete the required student fields.");
  if (getMockState().students.some((student) => student.number.toLocaleLowerCase() === number.toLocaleLowerCase())) throw new Error("This student number already belongs to a student record.");
  const id = nextId("mock-student", getMockState().students);
  updateMockState((state) => {
    state.students.push({ id, number, name: input.name.trim(), grade: input.grade, section: input.section, studentStatus: input.studentStatus ?? "Active" });
    appendAudit("student.created", id, actorId);
  });
  return getStudentById(id)!;
}

export function updateMockStudent(studentId: string, input: MockStudentInput, actorId = "user-registrar"): Student {
  let found = false;
  updateMockState((state) => {
    const student = state.students.find((item) => item.id === studentId);
    if (!student) return;
    if (state.students.some((item) => item.id !== studentId && item.number.toLocaleLowerCase() === input.number.trim().toLocaleLowerCase())) throw new Error("This student number already belongs to a student record.");
    Object.assign(student, { number: input.number.trim(), name: input.name.trim(), grade: input.grade, section: input.section, ...(input.studentStatus ? { studentStatus: input.studentStatus } : {}) });
    const link = state.studentGuardianLinks.find((item) => item.studentId === studentId);
    const guardian = link && state.guardians.find((item) => item.id === link.guardianId);
    if (link && guardian && input.guardianName && input.guardianRelationship) {
      guardian.name = input.guardianName.trim();
      guardian.email = input.guardianEmail?.trim() || null;
      guardian.mobile = input.guardianMobile?.trim() || "";
      link.relationship = input.guardianRelationship.trim();
    }
    found = true;
    appendAudit("student.updated", studentId, actorId);
  });
  if (!found) throw new Error("This student record is no longer available.");
  return getStudentById(studentId)!;
}

export function createMockBillingAccount(studentId: string, inputOrActor: MockBillingAccountInput | string = "user-cashier", actorId = "user-cashier"): MockBillingAccount {
  const student = getStudentById(studentId);
  if (!student) throw new Error("Select a student before creating an account.");
  const state = getMockState();
  const input = typeof inputOrActor === "string"
    ? {
      schoolYearId: state.config.currentSchoolYearId,
      gradeLevel: student.grade,
      feeItemIds: getMockFeeSchedule(state.config.currentSchoolYearId, student.grade)?.map((item) => item.id) ?? [],
      paymentPlanId: getMockPaymentPlans()[0]?.id ?? "",
    }
    : inputOrActor;
  const actualActorId = typeof inputOrActor === "string" ? inputOrActor : actorId;
  const actor = state.staffUsers.find((user) => user.id === actualActorId);
  if (!actor || !actor.active || actor.role !== "cashier") throw new Error("Only an active Cashier can create a billing account.");
  if (student.studentStatus !== "Active") throw new Error("Only active students are eligible for a new billing account.");
  if (!state.schoolYears.some((year) => year.id === input.schoolYearId)) throw new Error("Select a configured school year.");
  if (!getMockGradeLevels().includes(input.gradeLevel)) throw new Error("Select a configured grade level.");
  if (state.billingAccounts.some((account) => account.studentId === studentId && account.schoolYearId === input.schoolYearId)) throw new Error("Billing Account Already Exists: this student already has a billing account for the selected school year.");
  const fees = getMockFeeSchedule(input.schoolYearId, input.gradeLevel);
  if (!fees?.length) throw new Error("No fee schedule is configured for the selected school year and grade level.");
  const selectedIds = new Set(input.feeItemIds);
  if (fees.some((item) => item.required && !selectedIds.has(item.id))) throw new Error("Required fee items cannot be removed.");
  const selectedFees = fees.filter((item) => selectedIds.has(item.id));
  if (!selectedFees.length) throw new Error("Select at least one fee item.");
  const totalDueCents = selectedFees.reduce((sum, item) => sum + item.amount, 0);
  const schedule = scheduleForPlan(totalDueCents, input.paymentPlanId);
  const plan = state.paymentPlans.find((item) => item.id === input.paymentPlanId && item.active)!;
  const id = nextId("mock-account", state.billingAccounts);
  updateMockState((current) => {
    (current.billingAccounts as Array<Record<string, unknown>>).push({
      id, studentId, schoolYearId: input.schoolYearId, totalDueCents,
      gradeLevel: input.gradeLevel,
      feeItems: selectedFees.map((item) => ({ id: item.id, name: item.name, category: item.category, amountCents: item.amount, required: item.required })),
      paymentPlanId: plan.id,
      paymentPlanName: plan.name,
    });
    current.installments.push(...schedule.map((installment, index) => ({ id: `${id}-installment-${index + 1}`, accountId: id, label: installment.label, dueDate: installment.dueDate, amountCents: installment.amount })));
    appendAudit("billing_account.created", id, actualActorId);
  });
  return getBillingAccount(id)!;
}

export function requestMockVoid(paymentId: string, reason: string, actorId = "user-cashier"): void {
  if (reason.trim().length < 10) throw new Error("Enter a void reason with at least 10 characters.");
  updateMockState((state) => {
    if (!state.payments.some((payment) => payment.id === paymentId)) throw new Error("This payment is no longer available.");
    if (state.voidRequests.some((request) => request.paymentId === paymentId)) throw new Error("A void request already exists for this payment.");
    const id = nextId("mock-void", state.voidRequests);
    (state.voidRequests as Array<Record<string, unknown>>).unshift({ id, paymentId, status: "pending", reason: reason.trim(), requestedBy: actorId, requestedAt: `${getMockToday()}T12:00:00+08:00` });
    appendAudit("payment.void_requested", paymentId, actorId);
  });
}

export function decideMockVoid(requestId: string, approved: boolean, actorId = "user-accounting"): void {
  updateMockState((state) => {
    const request = state.voidRequests.find((item) => item.id === requestId);
    if (!request) throw new Error("This void request is no longer available.");
    if (request.status !== "pending") throw new Error("This void request has already been decided.");
    request.status = approved ? "approved" : "rejected";
    (request as Record<string, unknown>).decidedBy = actorId;
    (request as Record<string, unknown>).decidedAt = `${getMockToday()}T12:00:00+08:00`;
    appendAudit(approved ? "payment.void_approved" : "payment.void_rejected", request.paymentId, actorId);
  });
}

export function mockSystemCashTotal(_cashierId = "user-cashier", businessDate = getMockToday()): Centavos {
  const total = selectPayments()
    .filter((payment) => payment.paidOn === businessDate && payment.status === "Posted")
    .reduce((sum, payment) => sum + payment.amount, 0);
  return centavos(total);
}

export function selectMockCloseOuts(cashierId?: string): MockCloseOut[] {
  const rows = getMockState().closeouts as unknown as MockCloseOut[];
  return rows.filter((row) => !cashierId || row.cashierId === cashierId).sort((left, right) => right.businessDate.localeCompare(left.businessDate));
}

export function recordMockCloseOut(input: { cashierId: string; countedCashCents: number; varianceReason?: string }): MockCloseOut {
  const businessDate = getMockToday();
  const systemCashCents = mockSystemCashTotal(input.cashierId, businessDate);
  const varianceCents = input.countedCashCents - systemCashCents;
  if (varianceCents !== 0 && !input.varianceReason?.trim()) throw new Error("Explain a non-zero cash variance before closing the day.");
  let created: MockCloseOut | undefined;
  updateMockState((state) => {
    const closeouts = state.closeouts as unknown as MockCloseOut[];
    if (closeouts.some((row) => row.cashierId === input.cashierId && row.businessDate === businessDate)) throw new Error("Today's close-out is already finalized.");
    created = { id: nextId("mock-closeout", closeouts), businessDate, cashierId: input.cashierId, systemCashCents, countedCashCents: input.countedCashCents, varianceCents, varianceReason: input.varianceReason?.trim() || null, status: "closed" };
    closeouts.push(created);
    appendAudit("closeout.submitted", created.id, input.cashierId);
  });
  return created!;
}

export function reopenMockCloseOutForNewDay(cashierId = "user-cashier"): MockCloseOut {
  const businessDate = getMockToday();
  const history = selectMockCloseOuts(cashierId);
  const existing = history.find((row) => row.businessDate === businessDate);
  if (existing) {
    if (existing.status === "open") return existing;
    throw new Error("Today's close-out is finalized. A new session is available on a later Manila calendar day.");
  }
  const latest = history.find((row) => row.status === "closed");
  if (!latest || latest.businessDate >= businessDate) throw new Error("Finalize a prior close-out before opening a new business day.");
  let opened: MockCloseOut | undefined;
  updateMockState((state) => {
    const closeouts = state.closeouts as unknown as MockCloseOut[];
    opened = { id: nextId("mock-closeout", closeouts), businessDate, cashierId, systemCashCents: mockSystemCashTotal(cashierId, businessDate), countedCashCents: 0, varianceCents: 0, varianceReason: null, status: "open" };
    closeouts.push(opened);
    appendAudit("closeout.opened", opened.id, cashierId);
  });
  return opened!;
}

export function signOffMockCloseOut(closeOutId: string, actorId = "user-accounting"): void {
  updateMockState((state) => {
    const row = (state.closeouts as unknown as MockCloseOut[]).find((item) => item.id === closeOutId);
    if (!row || row.status !== "closed") throw new Error("Only finalized close-outs can be signed off.");
    if (row.signedOffBy) throw new Error("This close-out is already signed off.");
    row.signedOffBy = actorId;
    appendAudit("closeout.signed_off", closeOutId, actorId);
  });
}

export function recordMockBillingPayment(input: { studentNumber: string; billingAccountId?: string; amount: number; paidOn: string }): MockPayment {
  if (!Number.isInteger(input.amount) || input.amount < 1) throw new Error("Payment amount must be greater than zero.");
  const student = selectStudents().find((candidate) => candidate.number === input.studentNumber);
  if (!student) throw new Error("This student is not available for a payment.");
  const account = input.billingAccountId ? getBillingAccount(input.billingAccountId) : getCurrentBillingAccount(student.id);
  if (!account) throw new Error("This student does not have a current billing account.");
  if (account.studentId !== student.id) throw new Error("Select a billing account that belongs to the selected student.");
  if (input.amount > account.balance) throw new Error(`Payment cannot exceed the current balance of ${(account.balance / 100).toFixed(2)}.`);

  let remaining = input.amount;
  const allocations: { installmentId: string; amount: number }[] = [];
  for (const installment of [...account.schedule].sort((left, right) => left.dueDate.localeCompare(right.dueDate))) {
    const allocation = Math.min(remaining, installment.amount - installment.paid);
    if (allocation < 1) continue;
    allocations.push({ installmentId: installment.id, amount: allocation });
    remaining -= allocation;
    if (remaining === 0) break;
  }
  if (remaining !== 0) throw new Error("Payment cannot be allocated to the account schedule.");

  const sequence = 1000 + getMockState().payments.length;
  const id = `mock-payment-${sequence}`;
  updateMockState((state) => {
    (state.payments as Array<Record<string, unknown>>).unshift({ id, accountId: account.id, studentId: student.id, receiptNo: `OR-${input.paidOn.slice(0, 4)}-${String(sequence).padStart(6, "0")}`, paidOn: input.paidOn, amountCents: input.amount });
    (state.paymentAllocations as Array<Record<string, unknown>>).push(...allocations.map((allocation, index) => ({ id: `allocation-${id}-${index}`, paymentId: id, installmentId: allocation.installmentId, amountCents: allocation.amount })));
    (state.auditLog as Array<Record<string, unknown>>).push({ id: `audit-${id}`, action: "payment.recorded", entityId: id, actorId: "user-cashier", occurredAt: `${input.paidOn}T12:00:00+08:00` });
  });
  runtimePaymentIds.add(id);
  return getMockPayment(id)!;
}
