/**
 * Every color resolves to a CSS variable defined in `theme.ts`, so one set of
 * classes serves both themes and consumers can restyle the elements with
 * `--pixelshift-*` custom properties, which pierce the shadow root.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ["./*.ts"],
  theme: {
    extend: {
      colors: {
        surface: "var(--ps-surface)",
        sunken: "var(--ps-sunken)",
        field: "var(--ps-field)",
        hover: "var(--ps-hover)",
        line: "var(--ps-line)",
        "line-strong": "var(--ps-line-strong)",
        ink: "var(--ps-text)",
        body: "var(--ps-text-2)",
        muted: "var(--ps-muted)",
        accent: "var(--ps-accent)",
        "accent-hover": "var(--ps-accent-hover)",
        "accent-ink": "var(--ps-accent-content)",
        danger: "var(--ps-danger)",
        "danger-surface": "var(--ps-danger-surface)",
        success: "var(--ps-success)",
      },
      borderRadius: {
        panel: "var(--ps-radius-panel)",
        control: "var(--ps-radius)",
      },
      fontFamily: {
        mono: "var(--ps-font-mono)",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
};
