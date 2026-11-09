import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PaginationControls } from "@/components/ui/PaginationControls";

describe("PaginationControls", () => {
  it("uses the shared bottom-anchored pager contract", () => {
    render(
      <PaginationControls
        currentPage={1}
        lastPage={2}
        perPage={10}
        total={11}
        onPageChange={() => undefined}
      />,
    );

    expect(screen.getByText("Page 1 of 2").parentElement?.parentElement).toHaveClass("pagination-controls", "mt-auto");
  });

  it("keeps page navigation functional", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <PaginationControls
        currentPage={1}
        lastPage={2}
        perPage={10}
        total={11}
        onPageChange={onPageChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
