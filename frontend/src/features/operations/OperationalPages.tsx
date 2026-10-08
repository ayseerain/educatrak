// The static mock fixtures intentionally model incomplete server responses.
// Route and role behavior is covered at the component boundary until API types land.
// @ts-nocheck
import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  CircleDashed,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardLabel, CardValue } from "@/components/ui/Card";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { StudentSearchField } from "@/features/students/StudentSearchField";
import { students } from "@/features/students/mockStudents";
import { studentMatchesSearch } from "@/features/students/studentSearch";
import { can, canSeeFinancials } from "@/lib/permissions";
import { format, centavos } from "@/lib/money";
import { roleLabel } from "@/auth/session";
import { cn } from "@/lib/cn";
import { getStatusPresentation } from "@/lib/status";
import type { AuthenticatedUser, Capability } from "@/lib/types";

const firstStudent = students[0]!;
const dueRecordsByStudentId = {
  "sample-1001": [
    { account: "SY 2026-2027 tuition", installment: "Installment 1", dueDate: "Oct 01, 2026", status: "Due soon", amountDue: centavos(125000) },
  ],
  "sample-1002": [
    { account: "SY 2026-2027 tuition", installment: "Installment 1", dueDate: "Sep 30, 2026", status: "Due soon", amountDue: centavos(420000) },
  ],
  "sample-1003": [
    { account: "SY 2026-2027 tuition", installment: "Installment 1", dueDate: "Sep 15, 2026", status: "Overdue", amountDue: centavos(450000) },
    { account: "SY 2026-2027 tuition", installment: "Installment 2", dueDate: "Oct 01, 2026", status: "Due soon", amountDue: centavos(400000) },
  ],
};
const gradeOptions = [
  { value: "Grade 7", label: "Grade 7" },
  { value: "Grade 8", label: "Grade 8" },
  { value: "Grade 9", label: "Grade 9" },
];
const notificationRows = [
  { student: students[0].name, type: "Payment confirmation", recipient: "guardian@example.test", status: "Queued", attempts: "1" },
  { student: students[1].name, type: "Payment confirmation", recipient: "guardian@example.test", status: "Sent", attempts: "1" },
  { student: students[2].name, type: "Reminder", recipient: "No guardian email", status: "Failed", attempts: "0" },
];
const notificationStatusOptions = [
  { value: "all", label: "All statuses" },
  ...Array.from(new Set(notificationRows.map((row) => row.status))).map((status) => ({ value: status.toLowerCase(), label: status })),
];

const primaryLinkClass = "inline-flex min-h-control items-center justify-center gap-2 rounded-md bg-brand-green-dark px-4 text-sm font-medium text-white transition-colors hover:bg-[#023d12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark";
const secondaryLinkClass = "inline-flex min-h-control items-center justify-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark";
const inlineLinkClass = "inline-flex min-h-8 items-center gap-1 text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark";
const inputClass = "mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-text-primary placeholder:text-text-muted-readable transition-colors focus-visible:border-brand-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-green-dark";
const textareaClass = "mt-3 w-full rounded-md border border-border bg-white p-3 text-text-primary placeholder:text-text-muted-readable transition-colors focus-visible:border-brand-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-green-dark";

function PageHeader({ title, description, action, backTo, backLabel = "Back" }: { title: string; description: string; action?: ReactNode; backTo?: string; backLabel?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  function goBack() {
    if (location.key !== "default") {
      navigate(-1);
      return;
    }
    if (backTo) navigate(backTo);
  }
  return <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0">{backTo && <button className="mb-3 inline-flex min-h-control items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark" type="button" onClick={goBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" />{backLabel}</button>}<h1 className="text-2xl font-semibold text-text-primary">{title}</h1><p className="mt-1 max-w-3xl text-sm text-text-secondary">{description}</p></div>{action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}</div>;
}

export function DeniedPage() { return <SystemPage title="Access denied" description="You do not have permission to open this page." />; }
export function NotFoundPage() { return <SystemPage title="Page not found" description="The address you entered does not match an EducatraK page." />; }
function SystemPage({ title, description }: { title: string; description: string }) { return <Card className="mx-auto mt-20 max-w-lg border-l-4 border-l-brand-green text-center"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-text-secondary">{description}</p><Link className={cn(primaryLinkClass, "mt-6")} to="/">Go to dashboard</Link></Card>; }

export function RequireCapability({ user, capability, children }: { user: AuthenticatedUser; capability: Capability; children: ReactNode }) {
  return can(user, capability) ? <>{children}</> : <DeniedPage />;
}

export function ProfilePage({ user }: { user: AuthenticatedUser }) {
  const [saved, setSaved] = useState(false);
  function save(event: FormEvent) { event.preventDefault(); setSaved(true); }
  return <><PageHeader title="My profile" description="Review your account details and change your password." /><div className="grid max-w-4xl gap-4 lg:grid-cols-2"><Metric label="Name" value={user.name} /><Card><h2 className="text-lg font-semibold">Change password</h2><p className="mt-1 text-sm text-text-secondary">Role: {roleLabel(user.role)} · Last login: Sep 27, 2026, 9:00 AM</p><form className="mt-4 space-y-3" onSubmit={save}><label className="block text-sm font-medium">Current password<input required type="password" className={inputClass} /></label><label className="block text-sm font-medium">New password<input required minLength={12} type="password" className={inputClass} /></label><p className="text-sm text-text-secondary">Use at least 12 characters with upper- and lowercase letters, a number, and a symbol.</p>{saved && <p role="status" className="text-sm font-medium text-brand-green-dark">Password change submitted.</p>}<Button>Update password</Button></form></Card></div></>;
}

export function StudentsPage({ user }: { user: AuthenticatedUser }) {
  const [query, setQuery] = useState(""); const limited = user.role === "registrar";
  const shown = students.filter((student) => studentMatchesSearch(student, query));
  return <><PageHeader title="Students" description={limited ? "Search student enrollment and clearance information." : "Search and filter student records."} action={can(user, "student.edit") ? <Link className={primaryLinkClass} to="/students/new">Add student</Link> : undefined} /><Card className="space-y-4 p-0"><div className="border-b border-border p-4"><StudentSearchField id="student-search" label="Search students" value={query} onChange={setQuery} autoFocus placeholder="Search by student name or number" wrapperClassName="max-w-lg" labelClassName="sr-only" inputClassName={cn(inputClass, "m-0")} /></div><StudentTable user={user} data={shown} /></Card></>;
}

function StudentTable({ user, data }: { user: AuthenticatedUser; data: typeof students }) {
  const limited = user.role === "registrar";
  const navigate = useNavigate();

  function openStudent(studentId: string) {
    navigate(`/students/${studentId}`);
  }

  function handleStudentRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, studentId: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openStudent(studentId);
  }

  return <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b bg-surface"><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Student</th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Grade & section</th>{!limited && <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Balance</th>}<th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Student status</th>{!limited && <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Billing status</th>}{limited && <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Clearance</th>}</tr></thead><tbody>{data.map((student) => <tr aria-label={`Open ${student.name}`} className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface/70 focus:bg-surface/70 focus:outline-none focus-visible:bg-surface/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-green-dark" key={student.id} onClick={() => openStudent(student.id)} onKeyDown={(event) => handleStudentRowKeyDown(event, student.id)} role="link" tabIndex={0}><td className="px-4 py-3"><div className="font-medium text-brand-green-dark">{student.name}</div><div className="text-sm text-text-secondary">{student.number}</div></td><td className="px-4 py-3">{student.grade} - {student.section}</td>{!limited && <td className="px-4 py-3 font-medium">{format(student.balance)}</td>}<td className="px-4 py-3"><StatusBadge status={student.studentStatus} /></td>{!limited && <td className="px-4 py-3"><StatusBadge status={student.billingStatus} /></td>}{limited && <td className="px-4 py-3"><StatusBadge status={student.clearanceStatus} /></td>}</tr>)}</tbody></table></div>;
}
export function StudentFormPage({ edit }: { edit?: boolean }) { const navigate = useNavigate(); const [duplicate, setDuplicate] = useState(false); const [grade, setGrade] = useState(edit ? "Grade 7" : gradeOptions[0].value); function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const number = new FormData(e.currentTarget).get("number"); setDuplicate(number === "S-1001"); if (number !== "S-1001") navigate("/students/sample-1001"); } return <><PageHeader title={edit ? "Edit student" : "Add student"} description="Student numbers must be unique. Guardian contact details are used for payment notifications." backTo={edit ? "/students/sample-1001" : "/students"} /><form onSubmit={submit} className="max-w-3xl space-y-5"><Card className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Student number<input name="number" required defaultValue={edit ? "S-1001" : ""} className={inputClass} /></label><label className="text-sm font-medium">Student name<input name="name" required defaultValue={edit ? students[0].name : ""} className={inputClass} /></label><label className="text-sm font-medium">Grade level<span className="mt-1 block"><DropdownSelect aria-label="Grade level" value={grade} options={gradeOptions} onChange={setGrade} className="w-full" contentClassName="min-w-[var(--radix-dropdown-menu-trigger-width)]" align="start" /></span></label><label className="text-sm font-medium">Section<input required defaultValue={edit ? "Olive" : ""} className={inputClass} /></label></Card><Card><h2 className="font-semibold">Guardian</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Name<input required className={inputClass} /></label><label className="text-sm font-medium">Relationship<input required className={inputClass} /></label><label className="text-sm font-medium">Email<input type="email" className={inputClass} /></label><label className="text-sm font-medium">Mobile<input className={inputClass} /></label></div></Card>{duplicate && <p role="alert" className="text-sm text-status-error">This student number already belongs to a student record.</p>}<Button>{edit ? "Save changes" : "Create student"}</Button></form></>;
}

type StudentProfileTab = "overview" | "billing" | "payments" | "followup";

export function StudentProfilePage({ user }: { user: AuthenticatedUser }) { const { id } = useParams(); const student = students.find((item) => item.id === id) ?? students[0]; const limited = user.role === "registrar"; return <><PageHeader title={student.name} description={`${student.number} - ${student.grade} - ${student.section}`} backTo="/students" action={!limited && can(user, "student.edit") ? <Link to={`/students/${student.id}/edit`} className={secondaryLinkClass}>Edit student</Link> : undefined} />{limited ? <StudentOverviewPanel student={student} limited /> : <StudentProfileTabs user={user} student={student} />}</>; }

function StudentProfileTabs({ user, student }: { user: AuthenticatedUser; student: typeof firstStudent }) {
  const options = [
    { id: "overview", label: "Overview" },
    can(user, "account.view") || can(user, "report.view") ? { id: "billing", label: "Billing" } : null,
    can(user, "payment.view") || can(user, "payment.record") ? { id: "payments", label: "Payments" } : null,
    can(user, "followup.view") ? { id: "followup", label: "Follow-up" } : null,
  ].filter(Boolean) as { id: StudentProfileTab; label: string }[];
  const preferred = options[0];
  const [activeView, setActiveView] = useState<StudentProfileTab>(preferred?.id ?? "overview");
  const visibleView = options.some((option) => option.id === activeView) ? activeView : preferred?.id;

  if (!preferred || !visibleView) return null;

  return <Card className="mt-5"><h2 className="font-semibold">Student profile</h2><div className="mt-3 flex flex-wrap gap-3" role="tablist" aria-label="Student profile sections">{options.map((option) => <Button key={option.id} type="button" variant={visibleView === option.id ? "primary" : "secondary"} role="tab" aria-selected={visibleView === option.id} aria-controls={`student-profile-${option.id}`} onClick={() => setActiveView(option.id)}>{option.label}</Button>)}</div><div className="mt-5 rounded-md border border-border bg-surface p-4" id={`student-profile-${visibleView}`} role="tabpanel">{visibleView === "overview" && <StudentOverviewPanel student={student} />}{visibleView === "billing" && <StudentBillingPanel student={student} />}{visibleView === "payments" && <StudentPaymentsPanel student={student} />}{visibleView === "followup" && <StudentFollowupWidget student={student} user={user} />}</div></Card>;
}

function StudentOverviewPanel({ student, limited = false }: { student: typeof firstStudent; limited?: boolean }) {
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-4"><Metric label="Clearance" value={<StatusBadge status={student.clearanceStatus} />} />{!limited && <Metric label="Account balance" value={format(student.balance)} />}<Metric label="Student status" value={<StatusBadge status={student.studentStatus} />} />{!limited && <Metric label="Billing status" value={<StatusBadge status={student.billingStatus} />} />}</div>{!limited && <Card className="bg-white"><h3 className="font-semibold">Guardian details</h3><p className="mt-2 text-sm text-text-secondary">Guardian email health and contact changes stay with the student record.</p><ListCard className="mt-3" headers={["Guardian", "Relationship", "Email status"]} rows={[["Sample Guardian", "Parent", "Queued"]]} /></Card>}</div>;
}

function StudentBillingPanel({ student }: { student: typeof firstStudent }) {
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><Metric label="School year" value="SY 2026-2027" /><Metric label="Balance" value={format(student.balance)} /><Metric label="Billing status" value={<StatusBadge status={student.billingStatus} />} /></div><ListCard headers={["Due date", "Amount", "Paid", "Status"]} rows={[["Oct 01, 2026", "₱2,500.00", "₱1,250.00", "Due soon"], ["Nov 01, 2026", "₱2,500.00", "₱0.00", "Current"]]} /><StudentStatementWidget student={student} /></div>;
}

function StudentPaymentsPanel({ student }: { student: typeof firstStudent }) {
  return <div className="space-y-5"><PaymentWorkflow preselectedStudent={student} compact /><ListCard headers={["Receipt", "Date", "Amount", "Status"]} rows={[["OR-2026-001000", "Sep 27, 2026", "₱1,250.00", "Posted"]]} /></div>;
}

function StudentFollowupWidget({ student, user }: { student: typeof firstStudent; user: AuthenticatedUser }) {
  const [selected, setSelected] = useState(true);
  const dueRecords = dueRecordsByStudentId[student.id] ?? [];

  return <div className="space-y-5"><div><h3 className="text-base font-semibold">Follow-up reminder</h3><p className="mt-1 text-sm text-text-secondary">Review the due records before preparing a reminder.</p></div><div className="grid gap-3 rounded-md border border-brand-green-light bg-[#F4FAF5] p-4 text-sm md:grid-cols-3"><div><span className="block text-xs font-medium uppercase text-text-secondary">Student</span><span className="mt-1 block font-semibold text-text-primary">{student.name}</span></div><div><span className="block text-xs font-medium uppercase text-text-secondary">Guardian email</span><span className="mt-1 block font-semibold text-text-primary">guardian@example.test</span></div><div><span className="block text-xs font-medium uppercase text-text-secondary">Total due</span><span className="mt-1 block font-semibold text-text-primary">{format(student.balance)}</span></div></div><div className="overflow-x-auto rounded-md border border-border bg-white"><table className="w-full min-w-[640px] border-collapse text-left text-sm"><thead><tr className="border-b bg-surface"><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Due record</th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Payment for</th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Due date</th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Status</th><th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-secondary">Amount due</th></tr></thead><tbody>{dueRecords.map((record) => <tr className="border-b border-border last:border-0" key={`${record.account}-${record.installment}`}><td className="px-4 py-3 align-middle text-text-primary">{record.account}</td><td className="px-4 py-3 align-middle font-medium text-text-primary">{record.installment}</td><td className="px-4 py-3 align-middle text-text-primary">{record.dueDate}</td><td className="px-4 py-3 align-middle text-text-primary">{renderTableCell(record.status)}</td><td className="px-4 py-3 text-right align-middle font-semibold text-text-primary">{format(record.amountDue)}</td></tr>)}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected} onChange={(event) => setSelected(event.target.checked)} /> Include this student in the reminder batch</label>{can(user, "followup.send") && <Button disabled={!selected}>Prepare reminder</Button>}</div></div>;
}

function StudentStatementWidget({ student }: { student: typeof firstStudent }) {
  return <div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-semibold">Statement of account</h3><p className="mt-1 text-sm text-text-secondary">Fees, payments, and remaining balance for {student.name}.</p></div><Button type="button" variant="secondary" onClick={() => window.print()}>Print</Button></div><StudentStatementTable /></div>;
}

export function AccountsPage() { return <><PageHeader title="Billing accounts" description="Search accounts by student, school year, grade, or status." action={<Link className={primaryLinkClass} to="/accounts/new">Create account</Link>} /><ListCard rows={students.map((s) => [s.name, "SY 2026-2027", format(s.balance), s.billingStatus])} headers={["Student", "School year", "Balance", "Billing status"]} /></>; }
export function AccountWizardPage() { const [step, setStep] = useState(1); const [studentQuery, setStudentQuery] = useState(""); const steps = ["Student", "Fees & plan", "Schedule", "Review"]; return <><PageHeader title="Create billing account" description="Set up an account for one student and one school year." backTo="/accounts" /><Card className="max-w-4xl"><ol className="mb-6 flex flex-wrap gap-2 text-sm">{steps.map((label, i) => <li key={label} className={cn("rounded-md border px-3 py-2", i + 1 === step ? "border-brand-green-light bg-[#EAF6EC] font-semibold text-brand-green-dark" : "border-border bg-white text-text-secondary")}>{i + 1}. {label}</li>)}</ol><h2 className="text-lg font-semibold">{steps[step - 1]}</h2><p className="mt-2 text-sm text-text-secondary">{step === 1 ? "Search for a student, or create a student before continuing." : step === 2 ? "Configured fee items and payment plans load from school settings." : step === 3 ? "Review installment due dates and amounts before saving." : "Confirm the student, fees, plan, and schedule. A duplicate school-year account is blocked."}</p>{step === 1 && <StudentSearchField value={studentQuery} onChange={setStudentQuery} autoFocus placeholder="Search student name or number" wrapperClassName="mt-5" inputClassName={cn(inputClass, "m-0")} />}{step === 2 && <div className="mt-5 rounded-md border border-border bg-surface p-4 text-sm">Required and optional fee items will be loaded from the selected student's grade-level schedule.</div>}{step === 3 && <ListCard className="mt-5" rows={[["Down payment", "Sep 01, 2026", "₱2,000.00"], ["Installment 1", "Oct 01, 2026", "₱2,500.00"]]} headers={["Installment", "Due date", "Amount"]} />}{step === 4 && <div className="mt-5 rounded-md border border-brand-green-light bg-[#F4FAF5] p-4 text-sm">Creating the account saves the configured schedule. Existing accounts are never changed by later fee or plan edits.</div>}<div className="mt-6 flex justify-between"><Button variant="secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</Button><Button onClick={() => step === 4 ? undefined : setStep(step + 1)}>{step === 4 ? "Create account" : "Continue"}</Button></div></Card></>; }
export function AccountDetailPage({ user }: { user: AuthenticatedUser }) { return <><PageHeader title="Billing account" description="SY 2026–2027 · Amara Villanueva (sample)" backTo="/accounts" action={can(user, "payment.record") ? <Link className={primaryLinkClass} to="/payments/new?student=sample-1001">Record payment</Link> : undefined} /><div className="grid gap-4 md:grid-cols-3"><Metric label="Total fees" value="₱12,500.00" /><Metric label="Paid" value="₱11,250.00" /><Metric label="Balance" value="₱1,250.00" /></div><div className="mt-5"><ListCard headers={["Due date", "Amount", "Paid", "Status"]} rows={[["Oct 01, 2026", "₱2,500.00", "₱1,250.00", "Due soon"], ["Nov 01, 2026", "₱2,500.00", "₱0.00", "Current"]]} /></div></>; }

export function PaymentsPage({ user, detail = false }: { user: AuthenticatedUser; detail?: boolean }) { if (detail) return <PaymentDetailPage user={user} />; return <><PageHeader title="Transaction history" description={user.role === "cashier" ? "Your recorded payments are shown by default." : "Search and filter recorded payments."} action={can(user, "payment.record") ? <Link className={primaryLinkClass} to="/payments/new">Record payment</Link> : undefined} /><ListCard headers={["Receipt", "Student", "Amount", "Method", "Status"]} rows={[["OR-2026-001000", students[0].name, "₱1,250.00", "Cash", "Posted"], ["OR-2026-001001", students[1].name, "₱2,000.00", "Cash", "Void pending"]]} /></>; }
function PaymentDetailPage({ user }: { user: AuthenticatedUser }) {
  const canDownloadPdf = can(user, "receipt.pdf");

  return <><PageHeader title="Payment OR-2026-001000" description="Recorded Sep 27, 2026 - Payment details are permanent after saving." backTo="/payments" action={<div className="flex flex-wrap gap-2"><Link className={secondaryLinkClass} to="/receipts/mock-payment-0/print">{can(user, "receipt.reprint") ? "Reprint receipt" : "View receipt"}</Link>{canDownloadPdf && <Button type="button" variant="secondary">Download PDF receipt</Button>}{can(user, "payment.void.approve") && <Link className={secondaryLinkClass} to="/voids">Review void queue</Link>}</div>} /><div className="grid gap-4 md:grid-cols-4"><Metric label="Student" value="Amara Villanueva (sample)" /><Metric label="Amount" value={format(centavos(125000))} /><Metric label="Recorder" value="Casey Cashier (sample)" /><Metric label="Email status" value={<StatusBadge status="Queued" />} /></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><ListCard headers={["Allocation", "Amount"]} rows={[["Installment 1", "₱1,250.00"], ["Balance after payment", "₱1,250.00"]]} /><ListCard headers={["Audit item", "Status"]} rows={[["Receipt number", "OR-2026-001000"], ["Notification", "Queued"], ["Reprint count", "0"], ["PDF downloads", canDownloadPdf ? "Available" : "View only"], ["Void state", "Posted"]]} /></div>{can(user, "payment.void.request") && <Card className="mt-5"><h2 className="font-semibold">Request void</h2><p className="mt-1 text-sm text-text-secondary">A reason of at least 10 characters is required. Accounting reviews the request.</p><textarea minLength={10} className={textareaClass} placeholder="Reason for void request" /><Button className="mt-3" variant="destructive">Request void</Button></Card>}</>;
}

const paymentMethodOptions = [
  { value: "Cash", label: "Cash" },
];

function PaymentWorkflow({ preselectedStudent, compact = false }: { preselectedStudent?: typeof firstStudent; compact?: boolean }) {
  const [searchParams] = useSearchParams();
  const selectedStudent = preselectedStudent ?? students.find((student) => student.id === searchParams.get("student"));
  const nextDueRecord = selectedStudent ? dueRecordsByStudentId[selectedStudent.id]?.[0] : undefined;
  const suggestedAmount = nextDueRecord?.amountDue ?? selectedStudent?.balance ?? centavos(0);
  const [studentQuery, setStudentQuery] = useState(selectedStudent ? `${selectedStudent.name} · ${selectedStudent.number}` : "");
  const [amount, setAmount] = useState(selectedStudent ? (suggestedAmount / 100).toFixed(2) : "");
  const [method, setMethod] = useState("Cash");
  const [stage, setStage] = useState<"entry" | "confirm" | "saved">("entry");
  const [error, setError] = useState("");
  const amountNumber = Number(amount || 0);
  const enteredCentavos = centavos(Number.isFinite(amountNumber) ? Math.max(0, Math.round(amountNumber * 100)) : 0);
  const balanceAfterPayment = selectedStudent ? centavos(Math.max(0, selectedStudent.balance - enteredCentavos)) : centavos(0);

  function reviewPayment(event: FormEvent) {
    event.preventDefault();
    if (!selectedStudent) {
      setError("Select a student before reviewing the payment.");
      return;
    }
    if (!amount || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Enter an amount received that is more than zero.");
      return;
    }
    if (enteredCentavos > selectedStudent.balance) {
      setError(`Amount is more than the balance of ${format(selectedStudent.balance)}. Enter ${format(selectedStudent.balance)} or less.`);
      return;
    }
    setError("");
    setStage("confirm");
  }

  function resetForNextPayment() {
    setStudentQuery(preselectedStudent ? `${preselectedStudent.name} · ${preselectedStudent.number}` : "");
    setAmount("");
    setMethod("Cash");
    setStage("entry");
    setError("");
  }

  return <form onSubmit={reviewPayment} className="space-y-5"><div><h3 className="text-base font-semibold">Record payment</h3>{compact && <p className="mt-1 text-sm text-text-secondary">The current student is selected for this payment draft.</p>}</div>{!preselectedStudent && <StudentSearchField label="Student search" value={studentQuery} onChange={(value) => { setStudentQuery(value); setStage("entry"); }} autoFocus placeholder="Type a student name or number" labelClassName="block text-sm font-medium" inputClassName={inputClass} />}{selectedStudent ? <div className="grid gap-3 rounded-md border border-brand-green-light bg-[#F4FAF5] p-4 text-sm md:grid-cols-5"><div><span className="block text-xs font-medium uppercase text-text-secondary">Student</span><span className="mt-1 block font-semibold text-text-primary">{selectedStudent.name}</span></div><div><span className="block text-xs font-medium uppercase text-text-secondary">Grade & section</span><span className="mt-1 block font-semibold text-text-primary">{selectedStudent.grade} · {selectedStudent.section}</span></div><div><span className="block text-xs font-medium uppercase text-text-secondary">Fee name</span><span className="mt-1 block font-semibold text-text-primary">{nextDueRecord ? nextDueRecord.account : "Select a fee"}</span></div><div><span className="block text-xs font-medium uppercase text-text-secondary">Next due record</span><span className="mt-1 block font-semibold text-text-primary">{nextDueRecord ? nextDueRecord.installment : "No due record"}</span></div><div><span className="block text-xs font-medium uppercase text-text-secondary">Amount due</span><span className="mt-1 block font-semibold text-text-primary">{nextDueRecord ? format(nextDueRecord.amountDue) : format(selectedStudent.balance)}</span></div></div> : <div className="rounded-md border border-border bg-surface p-4 text-sm text-text-secondary">Select a student to show their current balance and next due installment.</div>}<div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-medium">Fee name<input className={inputClass} defaultValue={nextDueRecord?.account ?? ""} placeholder="Enter fee name" readOnly={Boolean(nextDueRecord)} /></label><label className="text-sm font-medium">Amount received<input value={amount} onChange={(event) => { setAmount(event.target.value); setStage("entry"); }} inputMode="decimal" placeholder="0.00" className={inputClass} /></label><label className="text-sm font-medium">Payment method<span className="mt-1 block"><DropdownSelect aria-label="Payment method" value={method} options={paymentMethodOptions} onChange={(value) => { setMethod(value); setStage("entry"); }} className="w-full" contentClassName="min-w-[var(--radix-dropdown-menu-trigger-width)]" align="start" /></span></label></div>{selectedStudent && <button type="button" className={inlineLinkClass} onClick={() => { setAmount((suggestedAmount / 100).toFixed(2)); setStage("entry"); }}>Pay next installment: {format(suggestedAmount)}</button>}{error && <p role="alert" className="rounded-md border border-[#F3C2C2] bg-[#FBEAEA] p-3 text-sm text-status-error">{error}</p>}{stage === "confirm" && selectedStudent && <div className="rounded-md border border-brand-green-light bg-[#F4FAF5] p-4" role="status"><h2 className="text-base font-semibold">Confirm payment</h2><dl className="mt-3 grid gap-3 text-sm md:grid-cols-4"><div><dt className="text-text-secondary">Student</dt><dd className="font-medium">{selectedStudent.name}</dd></div><div><dt className="text-text-secondary">Amount</dt><dd className="font-medium">{format(enteredCentavos)}</dd></div><div><dt className="text-text-secondary">Method</dt><dd className="font-medium">{method}</dd></div><div><dt className="text-text-secondary">Balance left</dt><dd className="font-medium">{format(balanceAfterPayment)}</dd></div></dl><div className="mt-4 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setStage("entry")}>Edit</Button><Button type="button" onClick={() => setStage("saved")}>Confirm and save</Button></div></div>}{stage === "saved" && selectedStudent && <div className="rounded-md border border-status-success bg-[#EAF6EC] p-4" role="status"><h2 className="text-base font-semibold text-brand-green-dark">Payment saved</h2><p className="mt-1 text-sm text-text-primary">Receipt OR-2026-001002 is ready. A payment email has been queued for the guardian.</p><div className="mt-4 flex flex-wrap gap-3"><Link className={secondaryLinkClass} to="/receipts/mock-payment-0/print">Preview receipt</Link><Button type="button" onClick={resetForNextPayment}>Done</Button></div></div>}<div className="flex justify-end"><Button disabled={!selectedStudent || stage === "saved"}>Review payment</Button></div></form>;
}

export function PaymentEntryPage() {
  const [searchParams] = useSearchParams();
  const selectedStudent = students.find((student) => student.id === searchParams.get("student"));
  return <><PageHeader title="Record payment" description={selectedStudent ? `Record a cash payment for ${selectedStudent.name}. Review the balance and next installment before saving.` : "Search for a student, then review the balance and next installment before saving."} backTo="/payments" /><Card className="max-w-4xl"><PaymentWorkflow preselectedStudent={selectedStudent} /></Card></>;
}

export function ReceiptPage({ user }: { user: AuthenticatedUser }) {
  const canPrint = can(user, "receipt.reprint");
  const canDownloadPdf = can(user, "receipt.pdf");

  return <div className="print-page mx-auto max-w-2xl"><PageHeader title="Acknowledgment Receipt" description="EducatraK · Mendez Christian Academy" backTo="/payments/mock-payment-0" action={(canPrint || canDownloadPdf) ? <div className="flex flex-wrap gap-2">{canPrint && <Button onClick={() => window.print()}>Print receipt</Button>}{canDownloadPdf && <Button type="button" variant="secondary">Download PDF</Button>}</div> : undefined} /><Card className="border-2 border-black"><div className="flex items-start justify-between gap-4"><p className="text-sm">Receipt No. OR-2026-001000</p><p className="text-sm font-semibold">REPRINT count: 0</p></div><h2 className="mt-4 text-xl font-semibold">Amara Villanueva (sample)</h2><p className="mt-2">Payment received: ₱1,250.00</p><p className="mt-1">Method: Cash · Date: Sep 27, 2026</p><div className="mt-5 border-t border-black pt-3 text-sm"><p>Applied to: Installment 1 · ₱1,250.00</p><p>Balance after payment: ₱1,250.00</p><p>Void mark: none</p></div><p className="mt-6 text-sm">This is a half-page receipt block. Receipt title and paper size are controlled in settings. Reprints, void marks, and PDF downloads are logged by the backend.</p></Card></div>;
}
export function VoidsPage({ user }: { user: AuthenticatedUser }) { return <><PageHeader title="Void approval queue" description="Review pending void requests. The cashier who recorded a payment cannot approve its void." /><ListCard headers={["Receipt", "Requester", "Reason", "Amount", "Decision"]} rows={[["OR-2026-001001", "Casey Cashier (sample)", "Duplicate entry during handover", "₱2,000.00", can(user, "payment.void.approve") ? "Approve or reject" : "Pending review"]]} /></>; }
function SectionTabs({ items }: { items: { label: string; to: string; active: boolean }[] }) {
  return <div className="mb-4 flex flex-wrap gap-2" role="tablist">{items.map((item) => <Link key={item.to} to={item.to} role="tab" aria-selected={item.active} className={cn(item.active ? primaryLinkClass : secondaryLinkClass, "min-h-10")}>{item.label}</Link>)}</div>;
}

function RemindersNotificationsTabs({ active }: { active: "followup" | "notifications" }) {
  return <SectionTabs items={[{ label: "Due follow-ups", to: "/followup", active: active === "followup" }, { label: "Notification log", to: "/notifications", active: active === "notifications" }]} />;
}

function CloseoutTabs({ active }: { active: "today" | "history" }) {
  return <SectionTabs items={[{ label: "Today's close-out", to: "/closeout", active: active === "today" }, { label: "History", to: "/closeout/history", active: active === "history" }]} />;
}

export function FollowupPage({ user }: { user: AuthenticatedUser }) { const [selected, setSelected] = useState(false); return <><PageHeader title="Reminders & notifications" description="Review due follow-ups and notification history without merging their records." action={can(user, "followup.send") ? <Button disabled={!selected}>Send reminder emails</Button> : undefined} /><RemindersNotificationsTabs active="followup" /><Card><h2 className="font-semibold">Due follow-ups</h2><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={selected} onChange={(e) => setSelected(e.target.checked)} /> Select all listed accounts</label><div className="mt-4"><ListCard headers={["Student", "Guardian email", "Amount overdue", "Days overdue", "Last reminder"]} rows={[[students[2].name, "missing email", "₱8,500.00", "12", "Never"], [students[1].name, "guardian@example.test", "₱4,200.00", "3", "Sep 20, 2026"]]} /></div></Card></>; }
export function ClearancePage({ user }: { user: AuthenticatedUser }) { const [studentQuery, setStudentQuery] = useState(""); const amount = canSeeFinancials(user) ? "Balance due: ₱1,250.00" : "Installment overdue"; return <><PageHeader title="Clearance lookup" description="Search a student to check enrollment and exam-period clearance." /><Card className="space-y-4"><StudentSearchField value={studentQuery} onChange={setStudentQuery} autoFocus placeholder="Search student name or number" inputClassName={cn(inputClass, "m-0")} /><h2 className="font-semibold">Amara Villanueva (sample)</h2><ListCard headers={["Period", "Status", "Reason", "Action"]} rows={[["Enrollment", "Not cleared", amount, "—"], ["Midterm", "Cleared", "Requirements met", can(user, "permit.print") ? "Print exam permit" : "View only"], ["Final", "Not cleared", amount, "Unavailable"]]} /></Card></>; }
export function PermitPage() { return <div className="print-page mx-auto max-w-2xl"><PageHeader title="Exam Permit" description="Mendez Christian Academy" backTo="/clearance" action={<Button onClick={() => window.print()}>Print permit</Button>} /><Card className="border-2 border-black"><h2 className="text-xl font-semibold">Amara Villanueva (sample)</h2><p className="mt-2">Grade 7 · Olive</p><p className="mt-4">Midterm examination permit</p></Card></div>; }
export function CloseoutPage() { const [counted, setCounted] = useState(""); const variance = Number(counted || 0) - 1250; return <><PageHeader title="Daily close-out" description="Review today's totals and history from one close-out area." /><CloseoutTabs active="today" /><Card className="max-w-2xl"><h2 className="font-semibold">Today's close-out</h2><Metric label="System cash total" value="₱1,250.00" /><label className="mt-4 block text-sm font-medium">Counted cash<input value={counted} onChange={(e) => setCounted(e.target.value)} inputMode="decimal" className={inputClass} /></label><p className="mt-3 text-sm font-medium">Variance: {format(centavos(Math.round(variance * 100)))}</p>{variance !== 0 && <textarea className={textareaClass} placeholder="Explain the variance" required />}<Button className="mt-4">Review close-out</Button></Card></>; }
export function CloseoutHistoryPage({ user }: { user: AuthenticatedUser }) { return <><PageHeader title="Daily close-out" description="Review close-outs and sign off where authorized." /><CloseoutTabs active="history" /><ListCard headers={["Date", "Cashier", "Variance", "Status", "Action"]} rows={[["Sep 27, 2026", "Casey Cashier (sample)", "₱0.00", "Unsigned", can(user, "closeout.signoff") ? "Sign off" : "View"]]} /></>; }

export function ReportsHubPage() { const reports = [["Daily collection", "/reports/daily", "Collections by method, cashier, and payment."], ["Monthly financial", "/reports/monthly", "Collections by fee category and grade level."], ["Outstanding balances", "/reports/outstanding", "Accounts needing attention."], ["Student statement", "/reports/student/sample-1001", "Fees, schedule, payments, and balance."], ["Receipt PDF", "/receipts/mock-payment-0/print", "Download a shareable receipt copy when a guardian needs one."]]; return <><PageHeader title="Reports" description="Open a report, receipt, or statement, then print or export the current result where allowed." /><div className="grid gap-4 md:grid-cols-2">{reports.map(([name, route, detail]) => <Card className="border-l-4 border-l-brand-green" key={name}><h2 className="font-semibold">{name}</h2><p className="mt-1 text-sm text-text-secondary">{detail}</p><Link className={cn(inlineLinkClass, "mt-3")} to={route}>Open</Link></Card>)}</div></>; }
function StudentStatementTable() { return <ListCard headers={["Item", "Due date", "Amount", "Paid"]} rows={[["Tuition installment", "Oct 01, 2026", "₱2,500.00", "₱1,250.00"], ["Payment OR-2026-001000", "Sep 27, 2026", "₱1,250.00", "₱1,250.00"], ["Balance", "After payment", "₱1,250.00", "—"]]} />; }
export function ReportPage({ type }: { type: "daily" | "monthly" | "outstanding" | "statement" }) { const reports = { daily: { title: "Daily collection report", description: "Totals by method and cashier, with payments and voids separated.", filter: "date", headers: ["Section", "Cashier / method", "Count", "Amount"], rows: [["Method total", "Cash", "2", "₱3,250.00"], ["Cashier total", "Casey Cashier (sample)", "2", "₱3,250.00"], ["Voids", "OR-2026-001001 pending", "1", "₱2,000.00"]] }, monthly: { title: "Monthly financial report", description: "Collections by fee category and grade level, compared with billed amounts.", filter: "month", headers: ["Fee category", "Grade level", "Collected", "Billed"], rows: [["Tuition", "Grade 7", "₱42,500.00", "₱58,000.00"], ["Miscellaneous", "Grade 8", "₱18,750.00", "₱22,000.00"]] }, outstanding: { title: "Outstanding balances report", description: "Filter balances by grade, section, minimum balance, and overdue state.", filter: "outstanding", headers: ["Student", "Grade & section", "Balance", "Status"], rows: [[students[2].name, "Grade 9 - Pine", "₱8,500.00", "Overdue"], [students[1].name, "Grade 8 - Maple", "₱4,200.00", "Due soon"]] }, statement: { title: "Student statement of account", description: "One student's fees, schedule, payments, and remaining balance.", filter: "date", headers: ["Item", "Due date", "Amount", "Paid"], rows: [] } } as const; const report = reports[type]; return <><PageHeader title={report.title} description={report.description} backTo="/reports" action={<div className="flex gap-2"><Button variant="secondary" onClick={() => window.print()}>Print</Button><Button variant="secondary">Export to Excel</Button></div>} /><Card><div className="mb-4 flex flex-wrap gap-3">{report.filter === "outstanding" ? <><input aria-label="Grade" className={cn(inputClass, "m-0 max-w-40")} placeholder="Grade" /><input aria-label="Section" className={cn(inputClass, "m-0 max-w-40")} placeholder="Section" /><input aria-label="Minimum balance" className={cn(inputClass, "m-0 max-w-48")} placeholder="Minimum balance" /></> : <input type={report.filter === "month" ? "month" : "date"} className={cn(inputClass, "m-0 max-w-48")} defaultValue={report.filter === "month" ? "2026-09" : "2026-09-27"} />}<Button variant="secondary">Apply filters</Button></div>{type === "statement" ? <StudentStatementTable /> : <ListCard headers={[...report.headers]} rows={report.rows.map((row) => [...row])} />}</Card></>; }

export function NotificationsPage({ user }: { user: AuthenticatedUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStatus = notificationStatusOptions.some((option) => option.value === searchParams.get("status")) ? searchParams.get("status")! : "all";
  const rows = selectedStatus === "all" ? notificationRows : notificationRows.filter((row) => row.status.toLowerCase() === selectedStatus);

  function updateStatusFilter(nextStatus: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextStatus === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", nextStatus);
    }
    setSearchParams(nextParams);
  }

  return <><PageHeader title="Reminders & notifications" description="View notification attempts and retry failed email where permitted." /><RemindersNotificationsTabs active="notifications" /><Card className="overflow-hidden p-0"><div className="border-b border-border p-4"><h2 className="font-semibold">Notification log</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead><tr className="border-b bg-surface"><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Student</th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Type</th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Recipient</th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary"><DropdownMenu.Root><DropdownMenu.Trigger asChild><button type="button" className="inline-flex min-h-8 items-center gap-1 rounded-md px-1 font-medium uppercase text-text-secondary transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark" aria-label="Filter status">Status<ChevronsUpDown aria-hidden="true" className="h-3.5 w-3.5" /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content align="start" sideOffset={6} className="dropdown-menu z-50 min-w-44 rounded-md border border-border bg-white p-1 shadow-lg"><DropdownMenu.RadioGroup value={selectedStatus} onValueChange={updateStatusFilter}>{notificationStatusOptions.map((option) => <DropdownMenu.RadioItem key={option.value} value={option.value} className="dropdown-menu-item"><DropdownMenu.ItemIndicator className="flex size-4 items-center justify-center"><Check aria-hidden="true" className="size-4" /></DropdownMenu.ItemIndicator><span>{option.label}</span></DropdownMenu.RadioItem>)}</DropdownMenu.RadioGroup></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root></th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Attempts</th><th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">Action</th></tr></thead><tbody>{rows.map((row) => <tr className="border-b border-border transition-colors last:border-0 hover:bg-surface/70 focus-within:bg-surface/70" key={`${row.student}-${row.type}`}><td className="px-4 py-3 align-middle text-text-primary">{row.student}</td><td className="px-4 py-3 align-middle text-text-primary">{row.type}</td><td className="px-4 py-3 align-middle text-text-primary">{row.recipient}</td><td className="px-4 py-3 align-middle text-text-primary">{renderTableCell(row.status)}</td><td className="px-4 py-3 align-middle text-text-primary">{row.attempts}</td><td className="px-4 py-3 align-middle text-text-primary">{renderTableCell(row.status === "Failed" && can(user, "notification.retry") ? "Retry" : "View")}</td></tr>)}</tbody></table></div></Card></>;
}
export function ImportPage() { const [stage, setStage] = useState<"upload" | "map" | "preview" | "result">("upload"); return <><PageHeader title="Ledger import" description="Nothing is saved until you confirm the final import." /><Card className="max-w-4xl"><p className="text-sm font-medium">Step: {stage === "upload" ? "Upload a .xlsx or .csv file" : stage === "map" ? "Map columns" : stage === "preview" ? "Preview and validate" : "Import result"}</p>{stage === "upload" && <input className="mt-5 block" type="file" accept=".xlsx,.csv" />}{stage === "map" && <p className="mt-4 text-sm">Column suggestions are based on headers; correct each mapping before previewing.</p>}{stage === "preview" && <ListCard headers={["Row", "Status", "Details"]} rows={[["2", "Valid", "Ready to import"], ["3", "Warning", "Missing guardian email"], ["4", "Error", "Duplicate student number"]]} />}{stage === "result" && <p className="mt-4 text-sm">Import complete: 1 created, 1 skipped. Download the error report for problem rows.</p>}<div className="mt-5 flex gap-3"><Button variant="secondary" onClick={() => setStage("upload")}>Cancel</Button><Button onClick={() => setStage(stage === "upload" ? "map" : stage === "map" ? "preview" : stage === "preview" ? "result" : "result")}>{stage === "preview" ? "Confirm valid rows" : stage === "result" ? "Download error report" : "Continue"}</Button></div></Card></>; }

export function SettingsPage({ section, editable }: { section: "fees" | "plans" | "clearance" | "school" | "receipt" | "email"; editable: boolean }) { const settings = { fees: { title: "Fee schedules", description: "School year and grade-level fee items apply to new accounts only.", action: "Add fee item", headers: ["School year", "Grade level", "Fee item", "Status"], rows: [["SY 2026-2027", "Grade 7", "Tuition - ₱12,500.00", "Active"], ["SY 2026-2027", "Grade 8", "Miscellaneous - optional", "Active"]] }, plans: { title: "Payment plans", description: "Plan changes apply to new accounts only; preview schedules before saving.", action: "Add plan", headers: ["Plan", "Down payment", "Installments", "Status"], rows: [["Monthly", "₱2,000.00", "8 due dates", "Active"], ["Quarterly", "25%", "4 due dates", "Active"]] }, clearance: { title: "Clearance rules", description: "Rules are computed by the server after payments, voids, and adjustments.", action: "Add rule", headers: ["Period", "Rule", "Preview", "Status"], rows: [["Enrollment", "Minimum down payment", "Cleared after required down payment", "Active"], ["Midterm", "Installments paid through exam start", "Checks schedule before permit", "Active"]] }, school: { title: "School and academic lists", description: "Manage school year, terms, exam periods, grades, sections, and payment methods.", action: "Add list item", headers: ["List", "Current value", "Status"], rows: [["School year", "SY 2026-2027 current", "Active"], ["Exam period", "Midterm starts Oct 15, 2026", "Active"], ["Payment method", "Cash, Check, Bank deposit", "Active"]] }, receipt: { title: "Receipt settings", description: "Set school header, receipt title, and configured paper size.", action: "Edit receipt settings", headers: ["Setting", "Current value", "Status"], rows: [["Receipt title", "Acknowledgment Receipt", "Active"], ["Paper size", "Letter", "Active"], ["Next receipt number", "OR-2026-001002", "Read-only"]] }, email: { title: "Email settings", description: "Configure sender details, daily send limit, and a test email.", action: "Edit email settings", headers: ["Setting", "Current value", "Status"], rows: [["Sender", "Mendez Christian Academy Billing", "Active"], ["Daily send limit", "100 messages", "Active"], ["Test email", "Available for administrators", "Ready"]] } } as const; const current = settings[section]; return <><PageHeader title={current.title} description={current.description} action={editable ? <Button>{current.action}</Button> : undefined} /><Card><p className="text-sm text-text-secondary">{editable ? "Changes are prepared in this mock screen and would be audited by the backend." : "You have read-only access to these settings."}</p><ListCard className="mt-4" headers={[...current.headers]} rows={current.rows.map((row) => [...row])} /></Card></>; }
export function UsersPage() { return <><PageHeader title="User administration" description="Create, search, edit, deactivate, reactivate, or reset user accounts." action={<Button>Create user</Button>} /><ListCard headers={["Name", "Username", "Role", "State", "Action"]} rows={[["Alex Administrator (sample)", "sample.admin", "Administrator", "Active", "Edit"], ["Casey Cashier (sample)", "sample.cashier", "Cashier", "Active", "Reset password"]]} /><Card className="mt-5"><p className="text-sm text-text-secondary">Temporary passwords are shown once after creation or reset. An administrator cannot deactivate themselves or the last active administrator.</p></Card></>; }
export function RolesPage() { return <><PageHeader title="Role matrix" description="Read-only reference for the application capability matrix." /><ListCard headers={["Capability", "Administrator", "Cashier", "Accounting", "Auditor", "Registrar"]} rows={[["Student records", "Full", "Full", "Read", "Read", "Limited"], ["Payments", "Read", "Full", "Read", "Read", "—"], ["Exam permits", "—", "Print", "—", "—", "Print"]]} /></>; }
export function AuditPage() { return <><PageHeader title="Audit log" description="Filter activity by user, action, date, or entity. Entries cannot be changed or deleted." /><ListCard headers={["When", "User", "Action", "Entity", "Details"]} rows={[["Sep 27, 2026, 9:00 AM", "Casey Cashier (sample)", "Recorded payment", "OR-2026-001000", "View before/after values"], ["Sep 27, 2026, 8:30 AM", "Alex Administrator (sample)", "Signed in", "Session", "View"]]} /></>; }
export function BackupPage() { return <><PageHeader title="Backup and recovery" description="Review backup status and start a manual backup when needed." action={<Button>Run backup now</Button>} /><div className="grid gap-4 md:grid-cols-3"><Metric label="Last backup" value="Sep 27, 2026, 1:00 AM" /><Metric label="Result" value="Succeeded" /><Metric label="Last restore test" value="Sep 01, 2026" /></div><Card className="mt-5"><h2 className="font-semibold">Restore instructions</h2><ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-text-secondary"><li>Stop the application with the school administrator.</li><li>Use the approved server restore procedure outside this application.</li><li>Verify the restored data before allowing users to sign in.</li></ol></Card></>; }

function Metric({ label, value }: { label: string; value: ReactNode }) { return <Card className="group flex min-h-[96px] flex-col border-l-4 border-l-brand-green p-3 transition-shadow hover:shadow-md"><div className="flex min-h-7 items-start justify-between gap-3"><CardLabel className="leading-5">{label}</CardLabel><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brand-green-light/60 bg-[#EAF6EC] text-brand-green-dark"><CircleDashed aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} /></span></div><CardValue className="truncate">{value}</CardValue></Card>; }

function ListCard({ headers, rows, className }: { headers: string[]; rows: string[][]; className?: string }) {
  return <Card className={cn("overflow-hidden p-0", className)}><div className="overflow-x-auto"><table className="w-full min-w-[560px] border-collapse text-left text-sm"><thead><tr className="border-b bg-surface">{headers.map((header) => <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary" key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr className="border-b border-border transition-colors last:border-0 hover:bg-surface/70 focus-within:bg-surface/70" key={index}>{row.map((cell, itemIndex) => <td className="px-4 py-3 align-middle text-text-primary" key={itemIndex}>{renderTableCell(cell)}</td>)}</tr>)}</tbody></table></div></Card>;
}

function renderTableCell(cell: string) {
  if (!getStatusPresentation(cell)) return cell;
  return <StatusBadge status={cell} />;
}
