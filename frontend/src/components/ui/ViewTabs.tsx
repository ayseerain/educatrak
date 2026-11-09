import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import type { ViewTabState } from "@/components/layout/ScreenTransition";

/** Last indicator position per tab strip, so a strip that remounts with its new view still slides from the old tab. */
const lastIndicator = new Map<string, { left: number; width: number }>();

export interface ViewTabItem {
  key: string;
  label: string;
  selected: boolean;
  /** Route-backed view: renders a link. */
  to?: string;
  onSelect?: () => void;
}

/**
 * Switches a page between whole views (CLINIQ Tabs look): one surface track holding the options,
 * with the selected one a raised white chip with a green ring and heavier weight (never color
 * alone). ARIA tabs with Arrow/Home/End; 44px tall on phones.
 */
export function ViewTabs({ label, items, className }: { label: string; items: ViewTabItem[]; className?: string }) {
  const refs = useRef<Array<HTMLElement | null>>([]);
  const selectedIndex = items.findIndex((item) => item.selected);
  const [indicator, setIndicator] = useState(() => lastIndicator.get(label) ?? null);

  // The selected chip is one indicator that slides between tabs (CLINIQ tabs), not a hard swap.
  useLayoutEffect(() => {
    function measure() {
      const tab = refs.current[selectedIndex];
      if (!tab) return;
      const next = { left: tab.offsetLeft, width: tab.offsetWidth };
      lastIndicator.set(label, next);
      setIndicator(next);
    }
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [label, selectedIndex]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    const keyMap: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 };
    if (!(event.key in keyMap)) return;
    event.preventDefault();
    const next = refs.current[((keyMap[event.key] ?? index) + items.length) % items.length];
    next?.focus();
    next?.click();
  }

  return (
    <div role="tablist" aria-label={label} className={cn("relative mb-5 flex gap-1 rounded-md border border-border bg-surface p-1 sm:inline-flex", className)}>
      {indicator && selectedIndex >= 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 top-1 left-0 rounded-sm bg-white shadow-card ring-1 ring-brand-green transition-[transform,width] duration-200 ease-out motion-reduce:transition-none"
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
      )}
      {items.map((item, index) => {
        const classes = cn(
          "relative inline-flex h-11 min-w-0 flex-auto cursor-pointer items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm transition-colors duration-200 motion-reduce:transition-none sm:h-10 sm:min-w-36 sm:px-4",
          item.selected
            ? cn("font-semibold text-brand-green-dark", !indicator && "bg-white shadow-card ring-1 ring-brand-green")
            : "font-medium text-text-secondary hover:bg-white/60 hover:text-text-primary",
        );
        const shared = {
          role: "tab",
          "aria-selected": item.selected,
          tabIndex: item.selected ? 0 : -1,
          className: classes,
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => onKeyDown(event, index),
        } as const;
        return item.to ? (
          <Link key={item.key} to={item.to} state={{ viewTab: true } satisfies ViewTabState} ref={(el) => { refs.current[index] = el; }} {...shared}>{item.label}</Link>
        ) : (
          <button key={item.key} type="button" ref={(el) => { refs.current[index] = el; }} onClick={item.onSelect} {...shared}>{item.label}</button>
        );
      })}
    </div>
  );
}
