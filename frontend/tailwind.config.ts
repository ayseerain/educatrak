import type { Config } from "tailwindcss";

// Design tokens are taken verbatim from EducatraK_Frontend_Context_Brief.md
// (Section 4: Exact Design Tokens, Section 5: Typography), aligned with CLINIQ's
// design system (same school, same brand): surface, radius, shadows, and type scale
// match CLINIQ; controls keep EducatraK's 44px minimum (see 06-Decisions).
// Do not add ad-hoc colors outside this palette; tints use opacity (e.g. bg-status-success/10).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#039935",
          "green-dark": "#035419",
          "green-light": "#8CCC7E",
          yellow: "#EAEA09",
          "yellow-dark": "#AFAF07",
        },
        text: {
          primary: "#1A1A1A",
          secondary: "#616161",
          muted: "#9E9E9E",
          "muted-readable": "#757575",
        },
        background: "#FFFFFF",
        surface: "#F5F5F5",
        border: "#E0E0E0",
        status: {
          success: "#20753A",
          warning: "#A85F00",
          error: "#D32F2F",
          info: "#1976D2",
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', "system-ui", "sans-serif"],
      },
      // CLINIQ's compact scale; body text is sm (14px), set on <body> in index.css.
      fontSize: {
        xs: ["12px", "16px"],
        sm: ["14px", "20px"],
        base: ["16px", "24px"],
        md: ["18px", "26px"],
        lg: ["18px", "26px"],
        xl: ["22px", "30px"],
        "2xl": ["28px", "36px"],
        // Display size, stat-card figures only.
        "3xl": ["32px", "40px"],
      },
      // One restrained radius set: sm = badges/menu items, md = panels and controls.
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
      },
      // Cards separate from the page by a soft shadow, not an outline.
      boxShadow: {
        card: "0 1px 2px 0 rgb(26 26 26 / 0.04), 0 2px 8px -2px rgb(26 26 26 / 0.06)",
        raised: "0 1px 2px 0 rgb(26 26 26 / 0.06), 0 4px 12px -2px rgb(26 26 26 / 0.1)",
      },
      minHeight: {
        control: "44px",
      },
      // View-tab panels fade in instead of swapping abruptly (route screens use ScreenTransition).
      keyframes: {
        "screen-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "screen-in": "screen-in 200ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
