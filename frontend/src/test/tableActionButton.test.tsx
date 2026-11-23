import { fireEvent, render, screen } from "@testing-library/react";
import { Pencil } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { TableActionButton, TableActionGroup } from "@/components/ui/TableActionButton";

describe("TableActionButton", () => {
  it("keeps an accessible label while visually expanding it on hover and keyboard focus", () => {
    render(<TableActionButton icon={Pencil} label="Edit account" />);

    const action = screen.getByRole("button", { name: "Edit account" });
    const label = screen.getByText("Edit account");

    expect(action).toHaveClass("group", "min-w-9");
    expect(action.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(label).toHaveClass("max-w-0", "group-hover:max-w-48", "group-focus-visible:max-w-48");
  });

  it("keeps an expanding action group on one left-anchored line", () => {
    const { container } = render(<TableActionGroup><TableActionButton icon={Pencil} label="Edit account" /></TableActionGroup>);

    expect(container.firstElementChild).toHaveClass("w-full", "min-w-0", "flex-nowrap", "justify-start", "whitespace-nowrap");
    expect(container.firstElementChild).not.toHaveClass("min-w-max");
  });

  it("preserves disabled behavior while retaining the accessible action name", () => {
    const onClick = vi.fn();
    render(<TableActionButton icon={Pencil} label="Deactivate account" variant="destructive" disabled onClick={onClick} />);

    const action = screen.getByRole("button", { name: "Deactivate account" });
    expect(action).toBeDisabled();
    expect(action).toHaveClass("disabled:cursor-not-allowed", "disabled:opacity-50");
    fireEvent.click(action);
    expect(onClick).not.toHaveBeenCalled();
  });
});
