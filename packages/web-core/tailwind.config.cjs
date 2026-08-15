/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.ts"],
  theme: {
    extend: {
      colors: {
        panel: { DEFAULT: "#ffffff", dark: "#201e15" },
        "panel-border": {
          DEFAULT: "#e2e8f0",
          dark: "rgba(243, 241, 231, 0.14)",
        },
        field: { DEFAULT: "#ffffff", dark: "#26241a" },
        "field-border": {
          DEFAULT: "#cbd5e1",
          dark: "rgba(243, 241, 231, 0.22)",
        },
        "hover-surface": { DEFAULT: "#f8fafc", dark: "#2c2a1e" },
        preview: { DEFAULT: "#f1f5f9", dark: "#26241a" },
        heading: { DEFAULT: "#0f172a", dark: "#f3f1e7" },
        body: { DEFAULT: "#475569", dark: "#b8b5a6" },
        strong: { DEFAULT: "#1e293b", dark: "#ddd9c8" },
        label: { DEFAULT: "#334155", dark: "#c9c5b4" },
        muted: { DEFAULT: "#64748b", dark: "#918e7f" },
        danger: {
          surface: { DEFAULT: "#fef2f2", dark: "#450a0a" },
          text: { DEFAULT: "#b91c1c", dark: "#fca5a5" },
        },
        accent: {
          DEFAULT: "#2563eb",
          hover: "#1d4ed8",
          dark: "#caff45",
          "dark-hover": "#b8ea38",
        },
        "accent-content": { DEFAULT: "#ffffff", dark: "#151614" },
        drag: { DEFAULT: "#2563eb", dark: "#caff45" },
        "drag-surface": {
          DEFAULT: "#eff6ff",
          dark: "rgba(202, 255, 69, 0.12)",
        },
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
};
