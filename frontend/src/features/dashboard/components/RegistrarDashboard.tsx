import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StudentSearchField } from "@/features/students/StudentSearchField";
import { en } from "@/i18n/en";
import { LiveRegistrarStudentSearch } from "./LiveRegistrarStudentSearch";
import { isLiveCashierApiEnabled } from "@/api/cashierApi";

// The specification explicitly calls for "one large student search box"
// as the Registrar's primary interaction (section 9). No financial data
// of any kind belongs on this screen.
export function RegistrarDashboard() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  return (
    <div>
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
              {isLiveCashierApiEnabled() ? en.dashboard.liveStudentSearchHelp : en.dashboard.studentSearchHelp}
            </p>
            {isLiveCashierApiEnabled() ? <LiveRegistrarStudentSearch /> : <StudentSearchField
              id="registrar-student-search"
              value={query}
              onChange={setQuery}
              onSelect={(student) => navigate(`/clearance?studentId=${encodeURIComponent(student.id)}`)}
              placeholder={en.dashboard.studentSearchPlaceholder}
              wrapperClassName="mt-4"
              inputClassName="h-14 rounded-md border border-border bg-white px-4 text-lg text-text-primary placeholder:text-text-muted focus-visible:border-brand-green"
            />}
          </div>
        </div>
      </Card>
    </div>
  );
}
