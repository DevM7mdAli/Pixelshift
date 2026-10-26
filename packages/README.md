# Publishable packages

- `core` contains the framework-free image operations: convert, compress, resize, crop, colors, Base64, social sizes, background removal, and the PNG/ZIP writers behind them.
- `web-core` contains the Lit elements for every tool, the `pixelshift-studio` container, their shared base class, and the generated Tailwind stylesheet.
- `react`, `angular`, and `vue` are thin framework adapters around `web-core`.
