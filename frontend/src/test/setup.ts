import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// The mock session persists in sessionStorage; never let one test sign in the next.
afterEach(() => window.sessionStorage.clear());

Object.defineProperties(HTMLElement.prototype, {
  clientHeight: {
    configurable: true,
    value: 300,
  },
  clientWidth: {
    configurable: true,
    value: 800,
  },
  offsetHeight: {
    configurable: true,
    value: 300,
  },
  offsetWidth: {
    configurable: true,
    value: 800,
  },
});
