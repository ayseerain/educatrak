import { centavos, type Centavos } from "@/lib/money";
import { students } from "@/features/students/mockStudents";

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

export const CURRENT_MOCK_SCHOOL_YEAR = "SY 2026-2027";

export const billingAccounts: MockBillingAccount[] = [
  {
    id: "account-1001-2026", studentId: "sample-1001", schoolYear: "SY 2026-2027", totalDue: centavos(1250000), totalPaid: centavos(1125000), balance: centavos(125000), status: "Due soon",
    schedule: [
      { id: "installment-1001-1", label: "Tuition installment 1", dueDate: "Jun 01, 2026", amount: centavos(250000), paid: centavos(250000), status: "paid" },
      { id: "installment-1001-2", label: "Tuition installment 2", dueDate: "Jul 01, 2026", amount: centavos(250000), paid: centavos(250000), status: "paid" },
      { id: "installment-1001-3", label: "Tuition installment 3", dueDate: "Aug 01, 2026", amount: centavos(250000), paid: centavos(250000), status: "paid" },
      { id: "installment-1001-4", label: "Tuition installment 4", dueDate: "Sep 01, 2026", amount: centavos(250000), paid: centavos(250000), status: "paid" },
      { id: "installment-1001-5", label: "Tuition installment 5", dueDate: "Oct 01, 2026", amount: centavos(250000), paid: centavos(125000), status: "due_soon" },
    ],
  },
  {
    id: "account-1001-2027", studentId: "sample-1001", schoolYear: "SY 2027-2028", totalDue: centavos(1300000), totalPaid: centavos(0), balance: centavos(1300000), status: "Current",
    schedule: [{ id: "installment-1001-next", label: "Tuition installment", dueDate: "Sep 01, 2027", amount: centavos(250000), paid: centavos(0), status: "current" }],
  },
  {
    id: "account-1002-2026", studentId: "sample-1002", schoolYear: "SY 2026-2027", totalDue: centavos(1000000), totalPaid: centavos(580000), balance: centavos(420000), status: "Due soon",
    schedule: [
      { id: "installment-1002-1", label: "Tuition installment 1", dueDate: "Jun 01, 2026", amount: centavos(250000), paid: centavos(250000), status: "paid" },
      { id: "installment-1002-2", label: "Tuition installment 2", dueDate: "Jul 01, 2026", amount: centavos(250000), paid: centavos(250000), status: "paid" },
      { id: "installment-1002-3", label: "Tuition installment 3", dueDate: "Oct 01, 2026", amount: centavos(250000), paid: centavos(80000), status: "due_soon" },
      { id: "installment-1002-4", label: "Tuition installment 4", dueDate: "Nov 01, 2026", amount: centavos(250000), paid: centavos(0), status: "current" },
    ],
  },
  {
    id: "account-1003-2026", studentId: "sample-1003", schoolYear: "SY 2026-2027", totalDue: centavos(1500000), totalPaid: centavos(650000), balance: centavos(850000), status: "Overdue",
    schedule: [
      { id: "installment-1003-1", label: "Installment 1", dueDate: "Sep 01, 2026", amount: centavos(500000), paid: centavos(0), status: "overdue" },
      { id: "installment-1003-2", label: "Installment 2", dueDate: "Oct 01, 2026", amount: centavos(350000), paid: centavos(0), status: "overdue" },
      { id: "installment-1003-3", label: "Installment 3", dueDate: "Jun 01, 2026", amount: centavos(250000), paid: centavos(250000), status: "paid" },
      { id: "installment-1003-4", label: "Installment 4", dueDate: "Jul 01, 2026", amount: centavos(250000), paid: centavos(250000), status: "paid" },
      { id: "installment-1003-5", label: "Installment 5", dueDate: "Aug 01, 2026", amount: centavos(150000), paid: centavos(150000), status: "paid" },
    ],
  },
];

export const payments: MockPayment[] = [
  {
    id: "mock-payment-0", accountId: "account-1001-2026", studentId: "sample-1001", receiptNo: "OR-2026-001000", paidOn: "2026-06-15", amount: centavos(250000), status: "Posted", balanceAfter: centavos(1000000),
    allocations: [{ installmentId: "installment-1001-1", amount: centavos(250000) }],
  },
  {
    id: "mock-payment-1", accountId: "account-1001-2026", studentId: "sample-1001", receiptNo: "OR-2026-001001", paidOn: "2026-06-30", amount: centavos(250000), status: "Posted", balanceAfter: centavos(750000),
    allocations: [{ installmentId: "installment-1001-2", amount: centavos(250000) }],
  },
  {
    id: "mock-payment-2", accountId: "account-1001-2026", studentId: "sample-1001", receiptNo: "OR-2026-001002", paidOn: "2026-07-30", amount: centavos(250000), status: "Posted", balanceAfter: centavos(500000),
    allocations: [{ installmentId: "installment-1001-3", amount: centavos(250000) }],
  },
  {
    id: "mock-payment-3", accountId: "account-1001-2026", studentId: "sample-1001", receiptNo: "OR-2026-001003", paidOn: "2026-08-30", amount: centavos(250000), status: "Posted", balanceAfter: centavos(250000),
    allocations: [{ installmentId: "installment-1001-4", amount: centavos(250000) }],
  },
  {
    id: "mock-payment-4", accountId: "account-1001-2026", studentId: "sample-1001", receiptNo: "OR-2026-001004", paidOn: "2026-10-20", amount: centavos(125000), status: "Posted", balanceAfter: centavos(125000),
    allocations: [{ installmentId: "installment-1001-5", amount: centavos(125000) }],
  },
  {
    id: "mock-payment-5", accountId: "account-1002-2026", studentId: "sample-1002", receiptNo: "OR-2026-001005", paidOn: "2026-06-20", amount: centavos(250000), status: "Posted", balanceAfter: centavos(750000),
    allocations: [{ installmentId: "installment-1002-1", amount: centavos(250000) }],
  },
  {
    id: "mock-payment-6", accountId: "account-1002-2026", studentId: "sample-1002", receiptNo: "OR-2026-001006", paidOn: "2026-08-20", amount: centavos(250000), status: "Posted", balanceAfter: centavos(500000),
    allocations: [{ installmentId: "installment-1002-2", amount: centavos(250000) }],
  },
  {
    id: "mock-payment-7", accountId: "account-1002-2026", studentId: "sample-1002", receiptNo: "OR-2026-001007", paidOn: "2026-09-27", amount: centavos(80000), status: "Void pending", balanceAfter: centavos(420000),
    allocations: [{ installmentId: "installment-1002-3", amount: centavos(80000) }],
  },
  {
    id: "mock-payment-8", accountId: "account-1003-2026", studentId: "sample-1003", receiptNo: "OR-2026-001008", paidOn: "2026-07-15", amount: centavos(250000), status: "Posted", balanceAfter: centavos(1250000),
    allocations: [{ installmentId: "installment-1003-3", amount: centavos(250000) }],
  },
  {
    id: "mock-payment-9", accountId: "account-1003-2026", studentId: "sample-1003", receiptNo: "OR-2026-001009", paidOn: "2026-08-15", amount: centavos(250000), status: "Posted", balanceAfter: centavos(1000000),
    allocations: [{ installmentId: "installment-1003-4", amount: centavos(250000) }],
  },
  {
    id: "mock-payment-10", accountId: "account-1003-2026", studentId: "sample-1003", receiptNo: "OR-2026-001010", paidOn: "2026-09-15", amount: centavos(150000), status: "Posted", balanceAfter: centavos(850000),
    allocations: [{ installmentId: "installment-1003-5", amount: centavos(150000) }],
  },
];

let nextMockReceiptSequence = 1011;

function accountStatus(account: MockBillingAccount): MockBillingAccount["status"] {
  if (account.balance === 0) return "Current";
  if (account.schedule.some((installment) => installment.status === "overdue" && installment.paid < installment.amount)) return "Overdue";
  if (account.schedule.some((installment) => installment.status === "due_soon" && installment.paid < installment.amount)) return "Due soon";
  return "Current";
}

function synchronizeStudentBalance(studentId: string, account: MockBillingAccount): void {
  const student = getStudentById(studentId);
  if (!student) return;

    student.balance = account.balance;
  student.billingStatus = accountStatus(account);
  student.clearanceStatus = account.balance === 0 ? "Cleared" : "Not cleared";
}

/**
 * In-memory equivalent of the payment endpoint. It intentionally uses the
 * same oldest-unpaid allocation and server-assigned receipt behavior as the
 * Laravel action, so account, payment, and receipt views share one state.
 */
export function recordMockBillingPayment(input: {
  studentNumber: string;
  amount: number;
  paidOn: string;
}): MockPayment {
  if (!Number.isInteger(input.amount) || input.amount < 1) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const student = students.find((candidate) => candidate.number === input.studentNumber);
  if (!student) throw new Error("This student is not available for a payment.");

  const account = getCurrentBillingAccount(student.id);
  if (!account) throw new Error("This student does not have a current billing account.");
  if (input.amount > account.balance) {
    throw new Error(`Payment cannot exceed the current balance of ${(account.balance / 100).toFixed(2)}.`);
  }

  let remaining = input.amount;
  const allocations: MockPayment["allocations"] = [];
  for (const installment of [...account.schedule].sort(
    (first, second) => Date.parse(first.dueDate) - Date.parse(second.dueDate),
  )) {
    const amountDue = installment.amount - installment.paid;
    const allocation = Math.min(remaining, amountDue);
    if (allocation < 1) continue;

    installment.paid = centavos(installment.paid + allocation);
    installment.status = installment.paid === installment.amount ? "paid" : "current";
    allocations.push({ installmentId: installment.id, amount: centavos(allocation) });
    remaining -= allocation;
    if (remaining === 0) break;
  }

  if (remaining !== 0) throw new Error("Payment cannot be allocated to the account schedule.");

  account.totalPaid = centavos(account.totalPaid + input.amount);
  account.balance = centavos(account.balance - input.amount);
  account.status = accountStatus(account);
  synchronizeStudentBalance(student.id, account);

  const receiptNo = `OR-${input.paidOn.slice(0, 4)}-${String(nextMockReceiptSequence).padStart(6, "0")}`;
  nextMockReceiptSequence += 1;
  const payment: MockPayment = {
    id: `mock-payment-${nextMockReceiptSequence}`,
    accountId: account.id,
    studentId: student.id,
    receiptNo,
    paidOn: input.paidOn,
    amount: centavos(input.amount),
    status: "Posted",
    balanceAfter: centavos(account.balance),
    allocations,
  };
  payments.unshift(payment);

  return payment;
}

export function getStudentById(id?: string) {
  return students.find((student) => student.id === id);
}

export function getBillingAccount(id?: string) {
  return billingAccounts.find((account) => account.id === id);
}

export function getStudentBillingAccounts(studentId: string) {
  return billingAccounts.filter((account) => account.studentId === studentId);
}

export function getCurrentBillingAccount(studentId: string) {
  return getStudentBillingAccounts(studentId).find((account) => account.schoolYear === CURRENT_MOCK_SCHOOL_YEAR);
}

export function getPaymentsForStudent(studentId: string) {
  return payments.filter((payment) => payment.studentId === studentId);
}

export function getMockPayment(id?: string) {
  return payments.find((payment) => payment.id === id);
}

export function getDueInstallments(studentId: string) {
  return getStudentBillingAccounts(studentId).flatMap((account) => account.schedule.filter((installment) => installment.status !== "paid" && installment.paid < installment.amount).map((installment) => ({ account, installment, amountDue: centavos(installment.amount - installment.paid) })));
}

export function getNextDueRecord(studentId: string) {
  const due = getDueInstallments(studentId)[0];
  if (!due) return undefined;
  return {
    account: `${due.account.schoolYear} tuition`,
    installment: due.installment.label,
    dueDate: due.installment.dueDate,
    status: due.installment.status.replace("_", " "),
    amountDue: centavos(due.amountDue),
  };
}
