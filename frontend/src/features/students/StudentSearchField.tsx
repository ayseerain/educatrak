import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { getStudentSearchMatches, normalizeStudentSearchQuery } from "@/features/students/studentSearch";
import type { Student } from "@/features/students/mockStudents";

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
  onSelect?: (student: Student) => void;
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
  onSelect,
  "aria-invalid": ariaInvalid,
}: StudentSearchFieldProps) {
  const navigate = useNavigate();
  const generatedId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const inputId = id ?? generatedId;
  const suggestionsId = `${inputId}-suggestions`;
  const matches = getStudentSearchMatches(value);
  const hasSuggestions = matches.length > 0 && !suggestionsDismissed;
  const inputDescribedBy = [describedBy, errorMessage ? `${inputId}-error` : undefined, hasSuggestions ? suggestionsId : undefined]
    .filter(Boolean)
    .join(" ") || undefined;

  function getStudentToOpen() {
    const normalizedValue = normalizeStudentSearchQuery(value);

    return (
      matches.find((student) => {
        const normalizedName = normalizeStudentSearchQuery(student.name);
        const normalizedNumber = normalizeStudentSearchQuery(student.number);

        return normalizedName === normalizedValue || normalizedNumber === normalizedValue;
      }) ?? matches[0]
    );
  }

  function openStudent(student: Student) {
    setSuggestionsDismissed(true);
    if (onSelect) {
      onSelect(student);
      return;
    }

    onChange(student.name);
    navigate(`/students/${student.id}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && hasSuggestions) {
      event.preventDefault();
      setSuggestionsDismissed(true);
      return;
    }
    if (event.key !== "Enter") return;

    const student = getStudentToOpen();
    if (!student) return;

    event.preventDefault();
    openStudent(student);
  }

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
          ref={inputRef}
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => {
            setSuggestionsDismissed(false);
            onChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
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
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-border bg-white text-left shadow-lg">
          <div
            id={suggestionsId}
            role="listbox"
            aria-label="Matching students"
          >
            {matches.map((student) => (
              <button
                key={student.id}
                type="button"
                role="option"
                className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-surface focus:bg-surface focus:outline-none"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openStudent(student)}
              >
                <span className="block font-medium text-text-primary">{student.name}</span>
                <span className="block text-xs text-text-secondary">{student.number}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end border-t border-border px-3 py-2">
            <button
              type="button"
              className="text-sm font-medium text-brand-green-dark underline underline-offset-2 hover:text-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setSuggestionsDismissed(true);
                inputRef.current?.focus();
              }}
            >
              Close suggestions
            </button>
          </div>
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
