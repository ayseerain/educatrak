import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Shell } from "@/components/layout/Shell";

const cashier = { id: "cashier-1", name: "Casey Cashier", role: "cashier" as const };

describe("application sidebar", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
      },
    });
  });

  it("collapses to labeled icon links and remembers the preference", () => {
    const { unmount } = render(
      <MemoryRouter>
        <Shell user={cashier} onLogout={() => undefined} onRoleChange={() => undefined}>
          <p>Workspace</p>
        </Shell>
      </MemoryRouter>,
    );

    const sidebar = screen.getByRole("navigation", { name: "Primary" });
    const brand = screen.getByText("EducaTrak").parentElement?.parentElement;
    const toggle = within(sidebar).getByRole("button", { name: "Collapse sidebar" });

    expect(brand?.nextElementSibling).toBe(toggle);
    expect(toggle).toHaveClass("ml-auto");

    fireEvent.click(toggle);

    expect(sidebar).toHaveClass("md:w-16");
    expect(screen.getByRole("link", { name: "Students" })).toHaveAttribute("title", "Students");
    expect(within(sidebar).getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
    expect(window.localStorage.getItem("educatrak.sidebar.collapsed")).toBe("true");

    unmount();
    render(
      <MemoryRouter>
        <Shell user={cashier} onLogout={() => undefined} onRoleChange={() => undefined}>
          <p>Workspace</p>
        </Shell>
      </MemoryRouter>,
    );
    expect(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });
});
