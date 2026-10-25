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
  clearanceStatus: "Cleared" | "Not cleared";
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

export interface MockBillingAccount {
  id: string;
  studentId: string;
  schoolYear: string;
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
  student: string;
  type: string;
  channel: string;
  recipient: string;
  loadFee: string;
  status: string;
  attempts: string;
}

export interface MockStaffUser {
  id: string;
  name: string;
  username: string;
  role: "super_admin" | "cashier" | "accounting" | "administrator" | "auditor" | "registrar";
  active: boolean;
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
  guardianName: string;
  guardianRelationship: string;
  guardianEmail?: string;
  guardianMobile?: string;
}

function nextId(prefix: string, rows: ReadonlyArray<{ id: string }>): string {
  let value = rows.length + 1;
  while (rows.some((row) => row.id === `${prefix}-${value}`)) value += 1;
  return `${prefix}-${value}`;
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
  const next = new Date(`${value}T00:00:00+08:00`);
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
    const schoolYear = state.schoolYears.find((item) => item.id === account.schoolYearId)?.label ?? "Unavailable school year";
    return { id: account.id, studentId: account.studentId, schoolYear, totalDue: centavos(account.totalDueCents), totalPaid: centavos(totalPaid), balance: centavos(balance), status, schedule };
  });
}

export function selectStudents(): Student[] {
  return getMockState().students.map((student) => {
    const account = getCurrentBillingAccount(student.id);
    return {
      ...student,
      billingStatus: account?.status ?? "Current",
      clearanceStatus: account && account.balance === 0 ? "Cleared" : "Not cleared",
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
    student: getStudentById(attempt.studentId)?.name ?? "Unavailable student",
    type: attempt.type,
    channel: attempt.channel,
    recipient: attempt.recipient,
    loadFee: "—",
    status: attempt.status,
    attempts: String(attempt.attempts),
  }));
}

export function selectMockStaffUsers(): MockStaffUser[] {
  return getMockState().staffUsers.map((user) => ({
    ...user,
    role: user.role as MockStaffUser["role"],
  }));
}

export function createMockStaffUser(input: Omit<MockStaffUser, "id" | "active">): MockStaffUser {
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
  };
  updateMockState((state) => {
    state.staffUsers.push(user);
  });
  return user;
}

export function updateMockStaffUser(userId: string, updates: Partial<Pick<MockStaffUser, "name" | "role" | "active">>): MockStaffUser {
  let updated: MockStaffUser | undefined;
  updateMockState((state) => {
    const user = state.staffUsers.find((candidate) => candidate.id === userId);
    if (!user) return;
    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.active !== undefined) user.active = updates.active;
    updated = { ...user, role: user.role as MockStaffUser["role"] };
  });
  if (!updated) throw new Error("This sample user is no longer available.");
  return updated as MockStaffUser;
}

export function createMockStudent(input: MockStudentInput, actorId = "user-cashier"): Student {
  const number = input.number.trim();
  if (!number || !input.name.trim() || !input.grade || !input.section || !input.guardianName.trim() || !input.guardianRelationship.trim()) throw new Error("Complete the required student and guardian fields.");
  if (getMockState().students.some((student) => student.number.toLocaleLowerCase() === number.toLocaleLowerCase())) throw new Error("This student number already belongs to a student record.");
  const id = nextId("mock-student", getMockState().students);
  const guardianId = nextId("mock-guardian", getMockState().guardians);
  updateMockState((state) => {
    state.students.push({ id, number, name: input.name.trim(), grade: input.grade, section: input.section, studentStatus: "Active" });
    state.guardians.push({ id: guardianId, name: input.guardianName.trim(), email: input.guardianEmail?.trim() || null, mobile: input.guardianMobile?.trim() || "" });
    state.studentGuardianLinks.push({ id: `link-${id}`, studentId: id, guardianId, relationship: input.guardianRelationship.trim() });
    appendAudit("student.created", id, actorId);
  });
  return getStudentById(id)!;
}

export function updateMockStudent(studentId: string, input: MockStudentInput, actorId = "user-cashier"): Student {
  let found = false;
  updateMockState((state) => {
    const student = state.students.find((item) => item.id === studentId);
    if (!student) return;
    if (state.students.some((item) => item.id !== studentId && item.number.toLocaleLowerCase() === input.number.trim().toLocaleLowerCase())) throw new Error("This student number already belongs to a student record.");
    Object.assign(student, { number: input.number.trim(), name: input.name.trim(), grade: input.grade, section: input.section });
    const link = state.studentGuardianLinks.find((item) => item.studentId === studentId);
    const guardian = link && state.guardians.find((item) => item.id === link.guardianId);
    if (link && guardian) {
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

export function createMockBillingAccount(studentId: string, actorId = "user-cashier"): MockBillingAccount {
  const student = getStudentById(studentId);
  if (!student) throw new Error("Select a student before creating an account.");
  if (getCurrentBillingAccount(studentId)) throw new Error("This student already has a current school-year billing account.");
  const state = getMockState();
  const id = nextId("mock-account", state.billingAccounts);
  const totalDueCents = 500_000;
  updateMockState((current) => {
    current.billingAccounts.push({ id, studentId, schoolYearId: current.config.currentSchoolYearId, totalDueCents });
    for (let index = 0; index < 4; index += 1) {
      current.installments.push({ id: `${id}-installment-${index + 1}`, accountId: id, label: index === 0 ? "Down payment" : `Installment ${index}`, dueDate: dateWithDays(getMockToday(), index * 30), amountCents: 125_000 });
    }
    appendAudit("billing_account.created", id, actorId);
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

export function recordMockBillingPayment(input: { studentNumber: string; amount: number; paidOn: string }): MockPayment {
  if (!Number.isInteger(input.amount) || input.amount < 1) throw new Error("Payment amount must be greater than zero.");
  const student = selectStudents().find((candidate) => candidate.number === input.studentNumber);
  if (!student) throw new Error("This student is not available for a payment.");
  const account = getCurrentBillingAccount(student.id);
  if (!account) throw new Error("This student does not have a current billing account.");
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
