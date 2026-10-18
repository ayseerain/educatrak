import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, SearchCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StudentSearchField } from "@/features/students/StudentSearchField";
import { en } from "@/i18n/en";

// The specification explicitly calls for "one large student search box"
// as the Registrar's primary interaction (section 9). No financial data
// of any kind belongs on this screen.
export function RegistrarDashboard() {
  const [query, setQuery] = useState("");

  return (
    <div className="mt-4 grid flex-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="border-l-4 border-l-brand-green p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-brand-green-light/60 bg-[#EAF6EC] text-brand-green-dark">
            <SearchCheck aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <label
              htmlFor="registrar-student-search"
              className="block text-lg font-semibold text-text-primary"
            >
              {en.dashboard.studentSearchLabel}
            </label>
            <p className="mt-1 text-sm text-text-secondary">
              {en.dashboard.studentSearchHelp}
            </p>
            <StudentSearchField
              id="registrar-student-search"
              value={query}
              onChange={setQuery}
              placeholder={en.dashboard.studentSearchPlaceholder}
              wrapperClassName="mt-4"
              inputClassName="h-14 rounded-md border border-border bg-white px-4 text-lg text-text-primary placeholder:text-text-muted focus-visible:border-brand-green"
            />
          </div>
        </div>
      </Card>
      <Card className="p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-text-primary">
            {en.dashboard.registrarWorkspace}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {en.dashboard.registrarWorkspaceHelp}
          </p>
        </div>
        <div className="divide-y divide-border">
          <RegistrarLink
            to="/clearance"
            icon={ClipboardCheck}
            label={en.dashboard.openClearanceLookup}
            detail={en.dashboard.openClearanceLookupHelp}
          />
        </div>
      </Card>
    </div>
  );
}

function RegistrarLink({
  detail,
  icon: Icon,
  label,
  to,
}: {
  detail: string;
  icon: typeof ClipboardCheck;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-[84px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface/80 focus-visible:bg-surface"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-green-light/60 bg-[#EAF6EC] text-brand-green-dark">
        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span>
        <span className="block font-semibold text-text-primary">{label}</span>
        <span className="mt-0.5 block text-sm text-text-secondary">{detail}</span>
      </span>
    </Link>
  );
}
