import { useState } from "react";
import { StudentSearchField } from "@/features/students/StudentSearchField";
import { en } from "@/i18n/en";

// The specification explicitly calls for "one large student search box"
// as the Registrar's primary interaction (section 9). No financial data
// of any kind belongs on this screen.
export function RegistrarDashboard() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="w-full max-w-xl text-center">
        <label
          htmlFor="registrar-student-search"
          className="mb-2 block text-lg font-semibold text-text-primary"
        >
          {en.dashboard.studentSearchLabel}
        </label>
        <StudentSearchField
          id="registrar-student-search"
          value={query}
          onChange={setQuery}
          placeholder={en.dashboard.studentSearchPlaceholder}
          inputClassName="h-14 rounded-md border border-border bg-white px-4 text-lg text-text-primary placeholder:text-text-muted focus-visible:border-brand-green"
        />
        <p className="mt-3 text-sm text-text-muted-readable">
          {en.dashboard.studentSearchHelp}
        </p>
      </div>
    </div>
  );
}
