// The static mock fixtures intentionally model incomplete server responses.
// Route and role behavior is covered at the component boundary until API types land.
// @ts-nocheck
import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Check, ChevronsUpDown, CircleDashed, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardLabel, CardValue } from "@/components/ui/Card";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { StudentSearchField } from "@/features/students/StudentSearchField";
import { students } from "@/features/students/mockStudents";
import {
  billingAccounts,
  payments,
  getBillingAccount,
  getCurrentBillingAccount,
  getDueInstallments,
  getMockPayment,
  getNextDueRecord,
  getPaymentsForStudent,
  getStudentBillingAccounts,
  getStudentById,
} from "@/features/students/mockBilling";
import { studentMatchesSearch } from "@/features/students/studentSearch";
import { can, canViewReport, type ReportKind } from "@/lib/permissions";
import { format, centavos } from "@/lib/money";
import { roleLabel } from "@/auth/session";
import { cn } from "@/lib/cn";
import { getStatusPresentation } from "@/lib/status";
import { recordCashPaymentForStudent, type NotificationChannel, type SavedCashPayment } from "@/api/cashierApi";
import type { AuthenticatedUser, Capability } from "@/lib/types";

const firstStudent = students[0]!;
const dueRecordsByStudentId = {
  "sample-1001": [
    {
      account: "SY 2026-2027 tuition",
      installment: "Installment 1",
      dueDate: "Oct 01, 2026",
      status: "Due soon",
      amountDue: centavos(125000),
    },
  ],
  "sample-1002": [
    {
      account: "SY 2026-2027 tuition",
      installment: "Installment 1",
      dueDate: "Sep 30, 2026",
      status: "Due soon",
      amountDue: centavos(420000),
    },
  ],
  "sample-1003": [
    {
      account: "SY 2026-2027 tuition",
      installment: "Installment 1",
      dueDate: "Sep 15, 2026",
      status: "Overdue",
      amountDue: centavos(450000),
    },
    {
      account: "SY 2026-2027 tuition",
      installment: "Installment 2",
      dueDate: "Oct 01, 2026",
      status: "Due soon",
      amountDue: centavos(400000),
    },
  ],
};
const gradeOptions = [
  "Kinder",
  ...Array.from({ length: 12 }, (_, index) => `Grade ${index + 1}`),
].map((grade) => ({ value: grade, label: grade }));

function asDropdownOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }));
}

const sectionOptionsByGrade: Record<string, { value: string; label: string }[]> = {
  Kinder: asDropdownOptions(["Section A", "Section B"]),
  "Grade 1": asDropdownOptions(["Section A", "Section B"]),
  "Grade 2": asDropdownOptions(["Section A", "Section B"]),
  "Grade 3": asDropdownOptions(["Section A", "Section B"]),
  "Grade 4": asDropdownOptions(["Section A", "Section B"]),
  "Grade 5": asDropdownOptions(["Section A", "Section B"]),
  "Grade 6": asDropdownOptions(["Section A", "Section B"]),
  "Grade 7": asDropdownOptions(["Olive", "Section B"]),
  "Grade 8": asDropdownOptions(["Maple", "Section B"]),
  "Grade 9": asDropdownOptions(["Pine", "Section B"]),
  "Grade 10": asDropdownOptions(["Section A", "Section B"]),
  "Grade 11": asDropdownOptions(["Exodus", "Section B"]),
  "Grade 12": asDropdownOptions(["Exodus", "Section B"]),
};

const strandOptions = ["STEM", "ABM", "HUMSS", "TVL"].map((strand) => ({
  value: strand,
  label: strand,
}));

function isSeniorHighGrade(grade: string) {
  return grade === "Grade 11" || grade === "Grade 12";
}

function getSectionOptions(grade: string) {
  return sectionOptionsByGrade[grade] ?? [];
}
const notificationRows = [
  {
    student: students[0].name,
    type: "Payment confirmation",
    channel: "Email",
    recipient: "guardian@example.test",
    loadFee: "—",
    status: "Queued",
    attempts: "1",
  },
  {
    student: students[1].name,
    type: "Payment confirmation",
    channel: "SMS",
    recipient: "0917 555 0101",
    loadFee: "Not configured",
    status: "Sent",
    attempts: "1",
  },
  {
    student: students[2].name,
    type: "Reminder",
    channel: "SMS",
    recipient: "No guardian mobile number",
    loadFee: "—",
    status: "Failed",
    attempts: "0",
  },
];
const notificationStatusOptions = [
  { value: "all", label: "All statuses" },
  ...Array.from(new Set(notificationRows.map((row) => row.status))).map(
    (status) => ({ value: status.toLowerCase(), label: status }),
  ),
];

const primaryLinkClass =
  "inline-flex min-h-control items-center justify-center gap-2 rounded-md bg-brand-green-dark px-4 text-sm font-medium text-white transition-colors hover:bg-[#023d12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark";
const secondaryLinkClass =
  "inline-flex min-h-control items-center justify-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark";
const inlineLinkClass =
  "inline-flex min-h-control items-center gap-1 text-sm font-medium text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark";
const inputClass =
  "mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-text-primary placeholder:text-text-muted-readable transition-colors focus-visible:border-brand-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-green-dark";
const textareaClass =
  "mt-3 w-full rounded-md border border-border bg-white p-3 text-text-primary placeholder:text-text-muted-readable transition-colors focus-visible:border-brand-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-green-dark";

function manilaDateInput(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (kind: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === kind)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function MockDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%_-_2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-white p-5 shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-text-primary">
            {title}
          </Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PageHeader({
  title,
  description,
  action,
  backTo,
  backLabel = "Back",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  function goBack() {
    if (location.key !== "default") {
      navigate(-1);
      return;
    }
    if (backTo) navigate(backTo);
  }
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {backTo && (
          <button
            className="mb-3 inline-flex min-h-control items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
            type="button"
            onClick={goBack}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </button>
        )}
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">
          {description}
        </p>
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}

export function DeniedPage() {
  return (
    <SystemPage
      title="Access denied"
      description="You do not have permission to open this page."
    />
  );
}
export function NotFoundPage() {
  return (
    <SystemPage
      title="Page not found"
      description="The address you entered does not match an EducaTrak page."
    />
  );
}
function SystemPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="mx-auto mt-20 max-w-lg border-l-4 border-l-brand-green text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-text-secondary">{description}</p>
      <Link className={cn(primaryLinkClass, "mt-6")} to="/">
        Go to dashboard
      </Link>
    </Card>
  );
}

export function RequireCapability({
  user,
  capability,
  children,
}: {
  user: AuthenticatedUser;
  capability: Capability;
  children: ReactNode;
}) {
  return can(user, capability) ? <>{children}</> : <DeniedPage />;
}

export function ProfilePage({ user }: { user: AuthenticatedUser }) {
  const [saved, setSaved] = useState(false);
  function save(event: FormEvent) {
    event.preventDefault();
    setSaved(true);
  }
  return (
    <>
      <PageHeader
        title="My profile"
        description="Review your account details and change your password."
      />
      <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
        <Metric label="Name" value={user.name} />
        <Card>
          <h2 className="text-lg font-semibold">Change password</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Role: {roleLabel(user.role)} · Last login: Sep 27, 2026, 9:00 AM
          </p>
          <form className="mt-4 space-y-3" onSubmit={save}>
            <label className="block text-sm font-medium">
              Current password
              <input required type="password" className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              New password
              <input
                required
                minLength={12}
                type="password"
                className={inputClass}
              />
            </label>
            <p className="text-sm text-text-secondary">
              Use at least 12 characters with upper- and lowercase letters, a
              number, and a symbol.
            </p>
            {saved && (
              <p
                role="status"
                className="text-sm font-medium text-brand-green-dark"
              >
                Password change submitted.
              </p>
            )}
            <Button>Update password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}

export function StudentsPage({ user }: { user: AuthenticatedUser }) {
  const [query, setQuery] = useState("");
  const limited = user.role === "registrar";
  const shown = students.filter((student) =>
    studentMatchesSearch(student, query),
  );
  return (
    <>
      <PageHeader
        title="Students"
        description={
          limited
            ? "Search student enrollment and clearance information."
            : "Search and filter student records."
        }
        action={
          can(user, "student.edit") ? (
            <Link className={primaryLinkClass} to="/students/new">
              Add student
            </Link>
          ) : undefined
        }
      />
      <Card className="space-y-4 p-0">
        <div className="border-b border-border p-4">
          <StudentSearchField
            id="student-search"
            label="Search students"
            value={query}
            onChange={setQuery}
            autoFocus
            placeholder="Search by student name or number"
            wrapperClassName="max-w-lg"
            labelClassName="sr-only"
            inputClassName={cn(inputClass, "m-0")}
          />
        </div>
        <StudentTable user={user} data={shown} />
      </Card>
    </>
  );
}

function StudentTable({
  user,
  data,
}: {
  user: AuthenticatedUser;
  data: typeof students;
}) {
  const limited = user.role === "registrar";
  const navigate = useNavigate();

  function openStudent(studentId: string) {
    navigate(`/students/${studentId}`);
  }

  function handleStudentRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    studentId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openStudent(studentId);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead>
          <tr className="border-b bg-surface">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
              Student
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
              Grade & section
            </th>
            {!limited && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                Balance
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
              Student status
            </th>
            {!limited && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                Billing status
              </th>
            )}
            {limited && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                Clearance
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((student) => (
            <tr
              aria-label={`Open ${student.name}`}
              className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface/70 focus:bg-surface/70 focus:outline-none focus-visible:bg-surface/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-green-dark"
              key={student.id}
              onClick={() => openStudent(student.id)}
              onKeyDown={(event) => handleStudentRowKeyDown(event, student.id)}
              role="link"
              tabIndex={0}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-brand-green-dark">
                  {student.name}
                </div>
                <div className="text-sm text-text-secondary">
                  {student.number}
                </div>
              </td>
              <td className="px-4 py-3">
                {student.grade} - {student.section}
              </td>
              {!limited && (
                <td className="px-4 py-3 font-medium">
                  {format(student.balance)}
                </td>
              )}
              <td className="px-4 py-3">
                <StatusBadge status={student.studentStatus} />
              </td>
              {!limited && (
                <td className="px-4 py-3">
                  <StatusBadge status={student.billingStatus} />
                </td>
              )}
              {limited && (
                <td className="px-4 py-3">
                  <StatusBadge status={student.clearanceStatus} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function StudentFormPage({ edit }: { edit?: boolean }) {
  const navigate = useNavigate();
  const [duplicate, setDuplicate] = useState(false);
  const initialGrade = edit ? students[0].grade : gradeOptions[0].value;
  const [grade, setGrade] = useState(initialGrade);
  const [section, setSection] = useState(
    edit ? students[0].section : getSectionOptions(initialGrade)[0]?.value ?? "",
  );
  const [strand, setStrand] = useState("");
  const seniorHigh = isSeniorHighGrade(grade);

  function selectGrade(nextGrade: string) {
    setGrade(nextGrade);
    setSection(getSectionOptions(nextGrade)[0]?.value ?? "");
    setStrand(isSeniorHighGrade(nextGrade) ? strandOptions[0].value : "");
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const number = new FormData(e.currentTarget).get("number");
    setDuplicate(number === "S-1001");
    if (number !== "S-1001") navigate("/students/sample-1001");
  }
  return (
    <>
      <PageHeader
        title={edit ? "Edit student" : "Add student"}
        description="Student numbers must be unique. Guardian contact details are used for payment notifications."
        backTo={edit ? "/students/sample-1001" : "/students"}
      />
      <form onSubmit={submit} className="max-w-3xl space-y-5">
        <Card className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Student number
            <input
              name="number"
              required
              defaultValue={edit ? "S-1001" : ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium">
            Student name
            <input
              name="name"
              required
              defaultValue={edit ? students[0].name : ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium">
            Grade level
            <span className="mt-1 block">
              <DropdownSelect
                aria-label="Grade level"
                value={grade}
                options={gradeOptions}
                onChange={selectGrade}
                className="w-full"
                contentClassName="min-w-[var(--radix-dropdown-menu-trigger-width)]"
                align="start"
              />
            </span>
            <input name="grade" type="hidden" value={grade} />
          </label>
          <label className="text-sm font-medium">
            Section
            <span className="mt-1 block">
              <DropdownSelect
                aria-label="Section"
                value={section}
                options={getSectionOptions(grade)}
                onChange={setSection}
                className="w-full"
                contentClassName="min-w-[var(--radix-dropdown-menu-trigger-width)]"
                align="start"
              />
            </span>
            <input name="section" type="hidden" value={section} />
          </label>
          {seniorHigh && (
            <label className="text-sm font-medium">
              Strand
              <span className="mt-1 block">
                <DropdownSelect
                  aria-label="Strand"
                  value={strand}
                  options={strandOptions}
                  onChange={setStrand}
                  className="w-full"
                  contentClassName="min-w-[var(--radix-dropdown-menu-trigger-width)]"
                  align="start"
                />
              </span>
              <input name="strand" type="hidden" value={strand} />
            </label>
          )}
          {seniorHigh && (
            <p className="text-sm text-text-secondary md:col-span-2">
              Student will be listed as {grade} - {strand} {section}.
            </p>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold">Guardian</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Name
              <input required className={inputClass} />
            </label>
            <label className="text-sm font-medium">
              Relationship
              <input required className={inputClass} />
            </label>
            <label className="text-sm font-medium">
              Email
              <input type="email" className={inputClass} />
            </label>
            <label className="text-sm font-medium">
              Mobile
              <input className={inputClass} />
            </label>
          </div>
        </Card>
        {duplicate && (
          <p role="alert" className="text-sm text-status-error">
            This student number already belongs to a student record.
          </p>
        )}
        <Button>{edit ? "Save changes" : "Create student"}</Button>
      </form>
    </>
  );
}

type StudentProfileTab = "overview" | "billing" | "payments" | "followup";

export function StudentProfilePage({ user }: { user: AuthenticatedUser }) {
  const { id } = useParams();
  const student = getStudentById(id);
  if (!student) return <NotFoundPage />;
  const limited = user.role === "registrar";
  return (
    <>
      <PageHeader
        title={student.name}
        description={`${student.number} - ${student.grade} - ${student.section}`}
        backTo="/students"
        action={
          !limited && can(user, "student.edit") ? (
            <Link
              to={`/students/${student.id}/edit`}
              className={secondaryLinkClass}
            >
              Edit student
            </Link>
          ) : undefined
        }
      />
      {limited ? (
        <StudentOverviewPanel student={student} limited />
      ) : (
        <StudentProfileTabs user={user} student={student} />
      )}
    </>
  );
}

function StudentProfileTabs({
  user,
  student,
}: {
  user: AuthenticatedUser;
  student: typeof firstStudent;
}) {
  const options = [
    { id: "overview", label: "Overview" },
    can(user, "account.view") ? { id: "billing", label: "Billing" } : null,
    can(user, "payment.view") || can(user, "payment.record")
      ? { id: "payments", label: "Payments" }
      : null,
    can(user, "followup.view") ? { id: "followup", label: "Follow-up" } : null,
  ].filter(Boolean) as { id: StudentProfileTab; label: string }[];
  const preferred = options[0];
  const [activeView, setActiveView] = useState<StudentProfileTab>(
    preferred?.id ?? "overview",
  );
  const visibleView = options.some((option) => option.id === activeView)
    ? activeView
    : preferred?.id;

  if (!preferred || !visibleView) return null;

  return (
    <Card className="mt-5">
      <h2 className="font-semibold">Student profile</h2>
      <div
        className="mt-3 flex flex-wrap gap-3"
        role="tablist"
        aria-label="Student profile sections"
      >
        {options.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant={visibleView === option.id ? "primary" : "secondary"}
            role="tab"
            aria-selected={visibleView === option.id}
            aria-controls={`student-profile-${option.id}`}
            onClick={() => setActiveView(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <div
        className="mt-5 rounded-md border border-border bg-surface p-4"
        id={`student-profile-${visibleView}`}
        role="tabpanel"
      >
        {visibleView === "overview" && (
          <StudentOverviewPanel student={student} />
        )}
        {visibleView === "billing" && (
          <StudentBillingPanel student={student} user={user} />
        )}
        {visibleView === "payments" && (
          <StudentPaymentsPanel student={student} user={user} />
        )}
        {visibleView === "followup" && (
          <StudentFollowupWidget student={student} user={user} />
        )}
      </div>
    </Card>
  );
}

function StudentOverviewPanel({
  student,
  limited = false,
}: {
  student: typeof firstStudent;
  limited?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric
          label="Clearance"
          value={<StatusBadge status={student.clearanceStatus} />}
        />
        {!limited && (
          <Metric label="Account balance" value={format(student.balance)} />
        )}
        <Metric
          label="Student status"
          value={<StatusBadge status={student.studentStatus} />}
        />
        {!limited && (
          <Metric
            label="Billing status"
            value={<StatusBadge status={student.billingStatus} />}
          />
        )}
      </div>
      {!limited && (
        <Card className="bg-white">
          <h3 className="font-semibold">Guardian details</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Guardian email health and contact changes stay with the student
            record.
          </p>
          <ListCard
            className="mt-3"
            headers={["Guardian", "Relationship", "Email status"]}
            rows={[["Sample Guardian", "Parent", "Queued"]]}
          />
        </Card>
      )}
    </div>
  );
}

function StudentBillingPanel({
  student,
  user,
}: {
  student: typeof firstStudent;
  user: AuthenticatedUser;
}) {
  const accounts = getStudentBillingAccounts(student.id);
  const current = getCurrentBillingAccount(student.id);
  if (!current)
    return (
      <p className="text-sm text-text-secondary">
        No billing account is available for this student.
      </p>
    );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Billing accounts</h3>
          <p className="text-sm text-text-secondary">
            Current, upcoming, and historical school-year records.
          </p>
        </div>
      </div>
      <ListCard
        headers={["School year", "Balance", "Status", "Open"]}
        rows={accounts.map((account) => [
          account.schoolYear,
          format(account.balance),
          account.status,
          "View account",
        ])}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Current school year" value={current.schoolYear} />
        <Metric label="Balance" value={format(current.balance)} />
        <Metric
          label="Billing status"
          value={<StatusBadge status={current.status} />}
        />
      </div>
      <ListCard
        headers={["Due date", "Amount", "Paid", "Status"]}
        rows={current.schedule.map((installment) => [
          installment.dueDate,
          format(installment.amount),
          format(installment.paid),
          installment.status.replace("_", " "),
        ])}
      />
      <StudentStatementWidget student={student} user={user} />
    </div>
  );
}

function StudentPaymentsPanel({
  student,
  user,
}: {
  student: typeof firstStudent;
  user: AuthenticatedUser;
}) {
  const studentPayments = getPaymentsForStudent(student.id);
  return (
    <div className="space-y-5">
      {can(user, "payment.record") && (
        <PaymentWorkflow preselectedStudent={student} compact />
      )}
      <ListCard
        headers={["Receipt", "Date", "Amount", "Status"]}
        rows={studentPayments.map((payment) => [
          payment.receiptNo,
          payment.paidOn,
          format(payment.amount),
          payment.status,
        ])}
      />
    </div>
  );
}

function StudentFollowupWidget({
  student,
  user,
}: {
  student: typeof firstStudent;
  user: AuthenticatedUser;
}) {
  const [selected, setSelected] = useState(true);
  const dueRecords = getDueInstallments(student.id).map(
    ({ account, installment, amountDue }) => ({
      account: `${account.schoolYear} tuition`,
      installment: installment.label,
      dueDate: installment.dueDate,
      status: installment.status
        .replace("_", " ")
        .replace(/^./, (firstLetter) => firstLetter.toUpperCase()),
      amountDue,
    }),
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Follow-up reminder</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Review the due records before preparing a reminder.
        </p>
      </div>
      <div className="grid gap-3 rounded-md border border-brand-green-light bg-[#F4FAF5] p-4 text-sm md:grid-cols-3">
        <div>
          <span className="block text-xs font-medium uppercase text-text-secondary">
            Student
          </span>
          <span className="mt-1 block font-semibold text-text-primary">
            {student.name}
          </span>
        </div>
        <div>
          <span className="block text-xs font-medium uppercase text-text-secondary">
            Guardian email
          </span>
          <span className="mt-1 block font-semibold text-text-primary">
            guardian@example.test
          </span>
        </div>
        <div>
          <span className="block text-xs font-medium uppercase text-text-secondary">
            Total due
          </span>
          <span className="mt-1 block font-semibold text-text-primary">
            {format(student.balance)}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-surface">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                Due record
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                Payment for
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                Due date
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-text-secondary">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-secondary">
                Amount due
              </th>
            </tr>
          </thead>
          <tbody>
            {dueRecords.map((record) => (
              <tr
                className="border-b border-border last:border-0"
                key={`${record.account}-${record.installment}`}
              >
                <td className="px-4 py-3 align-middle text-text-primary">
                  {record.account}
                </td>
                <td className="px-4 py-3 align-middle font-medium text-text-primary">
                  {record.installment}
                </td>
                <td className="px-4 py-3 align-middle text-text-primary">
                  {record.dueDate}
                </td>
                <td className="px-4 py-3 align-middle text-center text-text-primary">
                  {renderTableCell(record.status)}
                </td>
                <td className="px-4 py-3 text-right align-middle font-semibold text-text-primary">
                  {format(record.amountDue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => setSelected(event.target.checked)}
          />{" "}
          Include this student in the reminder batch
        </label>
        {can(user, "followup.send") && (
          <Button disabled={!selected}>Prepare reminder</Button>
        )}
      </div>
    </div>
  );
}

function StudentStatementWidget({
  student,
  user,
}: {
  student: typeof firstStudent;
  user: AuthenticatedUser;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Statement of account</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Fees, payments, and remaining balance for {student.name}.
          </p>
        </div>
        {can(user, "statement.print") && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.print()}
          >
            Print
          </Button>
        )}
      </div>
      <StudentStatementTable />
    </div>
  );
}

export function AccountsPage({ user }: { user: AuthenticatedUser }) {
  return (
    <>
      <PageHeader
        title="Billing accounts"
        description="Supported account directory for current, upcoming, and historical school-year records."
        action={
          can(user, "account.create") ? (
            <Link className={primaryLinkClass} to="/accounts/new">
              Create account
            </Link>
          ) : undefined
        }
      />
      <ListCard
        rows={billingAccounts.map((account) => [
          getStudentById(account.studentId)?.name ?? "Unknown student",
          account.schoolYear,
          format(account.balance),
          account.status,
        ])}
        headers={["Student", "School year", "Balance", "Billing status"]}
      />
    </>
  );
}
export function AccountWizardPage() {
  const [step, setStep] = useState(1);
  const [studentQuery, setStudentQuery] = useState("");
  const [created, setCreated] = useState(false);
  const navigate = useNavigate();
  const steps = ["Student", "Fees & plan", "Schedule", "Review"];
  function createAccount() {
    setCreated(true);
    window.setTimeout(() => navigate("/accounts/account-1001?created=1"), 0);
  }
  return (
    <>
      <PageHeader
        title="Create billing account"
        description="Set up an account for one student and one school year."
        backTo="/accounts"
      />
      <Card className="max-w-4xl">
        <ol className="mb-6 flex flex-wrap gap-2 text-sm">
          {steps.map((label, i) => (
            <li
              key={label}
              className={cn(
                "rounded-md border px-3 py-2",
                i + 1 === step
                  ? "border-brand-green-light bg-[#EAF6EC] font-semibold text-brand-green-dark"
                  : "border-border bg-white text-text-secondary",
              )}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>
        <h2 className="text-lg font-semibold">{steps[step - 1]}</h2>
        <p className="mt-2 text-sm text-text-secondary">
          {step === 1
            ? "Search for a student, or create a student before continuing."
            : step === 2
              ? "Configured fee items and payment plans load from school settings."
              : step === 3
                ? "Review installment due dates and amounts before saving."
                : "Confirm the student, fees, plan, and schedule. A duplicate school-year account is blocked."}
        </p>
        {step === 1 && (
          <StudentSearchField
            value={studentQuery}
            onChange={setStudentQuery}
            autoFocus
            placeholder="Search student name or number"
            wrapperClassName="mt-5"
            inputClassName={cn(inputClass, "m-0")}
          />
        )}
        {step === 2 && (
          <div className="mt-5 rounded-md border border-border bg-surface p-4 text-sm">
            Required and optional fee items will be loaded from the selected
            student's grade-level schedule.
          </div>
        )}
        {step === 3 && (
          <ListCard
            className="mt-5"
            rows={[
              ["Down payment", "Sep 01, 2026", "₱2,000.00"],
              ["Installment 1", "Oct 01, 2026", "₱2,500.00"],
            ]}
            headers={["Installment", "Due date", "Amount"]}
          />
        )}
        {step === 4 && (
          <div className="mt-5 rounded-md border border-brand-green-light bg-[#F4FAF5] p-4 text-sm">
            Creating the account saves the configured schedule. Existing
            accounts are never changed by later fee or plan edits.
          </div>
        )}
        <div className="mt-6 flex justify-between">
          <Button
            variant="secondary"
            disabled={step === 1 || created}
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
          <Button
            disabled={created}
            onClick={() => (step === 4 ? createAccount() : setStep(step + 1))}
          >
            {created
              ? "Creating account..."
              : step === 4
                ? "Create account"
                : "Continue"}
          </Button>
        </div>
      </Card>
    </>
  );
}
export function AccountDetailPage({ user }: { user: AuthenticatedUser }) {
  const { id } = useParams();
  const account = getBillingAccount(id);
  const student = account && getStudentById(account.studentId);
  if (!account || !student) return <NotFoundPage />;
  return (
    <>
      <PageHeader
        title="Billing account"
        description={`${account.schoolYear} · ${student.name}`}
        backTo="/accounts"
        action={
          can(user, "payment.record") ? (
            <Link
              className={primaryLinkClass}
              to={`/payments/new?student=${student.id}`}
            >
              Record payment
            </Link>
          ) : undefined
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Total fees" value={format(account.totalDue)} />
        <Metric label="Paid" value={format(account.totalPaid)} />
        <Metric label="Balance" value={format(account.balance)} />
      </div>
      <div className="mt-5">
        <ListCard
          headers={["Due date", "Amount", "Paid", "Status"]}
          rows={account.schedule.map((installment) => [
            installment.dueDate,
            format(installment.amount),
            format(installment.paid),
            installment.status.replace("_", " "),
          ])}
        />
      </div>
    </>
  );
}

export function PaymentsPage({
  user,
  detail = false,
}: {
  user: AuthenticatedUser;
  detail?: boolean;
}) {
  if (detail) return <PaymentDetailPage user={user} />;
  return (
    <>
      <PageHeader
        title="Transaction history"
        description={
          user.role === "cashier"
            ? "Your recorded payments are shown by default."
            : "Search and filter recorded payments."
        }
        action={
          can(user, "payment.record") ? (
            <Link className={primaryLinkClass} to="/payments/new">
              Record payment
            </Link>
          ) : undefined
        }
      />
      <ListCard
        headers={["Receipt", "Student", "Amount", "Method", "Status"]}
        rows={payments.map((payment) => [
          <Link className={inlineLinkClass} to={`/payments/${payment.id}`}>
            {payment.receiptNo}
          </Link>,
          getStudentById(payment.studentId)?.name ?? "Unknown student",
          format(payment.amount),
          "Cash",
          payment.status,
        ])}
      />
    </>
  );
}
function PaymentDetailPage({ user }: { user: AuthenticatedUser }) {
  const { id } = useParams();
  const payment = getMockPayment(id ?? "mock-payment-0");
  const canDownloadPdf = can(user, "receipt.pdf");
  const account = payment && getBillingAccount(payment.accountId);
  const student = payment && getStudentById(payment.studentId);

  if (!payment || !student) return <NotFoundPage />;

  return (
    <>
      <PageHeader
        title={`Payment ${payment.receiptNo}`}
        description={`Recorded ${payment.paidOn} - Payment details are permanent after saving.`}
        backTo="/payments"
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              className={secondaryLinkClass}
              to={`/receipts/${payment.id}/print`}
            >
              {can(user, "receipt.reprint")
                ? "Reprint receipt"
                : "View receipt"}
            </Link>
            {canDownloadPdf && (
              <Button type="button" variant="secondary">
                Download PDF receipt
              </Button>
            )}
            {can(user, "payment.void.approve") && (
              <Link className={secondaryLinkClass} to="/voids">
                Review void queue
              </Link>
            )}
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Student" value={student.name} />
        <Metric label="Amount" value={format(payment.amount)} />
        <Metric label="Recorder" value="Casey Cashier (sample)" />
        <Metric label="Email status" value={<StatusBadge status="Queued" />} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ListCard
          headers={["Allocation", "Amount"]}
          rows={[
            ...payment.allocations.map((allocation) => [
              account?.schedule.find((installment) => installment.id === allocation.installmentId)?.label ?? "Installment",
              format(allocation.amount),
            ]),
            ["Balance after payment", format(payment.balanceAfter)],
          ]}
        />
        <ListCard
          headers={["Audit item", "Status"]}
          rows={[
            ["Receipt number", payment.receiptNo],
            ["Notification", "Queued"],
            ["Reprint count", "0"],
            ["PDF downloads", canDownloadPdf ? "Available" : "View only"],
            ["Void state", payment.status],
          ]}
        />
      </div>
      {can(user, "payment.void.request") && (
        <Card className="mt-5">
          <h2 className="font-semibold">Request void</h2>
          <p className="mt-1 text-sm text-text-secondary">
            A reason of at least 10 characters is required. Accounting reviews
            the request.
          </p>
          <textarea
            minLength={10}
            className={textareaClass}
            placeholder="Reason for void request"
          />
          <Button className="mt-3" variant="destructive">
            Request void
          </Button>
        </Card>
      )}
    </>
  );
}

const paymentMethodOptions = [{ value: "Cash", label: "Cash" }];

function PaymentWorkflow({
  preselectedStudent,
  compact = false,
}: {
  preselectedStudent?: typeof firstStudent;
  compact?: boolean;
}) {
  const [searchParams] = useSearchParams();
  const initialStudent =
    preselectedStudent ??
    students.find((student) => student.id === searchParams.get("student"));
  const initialDueRecord = initialStudent
    ? getNextDueRecord(initialStudent.id)
    : undefined;
  const initialSuggestedAmount =
    initialDueRecord?.amountDue ?? initialStudent?.balance ?? centavos(0);
  const [studentQuery, setStudentQuery] = useState(
    initialStudent ? `${initialStudent.name} - ${initialStudent.number}` : "",
  );
  const [amount, setAmount] = useState(
    initialStudent ? (initialSuggestedAmount / 100).toFixed(2) : "",
  );
  const [method, setMethod] = useState("Cash");
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>(["email"]);
  const [feeName, setFeeName] = useState(initialDueRecord?.account ?? "");
  const [stage, setStage] = useState<"entry" | "confirm" | "saved">("entry");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedPayment, setSavedPayment] = useState<SavedCashPayment | null>(null);
  const selectedStudent =
    initialStudent ??
    students.find((student) => studentMatchesSearch(student, studentQuery));
  const nextDueRecord = selectedStudent
    ? getNextDueRecord(selectedStudent.id)
    : undefined;
  const suggestedAmount =
    nextDueRecord?.amountDue ?? selectedStudent?.balance ?? centavos(0);
  const amountNumber = Number(amount || 0);
  const enteredCentavos = centavos(
    Number.isFinite(amountNumber)
      ? Math.max(0, Math.round(amountNumber * 100))
      : 0,
  );
  const balanceAfterPayment = selectedStudent
    ? centavos(Math.max(0, selectedStudent.balance - enteredCentavos))
    : centavos(0);

  useEffect(() => {
    setFeeName(nextDueRecord?.account ?? "");
  }, [selectedStudent?.id]);

  function reviewPayment(event: FormEvent) {
    event.preventDefault();
    if (!selectedStudent) {
      setError("Select a student before reviewing the payment.");
      return;
    }
    if (notificationChannels.length === 0) {
      setError("Select email, SMS, or both for the receipt notification.");
      return;
    }
    if (!amount || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Enter an amount received that is more than zero.");
      return;
    }
    if (enteredCentavos > selectedStudent.balance) {
      setError(
        `Amount is more than the balance of ${format(selectedStudent.balance)}. Enter ${format(selectedStudent.balance)} or less.`,
      );
      return;
    }
    setError("");
    setStage("confirm");
  }

  function resetForNextPayment() {
    setStudentQuery(
      preselectedStudent
        ? `${preselectedStudent.name} - ${preselectedStudent.number}`
        : "",
    );
    setAmount("");
    setFeeName(getNextDueRecord(preselectedStudent?.id ?? "")?.account ?? "");
    setMethod("Cash");
    setNotificationChannels(["email"]);
    setStage("entry");
    setError("");
    setIsSaving(false);
    setSavedPayment(null);
  }

  async function savePayment() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payment = await recordCashPaymentForStudent({
        studentNumber: selectedStudent!.number,
        amount: enteredCentavos,
        paidOn: manilaDateInput(),
        notificationChannels,
      });
      setSavedPayment(payment);
      setStage("saved");
      setError("");
    } catch (saveError) {
      setStage("entry");
      setError(saveError instanceof Error ? saveError.message : "The payment could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={reviewPayment} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Record payment</h2>
        {compact && (
          <p className="mt-1 text-sm text-text-secondary">
            The current student is selected for this payment draft.
          </p>
        )}
      </div>
      {!preselectedStudent && (
        <StudentSearchField
          label="Student search"
          value={studentQuery}
          onChange={(value) => {
            setStudentQuery(value);
            setStage("entry");
            setIsSaving(false);
          }}
          onSelect={(student) => {
            setStudentQuery(student.name);
            const dueRecord = getNextDueRecord(student.id);
            setAmount(
              ((dueRecord?.amountDue ?? student.balance) / 100).toFixed(2),
            );
            setStage("entry");
            setError("");
            setIsSaving(false);
          }}
          autoFocus
          placeholder="Type a student name or number"
          labelClassName="block text-sm font-medium"
          inputClassName={inputClass}
        />
      )}
      {selectedStudent ? (
        <div className="grid gap-3 rounded-md border border-brand-green-light bg-[#F4FAF5] p-4 text-sm md:grid-cols-5">
          <div>
            <span className="block text-xs font-medium uppercase text-text-secondary">
              Student
            </span>
            <span className="mt-1 block font-semibold text-text-primary">
              {selectedStudent.name}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase text-text-secondary">
              Grade & section
            </span>
            <span className="mt-1 block font-semibold text-text-primary">
              {selectedStudent.grade} - {selectedStudent.section}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase text-text-secondary">
              Fee name
            </span>
            <span className="mt-1 block font-semibold text-text-primary">
              {nextDueRecord ? nextDueRecord.account : "Select a fee"}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase text-text-secondary">
              Next due record
            </span>
            <span className="mt-1 block font-semibold text-text-primary">
              {nextDueRecord ? nextDueRecord.installment : "No due record"}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase text-text-secondary">
              Amount due
            </span>
            <span className="mt-1 block font-semibold text-text-primary">
              {nextDueRecord
                ? format(nextDueRecord.amountDue)
                : format(selectedStudent.balance)}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-surface p-4 text-sm text-text-secondary">
          Select a student to show their current balance and next due
          installment.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium">
          Fee name
          <input
            className={inputClass}
            value={feeName}
            placeholder="SY 2026-2027 Tuition"
            onChange={(event) => {
              setFeeName(event.target.value);
              setStage("entry");
              setIsSaving(false);
            }}
            disabled={isSaving}
          />
        </label>
        <label className="text-sm font-medium">
          Amount received
          <input
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setStage("entry");
              setIsSaving(false);
            }}
            inputMode="decimal"
            placeholder="0.00"
            className={inputClass}
            disabled={isSaving}
          />
        </label>
        <label className="text-sm font-medium">
          Payment method
          <span className="mt-1 block">
            <DropdownSelect
              aria-label="Payment method"
              value={method}
              options={paymentMethodOptions}
              onChange={(value) => {
                setMethod(value);
                setStage("entry");
                setIsSaving(false);
              }}
              className="w-full"
              contentClassName="min-w-[var(--radix-dropdown-menu-trigger-width)]"
              align="start"
              disabled={isSaving}
            />
          </span>
        </label>
      </div>
      <fieldset className="rounded-md border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-medium">Receipt notification</legend>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-md border border-border bg-white p-3 text-sm">
            <input
              type="checkbox"
              checked={notificationChannels.includes("email")}
              disabled={isSaving}
              onChange={(event) => setNotificationChannels((channels) => (
                event.target.checked
                  ? [...channels, "email"]
                  : channels.filter((channel) => channel !== "email")
              ))}
            />
            <span>
              <span className="block font-medium text-text-primary">Email receipt</span>
              <span className="mt-1 block text-text-secondary">Send the receipt to the guardian's recorded email address.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-border bg-white p-3 text-sm">
            <input
              type="checkbox"
              checked={notificationChannels.includes("sms")}
              disabled={isSaving}
              onChange={(event) => setNotificationChannels((channels) => (
                event.target.checked
                  ? [...channels, "sms"]
                  : channels.filter((channel) => channel !== "sms")
              ))}
            />
            <span>
              <span className="block font-medium text-text-primary">SMS receipt</span>
              <span className="mt-1 block text-text-secondary">Send a receipt notice to the guardian's recorded mobile number.</span>
            </span>
          </label>
        </div>
        <p className="mt-3 rounded-md border border-status-warning bg-[#FFF8E8] p-3 text-sm text-text-primary">
          <span className="font-medium">SMS load fee:</span> Not configured. Any configured carrier/load cost is recorded with the SMS notification and is not added to this payment or the student's balance.
        </p>
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-[#F3C2C2] bg-[#FBEAEA] p-3 text-sm text-status-error"
        >
          {error}
        </p>
      )}
      {stage === "confirm" && selectedStudent && (
        <MockDialog
          open
          onOpenChange={(open) => !open && setStage("entry")}
          title="Confirm payment"
        >
          <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
            <div>
              <dt className="text-text-secondary">Student</dt>
              <dd className="font-medium">{selectedStudent.name}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Fee name</dt>
              <dd className="font-medium">{feeName || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Amount</dt>
              <dd className="font-medium">{format(enteredCentavos)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Method</dt>
              <dd className="font-medium">{method}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Balance left</dt>
              <dd className="font-medium">{format(balanceAfterPayment)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Receipt notification</dt>
              <dd className="font-medium">{notificationChannels.map((channel) => channel === "sms" ? "SMS" : "Email").join(" and ")}</dd>
            </div>
            {notificationChannels.includes("sms") && (
              <div>
                <dt className="text-text-secondary">SMS load fee</dt>
                <dd className="font-medium">Not configured; not added to the student balance</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStage("entry")}
              disabled={isSaving}
            >
              Edit
            </Button>
            <Button type="button" onClick={savePayment} disabled={isSaving}>
              {isSaving ? "Saving..." : "Confirm and save"}
            </Button>
          </div>
        </MockDialog>
      )}
      {stage === "saved" && selectedStudent && (
        <div
          className="rounded-md border border-status-success bg-[#EAF6EC] p-4"
          role="status"
        >
          <h2 className="text-base font-semibold text-brand-green-dark">
            Payment saved
          </h2>
          <p className="mt-1 text-sm text-text-primary">
            Receipt {savedPayment?.receiptNo} is ready. {savedPayment?.emailQueued ? "A payment email has been queued for the guardian." : notificationChannels.includes("email") ? "No guardian email is available." : "Email was not selected."} {savedPayment?.smsQueued ? "An SMS receipt has been queued for the guardian." : notificationChannels.includes("sms") ? "No guardian mobile number is available." : "SMS was not selected."}
          </p>
          {savedPayment?.smsQueued && (
            <p className="mt-2 text-sm text-text-secondary">
              SMS load fee: {savedPayment.smsLoadFeeCents === null ? "not configured; no fee was added to the student balance." : `${format(savedPayment.smsLoadFeeCents)} recorded outside the student balance.`}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className={secondaryLinkClass}
              to={`/receipts/${savedPayment?.id}/print`}
            >
              Preview receipt
            </Link>
            <Button type="button" onClick={resetForNextPayment}>
              Done
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {selectedStudent && (
          <button
            type="button"
            className={cn(inlineLinkClass, "px-1")}
            onClick={() => {
              setAmount((suggestedAmount / 100).toFixed(2));
              setStage("entry");
              setIsSaving(false);
            }}
            disabled={isSaving}
          >
            Pay next installment: {format(suggestedAmount)}
          </button>
        )}
        <Button disabled={!selectedStudent || stage === "saved" || isSaving}>
          Review payment
        </Button>
      </div>
    </form>
  );
}
export function PaymentEntryPage() {
  const [searchParams] = useSearchParams();
  const selectedStudent = students.find(
    (student) => student.id === searchParams.get("student"),
  );
  return (
    <>
      <PageHeader
        title="Record payment"
        description={
          selectedStudent
            ? `Record a cash payment for ${selectedStudent.name}. Review the balance and next installment before saving.`
            : "Search for a student, then review the balance and next installment before saving."
        }
        backTo="/payments"
      />
      <Card>
        <PaymentWorkflow preselectedStudent={selectedStudent} />
      </Card>
    </>
  );
}

export function ReceiptPage({ user }: { user: AuthenticatedUser }) {
  const { id } = useParams();
  const payment = getMockPayment(id ?? "mock-payment-0");
  const canPrint = can(user, "receipt.reprint");
  const canDownloadPdf = can(user, "receipt.pdf");
  const student = payment && getStudentById(payment.studentId);
  const account = payment && getBillingAccount(payment.accountId);

  if (!payment || !student) return <NotFoundPage />;

  return (
    <div className="print-page mx-auto max-w-2xl">
      <PageHeader
        title="Acknowledgment Receipt"
        description="EducaTrak · Mendez Christian Academy"
        backTo={`/payments/${payment.id}`}
        action={
          canPrint || canDownloadPdf ? (
            <div className="flex flex-wrap gap-2">
              {canPrint && (
                <Button onClick={() => window.print()}>Print receipt</Button>
              )}
              {canDownloadPdf && (
                <Button type="button" variant="secondary">
                  Download PDF
                </Button>
              )}
            </div>
          ) : undefined
        }
      />
      <Card className="border-2 border-black">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm">Receipt No. {payment.receiptNo}</p>
          <p className="text-sm font-semibold">REPRINT count: 0</p>
        </div>
        <h2 className="mt-4 text-xl font-semibold">
          {student.name}
        </h2>
        <p className="mt-2">Payment received: {format(payment.amount)}</p>
        <p className="mt-1">Method: Cash · Date: {payment.paidOn}</p>
        <div className="mt-5 border-t border-black pt-3 text-sm">
          {payment.allocations.map((allocation) => (
            <p key={allocation.installmentId}>
              Applied to: {account?.schedule.find((installment) => installment.id === allocation.installmentId)?.label ?? "Installment"} · {format(allocation.amount)}
            </p>
          ))}
          <p>Balance after payment: {format(payment.balanceAfter)}</p>
          <p>Void mark: {payment.status === "Voided" ? "VOID" : "none"}</p>
        </div>
        <p className="mt-6 text-sm">
          This is a half-page receipt block. Receipt title and paper size are
          controlled in settings. Reprints, void marks, and PDF downloads are
          logged by the backend.
        </p>
      </Card>
    </div>
  );
}
export function VoidsPage({ user }: { user: AuthenticatedUser }) {
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);
  const canDecide = can(user, "payment.void.approve");

  return (
    <>
      <PageHeader
        title="Void approval queue"
        description="Review pending void requests. The cashier who recorded a payment cannot approve its void."
      />
      <ListCard
        headers={["Receipt", "Requester", "Reason", "Amount", "Decision"]}
        rows={[
          [
            "OR-2026-001001",
            "Casey Cashier (sample)",
            "Duplicate entry during handover",
            "₱2,000.00",
            resolved ??
              (canDecide ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => setDecision("approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDecision("reject")}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                "Pending review"
              )),
          ],
        ]}
      />
      <MockDialog
        open={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
        title={decision === "approve" ? "Approve void request" : "Reject void request"}
      >
        <p className="mt-2 text-sm text-text-secondary">
          {decision === "approve"
            ? "Approve the void for OR-2026-001001 and return ₱2,000.00 to the billing account?"
            : "Reject the void request for OR-2026-001001?"}
        </p>
        <label className="mt-4 block text-sm font-medium">
          Decision note
          <textarea className={textareaClass} placeholder="Add a decision note" />
        </label>
        <div className="mt-4 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setDecision(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={decision === "approve" ? "primary" : "destructive"}
            onClick={() => {
              setResolved(decision === "approve" ? "Void approved" : "Void rejected");
              setDecision(null);
            }}
          >
            Confirm {decision}
          </Button>
        </div>
      </MockDialog>
    </>
  );
}
function SectionTabs({
  items,
}: {
  items: { label: string; to: string; active: boolean }[];
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="tablist">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          role="tab"
          aria-selected={item.active}
          className={cn(
            item.active ? primaryLinkClass : secondaryLinkClass,
            "min-h-10",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function RemindersNotificationsTabs({
  user,
  active,
}: {
  user: AuthenticatedUser;
  active: "followup" | "notifications";
}) {
  const items = [
    can(user, "followup.view")
      ? {
          label: "Due follow-ups",
          to: "/followup",
          active: active === "followup",
        }
      : null,
    can(user, "notification.view")
      ? {
          label: "Notification log",
          to: "/notifications",
          active: active === "notifications",
        }
      : null,
  ].filter(Boolean) as { label: string; to: string; active: boolean }[];

  if (active === "followup" && items.length === 1) return null;

  return (
    <SectionTabs items={items} />
  );
}

function CloseoutTabs({
  user,
  active,
}: {
  user: AuthenticatedUser;
  active: "today" | "history";
}) {
  const items = [
    can(user, "closeout.submit")
      ? {
          label: "Today's close-out",
          to: "/closeout",
          active: active === "today",
        }
      : null,
    can(user, "closeout.view")
      ? {
          label: "History",
          to: "/closeout/history",
          active: active === "history",
        }
      : null,
  ].filter(Boolean) as { label: string; to: string; active: boolean }[];

  if (active === "today" && items.length === 1) return null;

  return (
    <SectionTabs items={items} />
  );
}

export function FollowupPage({ user }: { user: AuthenticatedUser }) {
  const followupAccounts = [
    {
      id: students[2].id,
      student: students[2].name,
      guardianEmail: null,
      guardianMobile: "0917 555 0103",
      amountOverdue: "₱8,500.00",
      daysOverdue: "12",
      lastReminder: "Never",
    },
    {
      id: students[1].id,
      student: students[1].name,
      guardianEmail: "guardian@example.test",
      guardianMobile: "0917 555 0102",
      amountOverdue: "₱4,200.00",
      daysOverdue: "3",
      lastReminder: "Sep 20, 2026",
    },
  ];
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>(["email"]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const selectedAccounts = followupAccounts.filter((account) =>
    selectedAccountIds.includes(account.id),
  );
  const recipientAccounts = selectedAccounts.filter((account) => (
    (notificationChannels.includes("email") && account.guardianEmail)
    || (notificationChannels.includes("sms") && account.guardianMobile)
  ));
  const skippedAccounts = selectedAccounts.filter((account) => !recipientAccounts.includes(account));
  const allAccountsSelected = selectedAccountIds.length === followupAccounts.length;

  function toggleAccountSelection(accountId: string, checked: boolean) {
    setSelectedAccountIds((current) => (
      checked
        ? [...current, accountId]
        : current.filter((selectedId) => selectedId !== accountId)
    ));
  }

  return (
    <>
      <PageHeader
        title="Reminders & notifications"
        description="Review due follow-ups and notification history without merging their records."
        action={
          can(user, "followup.send") ? (
            <Button disabled={selectedAccounts.length === 0 || notificationChannels.length === 0 || sent} onClick={() => setReviewOpen(true)}>
              {sent ? "Reminders sent" : notificationChannels.includes("sms") ? "Review reminder notifications" : "Send reminder emails"}
            </Button>
          ) : undefined
        }
      />
      <RemindersNotificationsTabs user={user} active="followup" />
      <Card>
        <h2 className="font-semibold">Due follow-ups</h2>
        {sent && (
          <p role="status" className="mt-2 text-sm font-medium text-brand-green-dark">
            {`Reminder${recipientAccounts.length === 1 ? "" : "s"} sent today to ${recipientAccounts.length} guardian${recipientAccounts.length === 1 ? "" : "s"}.`}
            {skippedAccounts.length > 0
              ? ` ${skippedAccounts.length} account${skippedAccounts.length === 1 ? " was" : "s were"} skipped because ${skippedAccounts.length === 1 ? "it has" : "they have"} no selected notification contact.`
              : ""}
          </p>
        )}
        <fieldset className="mt-3 rounded-md border border-border bg-surface p-3">
          <legend className="px-1 text-sm font-medium">Reminder delivery</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notificationChannels.includes("email")}
                disabled={sent}
                onChange={(event) => setNotificationChannels((channels) => (
                  event.target.checked ? [...channels, "email"] : channels.filter((channel) => channel !== "email")
                ))}
              />
              Email
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notificationChannels.includes("sms")}
                disabled={sent}
                onChange={(event) => setNotificationChannels((channels) => (
                  event.target.checked ? [...channels, "sms"] : channels.filter((channel) => channel !== "sms")
                ))}
              />
              SMS
            </label>
          </div>
          {notificationChannels.includes("sms") && (
            <p className="mt-2 text-sm text-text-secondary">
              SMS load fee: not configured. Any configured carrier/load cost is recorded with the notification and is not added to a student's balance.
            </p>
          )}
        </fieldset>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allAccountsSelected}
            disabled={sent}
            onChange={(event) => setSelectedAccountIds(
              event.target.checked ? followupAccounts.map((account) => account.id) : [],
            )}
          />{" "}
          Select all listed accounts
        </label>
        <div className="mt-4">
          <ListCard
            headers={[
              "Student",
              "Guardian email",
              "Amount overdue",
              "Days overdue",
              "Last reminder",
            ]}
            rows={followupAccounts.map((account) => [
              can(user, "followup.send") ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Select reminder for ${account.student}`}
                    checked={selectedAccountIds.includes(account.id)}
                    disabled={sent}
                    onChange={(event) => toggleAccountSelection(account.id, event.target.checked)}
                  />
                  <span>{account.student}</span>
                </div>
              ) : account.student,
              account.guardianEmail ?? "missing email",
              account.amountOverdue,
              account.daysOverdue,
              account.lastReminder,
            ])}
          />
        </div>
      </Card>
      {can(user, "followup.send") && (
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            Print list
          </Button>
        </div>
      )}
      <MockDialog open={reviewOpen} onOpenChange={setReviewOpen} title={notificationChannels.includes("sms") ? "Review reminder notifications" : "Review reminder emails"}>
        <div className="mt-2 space-y-3 text-sm text-text-secondary">
          <div>
            <p className="font-medium text-text-primary">
              {recipientAccounts.length} reminder{recipientAccounts.length === 1 ? "" : "s"} will be sent by {notificationChannels.includes("email") && notificationChannels.includes("sms") ? "email and SMS" : notificationChannels.includes("sms") ? "SMS" : "email"}:
            </p>
            {recipientAccounts.length > 0 ? (
              <ul className="mt-1 list-disc pl-5">
                {recipientAccounts.map((account) => (
                  <li key={account.id}>
                    {account.student} — {notificationChannels.includes("email") && account.guardianEmail ? `Email: ${account.guardianEmail}` : ""}{notificationChannels.includes("email") && account.guardianEmail && notificationChannels.includes("sms") && account.guardianMobile ? "; " : ""}{notificationChannels.includes("sms") && account.guardianMobile ? `SMS: ${account.guardianMobile}` : ""}; {account.amountOverdue} overdue
                    {" "}for {account.daysOverdue} days
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1">No selected accounts have the chosen notification contact.</p>
            )}
          </div>
          {skippedAccounts.length > 0 && (
            <p>
              {skippedAccounts.map((account) => account.student).join(", ")} will be skipped because
              {" "}there is no selected notification contact.
            </p>
          )}
        </div>
        <p className="mt-3 rounded-md border border-border bg-surface p-3 text-sm">
          Message preview: Your student has an overdue installment. Please contact the billing office for assistance.
        </p>
        {notificationChannels.includes("sms") && (
          <p className="mt-3 rounded-md border border-status-warning bg-[#FFF8E8] p-3 text-sm">
            <span className="font-medium">SMS load fee:</span> not configured. It will not be added to a student balance.
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setReviewOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={recipientAccounts.length === 0}
            onClick={() => { setSent(true); setReviewOpen(false); }}
          >
            Send {recipientAccounts.length} reminder{recipientAccounts.length === 1 ? "" : "s"}
          </Button>
        </div>
      </MockDialog>
    </>
  );
}
export function ClearancePage({ user }: { user: AuthenticatedUser }) {
  const [studentQuery, setStudentQuery] = useState("");
  return (
    <>
      <PageHeader
        title="Clearance verification"
        description="Search a student to check enrollment and exam-period clearance. Clearance reasons do not expose financial amounts."
      />
      <Card className="space-y-4">
        <StudentSearchField
          value={studentQuery}
          onChange={setStudentQuery}
          autoFocus
          placeholder="Search student name or number"
          inputClassName={cn(inputClass, "m-0")}
        />
        <h2 className="font-semibold">Amara Villanueva (sample)</h2>
        <ListCard
          headers={["Period", "Status", "Reason", "Action"]}
          rows={[
            ["Enrollment", "Not cleared", "Installment overdue", "—"],
            [
              "Midterm",
              "Cleared",
              "Requirements met",
              can(user, "permit.print") ? (
                <Link
                  className={inlineLinkClass}
                  to="/permits/sample-1001/midterm/print"
                >
                  Print exam permit
                </Link>
              ) : (
                "View only"
              ),
            ],
            ["Final", "Not cleared", "Installment overdue", "Unavailable"],
          ]}
        />
      </Card>
    </>
  );
}
export function PermitPage() {
  return (
    <div className="print-page mx-auto max-w-2xl">
      <PageHeader
        title="Exam Permit"
        description="Mendez Christian Academy"
        backTo="/clearance"
        action={<Button onClick={() => window.print()}>Print permit</Button>}
      />
      <Card className="border-2 border-black">
        <h2 className="text-xl font-semibold">Amara Villanueva (sample)</h2>
        <p className="mt-2">Grade 7 · Olive</p>
        <p className="mt-4">Midterm examination permit</p>
      </Card>
    </div>
  );
}
export function CloseoutPage({ user }: { user: AuthenticatedUser }) {
  const [counted, setCounted] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [closed, setClosed] = useState(false);
  const systemCashTotal = centavos(125000);
  const enteredCount = Number(counted);
  const hasCountedCash = counted.trim() !== "" && Number.isFinite(enteredCount) && enteredCount >= 0;
  const countedCash = hasCountedCash ? centavos(Math.round(enteredCount * 100)) : null;
  const variance = countedCash === null ? null : centavos(countedCash - systemCashTotal);
  const requiresVarianceReason = variance !== null && variance !== 0;
  const canReview = !closed && countedCash !== null && (!requiresVarianceReason || varianceReason.trim().length > 0);

  const varianceSummary = variance === null
    ? { label: "Waiting for count", detail: "Enter the drawer count to compare it with the system total.", className: "border-border bg-surface" }
    : variance === 0
      ? { label: "Balanced", detail: "The counted cash matches the system total.", className: "border-status-success bg-[#F4FAF5]" }
      : variance > 0
        ? { label: "Over", detail: "Explain why the drawer count is higher than the system total.", className: "border-status-warning bg-[#FFF8E8]" }
        : { label: "Short", detail: "Explain why the drawer count is lower than the system total.", className: "border-status-error bg-[#FFF5F5]" };
  return (
    <>
      <PageHeader
        title="Daily close-out"
        description="Review today's totals and history from one close-out area."
      />
      <CloseoutTabs user={user} active="today" />
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <h2 className="font-semibold">Today's close-out</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Count the cash in the drawer, then review the difference before locking today.
            </p>
          </div>
          <p className="text-sm text-text-secondary">Cash payments only</p>
        </div>
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canReview) setReviewOpen(true);
          }}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <Metric label="System cash total" value="₱1,250.00" />
            <label className="block rounded-md border border-border bg-white p-4 text-sm font-medium shadow-card">
              Counted cash
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                aria-label="Counted cash"
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
                disabled={closed}
                inputMode="decimal"
                placeholder="0.00"
                className={inputClass}
              />
              <span className="mt-2 block text-sm font-normal text-text-secondary">
                Enter the amount counted in the cash drawer.
              </span>
            </label>
            <section className={cn("rounded-md border p-4 shadow-card", varianceSummary.className)} aria-live="polite">
              <p className="text-sm font-medium text-text-secondary">Variance</p>
              <p className="mt-1 text-xl font-semibold text-text-primary">
                {variance === null ? "—" : format(variance)}
              </p>
              <p className="mt-2 text-sm font-medium text-text-primary">{varianceSummary.label}</p>
              <p className="mt-1 text-sm text-text-secondary">{varianceSummary.detail}</p>
            </section>
          </div>
          {requiresVarianceReason && (
            <label className="mt-4 block text-sm font-medium">
              Variance explanation <span aria-hidden="true">*</span>
              <textarea
                className={textareaClass}
                value={varianceReason}
                onChange={(event) => setVarianceReason(event.target.value)}
                disabled={closed}
                placeholder="Explain the variance"
                required
              />
              <span className="mt-2 block text-sm font-normal text-text-secondary">
                A reason is required because the counted cash does not match the system total.
              </span>
            </label>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-secondary">
              {countedCash === null
                ? "The review step becomes available after a cash count is entered."
                : requiresVarianceReason
                  ? "Add a variance explanation before reviewing."
                  : "The drawer is balanced and ready for review."}
            </p>
            <Button type="submit" disabled={!canReview}>
              Review close-out
            </Button>
          </div>
        </form>
        {closed ? (
          <div className="mt-4 rounded-md border border-status-success bg-[#F4FAF5] p-4">
            <p role="status" className="font-medium text-brand-green-dark">Close-out locked for today.</p>
            <Button className="mt-3" type="button" variant="secondary" onClick={() => window.print()}>
              Print summary
            </Button>
          </div>
        ) : null}
      </Card>
      <MockDialog open={reviewOpen} onOpenChange={setReviewOpen} title="Confirm daily close-out">
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-4"><dt>System cash total</dt><dd className="font-medium">₱1,250.00</dd></div>
          <div className="flex justify-between gap-4"><dt>Counted cash</dt><dd className="font-medium">{countedCash === null ? "—" : format(countedCash)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Variance</dt><dd className="font-medium">{variance === null ? "—" : format(variance)}</dd></div>
        </dl>
        {requiresVarianceReason && (
          <p className="mt-3 rounded-md border border-border bg-surface p-3 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Variance explanation:</span> {varianceReason}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setReviewOpen(false)}>Edit</Button>
          <Button type="button" onClick={() => { setClosed(true); setReviewOpen(false); }}>Confirm and lock</Button>
        </div>
      </MockDialog>
    </>
  );
}
export function CloseoutHistoryPage({ user }: { user: AuthenticatedUser }) {
  return (
    <>
      <PageHeader
        title="Daily close-out"
        description="Review close-outs and sign off where authorized."
      />
      <CloseoutTabs user={user} active="history" />
      <ListCard
        headers={["Date", "Cashier", "Variance", "Status", "Action"]}
        rows={[
          [
            "Sep 27, 2026",
            "Casey Cashier (sample)",
            "₱0.00",
            "Unsigned",
            can(user, "closeout.signoff") ? "Sign off" : "View",
          ],
        ]}
      />
    </>
  );
}

export function ReportsHubPage({ user }: { user: AuthenticatedUser }) {
  const reports: {
    kind: ReportKind;
    name: string;
    route: string;
    detail: string;
  }[] = [
    {
      kind: "daily",
      name: "Daily collection",
      route: "/reports/daily",
      detail: "Collections by method, cashier, and payment.",
    },
    {
      kind: "monthly",
      name: "Monthly financial",
      route: "/reports/monthly",
      detail: "Collections by fee category and grade level.",
    },
    {
      kind: "outstanding",
      name: "Outstanding balances",
      route: "/reports/outstanding",
      detail: "Accounts needing attention.",
    },
    {
      kind: "statement",
      name: "Student statement",
      route: "/reports/student/sample-1001",
      detail: "Fees, schedule, payments, and balance.",
    },
  ];
  return (
    <>
      <PageHeader
        title="Reports"
        description="Open a report or statement. Receipts are available from payment detail."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {reports
          .filter((report) => canViewReport(user, report.kind))
          .map((report) => (
            <Link
              className="block rounded-md border border-border border-l-4 border-l-brand-green bg-white p-4 shadow-card transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
              key={report.name}
              to={report.route}
            >
              <h2 className="font-semibold">{report.name}</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {report.detail}
              </p>
            </Link>
          ))}
      </div>
    </>
  );
}
function StudentStatementTable() {
  return (
    <ListCard
      headers={["Item", "Due date", "Amount", "Paid"]}
      rows={[
        ["Tuition installment", "Oct 01, 2026", "₱2,500.00", "₱1,250.00"],
        ["Payment OR-2026-001000", "Sep 27, 2026", "₱1,250.00", "₱1,250.00"],
        ["Balance", "After payment", "₱1,250.00", "—"],
      ]}
    />
  );
}
export function StudentStatementPage({ user }: { user: AuthenticatedUser }) {
  const { id } = useParams();
  const student = getStudentById(id);
  const account = student && getCurrentBillingAccount(student.id);
  if (!student || !account) return <NotFoundPage />;
  const rows = [
    ...account.schedule.map((installment) => [
      installment.label,
      installment.dueDate,
      format(installment.amount),
      format(installment.paid),
    ]),
    ...getPaymentsForStudent(student.id).map((payment) => [
      `Payment ${payment.receiptNo}`,
      payment.paidOn,
      format(payment.amount),
      format(payment.amount),
    ]),
    ["Balance", "Current", format(account.balance), "—"],
  ];
  return (
    <>
      <PageHeader
        title="Student statement of account"
        description={`${student.name} · ${account.schoolYear}`}
        backTo="/reports"
        action={
          can(user, "statement.print") ? (
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
          ) : undefined
        }
      />
      <ListCard headers={["Item", "Due date", "Amount", "Paid"]} rows={rows} />
    </>
  );
}
export function ReportPage({
  type,
}: {
  type: "daily" | "monthly" | "outstanding" | "statement";
}) {
  const reports = {
    daily: {
      title: "Daily collection report",
      description:
        "Totals by method and cashier, with payments and voids separated.",
      filter: "date",
      headers: ["Section", "Cashier / method", "Count", "Amount"],
      rows: [
        ["Method total", "Cash", "2", "₱3,250.00"],
        ["Cashier total", "Casey Cashier (sample)", "2", "₱3,250.00"],
        ["Voids", "OR-2026-001001 pending", "1", "₱2,000.00"],
      ],
    },
    monthly: {
      title: "Monthly financial report",
      description:
        "Collections by fee category and grade level, compared with billed amounts.",
      filter: "month",
      headers: ["Fee category", "Grade level", "Collected", "Billed"],
      rows: [
        ["Tuition", "Grade 7", "₱42,500.00", "₱58,000.00"],
        ["Miscellaneous", "Grade 8", "₱18,750.00", "₱22,000.00"],
      ],
    },
    outstanding: {
      title: "Outstanding balances report",
      description:
        "Filter balances by grade, section, minimum balance, and overdue state.",
      filter: "outstanding",
      headers: ["Student", "Grade & section", "Balance", "Status"],
      rows: [
        [students[2].name, "Grade 9 - Pine", "₱8,500.00", "Overdue"],
        [students[1].name, "Grade 8 - Maple", "₱4,200.00", "Due soon"],
      ],
    },
    statement: {
      title: "Student statement of account",
      description:
        "One student's fees, schedule, payments, and remaining balance.",
      filter: "date",
      headers: ["Item", "Due date", "Amount", "Paid"],
      rows: [],
    },
  } as const;
  const report = reports[type];
  return (
    <>
      <PageHeader
        title={report.title}
        description={report.description}
        backTo="/reports"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
            <Button variant="secondary">Export to Excel</Button>
          </div>
        }
      />
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          {report.filter === "outstanding" ? (
            <>
              <input
                aria-label="Grade"
                className={cn(inputClass, "m-0 max-w-40")}
                placeholder="Grade"
              />
              <input
                aria-label="Section"
                className={cn(inputClass, "m-0 max-w-40")}
                placeholder="Section"
              />
              <input
                aria-label="Minimum balance"
                className={cn(inputClass, "m-0 max-w-48")}
                placeholder="Minimum balance"
              />
            </>
          ) : (
            <input
              type={report.filter === "month" ? "month" : "date"}
              className={cn(inputClass, "m-0 max-w-48")}
              defaultValue={
                report.filter === "month" ? "2026-09" : "2026-09-27"
              }
            />
          )}
          <Button variant="secondary">Apply filters</Button>
        </div>
        {type === "statement" ? (
          <StudentStatementTable />
        ) : (
          <ListCard
            headers={[...report.headers]}
            rows={report.rows.map((row) => [...row])}
          />
        )}
      </Card>
    </>
  );
}

export function NotificationsPage({ user }: { user: AuthenticatedUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStatus = notificationStatusOptions.some(
    (option) => option.value === searchParams.get("status"),
  )
    ? searchParams.get("status")!
    : "all";
  const rows =
    selectedStatus === "all"
      ? notificationRows
      : notificationRows.filter(
          (row) => row.status.toLowerCase() === selectedStatus,
        );

  function updateStatusFilter(nextStatus: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextStatus === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", nextStatus);
    }
    setSearchParams(nextParams);
  }

  return (
    <>
      <PageHeader
        title="Reminders & notifications"
        description="View email and SMS notification attempts, including any configured SMS load fee."
      />
      <RemindersNotificationsTabs user={user} active="notifications" />
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold">Notification log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-surface">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                  Channel
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                  SMS load fee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        className="inline-flex min-h-8 items-center gap-1 rounded-md px-1 font-medium uppercase text-text-secondary transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
                        aria-label="Filter status"
                      >
                        Status
                        <ChevronsUpDown
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="start"
                        sideOffset={6}
                        className="dropdown-menu z-50 min-w-44 rounded-md border border-border bg-white p-1 shadow-lg"
                      >
                        <DropdownMenu.RadioGroup
                          value={selectedStatus}
                          onValueChange={updateStatusFilter}
                        >
                          {notificationStatusOptions.map((option) => (
                            <DropdownMenu.RadioItem
                              key={option.value}
                              value={option.value}
                              className="dropdown-menu-item"
                            >
                              <DropdownMenu.ItemIndicator className="flex size-4 items-center justify-center">
                                <Check aria-hidden="true" className="size-4" />
                              </DropdownMenu.ItemIndicator>
                              <span>{option.label}</span>
                            </DropdownMenu.RadioItem>
                          ))}
                        </DropdownMenu.RadioGroup>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                  Attempts
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  className="border-b border-border transition-colors last:border-0 hover:bg-surface/70 focus-within:bg-surface/70"
                  key={`${row.student}-${row.type}`}
                >
                  <td className="px-4 py-3 align-middle text-text-primary">
                    {row.student}
                  </td>
                  <td className="px-4 py-3 align-middle text-text-primary">
                    {row.type}
                  </td>
                  <td className="px-4 py-3 align-middle text-text-primary">
                    {row.channel}
                  </td>
                  <td className="px-4 py-3 align-middle text-text-primary">
                    {row.recipient}
                  </td>
                  <td className="px-4 py-3 align-middle text-text-primary">
                    {row.loadFee}
                  </td>
                  <td className="px-4 py-3 align-middle text-text-primary">
                    {renderTableCell(row.status)}
                  </td>
                  <td className="px-4 py-3 align-middle text-text-primary">
                    {row.attempts}
                  </td>
                  <td className="px-4 py-3 align-middle text-text-primary">
                    {renderTableCell(
                      row.status === "Failed" && can(user, "notification.retry")
                        ? "Retry"
                        : "View",
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
export function ImportPage() {
  const [stage, setStage] = useState<"upload" | "map" | "preview" | "result">(
    "upload",
  );
  return (
    <>
      <PageHeader
        title="Ledger import"
        description="Nothing is saved until you confirm the final import."
      />
      <Card className="max-w-4xl">
        <p className="text-sm font-medium">
          Step:{" "}
          {stage === "upload"
            ? "Upload a .xlsx or .csv file"
            : stage === "map"
              ? "Map columns"
              : stage === "preview"
                ? "Preview and validate"
                : "Import result"}
        </p>
        {stage === "upload" && (
          <input className="mt-5 block" type="file" accept=".xlsx,.csv" />
        )}
        {stage === "map" && (
          <p className="mt-4 text-sm">
            Column suggestions are based on headers; correct each mapping before
            previewing.
          </p>
        )}
        {stage === "preview" && (
          <ListCard
            headers={["Row", "Status", "Details"]}
            rows={[
              ["2", "Valid", "Ready to import"],
              ["3", "Warning", "Missing guardian email"],
              ["4", "Error", "Duplicate student number"],
            ]}
          />
        )}
        {stage === "result" && (
          <p className="mt-4 text-sm">
            Import complete: 1 created, 1 skipped. Download the error report for
            problem rows.
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" onClick={() => setStage("upload")}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              setStage(
                stage === "upload"
                  ? "map"
                  : stage === "map"
                    ? "preview"
                    : stage === "preview"
                      ? "result"
                      : "result",
              )
            }
          >
            {stage === "preview"
              ? "Confirm valid rows"
              : stage === "result"
                ? "Download error report"
                : "Continue"}
          </Button>
        </div>
      </Card>
    </>
  );
}

export function SettingsPage({
  section,
  editable,
}: {
  section: "fees" | "plans" | "clearance" | "school" | "receipt" | "email";
  editable: boolean;
}) {
  const [addFeeOpen, setAddFeeOpen] = useState(false);
  const [addListItemOpen, setAddListItemOpen] = useState(false);
  const [listItemType, setListItemType] = useState<"schoolYear" | "term" | "examPeriod" | "gradeLevel" | "section">("schoolYear");
  const [listItemName, setListItemName] = useState("");
  const [feeRows, setFeeRows] = useState([
    ["SY 2026-2027", "Grade 7", "Tuition - ₱12,500.00", "Active"],
    ["SY 2026-2027", "Grade 8", "Miscellaneous - optional", "Active"],
  ]);
  const [schoolRows, setSchoolRows] = useState([
    ["School year", "SY 2026-2027 current", "Active"],
    ["Exam period", "Midterm starts Oct 15, 2026", "Active"],
    ["Payment method", "Cash only", "Active"],
  ]);
  const settings = {
    fees: {
      title: "Fee schedules",
      description:
        "School year and grade-level fee items apply to new accounts only.",
      action: "Add fee item",
      headers: ["School year", "Grade level", "Fee item", "Status"],
      rows: feeRows,
    },
    plans: {
      title: "Payment plans",
      description:
        "Plan changes apply to new accounts only; preview schedules before saving.",
      action: "Add plan",
      headers: ["Plan", "Down payment", "Installments", "Status"],
      rows: [
        ["Monthly", "₱2,000.00", "8 due dates", "Active"],
        ["Quarterly", "25%", "4 due dates", "Active"],
      ],
    },
    clearance: {
      title: "Clearance rules",
      description:
        "Rules are computed by the server after payments, voids, and adjustments.",
      action: "Add rule",
      headers: ["Period", "Rule", "Preview", "Status"],
      rows: [
        [
          "Enrollment",
          "Minimum down payment",
          "Cleared after required down payment",
          "Active",
        ],
        [
          "Midterm",
          "Installments paid through exam start",
          "Checks schedule before permit",
          "Active",
        ],
      ],
    },
    school: {
      title: "School and academic lists",
      description:
        "Manage school year, terms, exam periods, grades, sections, and payment methods.",
      action: "Add list item",
      headers: ["List", "Current value", "Status"],
      rows: schoolRows,
    },
    receipt: {
      title: "Receipt settings",
      description:
        "Set school header, receipt title, and configured paper size.",
      action: "Edit receipt settings",
      headers: ["Setting", "Current value", "Status"],
      rows: [
        ["Receipt title", "Acknowledgment Receipt", "Active"],
        ["Paper size", "Letter", "Active"],
        ["Next receipt number", "OR-2026-001002", "Read-only"],
      ],
    },
    email: {
      title: "Notification settings",
      description:
        "Configure email delivery, SMS notifications, and any SMS load fee recorded outside student balances.",
      action: "Edit notification settings",
      headers: ["Setting", "Current value", "Status"],
      rows: [
        ["Sender", "Mendez Christian Academy Billing", "Active"],
        ["Daily send limit", "100 messages", "Active"],
        ["SMS delivery", "Optional for receipts and reminders", "Active"],
        ["SMS load fee", "Not configured; never added to student balances", "Needs review"],
        ["Test email", "Available for administrators", "Ready"],
      ],
    },
  } as const;
  const current = settings[section];

  function addFeeItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("amount"));
    const requirement = formData.get("requirement") === "required" ? "Required" : "Optional";

    setFeeRows((rows) => [
      ...rows,
      [
        String(formData.get("schoolYear")),
        String(formData.get("gradeLevel")),
        `${String(formData.get("name"))} - ${String(formData.get("category"))} - ${format(centavos(Math.round(amount * 100)))} - ${requirement}`,
        "Active",
      ],
    ]);
    setAddFeeOpen(false);
  }

  function addListItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = listItemName.trim();
    const startDate = String(formData.get("startDate") ?? "");
    const gradeLevel = String(formData.get("gradeLevel") ?? "");
    const isCurrent = formData.get("isCurrent") === "on";
    const formattedStartDate = startDate
      ? new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Manila",
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(`${startDate}T00:00:00+08:00`))
      : "";
    const listItem = {
      schoolYear: ["School year", `${name}${isCurrent ? " current" : ""}`, "Active"],
      term: ["Term", `${name} starts ${formattedStartDate}`, "Active"],
      examPeriod: ["Exam period", `${name} starts ${formattedStartDate}`, "Active"],
      gradeLevel: ["Grade level", name, "Active"],
      section: ["Section", `${gradeLevel} - ${name}`, "Active"],
    }[listItemType];

    setSchoolRows((rows) => {
      const updatedRows = listItemType === "schoolYear" && isCurrent
        ? rows.map((row) => row[0] === "School year" ? [row[0], row[1].replace(" current", ""), row[2]] : row)
        : rows;
      return [...updatedRows, listItem];
    });
    setListItemType("schoolYear");
    setListItemName("");
    setAddListItemOpen(false);
  }

  return (
    <>
      <PageHeader
        title={current.title}
        description={current.description}
        action={editable ? (
          <Button type="button" onClick={() => {
            if (section === "fees") setAddFeeOpen(true);
            if (section === "school") setAddListItemOpen(true);
          }}>
            {current.action}
          </Button>
        ) : undefined}
      />
      <Card>
        <p className="text-sm text-text-secondary">
          {editable
            ? "Changes are prepared in this mock screen and would be audited by the backend."
            : "You have read-only access to these settings."}
        </p>
        <ListCard
          className="mt-4"
          headers={[...current.headers]}
          rows={current.rows.map((row) => [...row])}
          centeredColumns={
            section === "fees"
              || section === "plans"
              || section === "clearance"
              || section === "school"
              || section === "receipt"
              || section === "email"
              ? [current.headers.length - 1]
              : []
          }
        />
      </Card>
      {section === "fees" && editable && (
        <MockDialog open={addFeeOpen} onOpenChange={setAddFeeOpen} title="Add fee item">
          <form className="mt-4 space-y-4" onSubmit={addFeeItem}>
            <p className="text-sm text-text-secondary">
              The fee item will be available only to new accounts in the selected schedule.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium" htmlFor="fee-school-year">
                School year
                <select id="fee-school-year" name="schoolYear" className={inputClass} defaultValue="SY 2026-2027">
                  <option>SY 2026-2027</option>
                </select>
              </label>
              <label className="block text-sm font-medium" htmlFor="fee-grade-level">
                Grade level
                <select id="fee-grade-level" name="gradeLevel" className={inputClass} defaultValue="Grade 7">
                  <option>Grade 7</option>
                  <option>Grade 8</option>
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium" htmlFor="fee-name">
              Fee item name
              <input id="fee-name" name="name" required className={inputClass} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium" htmlFor="fee-category">
                Category
                <select id="fee-category" name="category" className={inputClass} defaultValue="Tuition">
                  <option>Tuition</option>
                  <option>Miscellaneous</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="block text-sm font-medium" htmlFor="fee-amount">
                Amount
                <input id="fee-amount" name="amount" type="number" min="0.01" step="0.01" required className={inputClass} />
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Account requirement</legend>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input name="requirement" type="radio" value="required" defaultChecked />Required</label>
                <label className="flex items-center gap-2"><input name="requirement" type="radio" value="optional" />Optional</label>
              </div>
            </fieldset>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setAddFeeOpen(false)}>Cancel</Button>
              <Button>Add fee item</Button>
            </div>
          </form>
        </MockDialog>
      )}
      {section === "school" && editable && (
        <MockDialog open={addListItemOpen} onOpenChange={setAddListItemOpen} title="Add list item">
          <form className="mt-4 space-y-4" onSubmit={addListItem}>
            <p className="text-sm text-text-secondary">
              Add a school or academic list item for future configuration. Payment methods remain Cash only under the current policy.
            </p>
            <label className="block text-sm font-medium" htmlFor="list-item-type">
              List type
              <select
                id="list-item-type"
                className={inputClass}
                value={listItemType}
                onChange={(event) => setListItemType(event.target.value as typeof listItemType)}
              >
                <option value="schoolYear">School year</option>
                <option value="term">Term</option>
                <option value="examPeriod">Exam period</option>
                <option value="gradeLevel">Grade level</option>
                <option value="section">Section</option>
              </select>
            </label>
            <label className="block text-sm font-medium" htmlFor="list-item-name">
              {listItemType === "schoolYear" ? "School year label" : listItemType === "section" ? "Section name" : "Name"}
              <input
                id="list-item-name"
                name="name"
                required
                className={inputClass}
                value={listItemName}
                onChange={(event) => setListItemName(event.target.value)}
              />
            </label>
            {(listItemType === "term" || listItemType === "examPeriod") && (
              <label className="block text-sm font-medium" htmlFor="list-item-start-date">
                Start date
                <input id="list-item-start-date" name="startDate" type="date" required className={inputClass} />
              </label>
            )}
            {listItemType === "section" && (
              <label className="block text-sm font-medium" htmlFor="list-item-grade-level">
                Grade level
                <select id="list-item-grade-level" name="gradeLevel" className={inputClass} defaultValue="Grade 7">
                  <option>Grade 7</option>
                  <option>Grade 8</option>
                </select>
              </label>
            )}
            {listItemType === "schoolYear" && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input name="isCurrent" type="checkbox" />
                Set {listItemName.trim() || "this school year"} as current school year
              </label>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setAddListItemOpen(false)}>Cancel</Button>
              <Button>Add list item</Button>
            </div>
          </form>
        </MockDialog>
      )}
    </>
  );
}
export function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([
    {
      id: "user-administrator",
      name: "Alex Administrator (sample)",
      username: "sample.admin",
      role: "Administrator",
      active: true,
      isCurrentAdministrator: true,
    },
    {
      id: "user-cashier",
      name: "Casey Cashier (sample)",
      username: "sample.cashier",
      role: "Cashier",
      active: true,
      isCurrentAdministrator: false,
    },
    {
      id: "user-registrar",
      name: "Riley Registrar (sample)",
      username: "sample.registrar",
      role: "Registrar",
      active: false,
      isCurrentAdministrator: false,
    },
  ]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [statusConfirmationOpen, setStatusConfirmationOpen] = useState(false);
  const editingUser = users.find((user) => user.id === editingUserId) ?? null;
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleUsers = users.filter((user) => (
    !normalizedSearchQuery
    || user.name.toLocaleLowerCase().includes(normalizedSearchQuery)
    || user.username.toLocaleLowerCase().includes(normalizedSearchQuery)
  ));

  function closeEditDialog() {
    setEditingUserId(null);
    setTemporaryPassword(null);
    setStatusConfirmationOpen(false);
  }

  function saveUserDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    const formData = new FormData(event.currentTarget);
    setUsers((currentUsers) => currentUsers.map((user) => (
      user.id === editingUser.id
        ? {
            ...user,
            name: String(formData.get("fullName") ?? user.name),
            role: String(formData.get("role") ?? user.role),
          }
        : user
    )));
  }

  function resetPassword() {
    setTemporaryPassword("SampleReset123!");
  }

  function updateAccountState() {
    if (!editingUser) return;
    setUsers((currentUsers) => currentUsers.map((user) => (
      user.id === editingUser.id ? { ...user, active: !user.active } : user
    )));
    setStatusConfirmationOpen(false);
  }

  return (
    <>
      <PageHeader
        title="User administration"
        description="Create, search, edit, deactivate, reactivate, or reset user accounts."
        action={
          <>
            <label className="sr-only" htmlFor="user-search">Search users</label>
            <div className="relative w-full sm:w-80">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted-readable"
              />
              <input
                id="user-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or username"
                className={cn(inputClass, "m-0 w-full pl-9")}
              />
            </div>
            <Button onClick={() => setCreateOpen(true)}>Create user</Button>
          </>
        }
      />
      {visibleUsers.length > 0 ? (
        <ListCard
          headers={["Name", "Username", "Role", "State", "Action"]}
          centeredColumns={[3]}
          rows={visibleUsers.map((user) => [
            user.name,
            user.username,
            user.role,
            <StatusBadge key={`${user.id}-state`} status={user.active ? "Active" : "Inactive"} />,
            <Button
              key={`${user.id}-edit`}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingUserId(user.id);
                setTemporaryPassword(null);
              }}
            >
              Edit
            </Button>,
          ])}
        />
      ) : (
        <Card>
          <p role="status" className="text-sm text-text-secondary">
            No users match that name or username.
          </p>
        </Card>
      )}
      <Card className="mt-5">
        <p className="text-sm text-text-secondary">
          Temporary passwords are shown once after creation or reset. An
          administrator cannot deactivate themselves or the last active
          administrator.
        </p>
      </Card>
      <MockDialog open={createOpen} onOpenChange={setCreateOpen} title="Create user">
        {created ? (
          <div className="mt-3">
            <p role="status" className="font-medium text-brand-green-dark">User created.</p>
            <p className="mt-2 text-sm text-text-secondary">Temporary password (show once): SampleStart123!</p>
            <div className="mt-4 flex justify-end"><Button type="button" onClick={() => setCreateOpen(false)}>Done</Button></div>
          </div>
        ) : (
          <form className="mt-3 space-y-3" onSubmit={(event) => { event.preventDefault(); setCreated(true); }}>
            <label className="block text-sm font-medium">Name<input required className={inputClass} /></label>
            <label className="block text-sm font-medium">Username<input required className={inputClass} /></label>
            <label className="block text-sm font-medium">Primary role<DropdownSelect aria-label="Primary role" value="cashier" options={[{ value: "cashier", label: "Cashier" }, { value: "accounting", label: "Accounting Officer" }, { value: "administrator", label: "Administrator" }, { value: "auditor", label: "Auditor" }, { value: "registrar", label: "Registrar" }]} onChange={() => undefined} className="mt-1 w-full" align="start" /></label>
            <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button>Create user</Button></div>
          </form>
        )}
      </MockDialog>
      <MockDialog
        open={editingUser !== null}
        onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}
        title="Edit user account"
      >
        {editingUser && (
          <div className="mt-3 space-y-5">
            <form key={editingUser.id} className="space-y-3" onSubmit={saveUserDetails}>
              <label className="block text-sm font-medium">
                Full name
                <input name="fullName" required defaultValue={editingUser.name} className={inputClass} />
              </label>
              <label className="block text-sm font-medium">
                Primary role
                <select name="role" defaultValue={editingUser.role} className={inputClass}>
                  {[
                    "Administrator",
                    "Cashier",
                    "Accounting Officer",
                    "Auditor",
                    "Registrar",
                  ].map((role) => <option key={role}>{role}</option>)}
                </select>
              </label>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={closeEditDialog}>Cancel</Button>
                <Button>Save changes</Button>
              </div>
            </form>

            <div className="border-t border-border pt-5">
              <h2 className="font-semibold">Account management</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Resetting the password forces a change at the account's next sign-in.
              </p>
              {temporaryPassword ? (
                <div className="mt-3 rounded-md border border-brand-green-light bg-surface p-3">
                  <p role="status" className="font-medium text-brand-green-dark">Password reset complete.</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Temporary password (shown once): <span className="font-medium text-text-primary">{temporaryPassword}</span>
                  </p>
                </div>
              ) : (
                <Button className="mt-3" type="button" variant="secondary" onClick={resetPassword}>
                  Reset password
                </Button>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {editingUser.active ? (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={editingUser.isCurrentAdministrator}
                      onClick={() => setStatusConfirmationOpen(true)}
                    >
                      Deactivate account
                    </Button>
                    {editingUser.isCurrentAdministrator && (
                      <p className="text-sm text-text-secondary">You cannot deactivate your own administrator account.</p>
                    )}
                  </>
                ) : (
                  <Button type="button" variant="secondary" onClick={updateAccountState}>
                    Reactivate account
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </MockDialog>
      <MockDialog
        open={statusConfirmationOpen}
        onOpenChange={setStatusConfirmationOpen}
        title="Deactivate account?"
      >
        <div className="mt-3">
          <p className="text-sm text-text-secondary">
            {editingUser?.name} will no longer be able to sign in. Their account history will remain available.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setStatusConfirmationOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={updateAccountState}>Deactivate account</Button>
          </div>
        </div>
      </MockDialog>
    </>
  );
}
export function RolesPage() {
  return (
    <>
      <PageHeader
        title="Role matrix"
        description="Read-only reference for exclusive primary ownership and narrow supporting access."
      />
      <ListCard
        headers={[
          "Primary module",
          "Administrator",
          "Cashier",
          "Accounting",
          "Auditor",
          "Registrar",
        ]}
        rows={[
          ["Users, system, backups, security", "Owns", "—", "—", "—", "—"],
          [
            "Students, billing, payments, follow-ups, close-out",
            "—",
            "Owns",
            "—",
            "—",
            "—",
          ],
          [
            "Policies, void approval, close-out sign-off, reports",
            "—",
            "—",
            "Owns",
            "—",
            "—",
          ],
          ["Independent audit review", "—", "—", "—", "Owns", "—"],
          [
            "Clearance verification and exam permits",
            "—",
            "—",
            "—",
            "—",
            "Owns",
          ],
        ]}
      />
    </>
  );
}
export function AuditPage({ user }: { user: AuthenticatedUser }) {
  if (user.role === "administrator")
    return (
      <>
        <PageHeader
        title="Admin Log"
          description="Review authentication and account-administration events. Entries cannot be changed or deleted."
        />
        <ListCard
        headers={["When", "Account", "Event", "Status", "Details"]}
        centeredColumns={[3]}
        rows={[
            [
              "Sep 27, 2026, 9:00 AM",
              "sample.cashier",
              "Sign-in",
              "Succeeded",
              "Session established",
            ],
            [
              "Sep 27, 2026, 8:30 AM",
              "sample.unknown",
              "Sign-in",
              "Denied",
              "Invalid credentials",
            ],
            [
              "Sep 27, 2026, 9:15 AM",
              "sample.cashier",
              "Sign-out",
              "Succeeded",
              "Session ended by user",
            ],
            [
              "Sep 27, 2026, 9:20 AM",
              "sample.admin",
              "Password reset",
              "Recorded",
              "Temporary password issued for sample.cashier",
            ],
            [
              "Sep 27, 2026, 9:25 AM",
              "sample.admin",
              "Account deactivated",
              "Recorded",
              "sample.cashier: Active -> Inactive",
            ],
            [
              "Sep 27, 2026, 10:00 AM",
              "sample.admin",
              "Account reactivated",
              "Recorded",
              "sample.cashier: Inactive -> Active",
            ],
          ]}
        />
      </>
    );
  return (
    <>
      <PageHeader
        title="Independent audit review"
        description="Read-only review of authorized financial history, void decisions, close-out records, and audit events."
      />
      <div className="space-y-5">
        <Card>
          <h2 className="font-semibold">Transaction and void history</h2>
          <ListCard
            className="mt-3"
            headers={[
              "Receipt",
              "Recorded action",
              "Void decision",
              "Audit state",
            ]}
            rows={[
              [
                "OR-2026-001000",
                "Cash payment recorded",
                "Not requested",
                "Complete",
              ],
              [
                "OR-2026-001001",
                "Cash payment recorded",
                "Pending Accounting review",
                "Review required",
              ],
            ]}
          />
        </Card>
        <Card>
          <h2 className="font-semibold">Close-out reconciliation history</h2>
          <ListCard
            className="mt-3"
            headers={["Business date", "Cashier", "Variance", "Review state"]}
            rows={[
              [
                "Sep 27, 2026",
                "Casey Cashier (sample)",
                "₱0.00",
                "Awaiting sign-off",
              ],
            ]}
          />
        </Card>
        <Card>
          <h2 className="font-semibold">Recorded changes</h2>
          <ListCard
            className="mt-3"
            headers={["When", "User", "Action", "Entity", "Details"]}
            rows={[
              [
                "Sep 27, 2026, 9:00 AM",
                "Casey Cashier (sample)",
                "Recorded payment",
                "OR-2026-001000",
                "View before/after values",
              ],
              [
                "Sep 27, 2026, 8:30 AM",
                "Avery Accounting (sample)",
                "Reviewed void request",
                "OR-2026-001001",
                "Pending decision",
              ],
            ]}
          />
        </Card>
      </div>
    </>
  );
}
export function BackupPage() {
  return (
    <>
      <PageHeader
        title="Backup and recovery"
        description="Review backup status and start a manual backup when needed."
        action={<Button>Run backup now</Button>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Last backup" value="Sep 27, 2026, 1:00 AM" />
        <Metric label="Result" value="Succeeded" />
        <Metric label="Last restore test" value="Sep 01, 2026" />
      </div>
      <Card className="mt-5">
        <h2 className="font-semibold">Restore instructions</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
          <li>Stop the application with the school administrator.</li>
          <li>
            Use the approved server restore procedure outside this application.
          </li>
          <li>Verify the restored data before allowing users to sign in.</li>
        </ol>
      </Card>
    </>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="group flex min-h-[96px] flex-col border-l-4 border-l-brand-green p-3 transition-shadow hover:shadow-md">
      <div className="flex min-h-7 items-start justify-between gap-3">
        <CardLabel className="leading-5">{label}</CardLabel>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brand-green-light/60 bg-[#EAF6EC] text-brand-green-dark">
          <CircleDashed
            aria-hidden="true"
            className="h-4 w-4"
            strokeWidth={1.8}
          />
        </span>
      </div>
      <CardValue className="truncate">{value}</CardValue>
    </Card>
  );
}

function ListCard({
  headers,
  rows,
  className,
  centeredColumns = [],
}: {
  headers: string[];
  rows: ReactNode[][];
  className?: string;
  centeredColumns?: number[];
}) {
  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-surface">
              {headers.map((header, index) => (
                <th
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium uppercase text-text-secondary",
                    centeredColumns.includes(index) && "text-center",
                  )}
                  key={header}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                className="border-b border-border transition-colors last:border-0 hover:bg-surface/70 focus-within:bg-surface/70"
                key={index}
              >
                {row.map((cell, itemIndex) => (
                  <td
                    className={cn(
                      "px-4 py-3 align-middle text-text-primary",
                      centeredColumns.includes(itemIndex) && "text-center",
                    )}
                    key={itemIndex}
                  >
                    {renderTableCell(cell, headers[itemIndex] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function renderTableCell(cell: ReactNode, header?: string) {
  if (typeof cell !== "string") return cell;
  if (isStatusOrStateColumn(header) && isStatusValue(cell)) return <StatusBadge status={cell} />;
  if (!header && getStatusPresentation(cell)) return <StatusBadge status={cell} />;
  return cell;
}

function isStatusOrStateColumn(header?: string) {
  return Boolean(header && /(?:status|state)$/i.test(header.trim()));
}

function isStatusValue(value: string) {
  const normalized = value.trim();
  return normalized !== "" && normalized !== "—" && !/^OR-\d+/i.test(normalized) && !/^\d+$/.test(normalized);
}
