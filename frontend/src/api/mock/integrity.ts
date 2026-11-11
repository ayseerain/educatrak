import { rawMockDatabase, type RelativeDate } from "./seed";
import { isValidDateOfBirth, todayInManila } from "@/lib/studentAge";

const roles = new Set(["super_admin", "cashier", "accounting", "administrator", "auditor", "registrar"]);

function relativeDate(value: unknown): value is RelativeDate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (typeof candidate.daysAgo === "number" || typeof candidate.daysFromNow === "number")
    && (candidate.time === undefined || /^\d{2}:\d{2}$/.test(String(candidate.time)));
}

function duplicateErrors(collection: string, rows: ReadonlyArray<{ id: string }>): string[] {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    if (!row.id) return [`${collection}.id is required`];
    if (seen.has(row.id)) return [`${collection}.id duplicates ${row.id}`];
    seen.add(row.id);
    return [];
  });
}

/** Validates the committed raw JSON before it can seed the browser store. */
export function mockIntegrityErrors(data: typeof rawMockDatabase = rawMockDatabase): string[] {
  const errors: string[] = [];
  if (!data.meta.notice.toLowerCase().includes("synthetic")) errors.push("meta.notice must state that all data is synthetic");
  if (!Number.isInteger(data.config.dueSoonDays) || data.config.dueSoonDays < 0) errors.push("config.dueSoonDays must be a non-negative integer");

  const collections = ["staffUsers", "schoolYears", "feeSchedules", "paymentPlans", "students", "guardians", "studentGuardianLinks", "billingAccounts", "installments", "payments", "paymentAllocations", "voidRequests", "notificationAttempts"] as const;
  for (const collection of collections) errors.push(...duplicateErrors(collection, data[collection]));

  const ids = {
    staff: new Set(data.staffUsers.map((item) => item.id)),
    students: new Set(data.students.map((item) => item.id)),
    guardians: new Set(data.guardians.map((item) => item.id)),
    years: new Set(data.schoolYears.map((item) => item.id)),
    accounts: new Set(data.billingAccounts.map((item) => item.id)),
    installments: new Set(data.installments.map((item) => item.id)),
    payments: new Set(data.payments.map((item) => item.id)),
  };
  if (!ids.years.has(data.config.currentSchoolYearId)) errors.push("config.currentSchoolYearId references no schoolYears.id");
  for (const schedule of data.feeSchedules) {
    if (!ids.years.has(schedule.schoolYearId)) errors.push(`feeSchedules.schoolYearId ${schedule.schoolYearId} does not exist`);
    if (!data.config.grades.includes(schedule.gradeLevel)) errors.push(`feeSchedules.gradeLevel ${schedule.gradeLevel} is not configured`);
    for (const item of schedule.items) {
      if (!item.id || !item.name || !Number.isInteger(item.amountCents) || item.amountCents < 0 || typeof item.required !== "boolean") errors.push(`feeSchedules.${schedule.id} has an invalid fee item`);
    }
  }
  for (const plan of data.paymentPlans) {
    if (typeof plan.active !== "boolean" || !Number.isInteger(plan.downPaymentCents) || plan.downPaymentCents < 0 || !Number.isInteger(plan.installmentCount) || plan.installmentCount < 1 || !Number.isInteger(plan.firstDueDays) || plan.firstDueDays < 0 || !Number.isInteger(plan.intervalDays) || plan.intervalDays < 0) errors.push(`paymentPlans.${plan.id} is invalid`);
  }
  for (const row of data.studentGuardianLinks) {
    if (!ids.students.has(row.studentId)) errors.push(`studentGuardianLinks.studentId ${row.studentId} does not exist`);
    if (!ids.guardians.has(row.guardianId)) errors.push(`studentGuardianLinks.guardianId ${row.guardianId} does not exist`);
  }
  const lrns = new Set<string>();
  for (const student of data.students) {
    if (!/^\d{12}$/.test(student.lrn)) errors.push(`students.lrn for ${student.id} must contain exactly 12 digits`);
    else if (lrns.has(student.lrn)) errors.push(`students.lrn ${student.lrn} duplicates`);
    else lrns.add(student.lrn);
    const personal = student as unknown as { id: string; dateOfBirth?: unknown; gender?: unknown; residentialAddress?: unknown };
    if (personal.dateOfBirth != null && (typeof personal.dateOfBirth !== "string" || !isValidDateOfBirth(personal.dateOfBirth) || personal.dateOfBirth > todayInManila())) errors.push(`students.dateOfBirth for ${student.id} must be a valid, non-future date`);
    if (personal.gender != null && personal.gender !== "Male" && personal.gender !== "Female") errors.push(`students.gender for ${student.id} must be Male or Female`);
    if (personal.residentialAddress != null && (typeof personal.residentialAddress !== "string" || !personal.residentialAddress.trim() || /[\r\n]/.test(personal.residentialAddress))) errors.push(`students.residentialAddress for ${student.id} must be one non-empty line`);
  }
  for (const row of data.billingAccounts) {
    if (!ids.students.has(row.studentId)) errors.push(`billingAccounts.studentId ${row.studentId} does not exist`);
    if (!ids.years.has(row.schoolYearId)) errors.push(`billingAccounts.schoolYearId ${row.schoolYearId} does not exist`);
    if ("balance" in row || "status" in row || "totalPaid" in row) errors.push(`billingAccounts.${row.id} stores a selector result`);
  }
  for (const row of data.installments) {
    if (!ids.accounts.has(row.accountId)) errors.push(`installments.accountId ${row.accountId} does not exist`);
    if (!relativeDate(row.due)) errors.push(`installments.due for ${row.id} must be relative, not absolute`);
    if ("status" in row || "paid" in row) errors.push(`installments.${row.id} stores a selector result`);
  }
  for (const row of data.payments) {
    if (!ids.accounts.has(row.accountId)) errors.push(`payments.accountId ${row.accountId} does not exist`);
    if (!ids.students.has(row.studentId)) errors.push(`payments.studentId ${row.studentId} does not exist`);
    if (!relativeDate(row.paidOn)) errors.push(`payments.paidOn for ${row.id} must be relative, not absolute`);
    const account = data.billingAccounts.find((item) => item.id === row.accountId);
    if (account && account.studentId !== row.studentId) errors.push(`payments.studentId for ${row.id} does not own payments.accountId`);
  }
  for (const row of data.paymentAllocations) {
    if (!ids.payments.has(row.paymentId)) errors.push(`paymentAllocations.paymentId ${row.paymentId} does not exist`);
    if (!ids.installments.has(row.installmentId)) errors.push(`paymentAllocations.installmentId ${row.installmentId} does not exist`);
  }
  for (const row of data.voidRequests) {
    if (!ids.payments.has(row.paymentId)) errors.push(`voidRequests.paymentId ${row.paymentId} does not exist`);
    if (!ids.staff.has(row.requestedBy)) errors.push(`voidRequests.requestedBy ${row.requestedBy} does not exist`);
    if (!relativeDate(row.requestedAt)) errors.push(`voidRequests.requestedAt for ${row.id} must be relative, not absolute`);
    if (!new Set(["pending", "approved", "rejected"]).has(row.status)) errors.push(`voidRequests.status for ${row.id} is invalid`);
  }
  for (const row of data.notificationAttempts) {
    if (!ids.students.has(row.studentId)) errors.push(`notificationAttempts.studentId ${row.studentId} does not exist`);
    if (!relativeDate(row.sentAt)) errors.push(`notificationAttempts.sentAt for ${row.id} must be relative, not absolute`);
  }
  for (const row of data.backupRuns) {
    if (!relativeDate(row.occurred)) errors.push(`backupRuns.occurred for ${row.id} must be relative, not absolute`);
  }
  for (const user of data.staffUsers) {
    if (!roles.has(user.role)) errors.push(`staffUsers.role for ${user.id} is invalid`);
  }
  const usernames = new Set<string>();
  for (const credential of data.frontendOnly.devCredentials) {
    if (usernames.has(credential.username)) errors.push(`frontendOnly.devCredentials username ${credential.username} duplicates`);
    usernames.add(credential.username);
    if (!credential.password.startsWith("demo-")) errors.push(`frontendOnly.devCredentials password for ${credential.username} must start demo-`);
    if (!ids.staff.has(credential.userId)) errors.push(`frontendOnly.devCredentials.userId ${credential.userId} does not exist`);
  }
  return errors;
}

export function assertMockIntegrity(): void {
  const errors = mockIntegrityErrors();
  if (errors.length) throw new Error(`Mock database integrity failed:\n- ${errors.join("\n- ")}`);
}
