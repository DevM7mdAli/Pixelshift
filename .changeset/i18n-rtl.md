---
"pixelshift-web-core": minor
"pixelshift-react": minor
"pixelshift-vue": minor
"pixelshift-angular": minor
---

Localize every element and support right-to-left layout.

- Every string now comes from a typed catalog (`PixelshiftMessages`). Elements follow their `locale` attribute, else the nearest `lang` attribute, else English, and re-render when the page language changes or a locale is registered.
- `registerLocale(locale, messages)` registers a translation with region-to-language fallback (`ar-SA` → `ar` → English). The `messages` property overrides strings on one element.
- An Arabic catalog ships as `ar`, bundled only when imported. Plurals use CLDR categories, and numbers, percentages, and sizes are formatted with `Intl`.
- Errors are shown from the catalog by `ImageConversionError.code`.
- Layout uses logical CSS properties and mirrors under `dir="rtl"`; image-space controls stay left to right. The studio's tab bar supports Home/End and mirrored arrow keys.
- React, Vue, and Angular components accept `locale` and `messages`, and the adapters re-export `registerLocale`, `ar`, and `en`.
- Selects draw their own chevron, and text fields show a focus ring flush with their border.
