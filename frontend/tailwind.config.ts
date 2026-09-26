import type { Config } from "tailwindcss";

// Design tokens are taken verbatim from EducatraK_Frontend_Context_Brief.md
// (Section 4: Exact Design Tokens, Section 5: Typography).
// Do not add ad-hoc colors outside this palette.
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
        surface: "#FAFAFA",
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
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        md: "18px",
        lg: "20px",
        xl: "24px",
        "2xl": "30px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0, 0, 0, 0.06)",
      },
      minHeight: {
        control: "44px",
      },
    },
  },
  plugins: [],
} satisfies Config;
