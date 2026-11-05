import { useDeferredValue, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { listStudents } from "@/api/cashierApi";
import { en } from "@/i18n/en";

export function LiveRegistrarStudentSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const deferredQuery = useDeferredValue(query.trim());
  const navigate = useNavigate();
  const students = useQuery({
    queryKey: ["registrar-student-search", deferredQuery],
    queryFn: () => listStudents({ query: deferredQuery, page: 1, perPage: 10 }),
    enabled: deferredQuery.length >= 2,
    staleTime: 15_000,
  });
  const results = students.data?.data ?? [];
  const showResults = isOpen && deferredQuery.length >= 2;

  function openStudent(id: string) {
    setIsOpen(false);
    navigate(`/students/${encodeURIComponent(id)}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && showResults) {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!showResults || results.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => event.key === "ArrowDown"
        ? (current + 1) % results.length
        : (current <= 0 ? results.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      const activeStudent = results[activeIndex];
      if (activeStudent) {
        event.preventDefault();
        openStudent(activeStudent.id);
      }
    }
  }

  return <div className="relative">
    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted-readable" />
    <input
      id="registrar-student-search"
      type="search"
      value={query}
      onChange={(event) => {
        setQuery(event.target.value);
        setIsOpen(true);
        setActiveIndex(-1);
      }}
      onKeyDown={handleKeyDown}
      placeholder={en.dashboard.studentSearchPlaceholder}
      role="combobox"
      aria-autocomplete="list"
      aria-label={en.dashboard.studentSearchLabel}
      aria-controls={showResults ? "registrar-student-results" : undefined}
      aria-expanded={showResults}
      aria-activedescendant={activeIndex >= 0 ? `registrar-student-option-${activeIndex}` : undefined}
      className="mt-4 h-14 w-full rounded-md border border-border bg-white px-4 pl-10 text-lg text-text-primary placeholder:text-text-muted focus-visible:border-brand-green"
    />
    {showResults && <div id="registrar-student-results" className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-white shadow-lg" role="listbox" aria-label={en.dashboard.studentSearchLabel}>
      {students.isPending && <p role="status" className="px-3 py-3 text-sm text-text-secondary">{en.dashboard.studentSearchLoading}</p>}
      {students.isError && <p role="alert" className="px-3 py-3 text-sm text-status-error">{en.dashboard.studentSearchError}</p>}
      {!students.isPending && !students.isError && results.length === 0 && <p role="status" className="px-3 py-3 text-sm text-text-secondary">{en.dashboard.studentSearchEmpty}</p>}
      {results.map((student, index) => <button
        key={student.id}
        id={`registrar-student-option-${index}`}
        type="button"
        role="option"
        tabIndex={-1}
        aria-selected={activeIndex === index}
        className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none ${activeIndex === index ? "bg-surface" : ""}`}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => openStudent(student.id)}
      >
        <span className="block font-medium text-text-primary">{student.fullName}</span>
        <span className="block font-mono text-xs text-text-secondary">{student.studentNo}</span>
      </button>)}
    </div>}
  </div>;
}
