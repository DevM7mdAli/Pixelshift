# Integration apps

Each application consumes its public workspace package and owns a smoke test:

- `vanila` uses the Lit custom elements directly, with a dark-mode toggle.
- `react-app` uses `pixelshift-react`.
- `angular-app` uses `pixelshift-angular`.
- `vue-app` uses `pixelshift-vue`.
- `docs` uses Fumadocs for the landing page, live studio demo, and library documentation.

The framework apps render `<pixelshift-studio>` and count results through the `process-complete` event that bubbles out of every tool.
