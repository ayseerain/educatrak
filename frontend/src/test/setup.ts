import "@testing-library/jest-dom/vitest";

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
