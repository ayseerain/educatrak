import { useId } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { getStudentSearchMatches } from "@/features/students/studentSearch";

interface StudentSearchFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder: string;
  autoFocus?: boolean;
  disabled?: boolean;
  inputClassName?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  errorMessage?: string;
  describedBy?: string;
  "aria-invalid"?: boolean;
}

export function StudentSearchField({
  id,
  value,
  onChange,
  label,
  placeholder,
  autoFocus,
  disabled,
  inputClassName,
  wrapperClassName,
  labelClassName,
  errorMessage,
  describedBy,
  "aria-invalid": ariaInvalid,
}: StudentSearchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const suggestionsId = `${inputId}-suggestions`;
  const matches = getStudentSearchMatches(value);
  const hasSuggestions = matches.length > 0;
  const inputDescribedBy = [describedBy, errorMessage ? `${inputId}-error` : undefined, hasSuggestions ? suggestionsId : undefined]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={cn("relative", wrapperClassName)}>
      {label && (
        <label htmlFor={inputId} className={labelClassName}>
          {label}
        </label>
      )}
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted-readable"
        />
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={ariaInvalid}
          aria-describedby={inputDescribedBy}
          aria-controls={hasSuggestions ? suggestionsId : undefined}
          className={cn("w-full", inputClassName, "pl-9")}
        />
      </div>
      {hasSuggestions && (
        <div
          id={suggestionsId}
          role="listbox"
          aria-label="Matching students"
          className="absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-border bg-white text-left shadow-lg"
        >
          {matches.map((student) => (
            <button
              key={student.id}
              type="button"
              role="option"
              className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-surface focus:bg-surface focus:outline-none"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange(student.name)}
            >
              <span className="block font-medium text-text-primary">{student.name}</span>
              <span className="block text-xs text-text-secondary">{student.number}</span>
            </button>
          ))}
        </div>
      )}
      {errorMessage && (
        <p id={`${inputId}-error`} className="mt-2 text-sm text-status-error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
