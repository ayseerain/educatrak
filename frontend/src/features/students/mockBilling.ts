import { centavos } from "@/lib/money";
import { students } from "@/features/students/mockStudents";

export interface MockInstallment {
  id: string;
  label: string;
  dueDate: string;
  amount: number;
  paid: number;
  status: "paid" | "current" | "due_soon" | "overdue";
}

export interface MockBillingAccount {
  id: string;
  studentId: string;
  schoolYear: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
  status: "Current" | "Due soon" | "Overdue";
  schedule: MockInstallment[];
}

export interface MockPayment {
  id: string;
  accountId: string;
  studentId: string;
  receiptNo: string;
  paidOn: string;
  amount: number;
  status: "Posted" | "Void pending";
}

export const billingAccounts: MockBillingAccount[] = [
  {
    id: "account-1001-2026", studentId: "sample-1001", schoolYear: "SY 2026-2027", totalDue: centavos(1250000), totalPaid: centavos(1125000), balance: centavos(125000), status: "Due soon",
    schedule: [
      { id: "installment-1001-1", label: "Tuition installment", dueDate: "Oct 01, 2026", amount: centavos(250000), paid: centavos(125000), status: "due_soon" },
      { id: "installment-1001-2", label: "Tuition installment", dueDate: "Nov 01, 2026", amount: centavos(250000), paid: 0, status: "current" },
    ],
  },
  {
    id: "account-1001-2027", studentId: "sample-1001", schoolYear: "SY 2027-2028", totalDue: centavos(1300000), totalPaid: 0, balance: centavos(1300000), status: "Current",
    schedule: [{ id: "installment-1001-next", label: "Tuition installment", dueDate: "Sep 01, 2027", amount: centavos(250000), paid: 0, status: "current" }],
  },
  {
    id: "account-1002-2026", studentId: "sample-1002", schoolYear: "SY 2026-2027", totalDue: centavos(1000000), totalPaid: centavos(580000), balance: centavos(420000), status: "Due soon",
    schedule: [{ id: "installment-1002-1", label: "Tuition installment", dueDate: "Oct 01, 2026", amount: centavos(420000), paid: 0, status: "due_soon" }],
  },
  {
    id: "account-1003-2026", studentId: "sample-1003", schoolYear: "SY 2026-2027", totalDue: centavos(1500000), totalPaid: centavos(650000), balance: centavos(850000), status: "Overdue",
    schedule: [
      { id: "installment-1003-1", label: "Installment 1", dueDate: "Sep 01, 2026", amount: centavos(500000), paid: 0, status: "overdue" },
      { id: "installment-1003-2", label: "Installment 2", dueDate: "Oct 01, 2026", amount: centavos(350000), paid: 0, status: "overdue" },
    ],
  },
];

export const payments: MockPayment[] = [
  { id: "mock-payment-0", accountId: "account-1001-2026", studentId: "sample-1001", receiptNo: "OR-2026-001000", paidOn: "Sep 27, 2026", amount: centavos(125000), status: "Posted" },
  { id: "mock-payment-1", accountId: "account-1002-2026", studentId: "sample-1002", receiptNo: "OR-2026-001001", paidOn: "Sep 27, 2026", amount: centavos(200000), status: "Void pending" },
];

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
  return getStudentBillingAccounts(studentId).find((account) => account.schoolYear === "SY 2026-2027");
}

export function getPaymentsForStudent(studentId: string) {
  return payments.filter((payment) => payment.studentId === studentId);
}

export function getDueInstallments(studentId: string) {
  return getStudentBillingAccounts(studentId).flatMap((account) => account.schedule.filter((installment) => installment.status !== "paid" && installment.paid < installment.amount).map((installment) => ({ account, installment, amountDue: installment.amount - installment.paid })));
}

export function getNextDueRecord(studentId: string) {
  const due = getDueInstallments(studentId)[0];
  if (!due) return undefined;
  return {
    account: `${due.account.schoolYear} tuition`,
    installment: due.installment.label,
    dueDate: due.installment.dueDate,
    status: due.installment.status.replace("_", " "),
    amountDue: due.amountDue,
  };
}
