import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, SearchCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/Button";
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link to="/students" className={buttonVariants({ variant: "secondary" })}>View students</Link>
        <Link to="/students/new" className={buttonVariants({ variant: "primary" })}><Plus aria-hidden="true" className="h-4 w-4" />Add student</Link>
      </div>
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <SearchCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-green-dark" />
          <div className="min-w-0 flex-1">
            <label
              htmlFor="registrar-student-search"
              className="block text-base font-semibold text-text-primary"
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
              onSelect={(student) => navigate(`/students/${encodeURIComponent(student.id)}`)}
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
