import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { StudentSearchField } from "@/features/students/StudentSearchField";

function SearchHarness() {
  const [query, setQuery] = useState("");
  const location = useLocation();

  return (
    <>
      <StudentSearchField
        id="student-search"
        value={query}
        onChange={setQuery}
        label="Search for a student"
        placeholder="Name or LRN"
      />
      <output aria-label="Current path">{location.pathname}</output>
    </>
  );
}

describe("StudentSearchField keyboard access", () => {
  it("navigates listbox options with arrows and selects the active student with Enter", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SearchHarness /></MemoryRouter>);

    const search = screen.getByRole("combobox", { name: "Search for a student" });
    await user.type(search, "Amara");
    const option = await screen.findByRole("option", { name: /Amara Villanueva.*000000000001/ });

    await user.keyboard("{ArrowDown}");
    expect(search).toHaveAttribute("aria-activedescendant", "student-search-option-0");
    expect(option).toHaveAttribute("tabindex", "-1");
    await user.keyboard("{Enter}");

    expect(screen.getByLabelText("Current path")).toHaveTextContent("/students/sample-1001");
  });
});
