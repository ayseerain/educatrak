// The static mock fixtures intentionally model incomplete server responses.
// Route and role behavior is covered at the component boundary until API types land.
import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Navigate,
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableFilters, dateRangeError, moneyRangeError, useTableFilters } from "@/components/ui/TableFilters";
import { useClientPagination } from "@/components/ui/useClientPagination";
import { SortableHeader, TABLE_BODY_CELL_CLASS, TABLE_CLASS, TABLE_HEADER_CELL_CLASS, TABLE_SCROLL_CLASS, useTableSort } from "@/components/ui/Table";
import { cellSortValue, sortTableRows } from "@/lib/tableSort";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardLabel, CardValue } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { SelectAllCheckbox } from "@/components/ui/SelectAllCheckbox";
import { channelsFromValue, channelsValue, hasSelectedReminderContact, isRowControlClick, REMINDER_CHANNEL_OPTIONS, selectedReminderContacts } from "@/features/followup/reminderChannels";
import { StudentSearchField } from "@/features/students/StudentSearchField";
import {
  students,
  billingAccounts,
  payments,
  getBillingAccount,
  getCurrentBillingAccount,
  getMockFeeSchedule,
  getMockGradeLevels,
  getMockPayment,
  getMockPaymentPlans,
  getNextDueRecord,
  getPaymentsForStudent,
  getRenewalSchoolYears,
  getSuggestedRenewalSchoolYear,
  getStudentById,
  getStudentBillingAccounts,
  getMockState,
  getMockGuardianContact,
  getMockToday,
  selectMockFollowUpAccounts,
  selectMockNotificationRows,
  selectMockStaffUsers,
  createMockStaffUser,
  archiveMockStaffUser,
  createMockFeeItem,
  updateMockFeeItem,
  archiveMockFeeItem,
  createMockGradeLevel,
  createMockSchoolYear,
  updateMockGradeLevel,
  archiveMockGradeLevel,
  createMockStudent,
  createMockBillingAccount,
  previewMockInstallmentSchedule,
  updateMockStaffUser,
  restoreMockStaffUser,
  updateMockStudent,
  mockSystemCashTotal,
  recordMockCloseOut,
  requestMockVoid,
  decideMockVoid,
  selectMockCloseOuts,
  signOffMockCloseOut,
  subscribeToMockState,
} from "@/api/mock";
import { studentMatchesSearch } from "@/features/students/studentSearch";
import { can, canViewReport, type ReportKind } from "@/lib/permissions";
import { format, centavos, parse as parseMoney } from "@/lib/money";
import { roleLabel, useSession } from "@/auth/session";
import { cn } from "@/lib/cn";
import { getStatusPresentation } from "@/lib/status";
import { isLiveCashierApiEnabled, recordCashPaymentForStudent, type NotificationChannel, type PaymentRecord, type SavedCashPayment } from "@/api/cashierApi";
import { listBackupRecords as listLiveBackupRecords } from "@/api/backupApi";
import { listBackupRecords as listMockBackupRecords } from "@/api/mockAdapter";
import { LiveUsersPage } from "@/features/operations/LiveUsersPage";
import { LivePaymentEntryPage } from "@/features/operations/LivePaymentEntryPage";
import { LivePaymentReceiptPage, LivePaymentsPage } from "@/features/operations/LivePaymentsPage";
import { ReceiptDocument } from "@/components/printing/ReceiptDocument";
import { PrintSurface } from "@/components/printing/PrintSurface";
import { PrintDocumentFooter, PrintDocumentHeader } from "@/components/printing/PrintDocumentHeader";
import { PrintDocumentTable } from "@/components/printing/PrintDocumentTable";
import { PrinterIcon } from "@/components/printing/ReceiptPrintAction";
import { printDocumentWhenReady } from "@/lib/printing";
import { formatDate, formatDateTime } from "@/lib/dates";
import { calculateStudentAge, todayInManila } from "@/lib/studentAge";
import { LiveVoidsPage } from "@/features/operations/LiveVoidsPage";
import { LiveCloseOutHistory, LiveDailyCloseOut } from "@/features/operations/LiveCloseouts";
import { LiveAdminLog } from "@/features/operations/LiveAdminLog";
import { LiveAuditLog } from "@/features/operations/LiveAuditLog";
import { LiveDailyReport } from "@/features/reports/LiveDailyReport";
import { LiveStudentStatement } from "@/features/reports/LiveStudentStatement";
import { LiveOutstandingReport } from "@/features/reports/LiveOutstandingReport";
import { LiveFinanceSettingsPage } from "@/features/operations/LiveFinanceSettingsPage";
import { LiveStudentProfilePage, LiveStudentsPage } from "@/features/students/LiveStudentsPage";
import { StudentFormPage as LiveStudentFormPage } from "@/features/students/StudentFormPage";
import { LiveBillingAccountDetail, LiveBillingAccounts } from "@/features/billing/LiveBillingAccounts";
import type { AuthenticatedUser, Capability, Role, StudentGender } from "@/lib/types";

const firstStudent = students[0]!;
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
const primaryLinkClass = buttonVariants({ variant: "primary" });
const secondaryLinkClass = buttonVariants({ variant: "secondary" });
const inlineLinkClass =
  "inline-flex min-h-control items-center gap-1 text-sm font-medium text-brand-green-dark underline decoration-brand-green-dark/40 underline-offset-2 transition-colors hover:text-brand-green hover:decoration-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark";
const inputClass = "form-control mt-1";
const textareaClass = "form-control mt-3 p-3";

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
  emphasis = false,
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  emphasis?: boolean;
  contentClassName?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn("fixed inset-0 bg-text-primary/40", emphasis ? "z-[60] bg-text-primary/55 backdrop-blur-sm" : "z-40")} />
        <Dialog.Content className={cn("fixed left-1/2 top-1/2 max-h-[calc(100vh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white shadow-raised", emphasis ? "z-[61] max-w-2xl border border-status-error/40 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]" : "z-50 p-5", contentClassName)}>
          <Dialog.Title className="text-lg font-semibold text-text-primary">
            {title}
          </Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
      title="Not found"
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
    <Card className="mx-auto mt-20 max-w-lg p-5 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
      <p className="mt-2 text-text-secondary">{description}</p>
      <Link className={cn(primaryLinkClass, "mt-6")} to="/">
        Go to dashboard
      </Link>
    </Card>
  );
}

function UnavailableFeaturePage({ title, backTo = "/", feature }: { title: string; backTo?: string; feature: string }) {
  return (
    <>
      <PageHeader title={title} description={`${feature} is not available in the live system yet.`} backTo={backTo} backLabel="Return" />
      <Card>
        <p className="text-sm text-text-secondary">Contact an administrator for help with this task.</p>
      </Card>
    </>
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
  const { changeOwnPassword } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword !== confirmation) {
      setError("The new password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 12) {
      setError("Use at least 12 characters for your new password.");
      return;
    }
    setIsSaving(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The password could not be changed.");
    } finally {
      setIsSaving(false);
    }
  }
  const lastLogin = user.lastLoginAt
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(user.lastLoginAt))
    : "Not available";
  return (
    <>
      <PageHeader
        title="My profile"
        description="Review your account details and change your password."
      />
      <div className="max-w-4xl space-y-4">
        <Card>
          <h2 className="text-base font-semibold text-text-primary">Account details</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div><dt className="text-sm text-text-secondary">Name</dt><dd className="mt-1 font-medium">{user.name}</dd></div>
            <div><dt className="text-sm text-text-secondary">Role</dt><dd className="mt-1 font-medium">{roleLabel(user.role)}</dd></div>
            <div><dt className="text-sm text-text-secondary">Last login</dt><dd className="mt-1 font-medium">{lastLogin}</dd></div>
          </dl>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-text-primary">Change password</h2>
          <p className="mt-1 text-sm text-text-secondary">Use a unique password with at least 12 characters.</p>
          <form className="mt-4 space-y-3" onSubmit={save}>
            <label className="block text-sm font-medium">
              Current password
              <input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              New password
              <input
                required
                minLength={12}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Confirm new password
              <input required minLength={12} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} />
            </label>
            {error && <p role="alert" className="text-sm font-medium text-status-danger-text">{error}</p>}
            {saved && (
              <p
                role="status"
                className="text-sm font-medium text-brand-green-dark"
              >
                Password changed successfully.
              </p>
            )}
            <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => { setCurrentPassword(""); setNewPassword(""); setConfirmation(""); setError(null); }}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? "Updating…" : "Update password"}</Button></div>
          </form>
        </Card>
      </div>
    </>
  );
}

export function StudentsPage({ user }: { user: AuthenticatedUser }) {
  if (isLiveCashierApiEnabled()) return <LiveStudentsPage user={user} />;
  const filters = useTableFilters({ query: "", grade: "", section: "", status: "" });
  const limited = user.role === "registrar";
  const shown = students.filter((student) =>
    studentMatchesSearch(student, filters.applied.query)
    && (!filters.applied.grade || student.grade.toLowerCase().includes(filters.applied.grade.toLowerCase()))
    && (!filters.applied.section || student.section.toLowerCase().includes(filters.applied.section.toLowerCase()))
    && (!filters.applied.status || student.studentStatus === filters.applied.status),
  );
  return (
    <>
      <PageHeader
        title="Students"
        description={
          limited
            ? "Search and filter student records."
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
      <Card className="p-0">
        <div className="border-b border-border px-5 py-3">
          <TableFilters embedded scope="Sample students" defaults={{ query: "", grade: "", section: "", status: "" }} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search students" }} searchSlot={
        <StudentSearchField
            id="student-search"
            label="Search students"
            value={filters.draft.query}
            onChange={(value) => filters.search("query", value)}
            autoFocus
            placeholder="Search by student name or number"
            wrapperClassName="min-w-[min(100%,16rem)] flex-1"
            labelClassName="sr-only"
            inputClassName={cn(inputClass, "m-0")}
          />
      } fields={[{ key: "grade", label: "Grade" }, { key: "section", label: "Section" }, { key: "status", label: "Enrollment status", type: "select", options: [{ value: "", label: "All statuses" }, { value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }] }]} onChange={filters.update} onApply={filters.apply} onClear={filters.clear} onRemove={filters.remove} />
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
  const canSeeFinancialContext = can(user, "student.financial.view");
  const navigate = useNavigate();
  const sorting = useTableSort();
  const rows = sortTableRows(data, sorting.sort, (student, key) => {
    if (key === "name") return student.name;
    if (key === "grade") return `${student.grade} - ${student.section}`;
    if (key === "balance") return cellSortValue(format(student.balance));
    return student[key as "studentStatus" | "billingStatus"];
  });

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
      <table className={cn(TABLE_CLASS, "min-w-[680px]")}>
        <thead>
          <tr className="border-b border-border">
            <SortableHeader sortKey="name" sort={sorting.sort} onSort={sorting.toggle}>
              Student
            </SortableHeader>
            <SortableHeader sortKey="grade" sort={sorting.sort} onSort={sorting.toggle}>
              Grade & section
            </SortableHeader>
            {canSeeFinancialContext && (
              <SortableHeader sortKey="balance" sort={sorting.sort} onSort={sorting.toggle}>
                Balance
              </SortableHeader>
            )}
            <SortableHeader sortKey="studentStatus" sort={sorting.sort} onSort={sorting.toggle}>
              Student status
            </SortableHeader>
            {canSeeFinancialContext && (
              <SortableHeader sortKey="billingStatus" sort={sorting.sort} onSort={sorting.toggle}>
                Billing status
              </SortableHeader>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((student) => (
            <tr
              aria-label={`Open ${student.name}`}
              className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface/70 focus:bg-surface/70 focus:outline-none focus-visible:bg-surface/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-green-dark"
              key={student.id}
              onClick={() => openStudent(student.id)}
              onKeyDown={(event) => handleStudentRowKeyDown(event, student.id)}
              role="link"
              tabIndex={0}
            >
              <td className="px-3 py-2">
                <div className="font-medium text-brand-green-dark">
                  {student.name}
                </div>
                <div className="text-sm text-text-secondary">
                  {student.number}
                </div>
              </td>
              <td className="px-3 py-2">
                {student.grade} - {student.section}
              </td>
              {canSeeFinancialContext && (
                <td className="px-3 py-2 font-medium">
                  {format(student.balance)}
                </td>
              )}
              <td className="px-3 py-2">
                <StatusBadge status={student.studentStatus} />
              </td>
              {canSeeFinancialContext && (
                <td className="px-3 py-2">
                  <StatusBadge status={student.billingStatus} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function StudentFormPage({ user, edit }: { user?: AuthenticatedUser; edit?: boolean }) {
  if (isLiveCashierApiEnabled()) return <LiveStudentFormPage edit={edit} />;
  const navigate = useNavigate();
  const { id } = useParams();
  const student = edit ? getStudentById(id) : undefined;
  const [error, setError] = useState("");
  const initialGrade = student?.grade ?? "";
  const [grade, setGrade] = useState(initialGrade);
  const [section, setSection] = useState(student?.section ?? "");
  const [studentStatus, setStudentStatus] = useState(student?.studentStatus ?? "Active");
  const [strand, setStrand] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(student?.dateOfBirth ?? "");
  const [gender, setGender] = useState<StudentGender | "">(student?.gender ?? "");
  const [residentialAddress, setResidentialAddress] = useState(student?.residentialAddress ?? "");
  const [dateOfBirthError, setDateOfBirthError] = useState("");
  const [genderError, setGenderError] = useState("");
  const [residentialAddressError, setResidentialAddressError] = useState("");
  const seniorHigh = isSeniorHighGrade(grade);
  const age = calculateStudentAge(dateOfBirth);

  function selectGrade(nextGrade: string) {
    setGrade(nextGrade);
    setSection("");
    setStrand(isSeniorHighGrade(nextGrade) ? strandOptions[0]!.value : "");
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");
    const invalid = form.querySelector<HTMLInputElement>(":invalid");
    if (invalid?.name === "dateOfBirth") {
      setDateOfBirthError(!dateOfBirth ? "Enter the student’s date of birth." : "Enter a valid date of birth that is not in the future.");
      invalid.focus();
      return;
    }
    if (invalid?.name === "residentialAddress" || !residentialAddress.trim()) {
      setResidentialAddressError("Enter the student’s residential address.");
      form.querySelector<HTMLInputElement>('[name="residentialAddress"]')?.focus();
      return;
    }
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setDateOfBirthError("");
    setResidentialAddressError("");
    if (!gender) {
      setGenderError("Select Male or Female for gender.");
      form.querySelector<HTMLButtonElement>('[aria-label="Gender"]')?.focus();
      return;
    }
    setGenderError("");
    const formData = new FormData(form);
    try {
      const input = {
        number: String(formData.get("number") ?? ""), name: String(formData.get("name") ?? ""), grade, section,
        studentStatus: student ? studentStatus : "Active",
        dateOfBirth, gender, residentialAddress,
        guardianName: String(formData.get("guardianName") ?? ""),
        guardianRelationship: String(formData.get("guardianRelationship") ?? ""),
        guardianEmail: String(formData.get("guardianEmail") ?? ""),
        guardianMobile: String(formData.get("guardianMobile") ?? ""),
      };
      const saved = student ? updateMockStudent(student.id, input, user?.id ?? "user-registrar") : createMockStudent(input, user?.id ?? "user-registrar");
      navigate(`/students/${saved.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The student record could not be saved.");
    }
  }
  if (edit && !student) return <NotFoundPage />;
  return (
    <>
      <PageHeader
        title={edit ? "Edit student" : "Add student"}
        description="Maintain student academic, personal, and guardian information."
        backTo={student ? `/students/${student.id}` : "/students"}
      />
      <form noValidate onSubmit={submit} className="w-full space-y-5">
        <Card className="grid gap-4 md:grid-cols-2">
          <h2 className="text-base font-semibold text-text-primary md:col-span-2">Student information</h2>
          <label className="text-sm font-medium">
            Student number <span aria-hidden="true" className="text-status-error">*</span>
            <input
              name="number"
              required
              defaultValue={student?.number ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium">
            Student name <span aria-hidden="true" className="text-status-error">*</span>
            <input
              name="name"
              required
              defaultValue={student?.name ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium">
            Grade level
            <span className="mt-1 block">
              <DropdownSelect
                aria-label="Grade level"
                value={grade}
                options={[{ value: "", label: "Select grade" }, ...asDropdownOptions(getMockGradeLevels())]}
                onChange={selectGrade}
                className="w-full"

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
                options={grade ? [{ value: "", label: "Select section" }, ...getSectionOptions(grade)] : [{ value: "", label: "Select grade first" }]}
                onChange={setSection}
                className="w-full"

                align="start"
              />
            </span>
            <input name="section" type="hidden" value={section} />
          </label>
          <label className="text-sm font-medium">
            Enrollment status
            <span className="mt-1 block">
              <DropdownSelect
                aria-label="Enrollment status"
                value={studentStatus}
                options={[{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }]}
                onChange={setStudentStatus}
                disabled
                className="w-full"
                align="start"
              />
            </span>
            <input name="studentStatus" type="hidden" value={studentStatus} />
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
        <Card className="grid gap-4 md:grid-cols-2">
          <h2 className="text-base font-semibold text-text-primary md:col-span-2">Personal information</h2>
          <label htmlFor="student-date-of-birth" className="text-sm font-medium">
            Date of birth <span aria-hidden="true" className="text-status-error">*</span>
            <input
              id="student-date-of-birth"
              name="dateOfBirth"
              type="date"
              required
              max={todayInManila()}
              value={dateOfBirth}
              onChange={(event) => { setDateOfBirth(event.currentTarget.value); setDateOfBirthError(""); }}
              aria-invalid={Boolean(dateOfBirthError)}
              aria-describedby={dateOfBirthError ? "student-date-of-birth-error" : "student-date-of-birth-hint"}
              className={inputClass}
            />
            {dateOfBirthError
              ? <span id="student-date-of-birth-error" role="alert" className="mt-1 block text-sm font-normal text-status-error">{dateOfBirthError}</span>
              : <span id="student-date-of-birth-hint" className="mt-1 block text-sm font-normal text-text-secondary">Use the date shown on the student’s record.</span>}
          </label>
          <div>
            <label htmlFor="student-age" className="text-sm font-medium">Age</label>
            <input id="student-age" readOnly value={age === null ? "Not available" : `${age} years old`} className={inputClass} />
            <p className="mt-1 text-sm text-text-secondary">Calculated from the date of birth and current Philippine date.</p>
          </div>
          <div>
            <span id="student-gender-label" className="text-sm font-medium">Gender <span aria-hidden="true" className="text-status-error">*</span></span>
            <span className="mt-1 block">
              <DropdownSelect
                aria-label="Gender"
                aria-describedby={genderError ? "student-gender-error" : undefined}
                aria-invalid={Boolean(genderError)}
                aria-required
                value={gender}
                options={[{ value: "", label: "Select gender" }, { value: "Male", label: "Male" }, { value: "Female", label: "Female" }]}
                onChange={(value) => { setGender(value); setGenderError(""); }}
                className="w-full"
                align="start"
              />
            </span>
            <input name="gender" type="hidden" value={gender} />
            {genderError && <p id="student-gender-error" role="alert" className="mt-1 text-sm text-status-error">{genderError}</p>}
          </div>
          <label htmlFor="student-residential-address" className="text-sm font-medium">
            Residential address <span aria-hidden="true" className="text-status-error">*</span>
            <input
              id="student-residential-address"
              name="residentialAddress"
              type="text"
              required
              value={residentialAddress}
              onChange={(event) => { setResidentialAddress(event.currentTarget.value); setResidentialAddressError(""); }}
              aria-invalid={Boolean(residentialAddressError)}
              aria-describedby={residentialAddressError ? "student-residential-address-error" : undefined}
              className={inputClass}
            />
            {residentialAddressError && <span id="student-residential-address-error" role="alert" className="mt-1 block text-sm font-normal text-status-error">{residentialAddressError}</span>}
          </label>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-text-primary">Guardian contact</h2>
          <p className="mt-1 text-sm text-text-secondary">Add or update the guardian details used for notices and receipts.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Guardian name<input name="guardianName" defaultValue={getMockState().guardians.find((guardian) => guardian.id === getMockState().studentGuardianLinks.find((link) => link.studentId === student?.id)?.guardianId)?.name ?? ""} className={inputClass} /></label>
            <label className="text-sm font-medium">Relationship<input name="guardianRelationship" defaultValue={getMockState().studentGuardianLinks.find((link) => link.studentId === student?.id)?.relationship ?? ""} className={inputClass} /></label>
            <label className="text-sm font-medium">Email<input name="guardianEmail" type="email" defaultValue={getMockGuardianContact(student?.id ?? "")?.email ?? ""} className={inputClass} /></label>
            <label className="text-sm font-medium">Mobile number<input name="guardianMobile" type="tel" defaultValue={getMockGuardianContact(student?.id ?? "")?.mobile ?? ""} className={inputClass} /></label>
          </div>
        </Card>
        {error && <p role="alert" className="text-sm text-status-error">{error}</p>}
        <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => navigate(student ? `/students/${student.id}` : "/students")}>Cancel</Button><Button type="submit">{edit ? "Save changes" : "Create student"}</Button></div>
      </form>
    </>
  );
}

export function StudentProfilePage({ user }: { user: AuthenticatedUser }) {
  if (isLiveCashierApiEnabled()) return <LiveStudentProfilePage user={user} />;
  const { id } = useParams();
  const student = getStudentById(id);
  if (!student) return <NotFoundPage />;
  const renewalYears = getRenewalSchoolYears(student.id);
  return (
    <>
      <PageHeader
        title={student.name}
        description={`${student.number} - ${student.grade} - ${student.section}`}
        backTo="/students"
        action={
          <div className="flex flex-wrap gap-2">
            {can(user, "payment.record") || can(user, "account.view") || can(user, "account.create") ? <>
              {can(user, "payment.record") && <Link to={`/payments/new?student=${student.id}`} className={primaryLinkClass}>Record payment</Link>}
              {can(user, "account.view") && <Link to={getCurrentBillingAccount(student.id) ? `/accounts/${getCurrentBillingAccount(student.id)?.id}` : `/accounts/new?student=${student.id}`} className={secondaryLinkClass}>{getCurrentBillingAccount(student.id) ? "View account" : "Create account"}</Link>}
              {can(user, "account.create") && (renewalYears.length ? <Link to={`/accounts/new?student=${student.id}&mode=renew`} className={secondaryLinkClass}>Renew Billing Account</Link> : <Button type="button" variant="secondary" disabled title="Every configured school year already has an account for this student.">Renew Billing Account</Button>)}
            </> : null}
            {can(user, "student.edit") && <Link to={`/students/${student.id}/edit`} className={secondaryLinkClass}>Edit student</Link>}
          </div>
        }
      />
      <StudentOverviewPanel student={student} user={user} />
    </>
  );
}

function StudentOverviewPanel({
  student,
  user,
}: {
  student: typeof firstStudent;
  user: AuthenticatedUser;
}) {
  if (user.role === "registrar") {
    const age = calculateStudentAge(student.dateOfBirth);
    return (
      <div className="space-y-4">
        <Card>
          <h2 className="text-base font-semibold text-text-primary">Academic information</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <StudentProfileField label="Student number" value={student.number} />
            <StudentProfileField label="Student name" value={student.name} />
            <StudentProfileField label="Grade level" value={student.grade} />
            <StudentProfileField label="Section" value={student.section} />
            <StudentProfileField label="Enrollment status" value={<StatusBadge status={student.studentStatus} />} />
          </dl>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-text-primary">Personal information</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <StudentProfileField label="Date of birth" value={student.dateOfBirth ? formatDate(`${student.dateOfBirth}T00:00:00+08:00`) : "Not provided"} />
            <StudentProfileField label="Age" value={age === null ? "Not provided" : `${age} years old`} />
            <StudentProfileField label="Gender" value={student.gender ?? "Not provided"} />
            <StudentProfileField label="Residential address" value={student.residentialAddress ?? "Not provided"} />
          </dl>
        </Card>
        <Card className="bg-white">
          <h2 className="text-base font-semibold text-text-primary">Guardian details</h2>
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
      </div>
    );
  }

  const canSeeFinancialContext = can(user, "student.financial.view");
  const canViewGuardianContacts = can(user, "guardianContact.view");
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {canSeeFinancialContext && (
          <Metric label="Account balance" value={format(student.balance)} />
        )}
        <Metric
          label="Student status"
          value={<StatusBadge className={PROMINENT_STATUS_BADGE_CLASS} status={student.studentStatus} />}
        />
        {canSeeFinancialContext && (
          <Metric
            label="Billing status"
            value={<StatusBadge className={PROMINENT_STATUS_BADGE_CLASS} status={student.billingStatus} />}
          />
        )}
      </div>
      {canViewGuardianContacts && (
        <Card className="bg-white">
          <h2 className="text-base font-semibold text-text-primary">Guardian details</h2>
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
      {canSeeFinancialContext && (
        <Card>
          <h2 className="text-base font-semibold text-text-primary">Billing accounts</h2>
          <p className="mt-1 text-sm text-text-secondary">Each school year remains a separate billing record. Historical balances and payments are not carried forward.</p>
          <ListCard
            className="mt-4"
            headers={["School year", "Grade", "Status", "Balance", "Action"]}
            rows={getStudentBillingAccounts(student.id).map((account) => [
              account.schoolYear,
              account.gradeLevel,
              <StatusBadge status={account.status} />,
              format(account.balance),
              can(user, "account.view") ? <Link key={account.id} className={inlineLinkClass} to={`/accounts/${account.id}`}>View</Link> : "Unavailable",
            ])}
          />
        </Card>
      )}
    </div>
  );
}

function StudentProfileField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-medium text-text-secondary">{label}</dt>
      <dd className="mt-1 break-words text-sm text-text-primary">{value}</dd>
    </div>
  );
}

const mockAccountFilters = { query: "", schoolYear: "", grade: "", status: "", minimumBalance: "", maximumBalance: "" };

export function AccountsPage({ user }: { user: AuthenticatedUser }) {
  if (isLiveCashierApiEnabled()) return <LiveBillingAccounts />;
  const filters = useTableFilters(mockAccountFilters);
  const visibleAccounts = billingAccounts.filter((account) => {
    const student = getStudentById(account.studentId);
    const applied = filters.applied;
    const balance = Number(account.balance) / 100;
    return (!applied.query || `${student?.name ?? ""} ${student?.number ?? ""}`.toLowerCase().includes(applied.query.toLowerCase()))
      && (!applied.schoolYear || account.schoolYear.toLowerCase().includes(applied.schoolYear.toLowerCase()))
      && (!applied.grade || student?.grade.toLowerCase().includes(applied.grade.toLowerCase()))
      && (!applied.status || account.status === applied.status)
      && (!applied.minimumBalance || balance >= Number(applied.minimumBalance))
      && (!applied.maximumBalance || balance <= Number(applied.maximumBalance));
  });
  return (
    <>
      <PageHeader
        title="Accounts"
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
        toolbar={<TableFilters embedded scope="Sample billing accounts" defaults={mockAccountFilters} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search billing accounts", placeholder: "Name or student number" }} fields={[
        { key: "schoolYear", label: "School year" }, { key: "grade", label: "Grade" },
        { key: "status", label: "Billing status", type: "select", options: [{ value: "", label: "All statuses" }, { value: "Current", label: "Current" }, { value: "Due soon", label: "Due soon" }, { value: "Overdue", label: "Overdue" }] },
        { key: "minimumBalance", label: "Minimum balance (PHP)", type: "number", min: "0", step: "0.01" },
        { key: "maximumBalance", label: "Maximum balance (PHP)", type: "number", min: "0", step: "0.01" },
      ]} onChange={filters.update} onSearch={filters.search} onApply={filters.apply} onClear={filters.clear} onRemove={filters.remove} validate={(draft) => moneyRangeError(draft.minimumBalance, draft.maximumBalance)} />}
        rows={visibleAccounts.map((account) => [
          <Link key={account.id} className={inlineLinkClass} to={`/accounts/${account.id}`}>{getStudentById(account.studentId)?.name ?? "Unknown student"}</Link>,
          account.schoolYear,
          format(account.balance),
          account.status,
        ])}
        headers={["Student", "School year", "Balance", "Billing status"]}
      />
    </>
  );
}
export function AccountWizardPage({ user }: { user?: AuthenticatedUser }) {
  const [searchParams] = useSearchParams();
  const renewalMode = searchParams.get("mode") === "renew";
  const queryStudent = getStudentById(searchParams.get("student") ?? undefined);
  const [step, setStep] = useState(1);
  const [studentQuery, setStudentQuery] = useState(queryStudent ? `${queryStudent.name} - ${queryStudent.number}` : "");
  const [studentId, setStudentId] = useState<string | null>(queryStudent?.id ?? null);
  const [schoolYearId, setSchoolYearId] = useState(queryStudent && renewalMode ? getSuggestedRenewalSchoolYear(queryStudent.id)?.id ?? "" : getMockState().config.currentSchoolYearId);
  const [gradeLevel, setGradeLevel] = useState(queryStudent?.grade ?? "");
  const [feeItemIds, setFeeItemIds] = useState<string[]>([]);
  const [paymentPlanId, setPaymentPlanId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const selectedStudent = studentId ? getStudentById(studentId) : undefined;
  const duplicateAccount = selectedStudent && schoolYearId
    ? getStudentBillingAccounts(selectedStudent.id).find((account) => account.schoolYearId === schoolYearId)
    : undefined;
  const feeItems = schoolYearId && gradeLevel ? getMockFeeSchedule(schoolYearId, gradeLevel) : undefined;
  const paymentPlans = getMockPaymentPlans();
  const totalDue = centavos((feeItems ?? []).filter((item) => feeItemIds.includes(item.id)).reduce((sum, item) => sum + item.amount, 0));
  const schedule = paymentPlanId && totalDue > 0 ? previewMockInstallmentSchedule(totalDue, paymentPlanId) : [];
  const steps = ["Student", "Fees & plan", "Schedule", "Review"];

  useEffect(() => {
    setFeeItemIds(feeItems?.map((item) => item.id) ?? []);
    setPaymentPlanId(paymentPlans[0]?.id ?? "");
    setConfirmed(false);
  }, [schoolYearId, gradeLevel]);

  function selectStudent(student: typeof firstStudent) {
    setStudentQuery(`${student.name} - ${student.number}`);
    setStudentId(student.id);
    setSchoolYearId(renewalMode ? getSuggestedRenewalSchoolYear(student.id)?.id ?? "" : getMockState().config.currentSchoolYearId);
    setGradeLevel(student.grade);
    setError("");
  }

  function validationError() {
    if (step === 1) {
      if (!studentId) return "Select an existing student before continuing.";
      if (!schoolYearId) return "Select a configured school year before continuing.";
      if (!gradeLevel) return "Confirm the target grade level before continuing.";
      if (getStudentBillingAccounts(studentId).some((account) => account.schoolYearId === schoolYearId)) return "Billing Account Already Exists: select a school year without an existing account.";
    }
    if (step === 2) {
      if (!feeItems?.length) return "No fee schedule is configured for the selected school year and grade level. Choose a configured grade or school year.";
      if (feeItems.some((item) => item.required && !feeItemIds.includes(item.id))) return "Required fee items cannot be removed.";
      if (!paymentPlanId) return "Select an active installment plan before continuing.";
    }
    if (step === 3 && (!schedule.length || schedule.reduce((sum, installment) => sum + installment.amount, 0) !== totalDue)) return "The installment schedule must equal the selected fee total.";
    if (step === 4 && !confirmed) return "Confirm that you are creating a new, separate billing account before saving.";
    return "";
  }

  function continueWizard() {
    const message = validationError();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (step === 4) createAccount(); else setStep((current) => current + 1);
  }

  function createAccount() {
    if (!studentId) return;
    try {
      setCreated(true);
      const account = createMockBillingAccount(studentId, { schoolYearId, gradeLevel, feeItemIds, paymentPlanId }, user?.id ?? "user-cashier");
      navigate(`/accounts/${account.id}?created=1`);
    } catch (cause) {
      setCreated(false);
      setError(cause instanceof Error ? cause.message : "The account could not be created.");
    }
  }

  return (
    <>
      <PageHeader title="New account" description={renewalMode ? "Create a new school-year billing account without changing earlier financial records." : "Set up an account for one student and one school year."} backTo="/accounts" />
      <Card data-testid="account-wizard" className="mx-auto w-full max-w-5xl">
        <ol className="mb-6 flex flex-wrap gap-2 text-sm">{steps.map((label, index) => <li key={label} className={cn("rounded-md border px-3 py-2", index + 1 === step ? "border-brand-green-light bg-status-success/10 font-semibold text-brand-green-dark" : "border-border bg-white text-text-secondary")}>{index + 1}. {label}</li>)}</ol>
        <h2 className="text-base font-semibold text-text-primary">{steps[step - 1]}</h2>
        <p className="mt-2 text-sm text-text-secondary">{step === 1 ? "Confirm the student, target school year, and grade level." : step === 2 ? "Configured fee items and active payment plans load from the shared mock database." : step === 3 ? "Review installment due dates and amounts before saving." : "Confirm the new account. Earlier financial records will remain unchanged."}</p>
        {step === 1 && <StudentSearchField value={studentQuery} onChange={(value) => { setStudentQuery(value); if (value !== `${selectedStudent?.name} - ${selectedStudent?.number}`) setStudentId(null); }} onSelect={selectStudent} autoFocus={!queryStudent} placeholder="Search student name or number" wrapperClassName="mt-5" inputClassName={cn(inputClass, "m-0")} />}
        {step === 1 && selectedStudent && <div className="mt-3 space-y-4 rounded-md border border-brand-green-light bg-status-success/5 p-4 text-sm text-text-primary"><p role="status">Selected student: <span className="font-medium">{selectedStudent.name}</span> ({selectedStudent.number}) · Current profile: {selectedStudent.grade} - {selectedStudent.section}</p><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Target school year<select aria-label="Target school year" className={inputClass} value={schoolYearId} onChange={(event) => { setSchoolYearId(event.target.value); setError(""); }}><option value="">Select school year</option>{getMockState().schoolYears.map((year) => <option key={year.id} value={year.id} disabled={getStudentBillingAccounts(selectedStudent.id).some((account) => account.schoolYearId === year.id)}>{year.label}{getStudentBillingAccounts(selectedStudent.id).some((account) => account.schoolYearId === year.id) ? " (account exists)" : ""}</option>)}</select></label><label className="text-sm font-medium">Target grade level<select aria-label="Target grade level" className={inputClass} value={gradeLevel} onChange={(event) => { setGradeLevel(event.target.value); setError(""); }}><option value="">Select grade level</option>{getMockGradeLevels().map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select><span className="mt-1 block text-xs font-normal text-text-secondary">This account snapshot does not update the student profile.</span></label></div>{getStudentBillingAccounts(selectedStudent.id).length > 0 && <ListCard headers={["School year", "Grade", "Status", "Balance"]} rows={getStudentBillingAccounts(selectedStudent.id).map((account) => [account.schoolYear, account.gradeLevel, account.status, format(account.balance)])} />}</div>}
        {step === 2 && <div className="mt-5 space-y-5">{!feeItems?.length ? <p role="status" className="rounded-md border border-status-warning bg-status-warning/5 p-4 text-sm text-text-primary">No fee schedule is configured for {gradeLevel || "this grade"} in the selected school year. Go back and choose a configured grade or year.</p> : <fieldset><legend className="font-medium">Fee items</legend><p className="mt-1 text-sm text-text-secondary">Required fees are locked. Selected amounts are copied into this billing account.</p><div className="mt-3 space-y-2">{feeItems.map((item) => <label key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-3 text-sm"><span className="flex items-center gap-3"><input type="checkbox" checked={feeItemIds.includes(item.id)} disabled={item.required} onChange={(event) => setFeeItemIds((selected) => event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} /><span><span className="font-medium">{item.name}</span><span className="ml-2 text-text-secondary">{item.category} · {item.required ? "Required" : "Optional"}</span></span></span><span className="font-medium">{format(item.amount)}</span></label>)}</div><p className="mt-3 text-sm font-semibold">Selected total: {format(totalDue)}</p></fieldset>}<fieldset><legend className="font-medium">Installment plan</legend><div className="mt-3 grid gap-3 md:grid-cols-3">{paymentPlans.map((plan) => <label key={plan.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-white p-3 text-sm"><input type="radio" name="paymentPlan" checked={paymentPlanId === plan.id} onChange={() => setPaymentPlanId(plan.id)} /><span><span className="block font-medium">{plan.name}</span><span className="mt-1 block text-text-secondary">Down payment: {format(plan.downPayment)} · {plan.installmentCount} scheduled payment{plan.installmentCount === 1 ? "" : "s"}</span></span></label>)}</div></fieldset></div>}
        {step === 3 && <div className="mt-5"><ListCard rows={schedule.map((installment) => [installment.label, formatDate(installment.dueDate), format(installment.amount)])} headers={["Installment", "Due date", "Amount"]} /><p className="mt-3 text-right text-sm font-semibold">Billing total: {format(totalDue)}</p></div>}
        {step === 4 && <div className="mt-5 space-y-4 rounded-md border border-brand-green-light bg-status-success/5 p-4 text-sm"><dl className="grid gap-3 md:grid-cols-3"><div><dt className="text-text-secondary">Student</dt><dd className="font-medium">{selectedStudent?.name}</dd></div><div><dt className="text-text-secondary">School year / grade</dt><dd className="font-medium">{getMockState().schoolYears.find((year) => year.id === schoolYearId)?.label} · {gradeLevel}</dd></div><div><dt className="text-text-secondary">Billing total</dt><dd className="font-medium">{format(totalDue)}</dd></div></dl><p>Creating the account saves the selected fee and schedule snapshots. Existing accounts, payments, receipts, balances, and audits are never changed.</p><label className="flex cursor-pointer items-center gap-2"><input className="shrink-0 cursor-pointer" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I confirm that this creates a separate billing account for the selected school year.</span></label></div>}
        {error && <p role="alert" className="mt-4 text-sm text-status-error">{error}{duplicateAccount && <> <Link className={inlineLinkClass} to={`/accounts/${duplicateAccount.id}`}>View existing billing account</Link></>}</p>}
        <div className="mt-6 flex justify-end gap-3">{step > 1 && <Button type="button" variant="secondary" disabled={created} onClick={() => { setStep((current) => current - 1); setError(""); }}>Back</Button>}<Button type="button" disabled={created} onClick={continueWizard}>{created ? "Creating account..." : step === 4 ? "Create account" : "Continue"}</Button></div>
      </Card>
    </>
  );
}
export function AccountDetailPage({ user }: { user: AuthenticatedUser }) {
  if (isLiveCashierApiEnabled()) return <LiveBillingAccountDetail user={user} />;
  const { id } = useParams();
  const [searchParams] = useSearchParams();
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
              to={`/payments/new?student=${student.id}&account=${account.id}`}
            >
              Record payment
            </Link>
          ) : undefined
        }
      />
      {searchParams.get("created") === "1" && <div role="status" className="mb-5 rounded-md border border-status-success bg-status-success/10 p-4 text-sm text-text-primary"><h2 className="font-semibold text-brand-green-dark">Billing Account Created Successfully</h2><p className="mt-1">The student's billing account for the selected school year has been created. You are viewing the new billing account.</p></div>}
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Total fees" value={format(account.totalDue)} />
        <Metric label="Paid" value={format(account.totalPaid)} />
        <Metric label="Balance" value={format(account.balance)} />
      </div>
      <div className="mt-5">
        {account.feeItems.length > 0 && <ListCard className="mb-4" headers={["Fee item", "Category", "Requirement", "Amount"]} rows={account.feeItems.map((item) => [item.name, item.category, item.required ? "Required" : "Optional", format(item.amount)])} />}
        <ListCard
          headers={["Due date", "Amount", "Paid", "Status"]}
          rows={account.schedule.map((installment) => [
            formatDate(installment.dueDate),
            format(installment.amount),
            format(installment.paid),
            <StatusBadge status={installment.status} />,
          ])}
        />
      </div>
    </>
  );
}

const mockPaymentFilters = { query: "", status: "", dateFrom: "", dateTo: "", amountMinimum: "", amountMaximum: "" };

export function PaymentsPage({
  user,
  detail = false,
}: {
  user: AuthenticatedUser;
  detail?: boolean;
}) {
  if (isLiveCashierApiEnabled()) return <LivePaymentsPage user={user} detail={detail} />;
  if (detail) return <PaymentDetailPage user={user} />;
  const filters = useTableFilters(mockPaymentFilters);
  const visiblePayments = payments.filter((payment) => {
    const applied = filters.applied;
    const student = getStudentById(payment.studentId);
    const amount = Number(payment.amount) / 100;
    return (!applied.query || `${payment.receiptNo} ${student?.name ?? ""} ${student?.number ?? ""}`.toLowerCase().includes(applied.query.toLowerCase()))
      && (!applied.status || payment.status === applied.status)
      && (!applied.dateFrom || payment.paidOn >= applied.dateFrom)
      && (!applied.dateTo || payment.paidOn <= applied.dateTo)
      && (!applied.amountMinimum || amount >= Number(applied.amountMinimum))
      && (!applied.amountMaximum || amount <= Number(applied.amountMaximum));
  });
  return (
    <>
      <PageHeader
        title={user.role === "accounting" ? "Payment review" : "Payments"}
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
        toolbar={<TableFilters embedded scope="Sample payments" defaults={mockPaymentFilters} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search receipt or student" }} fields={[
        { key: "status", label: "Status", type: "select", options: [{ value: "", label: "All statuses" }, { value: "Posted", label: "Posted" }, { value: "Void pending", label: "Void pending" }, { value: "Voided", label: "Voided" }] },
        { key: "dateFrom", label: "Paid on or after", type: "date" }, { key: "dateTo", label: "Paid on or before", type: "date" },
        { key: "amountMinimum", label: "Minimum amount (PHP)", type: "number", min: "0", step: "0.01" }, { key: "amountMaximum", label: "Maximum amount (PHP)", type: "number", min: "0", step: "0.01" },
      ]} onChange={filters.update} onSearch={filters.search} onApply={filters.apply} onClear={filters.clear} onRemove={filters.remove} validate={(draft) => dateRangeError(draft.dateFrom, draft.dateTo) || moneyRangeError(draft.amountMinimum, draft.amountMaximum)} />}
        paginate={{ label: "payments" }}
        headers={["Receipt", "Student", "Date", "Amount", "Method", "Status"]}
        rows={visiblePayments.map((payment) => [
          <Link className={inlineLinkClass} to={`/payments/${payment.id}`}>
            {payment.receiptNo}
          </Link>,
          <><span className="block">{getStudentById(payment.studentId)?.name ?? "Unknown student"}</span><span className="mt-0.5 block text-xs text-text-secondary">{[getStudentById(payment.studentId)?.grade, getStudentById(payment.studentId)?.section].filter(Boolean).join(" · ")}</span></>,
          payment.paidOn,
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
  const account = payment && getBillingAccount(payment.accountId);
  const student = payment && getStudentById(payment.studentId);
  const [voidReason, setVoidReason] = useState("");
  const [voidMessage, setVoidMessage] = useState("");

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
                ? "Reprint Receipt"
                : "View receipt"}
            </Link>
            {can(user, "payment.void.approve") && (
              <Link className={secondaryLinkClass} to="/voids">
                Review void queue
              </Link>
            )}
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Student" value={<><span className="block">{student.name}</span><span className="mt-1 block text-sm font-medium tracking-normal text-text-secondary">{student.grade} · {student.section}</span></>} />
        <Metric label="Amount" value={format(payment.amount)} />
        <Metric label="Recorder" value="Casey Cashier (sample)" />
        <Metric label="Email status" value={<StatusBadge className={PROMINENT_STATUS_BADGE_CLASS} status="Queued" />} />
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
            ["Void state", payment.status],
          ]}
        />
      </div>
      {can(user, "payment.void.request") && (
        <Card className="mt-5">
          <h2 className="text-base font-semibold text-text-primary">Request void</h2>
          <p className="mt-1 text-sm text-text-secondary">
            A reason of at least 10 characters is required. Accounting reviews
            the request.
          </p>
          <textarea
            minLength={10}
            className={textareaClass}
            placeholder="Reason for void request"
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            disabled={payment.status !== "Posted"}
          />
          {voidMessage && <p role="status" className="mt-2 text-sm text-text-secondary">{voidMessage}</p>}
          <Button className="mt-3" variant="destructive" disabled={payment.status !== "Posted"} onClick={() => {
            try {
              requestMockVoid(payment.id, voidReason, user.id);
              setVoidMessage("Void request submitted for Accounting review.");
              setVoidReason("");
            } catch (error) {
              setVoidMessage(error instanceof Error ? error.message : "The void request could not be submitted.");
            }
          }}>
            Request void
          </Button>
        </Card>
      )}
    </>
  );
}

const paymentMethodOptions = [{ value: "Cash", label: "Cash" }];
const PROMINENT_STATUS_BADGE_CLASS = "gap-1.5 px-2.5 py-0.5 text-xl font-bold leading-tight tracking-tight [&_svg]:h-5 [&_svg]:w-5";

function dueRecordForAccount(account: ReturnType<typeof getBillingAccount>) {
  const installment = account?.schedule.find((item) => item.paid < item.amount);
  return installment && account
    ? { account: `${account.schoolYear} tuition`, installment: installment.label, dueDate: installment.dueDate, status: installment.status, amountDue: centavos(installment.amount - installment.paid) }
    : undefined;
}

function PaymentWorkflow({
  preselectedStudent,
  preselectedAccountId,
  compact = false,
}: {
  preselectedStudent?: typeof firstStudent;
  preselectedAccountId?: string;
  compact?: boolean;
}) {
  const [searchParams] = useSearchParams();
  const initialStudent =
    preselectedStudent ??
    students.find((student) => student.id === searchParams.get("student"));
  const preselectedAccount = getBillingAccount(preselectedAccountId);
  const accountForInitialStudent = preselectedAccount?.studentId === initialStudent?.id ? preselectedAccount : undefined;
  const initialDueRecord = initialStudent
    ? dueRecordForAccount(accountForInitialStudent) ?? getNextDueRecord(initialStudent.id)
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
    (studentQuery.trim()
      ? students.find((student) => studentMatchesSearch(student, studentQuery))
      : undefined);
  const selectedAccount = preselectedAccount?.studentId === selectedStudent?.id ? preselectedAccount : undefined;
  const nextDueRecord = selectedStudent
    ? dueRecordForAccount(selectedAccount) ?? (selectedAccount ? undefined : getNextDueRecord(selectedStudent.id))
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
    ? centavos(Math.max(0, (selectedAccount?.balance ?? selectedStudent.balance) - enteredCentavos))
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
    const paymentBalance = selectedAccount?.balance ?? selectedStudent.balance;
    if (enteredCentavos > paymentBalance) {
      setError(
        `Amount is more than the balance of ${format(paymentBalance)}. Enter ${format(paymentBalance)} or less.`,
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
        billingAccountId: selectedAccount?.id ?? getCurrentBillingAccount(selectedStudent!.id)?.id ?? "",
        studentNumber: selectedStudent!.number,
        amount: enteredCentavos,
        paidOn: manilaDateInput(),
        notificationChannels,
        idempotencyKey: "development-mock",
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
        <div className="grid gap-3 rounded-md border border-brand-green-light bg-status-success/5 p-4 text-sm md:grid-cols-5">
          <div>
            <span className="block text-sm font-semibold text-text-secondary">
              Student
            </span>
            <span className="mt-1 block font-semibold text-text-primary">
              {selectedStudent.name}
            </span>
          </div>
          <div>
            <span className="block text-sm font-semibold text-text-secondary">
              Grade & section
            </span>
            <span className="mt-1 block font-semibold text-text-primary">
              {selectedStudent.grade} - {selectedStudent.section}
            </span>
          </div>
          <div>
            <span className="block text-sm font-semibold text-text-secondary">
              Fee name
            </span>
            <span className="mt-1 block font-semibold text-text-primary">
              {nextDueRecord ? nextDueRecord.account : "Select a fee"}
            </span>
          </div>
          <div>
            <span className="block text-sm font-semibold text-text-secondary">
              Next due record
            </span>
            <span className="mt-1 block font-semibold text-text-primary">
              {nextDueRecord ? nextDueRecord.installment : "No due record"}
            </span>
          </div>
          <div>
            <span className="block text-sm font-semibold text-text-secondary">
              Amount due
            </span>
            <span className="mt-1 block font-semibold text-text-primary">
              {nextDueRecord
                ? format(nextDueRecord.amountDue)
                : format(selectedAccount?.balance ?? selectedStudent.balance)}
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
        <p className="mt-3 rounded-md border border-status-warning bg-status-warning/5 p-3 text-sm text-text-primary">
          <span className="font-medium">SMS load fee:</span> Not configured. Any configured carrier/load cost is recorded with the SMS notification and is not added to this payment or the student's balance.
        </p>
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-status-error/40 bg-status-error/10 p-3 text-sm text-status-error"
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
          className="rounded-md border border-status-success bg-status-success/10 p-4"
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
        <Button type="submit" disabled={!selectedStudent || stage === "saved" || isSaving}>
          Review payment
        </Button>
      </div>
    </form>
  );
}
export function PaymentEntryPage() {
  const [searchParams] = useSearchParams();
  if (isLiveCashierApiEnabled()) return <LivePaymentEntryPage />;
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
        <PaymentWorkflow preselectedStudent={selectedStudent} preselectedAccountId={searchParams.get("account") ?? undefined} />
      </Card>
    </>
  );
}

export function ReceiptPage({ user }: { user: AuthenticatedUser }) {
  const { id } = useParams();
  if (isLiveCashierApiEnabled()) return <LivePaymentReceiptPage user={user} />;
  const payment = getMockPayment(id ?? "mock-payment-0");
  const canPrint = can(user, "receipt.reprint");
  const student = payment && getStudentById(payment.studentId);
  const account = payment && getBillingAccount(payment.accountId);

  if (!payment || !student) return <NotFoundPage />;
  const receipt: PaymentRecord = {
    id: payment.id, studentId: student.id, studentName: student.name, studentNo: student.number,
    studentGrade: student.grade, studentSection: student.section, schoolYear: account?.schoolYear ?? null,
    billingAccountId: payment.accountId, amountCents: payment.amount, method: "Cash", paidOn: payment.paidOn,
    status: payment.status === "Voided" ? "voided" : payment.status === "Void pending" ? "void_pending" : "valid",
    receiptNo: payment.receiptNo, firstPrintedAt: null, recordedAt: null, recordedBy: "Casey Cashier (sample)",
    reprintCount: 0, balanceAfterCents: payment.balanceAfter,
    allocations: payment.allocations.map((allocation) => ({
      installmentLabel: account?.schedule.find((installment) => installment.id === allocation.installmentId)?.label ?? "Installment",
      amountCents: allocation.amount,
    })),
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Acknowledgment Receipt"
        description="EducaTrak · Mendez Christian Academy"
        backTo={`/payments/${payment.id}`}
        action={canPrint ? <Button onClick={() => void printDocumentWhenReady()}><span className="inline-flex items-center gap-2"><PrinterIcon />Print Receipt</span></Button> : undefined}
      />
      <div className="overflow-x-auto rounded-md border border-border bg-white p-4"><ReceiptDocument payment={receipt} /></div>
      <PrintSurface className="receipt-print-root"><ReceiptDocument payment={receipt} /></PrintSurface>
    </div>
  );
}
export function VoidsPage({ user }: { user: AuthenticatedUser }) {
  if (isLiveCashierApiEnabled()) return <LiveVoidsPage user={user} />;
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const canDecide = can(user, "payment.void.approve");

  return (
    <>
      <PageHeader
        title="Void requests"
        description="Review pending void requests. The cashier who recorded a payment cannot approve its void."
      />
      <ListCard
        headers={["Receipt", "Requester", "Reason", "Amount", "Decision"]}
        rows={[
          [
            "OR-2026-001007",
            "Casey Cashier (sample)",
            "Duplicate entry during handover",
            "₱800.00",
            resolved ??
              (canDecide ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => { setSelectedRequestId(getMockState().voidRequests.find((request) => request.status === "pending")?.id ?? null); setDecision("approve"); setActionError(""); }}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setSelectedRequestId(getMockState().voidRequests.find((request) => request.status === "pending")?.id ?? null); setDecision("reject"); setActionError(""); }}
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
            ? "Approve the void for OR-2026-001007 and return ₱800.00 to the billing account?"
            : "Reject the void request for OR-2026-001007?"}
        </p>
        <label className="mt-4 block text-sm font-medium">
          Decision note
          <textarea className={textareaClass} placeholder="Add a decision note" />
        </label>
        {actionError && <p role="alert" className="mt-2 text-sm text-status-error">{actionError}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setDecision(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={decision === "approve" ? "success" : "destructive"}
            onClick={() => {
              if (!decision || !selectedRequestId) return;
              try {
                decideMockVoid(selectedRequestId, decision === "approve", user.id);
                setResolved(decision === "approve" ? "Void approved" : "Void rejected");
                setDecision(null);
                setSelectedRequestId(null);
              } catch (error) {
                setActionError(error instanceof Error ? error.message : "The void request could not be decided.");
              }
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
    <ViewTabs label="Close-out views" className="mb-4" items={items.map((item) => ({ key: item.to, label: item.label, selected: item.active, to: item.to }))} />
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

  if (items.length === 1) return null;

  return (
    <SectionTabs items={items} />
  );
}

export function FollowupPage({ user, workspaceSwitch }: { user: AuthenticatedUser; workspaceSwitch?: ReactNode }) {
  const filters = useTableFilters({ query: "", daysMinimum: "" });
  const canSendReminders = can(user, "followup.send");
  const followupAccounts = selectMockFollowUpAccounts();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>(["email"]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const visibleFollowupAccounts = followupAccounts.filter((account) => (
    account.student.toLowerCase().includes(filters.applied.query.trim().toLowerCase())
    && (!filters.applied.daysMinimum || account.daysOverdue >= Number(filters.applied.daysMinimum))
    && (!canSendReminders || hasSelectedReminderContact(notificationChannels, { email: account.guardianEmail, mobile: account.guardianMobile }))
  ));
  const selectedAccounts = followupAccounts.filter((account) =>
    selectedAccountIds.includes(account.id),
  );
  const recipientAccounts = selectedAccounts.filter((account) => (
    (notificationChannels.includes("email") && account.guardianEmail)
    || (notificationChannels.includes("sms") && account.guardianMobile)
  ));
  const skippedAccounts = selectedAccounts.filter((account) => !recipientAccounts.includes(account));
  const allAccountsSelected = visibleFollowupAccounts.length > 0 && visibleFollowupAccounts.every((account) => selectedAccountIds.includes(account.id));
  const applyFollowupFilters = () => { setSelectedAccountIds([]); filters.apply(); };
  const clearFollowupFilters = () => { setSelectedAccountIds([]); filters.clear(); };
  const searchFollowup = (key: "query" | "daysMinimum", value: string) => { setSelectedAccountIds([]); filters.search(key, value); };
  const removeFollowupFilter = (key: "query" | "daysMinimum") => { setSelectedAccountIds([]); filters.remove(key); };

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
        title="Follow-up"
        description="Review reminder activity and notification history without merging their records."
        action={
          can(user, "followup.send") ? (
            <Button disabled={selectedAccounts.length === 0 || notificationChannels.length === 0 || sent} onClick={() => setReviewOpen(true)}>
              Send reminder details
            </Button>
          ) : undefined
        }
      />
      {workspaceSwitch}
      {sent && (
        <p role="status" className="mb-4 text-sm font-medium text-brand-green-dark">
          {`Reminder${recipientAccounts.length === 1 ? "" : "s"} sent today to ${recipientAccounts.length} guardian${recipientAccounts.length === 1 ? "" : "s"}.`}
          {skippedAccounts.length > 0
            ? ` ${skippedAccounts.length} account${skippedAccounts.length === 1 ? " was" : "s were"} skipped because ${skippedAccounts.length === 1 ? "it has" : "they have"} no selected notification contact.`
            : ""}
        </p>
      )}
      <ListCard
            toolbar={<div className="space-y-3"><TableFilters embedded scope="Sample follow-up queue" defaults={{ query: "", daysMinimum: "" }} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search student" }} fields={[{ key: "daysMinimum", label: "Minimum days overdue", type: "number", min: "0" }]} onChange={filters.update} onSearch={searchFollowup} onApply={applyFollowupFilters} onClear={clearFollowupFilters} onRemove={removeFollowupFilter} />{can(user, "followup.send") ? (
              <div className="flex w-full flex-wrap items-center gap-3">
                <SelectAllCheckbox
                  label="Select all listed accounts"
                  checked={allAccountsSelected}
                  indeterminate={!allAccountsSelected && visibleFollowupAccounts.some((account) => selectedAccountIds.includes(account.id))}
                  disabled={sent}
                  onChange={(checked) => setSelectedAccountIds(checked ? visibleFollowupAccounts.map((account) => account.id) : [])}
                />
                <span className="ml-auto flex items-center gap-2 text-sm font-medium text-text-secondary">Send by
                  <DropdownSelect
                    aria-label="Send reminders by"
                    value={channelsValue(notificationChannels)}
                    options={REMINDER_CHANNEL_OPTIONS}
                    disabled={sent}
                    onChange={(value) => { setSelectedAccountIds([]); setNotificationChannels(channelsFromValue(value)); }}
                    className="min-w-40"
                  />
                </span>
              </div>
            ) : null}</div>}
            onRowClick={can(user, "followup.send") && !sent ? (index) => {
              const account = visibleFollowupAccounts[index];
              if (account) toggleAccountSelection(account.id, !selectedAccountIds.includes(account.id));
            } : undefined}
            isRowSelected={(index) => selectedAccountIds.includes(visibleFollowupAccounts[index]?.id ?? "")}
            headers={[
              "Student",
              "Guardian contact",
              "Amount due",
              "Days overdue",
              "Status",
              "Last reminder",
            ]}
            rows={visibleFollowupAccounts.map((account) => [
              can(user, "followup.send") ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-brand-green-dark"
                    aria-label={`Select reminder for ${account.student}`}
                    checked={selectedAccountIds.includes(account.id)}
                    disabled={sent}
                    onChange={(event) => toggleAccountSelection(account.id, event.target.checked)}
                  />
                  <span>{account.student}</span>
                </div>
              ) : account.student,
              selectedReminderContacts(notificationChannels, { email: account.guardianEmail, mobile: account.guardianMobile }).join(" · "),
              format(account.amountDue),
              account.daysOverdue,
              <StatusBadge status={account.status} />,
              "Not recorded",
            ])}
          />
      <MockDialog open={reviewOpen} onOpenChange={setReviewOpen} title={notificationChannels.includes("sms") ? "Review reminder notifications" : "Review reminder emails"} contentClassName="w-[min(56rem,calc(100vw-2rem))]">
        <div className="mt-2 space-y-3 text-sm text-text-secondary">
          <p className="font-medium text-text-primary">
            {recipientAccounts.length} reminder{recipientAccounts.length === 1 ? "" : "s"} will be sent by {notificationChannels.includes("email") && notificationChannels.includes("sms") ? "email and SMS" : notificationChannels.includes("sms") ? "SMS" : "email"}.
          </p>
          {recipientAccounts.length > 0 ? (
            <div className="max-h-52 overflow-y-auto rounded-md border border-border p-1">
              <table className="w-full table-fixed border-collapse text-left text-sm">
                <caption className="sr-only">Reminder recipients</caption>
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-border">
                    <th scope="col" className="px-3 py-2 text-xs font-semibold text-text-secondary">Student</th>
                    <th scope="col" className="px-3 py-2 text-xs font-semibold text-text-secondary">Contact</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text-secondary">Amount due</th>
                    <th scope="col" className="px-3 py-2 text-xs font-semibold text-text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recipientAccounts.map((account) => (
                    <tr key={account.id} className="border-b border-border last:border-b-0">
                      <th scope="row" className="px-3 py-2 font-medium text-text-primary">{account.student}</th>
                      <td className="px-3 py-2 break-words">
                        {notificationChannels.includes("email") && account.guardianEmail ? `Email: ${account.guardianEmail}` : ""}
                        {notificationChannels.includes("email") && account.guardianEmail && notificationChannels.includes("sms") && account.guardianMobile ? " · " : ""}
                        {notificationChannels.includes("sms") && account.guardianMobile ? `SMS: ${account.guardianMobile}` : ""}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-text-primary">{format(account.amountDue)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{account.status}{account.status === "Overdue" ? ` (${account.daysOverdue} days)` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No selected accounts have the chosen notification contact.</p>
          )}
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
          <p className="mt-3 rounded-md border border-status-warning bg-status-warning/5 p-3 text-sm">
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
export function CloseoutPage({ user }: { user: AuthenticatedUser }) {
  const [searchParams] = useSearchParams();
  if (isLiveCashierApiEnabled()) return <LiveDailyCloseOut user={user} initialView={searchParams.get("view") === "history" ? "history" : "today"} />;
  const [counted, setCounted] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const history = selectMockCloseOuts(user.id);
  const currentCloseout = history.find((item) => item.businessDate === getMockToday());
  const closed = currentCloseout?.status === "closed";
  const systemCashTotal = mockSystemCashTotal(user.id);
  const enteredCount = Number(counted);
  const hasCountedCash = counted.trim() !== "" && Number.isFinite(enteredCount) && enteredCount >= 0;
  const countedCash = hasCountedCash ? centavos(Math.round(enteredCount * 100)) : null;
  const variance = countedCash === null ? null : centavos(countedCash - systemCashTotal);
  const requiresVarianceReason = variance !== null && variance !== 0;
  const canReview = !closed && countedCash !== null && (!requiresVarianceReason || varianceReason.trim().length > 0);

  const varianceSummary = variance === null
    ? { label: "Waiting for count", detail: "Enter the drawer count to compare it with the system total.", className: "border-border bg-surface" }
    : variance === 0
      ? { label: "Balanced", detail: "The counted cash matches the system total.", className: "border-status-success bg-status-success/5" }
      : variance > 0
        ? { label: "Over", detail: "Explain why the drawer count is higher than the system total.", className: "border-status-warning bg-status-warning/5" }
        : { label: "Short", detail: "Explain why the drawer count is lower than the system total.", className: "border-status-error bg-status-error/5" };
  return (
    <>
      <PageHeader
        title="Close-out"
        description="Review today's totals and history from one close-out area."
      />
      <CloseoutTabs user={user} active="today" />
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Today's close-out</h2>
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
            <section className="rounded-md border border-border p-4">
              <p className="text-sm font-semibold text-text-secondary">System cash total</p>
              <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-text-primary">{format(systemCashTotal)}</p>
            </section>
            <label className="block rounded-md border border-border p-4 text-sm font-semibold text-text-secondary">
              Counted cash
              <input
                autoFocus
                type="text"
                pattern="^\d*(\.\d{0,2})?$"
                aria-label="Counted cash"
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
                disabled={Boolean(closed)}
                inputMode="decimal"
                placeholder="0.00"
                className={inputClass}
              />
              <span className="mt-2 block text-sm font-normal text-text-secondary">
                Enter the amount counted in the cash drawer.
              </span>
            </label>
            <section className={cn("rounded-md border p-4", varianceSummary.className)} aria-live="polite">
              <p className="text-sm font-semibold text-text-secondary">Variance</p>
              <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-text-primary">
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
                disabled={Boolean(closed)}
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
          <div className="mt-4 rounded-md border border-status-success bg-status-success/5 p-4">
            <p role="status" className="font-medium text-brand-green-dark">Closed for {formatDate(currentCloseout!.businessDate)}.</p>
            <p className="mt-1 text-sm text-text-secondary">Your closing record has been finalized. It cannot be reopened or changed.</p>
          </div>
        ) : null}
      </Card>
      <MockDialog open={reviewOpen} onOpenChange={setReviewOpen} title="Confirm daily close-out">
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-4"><dt>System cash total</dt><dd className="font-medium">{format(systemCashTotal)}</dd></div>
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
          <Button type="button" onClick={() => { if (countedCash === null) return; try { recordMockCloseOut({ cashierId: user.id, countedCashCents: countedCash, varianceReason }); setReviewOpen(false); } catch (cause) { setVarianceReason(cause instanceof Error ? cause.message : "Unable to lock the close-out."); setReviewOpen(false); } }}>Confirm and lock</Button>
        </div>
      </MockDialog>
    </>
  );
}
export function CloseoutHistoryPage({ user }: { user: AuthenticatedUser }) {
  if (user.role === "cashier" && isLiveCashierApiEnabled()) return <Navigate to="/closeout?view=history" replace />;
  if (isLiveCashierApiEnabled()) return <LiveCloseOutHistory user={user} />;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const history = selectMockCloseOuts(user.role === "cashier" ? user.id : undefined);
  const selected = history.find((record) => record.id === selectedId) ?? null;
  return (
    <>
      <PageHeader
        title={user.role === "accounting" ? "Close-out review" : "Close-outs"}
        description="Review close-outs and sign off where authorized."
      />
      <CloseoutTabs user={user} active="history" />
      <ListCard
        headers={["Date", "Cashier", "Variance", "Status", "Action"]}
        rows={history.map((record) => [
          formatDate(record.businessDate),
          selectMockStaffUsers().find((staff) => staff.id === record.cashierId)?.name ?? "Unavailable",
          format(centavos(record.varianceCents)),
          record.signedOffBy ? "Signed off" : "Unsigned",
          <Button key={record.id} type="button" variant="secondary" size="sm" onClick={() => { setSelectedId(record.id); setError(""); }}>View</Button>,
        ])}
      />
      {history.length === 0 && <Card><p className="text-sm text-text-secondary">No close-outs have been submitted.</p></Card>}
      {error && <p role="alert" className="mt-4 text-sm text-status-error">{error}</p>}
      <MockDialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)} title="Close-out details">
        {selected && <><dl className="mt-3 grid gap-2 text-sm"><div className="flex justify-between gap-4"><dt>System cash</dt><dd>{format(centavos(selected.systemCashCents))}</dd></div><div className="flex justify-between gap-4"><dt>Counted cash</dt><dd>{format(centavos(selected.countedCashCents))}</dd></div><div className="flex justify-between gap-4"><dt>Variance</dt><dd>{format(centavos(selected.varianceCents))}</dd></div></dl>{selected.varianceReason && <p className="mt-3 text-sm">Variance reason: {selected.varianceReason}</p>}<div className="mt-5 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setSelectedId(null)}>Close</Button>{can(user, "closeout.signoff") && !selected.signedOffBy && <Button type="button" onClick={() => { try { signOffMockCloseOut(selected.id, user.id); setSelectedId(null); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to sign off this close-out."); } }}>Sign off</Button>}</div></>}
      </MockDialog>
    </>
  );
}

export function ReportsHubPage({ user }: { user: AuthenticatedUser }) {
  const statementStudentId = billingAccounts[0]?.studentId ?? "";
  const mockStatementRoute = !isLiveCashierApiEnabled()
    ? `/reports/student/${statementStudentId}`
    : undefined;
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
      route: mockStatementRoute ?? "/students",
      detail: mockStatementRoute
        ? "Fees, schedule, payments, and balance."
        : "Search for a student, then open their statement.",
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
          .filter((report) => canViewReport(user, report.kind) && (!isLiveCashierApiEnabled() || report.kind !== "monthly"))
          .map((report) => (
            <Link
              className="block rounded-md bg-white p-5 shadow-card transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
              key={report.name}
              to={report.route}
            >
              <h2 className="text-base font-semibold text-text-primary">{report.name}</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {report.detail}
              </p>
            </Link>
          ))}
      </div>
    </>
  );
}
function StudentStatementTable({ query = "", item = "", toolbar }: { query?: string; item?: string; toolbar?: ReactNode }) {
  return (
    <ListCard
      toolbar={toolbar}
      headers={["Item", "Due date", "Amount", "Paid"]}
      rows={[
        ["Tuition installment", "Oct 01, 2026", "₱2,500.00", "₱1,250.00"],
        ["Payment OR-2026-001000", "Sep 27, 2026", "₱1,250.00", "₱1,250.00"],
        ["Balance", "After payment", "₱1,250.00", "—"],
      ].filter((row) => (!item || row[0] === item) && row.some((value) => value.toLowerCase().includes(query.trim().toLowerCase())))}
    />
  );
}
export function StudentStatementPage({ user }: { user: AuthenticatedUser }) {
  const { id } = useParams();
  if (isLiveCashierApiEnabled()) return <LiveStudentStatement user={user} studentId={id ?? ""} />;
  return <MockStudentStatementPage user={user} studentId={id ?? ""} />;
}

function MockStudentStatementPage({ user, studentId }: { user: AuthenticatedUser; studentId: string }) {
  const navigate = useNavigate();
  const id = studentId;
  const student = getStudentById(id);
  const account = student && getCurrentBillingAccount(student.id);
  if (!student || !account) return <NotFoundPage />;
  const statementOptions = Array.from(new Map(billingAccounts.map((billingAccount) => {
    const billingStudent = getStudentById(billingAccount.studentId);
    return [billingAccount.studentId, { value: billingAccount.studentId, label: billingStudent ? `${billingStudent.name} (${billingStudent.number})` : billingAccount.studentId }];
  })).values());
  const scheduleRows = account.schedule.map((installment) => [
    installment.label,
    installment.dueDate,
    format(installment.amount),
    format(installment.paid),
  ]);
  const paymentRows = getPaymentsForStudent(student.id).map((payment) => [
    `Payment ${payment.receiptNo}`,
    formatDate(payment.paidOn),
    format(payment.amount),
    format(payment.amount),
  ]);
  const rows = [...scheduleRows, ...paymentRows, ["Balance", "Current", format(account.balance), "—"]];
  return (
    <>
      <PageHeader
        title="Statement"
        description={`${student.name} · ${account.schoolYear}`}
        backTo="/reports"
        action={
          can(user, "statement.print") ? (
            <Button variant="secondary" onClick={() => void printDocumentWhenReady()}>
              <span className="inline-flex items-center gap-2"><PrinterIcon />Print Report</span>
            </Button>
          ) : undefined
        }
      />
      <Card className="mb-5 p-5">
        <label className="block text-sm font-medium">Student statement
          <span className="mt-1 block">
            <DropdownSelect aria-label="Student statement" value={student.id} options={statementOptions} onChange={(nextStudentId) => navigate(`/reports/student/${nextStudentId}`)} className="w-full sm:max-w-md" align="start" />
          </span>
        </label>
      </Card>
      <ListCard headers={["Item", "Due date", "Amount", "Paid"]} rows={rows} />
      <PrintSurface className="report-print-root student-statement-print">
        <PrintDocumentHeader title="STUDENT STATEMENT OF ACCOUNT" subtitle={`School year: ${account.schoolYear}`} details={["Development sample data", `Prepared by: ${user.name}`]} />
        <div className="report-print-summary"><strong>Student:</strong> {student.name} · {student.number} · {student.grade} {student.section}<br /><strong>Total due:</strong> {format(account.totalDue)} · <strong>Total paid:</strong> {format(account.totalPaid)} · <strong>Balance:</strong> {format(account.balance)}</div>
        <PrintDocumentTable title="Installment schedule" headings={["Installment", "Due date", "Amount", "Paid"]} rightAlignColumns={[2, 3]} rows={scheduleRows} />
        <PrintDocumentTable title="Payments" headings={["Receipt", "Paid on", "Amount", "Applied"]} rightAlignColumns={[2, 3]} rows={paymentRows} />
        <PrintDocumentFooter preparedBy={user.name} />
      </PrintSurface>
    </>
  );
}
export function ReportPage({
  type,
  user,
}: {
  type: "daily" | "monthly" | "outstanding" | "statement";
  user: AuthenticatedUser;
}) {
  if (isLiveCashierApiEnabled()) {
    if (type === "daily") return <LiveDailyReport user={user} />;
    if (type === "outstanding") return <LiveOutstandingReport user={user} />;
    return <Card><p className="text-sm text-text-secondary">This report is unavailable until its live data source is connected.</p></Card>;
  }
  return <MockReportPage type={type} preparedBy={user.name} />;
}

function MockReportPage({
  type,
  preparedBy,
}: {
  type: "daily" | "monthly" | "outstanding" | "statement";
  preparedBy: string;
}) {
  const reportFilterDefaults = { query: "", category: "", grade: "", section: "", minimumBalance: "", status: "", reportDate: manilaDateInput() };
  const filters = useTableFilters(reportFilterDefaults);
  const reports = {
    daily: {
      printTitle: "DAILY COLLECTION REPORT",
      period: `Reporting date: ${formatDate(filters.applied.reportDate)}`,
      moneyColumns: [2, 3],
      title: "Daily collection",
      description:
        "Totals by method and cashier, with payments and voids separated.",
      filter: "date",
      headers: ["Section", "Cashier / method", "Count", "Amount"],
      rows: [
        ["Method total", "Cash", "2", "₱3,250.00"],
        ["Cashier total", "Casey Cashier (sample)", "2", "₱3,250.00"],
        ["Voids", "OR-2026-001007 pending", "1", "₱800.00"],
      ],
    },
    monthly: {
      printTitle: "MONTHLY FINANCIAL REPORT",
      period: `Reporting month: ${new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(`${filters.applied.reportDate}T00:00:00+08:00`))}`,
      moneyColumns: [2, 3],
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
      printTitle: "OUTSTANDING BALANCE REPORT",
      period: "All school years",
      moneyColumns: [2],
      title: "Outstanding",
      description:
        "Filter balances by grade, section, minimum balance, and overdue state.",
      filter: "outstanding",
      headers: ["Student", "Grade & section", "Balance", "Status"],
      rows: [
        [students[2]!.name, "Grade 9 - Pine", "₱8,500.00", "Overdue"],
        [students[1]!.name, "Grade 8 - Maple", "₱4,200.00", "Due soon"],
      ],
    },
    statement: {
      printTitle: "STUDENT STATEMENT OF ACCOUNT",
      period: "School year: SY 2026-2027",
      moneyColumns: [],
      title: "Student statement",
      description:
        "One student's fees, schedule, payments, and remaining balance.",
      filter: "date",
      headers: ["Item", "Due date", "Amount", "Paid"],
      rows: [],
    },
  } as const;
  const report = reports[type];
  const reportRows = report.rows.filter((row) => {
    const query = filters.applied.query.trim().toLowerCase();
    if (query && !row.some((value) => value.toLowerCase().includes(query))) return false;
    if (filters.applied.category && row[0] !== filters.applied.category) return false;
    if (type !== "outstanding") return true;
    const gradeSection = row[1]?.toLowerCase() ?? "";
    const balance = Number((row[2] ?? "").replace(/[^\d.]/g, ""));
    return (!filters.applied.grade || gradeSection.includes(filters.applied.grade.trim().toLowerCase()))
      && (!filters.applied.section || gradeSection.includes(filters.applied.section.trim().toLowerCase()))
      && (!filters.applied.minimumBalance || balance >= Number(filters.applied.minimumBalance))
      && (!filters.applied.status || row[3] === filters.applied.status);
  });
  const reportFilters = <TableFilters embedded scope={`Sample ${type} report`} defaults={reportFilterDefaults} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search report rows" }} fields={type === "outstanding" ? [
        { key: "grade", label: "Grade" }, { key: "section", label: "Section" },
        { key: "minimumBalance", label: "Minimum balance", type: "number", min: "0", step: "0.01" },
        { key: "status", label: "Status", type: "select", options: [{ value: "", label: "All statuses" }, { value: "Overdue", label: "Overdue" }, { value: "Due soon", label: "Due soon" }] },
      ] : [{ key: "reportDate", label: type === "monthly" ? "Reporting month" : "Reporting date", type: "date" }, { key: "category", label: type === "monthly" ? "Fee category" : type === "statement" ? "Item" : "Section", type: "select", options: [{ value: "", label: "All rows" }, ...(type === "statement" ? ["Tuition installment", "Payment OR-2026-001000", "Balance"].map((value) => ({ value, label: value })) : report.rows.map((row) => ({ value: row[0], label: row[0] }))) ] }]} onChange={filters.update} onSearch={filters.search} onApply={filters.apply} onClear={filters.clear} onRemove={filters.remove} />;
  return (
    <>
      <PageHeader
        title={report.title}
        description={report.description}
        backTo="/reports"
        action={
          <Button variant="secondary" onClick={() => void printDocumentWhenReady()}>
            <span className="inline-flex items-center gap-2"><PrinterIcon />Print Report</span>
          </Button>
        }
      />
      {type === "statement" ? (
        <StudentStatementTable toolbar={reportFilters} query={filters.applied.query} item={filters.applied.category} />
      ) : (
        <ListCard
          toolbar={reportFilters}
          headers={[...report.headers]}
          rows={reportRows.map((row) => [...row])}
        />
      )}
      <PrintSurface className="report-print-root">
        <PrintDocumentHeader title={report.printTitle} subtitle={report.period} details={["Development sample data", `Prepared by: ${preparedBy}`]} />
        {type === "statement"
          ? <section className="report-print-section"><StudentStatementTable query={filters.applied.query} item={filters.applied.category} /></section>
          : <PrintDocumentTable title={`${report.title} (${reportRows.length} rows)`} headings={[...report.headers]} rightAlignColumns={[...report.moneyColumns]} rows={reportRows.map((row) => [...row])} />}
        <PrintDocumentFooter preparedBy={preparedBy} />
      </PrintSurface>
    </>
  );
}

export function MockNotificationsPage({ user, workspaceSwitch }: { user: AuthenticatedUser; workspaceSwitch?: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const notificationRows = selectMockNotificationRows();
  const selectedEntry = notificationRows.find((row) => row.id === selectedEntryId) ?? null;
  const notificationStatusOptions = [
    { value: "all", label: "All statuses" },
    ...Array.from(new Set(notificationRows.map((row) => row.status))).map((status) => ({ value: status.toLowerCase(), label: status })),
  ];
  const selectedStatus = notificationStatusOptions.some(
    (option) => option.value === searchParams.get("status"),
  )
    ? searchParams.get("status")!
    : "all";
  const defaults = { query: "", status: "all", channel: "" };
  const filters = useTableFilters(defaults, { ...defaults, status: selectedStatus });
  const rows = notificationRows.filter((row) => (
    row.student.toLowerCase().includes(filters.applied.query.trim().toLowerCase())
    && (filters.applied.status === "all" || row.status.toLowerCase() === filters.applied.status)
    && (!filters.applied.channel || row.channel === filters.applied.channel)
  ));

  function updateStatusFilter(nextStatus: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextStatus === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", nextStatus);
    }
    setSearchParams(nextParams);
  }

  function applyNotificationFilters() { filters.apply(); updateStatusFilter(filters.draft.status); }
  function clearNotificationFilters() { filters.clear(); updateStatusFilter("all"); }
  function removeNotificationFilter(key: "query" | "status" | "channel") {
    filters.remove(key);
    if (key === "status") updateStatusFilter("all");
  }

  return (
    <>
      <PageHeader
        title="Follow-up"
        description="View email and SMS notification attempts, including any configured SMS load fee."
      />
      {workspaceSwitch}
      {can(user, "notification.retry") && <p role="status" className="mb-3 text-sm text-text-secondary">Reminder retry is unavailable until delivery policies are approved.</p>}
      <ListCard
        title="Notification log"
        toolbar={<TableFilters embedded scope="Sample notification log" defaults={defaults} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search student" }} fields={[
        { key: "status", label: "Status", type: "select", options: notificationStatusOptions },
        { key: "channel", label: "Channel", type: "select", options: [{ value: "", label: "All channels" }, { value: "Email", label: "Email" }, { value: "SMS", label: "SMS" }] },
      ]} onChange={filters.update} onSearch={filters.search} onApply={applyNotificationFilters} onClear={clearNotificationFilters} onRemove={removeNotificationFilter} />}
        headers={["Student", "Type", "Channel", "Recipient", "SMS load fee", "Status", "Attempts", "Actions"]}
        rows={rows.map((row) => [
          row.student,
          row.type,
          row.channel,
          row.recipient,
          row.loadFee,
          row.status,
          row.attempts,
          <Button key={`${row.id}-view`} type="button" variant="secondary" size="sm" onClick={() => setSelectedEntryId(row.id)}>View entry</Button>,
        ])}
      />
      <MockDialog open={selectedEntry !== null} onOpenChange={(open) => !open && setSelectedEntryId(null)} title="Notification entry">
        {selectedEntry && <><dl className="mt-4 grid gap-3 text-sm"><div><dt className="font-medium text-text-secondary">Student</dt><dd className="mt-1">{selectedEntry.student}</dd></div><div><dt className="font-medium text-text-secondary">Type</dt><dd className="mt-1 capitalize">{selectedEntry.type.replace(/_/g, " ")}</dd></div><div><dt className="font-medium text-text-secondary">Channel</dt><dd className="mt-1">{selectedEntry.channel}</dd></div><div><dt className="font-medium text-text-secondary">Recipient</dt><dd className="mt-1 break-all">{selectedEntry.recipient}</dd></div><div><dt className="font-medium text-text-secondary">Status</dt><dd className="mt-1">{selectedEntry.status}</dd></div><div><dt className="font-medium text-text-secondary">Attempts</dt><dd className="mt-1">{selectedEntry.attempts}</dd></div><div><dt className="font-medium text-text-secondary">Sent</dt><dd className="mt-1">{formatDateTime(selectedEntry.sentAt)}</dd></div></dl><div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={() => setSelectedEntryId(null)}>Close</Button></div></>}
      </MockDialog>
    </>
  );
}
export function ImportPage() {
  return <UnavailableFeaturePage title="Import" feature="Ledger import" />;
}

export function SettingsPage({
  section,
  editable,
  actorId,
}: {
  section: "fees" | "plans" | "school" | "receipt" | "email";
  editable: boolean;
  actorId?: string;
}) {
  if (isLiveCashierApiEnabled()) {
    const titles = {
      fees: "Fees",
      plans: "Plans",
      school: "School settings",
      receipt: "Receipts",
      email: "Notifications",
    } satisfies Record<typeof section, string>;

    if (section === "fees" || section === "plans") {
      return <LiveFinanceSettingsPage section={section} editable={editable} />;
    }
    return <UnavailableFeaturePage
      title={titles[section]}
      feature="System configuration"
    />;
  }
  const [addFeeOpen, setAddFeeOpen] = useState(false);
  const [addListItemOpen, setAddListItemOpen] = useState(false);
  const [listItemType, setListItemType] = useState<"schoolYear" | "term" | "examPeriod" | "gradeLevel" | "section">("schoolYear");
  const [listItemName, setListItemName] = useState("");
  const [schoolSupplementRows, setSchoolSupplementRows] = useState<[string, string, string][]>([
    ["Exam period", "Midterm starts Oct 15, 2026", "Active"],
    ["Payment method", "Cash only", "Active"],
  ]);
  const [feeSchoolYearId, setFeeSchoolYearId] = useState("");
  const [feeGradeLevel, setFeeGradeLevel] = useState("");
  const [feeName, setFeeName] = useState("");
  const [feeCategory, setFeeCategory] = useState("Tuition");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeRequired, setFeeRequired] = useState(true);
  const [feeError, setFeeError] = useState("");
  const [feeSavedMessage, setFeeSavedMessage] = useState("");
  const [editingFee, setEditingFee] = useState<{ scheduleId: string; itemId: string; schoolYear: string; gradeLevel: string } | null>(null);
  const [editingGrade, setEditingGrade] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ kind: "fee"; scheduleId: string; itemId: string; name: string } | { kind: "grade"; name: string } | null>(null);
  const [, setMockRevision] = useState(0);
  const mockState = getMockState();
  const gradeLevels = getMockGradeLevels();
  const archivedGrades = new Set(((mockState.config as { archivedGrades?: string[] }).archivedGrades ?? []).map((grade) => grade.toLocaleLowerCase()));
  const allGradeLevels = mockState.config.grades;
  const schoolYears = mockState.schoolYears;
  const gradeOrder = new Map(gradeLevels.map((grade, index) => [grade, index]));
  const feeRows = [...mockState.feeSchedules]
    .sort((left, right) => {
      const leftCurrent = schoolYears.find((year) => year.id === left.schoolYearId)?.current ? 0 : 1;
      const rightCurrent = schoolYears.find((year) => year.id === right.schoolYearId)?.current ? 0 : 1;
      return leftCurrent - rightCurrent
        || (gradeOrder.get(left.gradeLevel) ?? Number.MAX_SAFE_INTEGER) - (gradeOrder.get(right.gradeLevel) ?? Number.MAX_SAFE_INTEGER)
        || left.gradeLevel.localeCompare(right.gradeLevel);
    })
    .flatMap((schedule) => {
    const schoolYear = schoolYears.find((year) => year.id === schedule.schoolYearId)?.label ?? "Unavailable school year";
    return schedule.items.map((item) => ({
      scheduleId: schedule.id,
      itemId: item.id,
      schoolYear,
      gradeLevel: schedule.gradeLevel,
      description: `${item.name} - ${item.category} - ${format(centavos(item.amountCents))} - ${item.required ? "Required" : "Optional"}`,
      name: item.name,
      active: (item as { active?: boolean }).active !== false,
    }));
  });
  const schoolRows: [string, string, string][] = [
    ...schoolYears.map((year) => ["School year", `${year.label}${year.current ? " current" : ""}`, "Active"] as [string, string, string]),
    ...allGradeLevels.map((grade) => ["Grade level", grade, archivedGrades.has(grade.toLocaleLowerCase()) ? "Archived" : "Active"] as [string, string, string]),
    ...schoolSupplementRows,
  ];
  const effectiveActorId = actorId ?? (section === "fees" ? "user-accounting" : "user-admin");

  useEffect(() => subscribeToMockState(() => setMockRevision((revision) => revision + 1)), []);
  const settings = {
    fees: {
      title: "Fees",
      description:
        "New fee items update matching existing accounts and future accounts.",
      action: "Add fee item",
      headers: ["School year", "Grade level", "Fee item", "Status"],
      rows: feeRows,
    },
    plans: {
      title: "Plans",
      description:
        "Plan changes apply to new accounts only; preview schedules before saving.",
      action: "Add plan",
      headers: ["Plan", "Down payment", "Installments", "Status"],
      rows: [
        ["Monthly", "₱2,000.00", "8 due dates", "Active"],
        ["Quarterly", "25%", "4 due dates", "Active"],
      ],
    },
    school: {
      title: "School settings",
      description:
        "Manage school year, terms, exam periods, grades, sections, and payment methods.",
      action: "Add list item",
      headers: ["List", "Current value", "Status"],
      rows: schoolRows,
    },
    receipt: {
      title: "Receipts",
      description:
        "Set school header, receipt title, and configured paper size.",
      action: "Edit receipt settings",
      headers: ["Setting", "Current value", "Status"],
      rows: [
        ["Receipt title", "Acknowledgment Receipt", "Active"],
        ["Paper size", "Letter", "Active"],
        ["Next receipt number", "OR-2026-001011", "Read-only"],
      ],
    },
    email: {
      title: "Notifications",
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
  const mockActionAvailable = section === "fees" || section === "school";

  function openFeeDialog() {
    setFeeSchoolYearId(mockState.config.currentSchoolYearId || schoolYears[0]?.id || "");
    setFeeGradeLevel("");
    setFeeName("");
    setFeeCategory("Tuition");
    setFeeAmount("");
    setFeeRequired(true);
    setFeeError("");
    setFeeSavedMessage("");
    setAddFeeOpen(true);
  }

  function addFeeItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!feeGradeLevel) throw new Error("Select a configured grade level.");
      createMockFeeItem({
        schoolYearId: feeSchoolYearId,
        gradeLevel: feeGradeLevel,
        name: feeName,
        category: feeCategory,
        amountCents: parseMoney(feeAmount),
        required: feeRequired,
      }, effectiveActorId);
      setFeeSavedMessage(`Fee item saved for ${feeGradeLevel}. Matching existing billing accounts were updated.`);
      setAddFeeOpen(false);
    } catch (cause) {
      setFeeError(cause instanceof Error ? cause.message : "The fee item could not be saved.");
    }
  }

  function openFeeEditor(target: typeof feeRows[number]) {
    const item = mockState.feeSchedules.find((schedule) => schedule.id === target.scheduleId)?.items.find((candidate) => candidate.id === target.itemId);
    if (!item) return;
    setFeeName(item.name);
    setFeeCategory(item.category);
    setFeeAmount(String(item.amountCents / 100));
    setFeeRequired(item.required);
    setFeeGradeLevel(target.gradeLevel);
    setFeeError("");
    setEditingFee({ scheduleId: target.scheduleId, itemId: target.itemId, schoolYear: target.schoolYear, gradeLevel: target.gradeLevel });
  }

  function saveFeeEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingFee) return;
    try {
      updateMockFeeItem(editingFee.scheduleId, editingFee.itemId, { name: feeName, category: feeCategory, amountCents: parseMoney(feeAmount), required: feeRequired, applyToAll: feeGradeLevel === "All" }, effectiveActorId);
      setFeeSavedMessage(`Fee item updated for ${feeGradeLevel === "All" ? "all grades" : editingFee.gradeLevel}.`);
      setEditingFee(null);
    } catch (cause) {
      setFeeError(cause instanceof Error ? cause.message : "The fee item could not be updated.");
    }
  }

  function saveGradeEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingGrade) return;
    try {
      updateMockGradeLevel(editingGrade, listItemName, effectiveActorId);
      setFeeSavedMessage(`Grade level renamed to ${listItemName.trim()}.`);
      setEditingGrade(null);
      setListItemName("");
    } catch (cause) {
      setFeeError(cause instanceof Error ? cause.message : "The grade level could not be updated.");
    }
  }

  function archiveSettingItem() {
    if (!archiveTarget) return;
    try {
      if (archiveTarget.kind === "fee") archiveMockFeeItem(archiveTarget.scheduleId, archiveTarget.itemId, effectiveActorId);
      else archiveMockGradeLevel(archiveTarget.name, effectiveActorId);
      setFeeSavedMessage(`${archiveTarget.kind === "fee" ? "Fee item" : "Grade level"} archived. Existing records are retained.`);
      setArchiveTarget(null);
    } catch (cause) {
      setFeeError(cause instanceof Error ? cause.message : "The item could not be archived.");
      setArchiveTarget(null);
    }
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
    }[listItemType]! as [string, string, string];

    try {
      if (listItemType === "schoolYear") createMockSchoolYear(name, isCurrent, effectiveActorId);
      else if (listItemType === "gradeLevel") createMockGradeLevel(name, effectiveActorId);
      else setSchoolSupplementRows((rows) => [...rows, listItem]);
    } catch {
      return;
    }
    setListItemType("schoolYear");
    setListItemName("");
    setAddListItemOpen(false);
  }

  return (
    <>
      <PageHeader
        title={current.title}
        description={current.description}
        action={editable && mockActionAvailable ? (
          <Button type="button" onClick={() => {
            if (section === "fees") openFeeDialog();
            if (section === "school") setAddListItemOpen(true);
          }}>
            {current.action}
          </Button>
        ) : undefined}
      />
      <SectionTabs items={section === "fees" || section === "plans" ? [
        { label: "Fees", to: "/settings/fees", active: section === "fees" },
        { label: "Plans", to: "/settings/plans", active: section === "plans" },
      ] : [
        { label: "School", to: "/settings/school", active: section === "school" },
        { label: "Receipt", to: "/settings/receipt", active: section === "receipt" },
        { label: "Email", to: "/settings/email", active: section === "email" },
      ]} />
      <Card>
        <p className="text-sm text-text-secondary">
          {editable && mockActionAvailable
            ? "Changes are prepared in this mock screen and would be audited by the backend."
            : editable
              ? "Editing is not available for this mock section."
              : "You have read-only access to these settings."}
        </p>
        <ListCard
          className="mt-4"
          headers={editable && mockActionAvailable ? [...current.headers, "Actions"] : [...current.headers]}
          paginate={section === "fees" ? { label: "fee items", fixedPageSize: true } : undefined}
          columnClassNames={section === "fees" ? ["w-[20%]", "w-[14%]", "w-[36%]", "w-[12%]", editable ? "w-[18%]" : ""] : []}
          rows={section === "fees"
            ? feeRows.map((row) => [
              row.schoolYear,
              row.gradeLevel,
              row.description,
              row.active ? "Active" : "Archived",
              ...(editable ? [row.active ? <div key={row.itemId} className="flex flex-wrap justify-center gap-2"><Button type="button" variant="secondary" size="sm" onClick={() => openFeeEditor(row)}>Edit</Button><Button type="button" variant="destructive" size="sm" onClick={() => setArchiveTarget({ kind: "fee", scheduleId: row.scheduleId, itemId: row.itemId, name: row.name })}>Archive</Button></div> : "—"] : []),
            ])
            : (current.rows as ReadonlyArray<readonly string[]>).map((row) => [
              ...row,
              ...(editable && section === "school" ? [row[0] === "Grade level" && row[2] !== "Archived" ? <div key={row[1]} className="flex flex-wrap justify-center gap-2"><Button type="button" variant="secondary" size="sm" onClick={() => { setEditingGrade(row[1]!); setListItemName(row[1]!); setFeeError(""); }}>Edit</Button><Button type="button" variant="destructive" size="sm" onClick={() => setArchiveTarget({ kind: "grade", name: row[1]! })}>Archive</Button></div> : "—"] : []),
            ])}
          centeredColumns={
            section === "fees"
              || section === "plans"
              || section === "school"
              || section === "receipt"
              || section === "email"
              ? editable && mockActionAvailable ? [current.headers.length - 1, current.headers.length] : [current.headers.length - 1]
              : []
          }
        />
        {feeSavedMessage && <p role="status" className="mt-4 text-sm text-status-success">{feeSavedMessage}</p>}
      </Card>
      {section === "fees" && editable && (
        <MockDialog open={addFeeOpen} onOpenChange={(open) => { setAddFeeOpen(open); if (!open) setFeeError(""); }} title="Add fee item">
          <form className="mt-4 space-y-4" onSubmit={addFeeItem}>
            <p className="text-sm text-text-secondary">
              The fee item will update matching existing accounts and be available to future accounts.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                School year
                <span className="mt-1 block"><DropdownSelect aria-label="School year" value={feeSchoolYearId} options={[{ value: "", label: "Select school year" }, ...schoolYears.map((year) => ({ value: year.id, label: year.label }))]} onChange={(value) => { setFeeSchoolYearId(value); setFeeError(""); }} disabled={schoolYears.length === 0} className="w-full" align="start" /></span>
              </label>
              <label className="block text-sm font-medium">
                Grade level
                <span className="mt-1 block"><DropdownSelect aria-label="Grade level" value={feeGradeLevel} options={[{ value: "", label: "Select grade level" }, { value: "All", label: "All grades" }, ...asDropdownOptions(gradeLevels)]} onChange={(value) => { setFeeGradeLevel(value); setFeeError(""); }} disabled={gradeLevels.length === 0} className="w-full" align="start" /></span>
              </label>
            </div>
            {gradeLevels.length === 0 && <p role="status" className="rounded-md border border-status-warning bg-status-warning/5 p-3 text-sm text-text-primary">No grade levels configured. Add grade levels in School Settings before creating fee items.</p>}
            <label className="block text-sm font-medium" htmlFor="fee-name">
              Fee item name
              <input id="fee-name" name="name" required className={inputClass} value={feeName} onChange={(event) => { setFeeName(event.target.value); setFeeError(""); }} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Category
                <span className="mt-1 block"><DropdownSelect aria-label="Category" value={feeCategory} options={asDropdownOptions(["Tuition", "Miscellaneous", "Other"])} onChange={(value) => { setFeeCategory(value); setFeeError(""); }} className="w-full" align="start" /></span>
              </label>
              <label className="block text-sm font-medium" htmlFor="fee-amount">
                Amount
                <input id="fee-amount" name="amount" type="number" min="0.01" step="0.01" required className={inputClass} value={feeAmount} onChange={(event) => { setFeeAmount(event.target.value); setFeeError(""); }} />
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Account requirement</legend>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input name="requirement" type="radio" value="required" checked={feeRequired} onChange={() => setFeeRequired(true)} />Required</label>
                <label className="flex items-center gap-2"><input name="requirement" type="radio" value="optional" checked={!feeRequired} onChange={() => setFeeRequired(false)} />Optional</label>
              </div>
            </fieldset>
            {feeError && <p role="alert" className="text-sm text-status-error">{feeError}</p>}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setAddFeeOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={schoolYears.length === 0 || gradeLevels.length === 0}>Save fee item</Button>
            </div>
          </form>
        </MockDialog>
      )}
      {section === "fees" && editable && (
        <MockDialog open={editingFee !== null} onOpenChange={(open) => { if (!open) { setEditingFee(null); setFeeError(""); } }} title="Edit fee item">
          <form className="mt-4 space-y-4" onSubmit={saveFeeEdit}>
            <p className="text-sm text-text-secondary">Revisions preserve existing account terms. Choose All grades to update this fee across the school year.</p>
            <label className="block text-sm font-medium">Apply to<span className="mt-1 block"><DropdownSelect aria-label="Apply to" value={feeGradeLevel} options={[{ value: editingFee?.gradeLevel ?? "", label: editingFee?.gradeLevel ?? "Selected grade" }, { value: "All", label: "All grades" }]} onChange={(value) => { setFeeGradeLevel(value); setFeeError(""); }} className="w-full" align="start" /></span></label>
            <label className="block text-sm font-medium" htmlFor="edit-fee-name">Fee item name<input id="edit-fee-name" required className={inputClass} value={feeName} onChange={(event) => { setFeeName(event.target.value); setFeeError(""); }} /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Category<span className="mt-1 block"><DropdownSelect aria-label="Edit category" value={feeCategory} options={asDropdownOptions(["Tuition", "Miscellaneous", "Other"])} onChange={(value) => { setFeeCategory(value); setFeeError(""); }} className="w-full" align="start" /></span></label><label className="block text-sm font-medium" htmlFor="edit-fee-amount">Amount<input id="edit-fee-amount" type="number" min="0.01" step="0.01" required className={inputClass} value={feeAmount} onChange={(event) => { setFeeAmount(event.target.value); setFeeError(""); }} /></label></div>
            <fieldset><legend className="text-sm font-medium">Account requirement</legend><div className="mt-2 flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input name="edit-requirement" type="radio" checked={feeRequired} onChange={() => setFeeRequired(true)} />Required</label><label className="flex items-center gap-2"><input name="edit-requirement" type="radio" checked={!feeRequired} onChange={() => setFeeRequired(false)} />Optional</label></div></fieldset>
            {feeError && <p role="alert" className="text-sm text-status-error">{feeError}</p>}
            <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setEditingFee(null)}>Cancel</Button><Button type="submit">Save changes</Button></div>
          </form>
        </MockDialog>
      )}
      {section === "school" && editable && (
        <MockDialog open={editingGrade !== null} onOpenChange={(open) => { if (!open) { setEditingGrade(null); setFeeError(""); } }} title="Edit grade level">
          <form className="mt-4 space-y-4" onSubmit={saveGradeEdit}><p className="text-sm text-text-secondary">This updates the configured grade label and its linked mock records.</p><label className="block text-sm font-medium" htmlFor="edit-grade-name">Grade level name<input id="edit-grade-name" required className={inputClass} value={listItemName} onChange={(event) => { setListItemName(event.target.value); setFeeError(""); }} /></label>{feeError && <p role="alert" className="text-sm text-status-error">{feeError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setEditingGrade(null)}>Cancel</Button><Button type="submit">Save changes</Button></div></form>
        </MockDialog>
      )}
      {(section === "fees" || section === "school") && editable && (
        <MockDialog open={archiveTarget !== null} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }} title={`Archive ${archiveTarget?.kind === "fee" ? "fee item" : "grade level"}?`} emphasis>
          <div className="mt-3"><p className="text-sm text-text-secondary">{archiveTarget?.name} will no longer be available for new configuration. Existing billing records and audit history are retained.</p><div className="mt-5 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setArchiveTarget(null)}>Cancel</Button><Button type="button" variant="destructive" onClick={archiveSettingItem}>Archive {archiveTarget?.kind === "fee" ? "fee item" : "grade level"}</Button></div></div>
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
                <select id="list-item-grade-level" name="gradeLevel" className={inputClass} defaultValue={gradeLevels[0] ?? ""}>
                  <option value="">Select grade level</option>
                  {gradeLevels.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
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
              <Button type="submit">Add list item</Button>
            </div>
          </form>
        </MockDialog>
      )}
    </>
  );
}
export function UsersPage({ user }: { user?: AuthenticatedUser }) {
  if (isLiveCashierApiEnabled() && user) return <LiveUsersPage user={user} />;
  const defaultCreateRole: Role = user?.role === "super_admin" ? "administrator" : "cashier";
  const createRoles: Role[] = user?.role === "super_admin"
    ? ["administrator", "cashier", "auditor", "registrar"]
    : ["cashier", "auditor", "registrar"];
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createRole, setCreateRole] = useState<Role>(defaultCreateRole);
  const filters = useTableFilters({ query: "", role: "", status: "" });
  const [users, setUsers] = useState(() => selectMockStaffUsers()
    .filter((staff) => staff.role !== "super_admin" || user?.role === "super_admin")
    .sort((left, right) => ["administrator", "cashier", "accounting", "auditor", "registrar", "super_admin"].indexOf(left.role) - ["administrator", "cashier", "accounting", "auditor", "registrar", "super_admin"].indexOf(right.role))
    .map((staff) => ({
      ...staff,
      role: roleLabel(staff.role),
      isCurrentAdministrator: staff.id === (user?.id ?? "user-admin"),
    })));
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>("cashier");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<(typeof users)[number] | null>(null);
  const [statusTarget, setStatusTarget] = useState<(typeof users)[number] | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<(typeof users)[number] | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<(typeof users)[number] | null>(null);
  const [archivedView, setArchivedView] = useState(false);
  const editingUser = users.find((user) => user.id === editingUserId) ?? null;
  const normalizedSearchQuery = filters.applied.query.trim().toLocaleLowerCase();
  const visibleUsers = users.filter((user) => (
    (!normalizedSearchQuery
    || user.name.toLocaleLowerCase().includes(normalizedSearchQuery)
    || user.username.toLocaleLowerCase().includes(normalizedSearchQuery))
    && (!filters.applied.role || user.role === filters.applied.role)
    && (!filters.applied.status || (user.active ? "Active" : "Inactive") === filters.applied.status)
    && (archivedView ? Boolean(user.archivedAt) : !user.archivedAt)
  ));

  function closeEditDialog() {
    setEditingUserId(null);
    setEditRole("cashier");
    setStatusTarget(null);
  }

  function createMockUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("fullName") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    if (users.some((existingUser) => existingUser.username.toLocaleLowerCase() === username.toLocaleLowerCase())) {
      setCreateError("That username is already in use.");
      return;
    }
    let createdUser;
    try {
      createdUser = createMockStaffUser({ name, username, role: createRole });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "The user could not be created.");
      return;
    }
    setUsers((currentUsers) => [...currentUsers, {
      ...createdUser,
      role: roleLabel(createdUser.role),
      isCurrentAdministrator: false,
    }]);
    setCreateError("");
    setCreated(true);
  }

  function saveUserDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    const formData = new FormData(event.currentTarget);
    const nextRole = editingUser.isCurrentAdministrator ? "administrator" : editRole;
    if (editingUser.isCurrentAdministrator && editRole !== "administrator") {
      setCreateError("You cannot change your own administrator role.");
      return;
    }
    const updated = updateMockStaffUser(editingUser.id, {
      name: String(formData.get("fullName") ?? editingUser.name),
      role: nextRole,
    });
    setUsers((currentUsers) => currentUsers.map((currentUser) => (
      currentUser.id === updated.id ? { ...currentUser, name: updated.name, role: roleLabel(updated.role) } : currentUser
    )));
  }

  function openEdit(user: (typeof users)[number]) {
    setEditingUserId(user.id);
    setEditRole((Object.entries({ administrator: "Administrator", cashier: "Cashier", accounting: "Accounting Officer", auditor: "Auditor", registrar: "Registrar", super_admin: "Super Admin" }) as Array<[Role, string]>).find(([, label]) => label === user.role)?.[0] ?? "cashier");
  }

  function resetPassword(target: (typeof users)[number]) {
    setTemporaryPassword("SampleReset123!");
    setResetTarget(target);
  }

  function updateAccountState() {
    if (!statusTarget) return;
    if (statusTarget.isCurrentAdministrator) return;
    if (statusTarget.role === "Administrator" && statusTarget.active && users.filter((item) => item.role === "Administrator" && item.active && !item.archivedAt).length <= 1) {
      setCreateError("The last active administrator cannot be deactivated.");
      return;
    }
    const updated = updateMockStaffUser(statusTarget.id, { active: !statusTarget.active });
    setUsers((currentUsers) => currentUsers.map((currentUser) => (
      currentUser.id === updated.id ? { ...currentUser, active: updated.active } : currentUser
    )));
    setStatusTarget(null);
  }

  function archiveUser() {
    if (!archiveTarget) return;
    try {
      const archived = archiveMockStaffUser(archiveTarget.id, user?.id ?? "user-admin");
      setUsers((currentUsers) => currentUsers.map((currentUser) => currentUser.id === archived.id ? { ...currentUser, active: archived.active, archivedAt: archived.archivedAt, anonymizeAt: archived.anonymizeAt } : currentUser));
      setArchiveTarget(null);
      closeEditDialog();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "The account could not be archived.");
    }
  }

  function restoreUser() {
    if (!restoreTarget) return;
    const restored = restoreMockStaffUser(restoreTarget.id, user?.id ?? "user-admin");
    setUsers((currentUsers) => currentUsers.map((currentUser) => currentUser.id === restored.id ? { ...currentUser, active: restored.active, archivedAt: restored.archivedAt, anonymizeAt: restored.anonymizeAt } : currentUser));
    setRestoreTarget(null);
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Create, search, edit, archive, deactivate, reactivate, or reset user accounts."
        action={
          <Button onClick={() => { setCreated(false); setCreateError(""); setCreateRole(defaultCreateRole); setCreateOpen(true); }}>Create user</Button>
        }
      />
      <ViewTabs label="User account view" className="mb-4" items={[
        { key: "current", label: "Current users", selected: !archivedView, onSelect: () => setArchivedView(false) },
        { key: "archived", label: "Archived users", selected: archivedView, onSelect: () => setArchivedView(true) },
      ]} />
        <ListCard
          key={archivedView ? "archived" : "current"}
          className="animate-screen-in motion-reduce:animate-none"
          toolbar={<TableFilters embedded scope="Sample users" defaults={{ query: "", role: "", status: "" }} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search users", placeholder: "Name or username" }} fields={[
        { key: "role", label: "Role", type: "select", options: [{ value: "", label: "All roles" }, { value: "Administrator", label: "Administrator" }, { value: "Cashier", label: "Cashier" }, { value: "Accounting Officer", label: "Accounting Officer" }, { value: "Auditor", label: "Auditor" }, { value: "Registrar", label: "Registrar" }, ...(user?.role === "super_admin" ? [{ value: "Super Admin", label: "Super Admin" }] : [])] },
        ...(archivedView ? [] : [{ key: "status" as const, label: "Status", type: "select" as const, options: [{ value: "", label: "All statuses" }, { value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }] }]),
      ]} onChange={filters.update} onSearch={filters.search} onApply={filters.apply} onClear={filters.clear} onRemove={filters.remove} />}
          paginate={{ label: "users" }}
          empty={<p role="status" className="text-sm text-text-secondary">{archivedView ? "No archived users match that search." : "No users match that name or username."}</p>}
          headers={archivedView ? ["Name", "Username", "Role", "Archived", "Scheduled anonymization", "Action"] : ["Name", "Username", "Role", "State", "Actions"]}
          tableClassName="min-w-[1000px]"
          columnClassNames={archivedView ? ["w-[22%]", "w-[16%]", "w-[18%]", "w-[15%]", "w-[19%]", "w-[10%]"] : ["w-[21%]", "w-[16%]", "w-[19%]", "w-[12%]", "w-[32%]"]}
          centeredColumns={archivedView ? [3, 4, 5] : [3, 4]}
          rows={visibleUsers.map((user) => [
            user.name,
            user.username,
            user.role,
            ...(archivedView ? [
              user.archivedAt?.slice(0, 10) ?? "Unavailable",
              user.anonymizeAt?.slice(0, 10) ?? "Unavailable",
              <Button key={`${user.id}-restore`} type="button" variant="secondary" size="sm" className="min-h-control" onClick={() => setRestoreTarget(user)}>Restore</Button>,
            ] : [
              <StatusBadge key={`${user.id}-state`} status={user.active ? "Active" : "Inactive"} />,
              <div key={`${user.id}-actions`} className="flex flex-nowrap justify-center gap-2 whitespace-nowrap"><Button type="button" variant="secondary" size="sm" className="min-h-control shrink-0" onClick={() => openEdit(user)}>Edit</Button><Button type="button" variant="secondary" size="sm" className="min-h-control shrink-0" onClick={() => resetPassword(user)}>Reset password</Button><Button type="button" variant={user.active ? "destructive" : "secondary"} size="sm" className="min-h-control shrink-0" disabled={user.isCurrentAdministrator} onClick={() => setStatusTarget(user)}>{user.active ? "Deactivate account" : "Reactivate account"}</Button></div>,
            ]),
          ])}
        />
      <Card className="mt-5">
        <p className="text-sm text-text-secondary">
          Temporary passwords are shown once after creation or reset. An
          administrator cannot deactivate themselves or the last active
          administrator.
        </p>
      </Card>
      <MockDialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setCreateError(""); setCreated(false); } }} title="Create user">
        {created ? (
          <div className="mt-3">
            <p role="status" className="font-medium text-brand-green-dark">User created.</p>
            <p className="mt-2 text-sm text-text-secondary">Temporary password (show once): SampleStart123!</p>
            <div className="mt-4 flex justify-end"><Button type="button" onClick={() => setCreateOpen(false)}>Done</Button></div>
          </div>
        ) : (
          <form className="mt-3 space-y-3" onSubmit={createMockUser}>
            <label className="block text-sm font-medium">Name <span aria-hidden="true" className="text-status-error">*</span><input aria-label="Name" name="fullName" required maxLength={255} className={inputClass} /></label>
            <label className="block text-sm font-medium">Username <span aria-hidden="true" className="text-status-error">*</span><input aria-label="Username" name="username" required maxLength={100} autoCapitalize="none" className={inputClass} /></label>
            <label className="block text-sm font-medium">Primary role<DropdownSelect aria-label="Primary role" value={createRole} options={createRoles.map((role) => ({ value: role, label: roleLabel(role) }))} onChange={setCreateRole} className="mt-1 w-full" align="start" /></label>
            {createError && <p role="alert" className="text-sm text-status-error">{createError}</p>}
            <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit">Create user</Button></div>
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
                <span className="mt-1 block"><DropdownSelect aria-label="Primary role" value={editRole} options={[...new Set([...createRoles, editRole])].map((role) => ({ value: role, label: roleLabel(role) }))} onChange={setEditRole} disabled={editingUser.isCurrentAdministrator} className="w-full" align="start" /></span>
                {editingUser.isCurrentAdministrator && <span className="mt-1 block text-sm text-text-secondary">You cannot change your own administrator role.</span>}
              </label>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="destructive" disabled={editingUser.isCurrentAdministrator} onClick={() => setArchiveTarget(editingUser)}>Archive account</Button>
                <Button type="button" variant="neutral" onClick={closeEditDialog}>Cancel</Button>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </div>
        )}
      </MockDialog>
      <MockDialog open={resetTarget !== null} onOpenChange={(open) => { if (!open) { setResetTarget(null); setTemporaryPassword(null); } }} title="Password reset">
        <div className="mt-3">
          <p role="status" className="font-medium text-brand-green-dark">Password reset complete.</p>
          <p className="mt-1 text-sm text-text-secondary">Temporary password for {resetTarget?.name} (shown once): <span className="font-medium text-text-primary">{temporaryPassword}</span></p>
          <div className="mt-4 flex justify-end"><Button type="button" onClick={() => { setResetTarget(null); setTemporaryPassword(null); }}>Done</Button></div>
        </div>
      </MockDialog>
      <MockDialog
        open={statusTarget !== null}
        onOpenChange={(open) => { if (!open) setStatusTarget(null); }}
        title={statusTarget?.active ? "Deactivate account?" : "Reactivate account?"}
      >
        <div className="mt-3">
          <p className="text-sm text-text-secondary">
            {statusTarget?.active ? `${statusTarget.name} will no longer be able to sign in. Their account history will remain available.` : `${statusTarget?.name} will be able to sign in again.`}
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button type="button" variant={statusTarget?.active ? "destructive" : "primary"} onClick={updateAccountState}>{statusTarget?.active ? "Deactivate account" : "Reactivate account"}</Button>
          </div>
        </div>
      </MockDialog>
      <MockDialog open={archiveTarget !== null} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }} title="Archive account?" emphasis>
        <div className="mt-3"><p className="text-sm text-text-secondary">{archiveTarget?.name} will lose sign-in access immediately. This MockDB account can be restored for 30 days before its identifying details are anonymized.</p><div className="mt-5 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setArchiveTarget(null)}>Cancel</Button><Button type="button" variant="destructive" onClick={archiveUser}>Archive account</Button></div></div>
      </MockDialog>
      <MockDialog open={restoreTarget !== null} onOpenChange={(open) => { if (!open) setRestoreTarget(null); }} title="Restore account?">
        <div className="mt-3"><p className="text-sm text-text-secondary">{restoreTarget?.name} will be reactivated and can sign in again.</p><div className="mt-5 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setRestoreTarget(null)}>Cancel</Button><Button type="button" onClick={restoreUser}>Restore account</Button></div></div>
      </MockDialog>
    </>
  );
}
export function RolesPage() {
  const roles: { role: Role; label: string }[] = [
    { role: "super_admin", label: "Super Admin" },
    { role: "administrator", label: "Administrator" },
    { role: "cashier", label: "Cashier" },
    { role: "accounting", label: "Accounting Officer" },
    { role: "auditor", label: "Auditor" },
    { role: "registrar", label: "Registrar" },
  ];
  const permissions: { area: string; action: string; capability: Capability }[] = [
    { area: "Dashboard", action: "View dashboard", capability: "dashboard.view" },
    { area: "Students", action: "View student records", capability: "student.view" },
    { area: "Students", action: "Edit student records", capability: "student.edit" },
    { area: "Guardian details", action: "View contact details", capability: "guardianContact.view" },
    { area: "Billing accounts", action: "View accounts", capability: "account.view" },
    { area: "Billing accounts", action: "Create accounts", capability: "account.create" },
    { area: "Payments", action: "View payment history", capability: "payment.view" },
    { area: "Payments", action: "Record payments", capability: "payment.record" },
    { area: "Payments", action: "Request payment voids", capability: "payment.void.request" },
    { area: "Payments", action: "Review payment voids", capability: "payment.void.view" },
    { area: "Payments", action: "Approve payment voids", capability: "payment.void.approve" },
    { area: "Receipts", action: "Reprint receipts", capability: "receipt.reprint" },
    { area: "Follow-up", action: "View overdue follow-up", capability: "followup.view" },
    { area: "Follow-up", action: "Send reminders", capability: "followup.send" },
    { area: "Reports", action: "View reports", capability: "report.view" },
    { area: "Reports", action: "Print student statements", capability: "statement.print" },
    { area: "Finance settings", action: "View fee and plan settings", capability: "settings.finance.view" },
    { area: "Finance settings", action: "Manage finance settings", capability: "settings.finance.manage" },
    { area: "System settings", action: "View system settings", capability: "settings.system.view" },
    { area: "System settings", action: "Manage system settings", capability: "settings.system.manage" },
    { area: "Users and security", action: "Manage user accounts", capability: "user.manage" },
    { area: "Users and security", action: "Review security events", capability: "security.events.view" },
    { area: "Audit", action: "View audit history", capability: "audit.view" },
    { area: "Notifications", action: "View notification log", capability: "notification.view" },
    { area: "Notifications", action: "Retry failed notifications", capability: "notification.retry" },
    { area: "Close-out", action: "Submit cashier close-out", capability: "closeout.submit" },
    { area: "Close-out", action: "Review and sign off close-out", capability: "closeout.signoff" },
    { area: "Close-out", action: "View close-out history", capability: "closeout.view" },
    { area: "Operations", action: "Manage backups", capability: "backup.manage" },
  ];
  const roleUsers = roles.map(({ role, label }) => ({ id: `role-${role}`, name: label, role }));

  return (
    <>
      <PageHeader
        title="Roles"
        description="Current interface access by role. The server enforces permissions for every request."
      />
      <Card className="overflow-x-auto" tabIndex={0}>
        <p className="mb-4 text-sm text-text-secondary">Allowed indicates a role capability. Some workflows remain unavailable until their live APIs are ready; API permission checks remain authoritative.</p>
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead><tr className="border-b border-border text-xs font-semibold text-text-secondary">
            <th scope="col" className="px-3 py-2">Area</th>
            <th scope="col" className="px-3 py-2">Action</th>
            {roles.map(({ role, label }) => <th key={role} scope="col" className="px-3 py-2">{label}</th>)}
          </tr></thead>
          <tbody>{permissions.map(({ area, action, capability }) => <tr key={`${area}-${capability}`} className="border-b last:border-0">
            <th scope="row" className="px-3 py-2 font-medium">{area}</th>
            <td className="px-3 py-2">{action}</td>
            {roleUsers.map((user) => <td key={user.role} className="px-3 py-2">{can(user, capability) ? "Allowed" : "Unavailable"}</td>)}
          </tr>)}</tbody>
        </table>
      </Card>
    </>
  );
}export function AuditPage({ security = false }: { user: AuthenticatedUser; security?: boolean }) {
  if (isLiveCashierApiEnabled()) return security ? <LiveAdminLog /> : <LiveAuditLog />;
  const filters = useTableFilters({ query: "", event: "" });
  const [selectedChange, setSelectedChange] = useState<{ receipt: string; action: string; before: string; after: string } | null>(null);
  const matchesAuditRow = (row: string[]) => row.some((value) => value.toLowerCase().includes(filters.applied.query.trim().toLowerCase()))
    && (!filters.applied.event || row.some((value) => value.toLowerCase().includes(filters.applied.event.toLowerCase())));
  const filterBar = <TableFilters embedded={security} scope={security ? "Sample security log" : "Sample audit log"} defaults={{ query: "", event: "" }} draft={filters.draft} applied={filters.applied} search={{ key: "query", label: "Search log entries" }} fields={[{ key: "event", label: "Event", type: "select", options: security
    ? [{ value: "", label: "All events" }, { value: "Sign-in", label: "Sign-in" }, { value: "Sign-out", label: "Sign-out" }, { value: "Password reset", label: "Password reset" }, { value: "deactivated", label: "Deactivation" }, { value: "reactivated", label: "Reactivation" }]
    : [{ value: "", label: "All events" }, { value: "payment", label: "Payment" }, { value: "void", label: "Void" }, { value: "sign-off", label: "Close-out sign-off" }] }]} onChange={filters.update} onSearch={filters.search} onApply={filters.apply} onClear={filters.clear} onRemove={filters.remove} />;
  if (security)
    return (
      <>
        <PageHeader
        title="Security events"
          description="Review authentication and account-administration events. Entries cannot be changed or deleted."
        />
        <ListCard
        toolbar={filterBar}
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
          ].filter(matchesAuditRow)}
        />
      </>
    );
  return (
    <>
      <PageHeader
        title="Audit"
        description="Read-only review of authorized financial history, void decisions, close-out records, and audit events."
      />
      {filterBar}
      <div className="space-y-5">
          <ListCard
            title="Transaction and void history"
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
            ].filter(matchesAuditRow)}
          />
          <ListCard
            title="Close-out reconciliation history"
            headers={["Business date", "Cashier", "Variance", "Review state"]}
            rows={[
              [
                "Sep 27, 2026",
                "Casey Cashier (sample)",
                "₱0.00",
                "Awaiting sign-off",
              ],
            ].filter(matchesAuditRow)}
          />
          <ListCard
            title="Recorded changes"
            headers={["When", "User", "Action", "Entity", "Details"]}
            rows={[
              { when: "Sep 27, 2026, 9:00 AM", user: "Casey Cashier (sample)", action: "Recorded payment", receipt: "OR-2026-001000", before: "Balance: ₱2,500.00", after: "Balance: ₱1,250.00" },
              { when: "Sep 27, 2026, 8:30 AM", user: "Avery Accounting (sample)", action: "Reviewed void request", receipt: "OR-2026-001001", before: "Void state: Pending", after: "Void state: Pending review" },
            ].filter((change) => matchesAuditRow([change.when, change.user, change.action, change.receipt, change.before, change.after])).map((change) => [
              change.when,
              change.user,
              change.action,
              change.receipt,
              <Button key={`${change.receipt}-view`} type="button" variant="secondary" size="sm" onClick={() => setSelectedChange(change)}>View change</Button>,
            ])}
          />
      </div>
      <MockDialog open={selectedChange !== null} onOpenChange={(open) => !open && setSelectedChange(null)} title="Recorded change">
        {selectedChange && <><dl className="mt-3 grid gap-3 text-sm"><div><dt className="font-medium text-text-secondary">Before</dt><dd className="mt-1">{selectedChange.before}</dd></div><div><dt className="font-medium text-text-secondary">After</dt><dd className="mt-1">{selectedChange.after}</dd></div></dl><div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={() => setSelectedChange(null)}>Close</Button></div></>}
      </MockDialog>
    </>
  );
}
export function BackupPage() {
  const backups = useQuery({
    queryKey: ["backups"],
    queryFn: () => isLiveCashierApiEnabled() ? listLiveBackupRecords() : listMockBackupRecords(),
  });
  return (
    <>
      <PageHeader
        title="Backups"
        description="Review the latest recorded backups and their results."
      />
      {backups.isPending && <LoadingState message="Loading backup history…" layout="table" columns={4} />}
      {backups.isError && <ErrorState message={backups.error.message} onRetry={() => void backups.refetch()} />}
      {backups.data && (
        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-semibold text-text-primary">Recovery readiness</h2>
            <p className="mt-2 text-sm text-text-secondary">
              No restore-test date or recovery procedure has been recorded. Restore operations are performed outside this application.
            </p>
          </Card>
          <ListCard
            title="Recent backups"
            empty={<p className="text-sm text-text-secondary">No backup has been recorded.</p>}
            headers={["Completed", "Result", "Size", "Details"]}
            rows={backups.data.map((backup) => [
              formatDateTime(backup.completedAt),
              <span key={`${backup.id}-result`} className="capitalize">{backup.result}</span>,
              backup.sizeBytes === null ? "Not recorded" : formatBackupSize(backup.sizeBytes),
              backup.error ?? "—",
            ])}
          />
        </div>
      )}
    </>
  );
}

function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <CardLabel className="font-semibold">{label}</CardLabel>
      <CardValue className="mt-0 truncate text-3xl font-bold tracking-tight">{value}</CardValue>
    </Card>
  );
}

function ListCard({
  headers,
  rows,
  title,
  toolbar,
  className,
  centeredColumns = [],
  columnClassNames = [],
  tableClassName,
  paginate,
  empty,
  onRowClick,
  isRowSelected,
}: {
  headers: string[];
  rows: ReactNode[][];
  title?: string;
  toolbar?: ReactNode;
  className?: string;
  centeredColumns?: number[];
  /** Page-specific column budgets keep dissimilar content balanced without changing other tables. */
  columnClassNames?: string[];
  /** An individual table can set a wider minimum when its controls must remain on one line. */
  tableClassName?: string;
  /** Paginate inside the card, after sorting, so a sort orders the whole list rather than one page. */
  paginate?: { label: string; fixedPageSize?: boolean };
  /** Shown in place of the table when there are no rows, so the toolbar stays usable. */
  empty?: ReactNode;
  /** Selectable rows: a click anywhere on the row (except its own controls) toggles it. Index is into `rows`. */
  onRowClick?: (rowIndex: number) => void;
  isRowSelected?: (rowIndex: number) => boolean;
}) {
  const sorting = useTableSort();
  const sortedRows = sortTableRows(rows, sorting.sort, (row, key) => cellSortValue(row[Number(key)]));
  const pagination = useClientPagination(sortedRows, paginate?.label ?? "records", paginate?.fixedPageSize);
  const shownRows = paginate ? pagination.items : sortedRows;
  function sortBy(key: string) {
    sorting.toggle(key);
    pagination.setPage(1);
  }
  return (
    <Card className={cn("p-0", className)}>
      {title && <div className="border-b border-border px-5 pb-3 pt-5"><h2 className="text-base font-semibold text-text-primary">{title}</h2></div>}
      {toolbar && <div className="border-b border-border px-5 py-3">{toolbar}</div>}
      {empty && rows.length === 0 ? <div className="px-5 py-6">{empty}</div> : <div className={TABLE_SCROLL_CLASS}>
        <table className={cn(TABLE_CLASS, tableClassName ?? "min-w-[560px]")}>
          {columnClassNames.length > 0 && <colgroup>{headers.map((header, index) => <col key={`${header}-${index}`} className={columnClassNames[index]} />)}</colgroup>}
          <thead>
            <tr className="border-b border-border">
              {headers.map((header, index) => isSortableHeader(header) ? (
                <SortableHeader key={header} sortKey={String(index)} label={header} sort={sorting.sort} onSort={sortBy} className={cn(centeredColumns.includes(index) && "text-center")}>
                  {header}
                </SortableHeader>
              ) : (
                <th scope="col" className={cn(TABLE_HEADER_CELL_CLASS, centeredColumns.includes(index) && "text-center")} key={header || index}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownRows.map((row) => {
              const rowIndex = rows.indexOf(row);
              return (
              <tr
                className={cn(
                  "border-b border-border transition-colors last:border-0 hover:bg-surface/70 focus-within:bg-surface/70",
                  onRowClick && "cursor-pointer",
                  isRowSelected?.(rowIndex) && "bg-brand-green-light/15 hover:bg-brand-green-light/25",
                )}
                key={rowIndex}
                onClick={onRowClick ? (event) => { if (!isRowControlClick(event.target)) onRowClick(rowIndex); } : undefined}
              >
                {row.map((cell, itemIndex) => (
                  <td
                    className={cn(
                      TABLE_BODY_CELL_CLASS,
                      centeredColumns.includes(itemIndex) && "text-center",
                    )}
                    key={itemIndex}
                  >
                    {renderTableCell(cell, headers[itemIndex] ?? "")}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>}
      {paginate && (rows.length > 0 || !empty) && pagination.controls}
    </Card>
  );
}

/** Action columns (no header, or "Actions") have nothing to order by. */
function isSortableHeader(header: string) {
  return header.trim() !== "" && !/^actions?$/i.test(header.trim());
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
