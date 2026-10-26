# pixelshift-core

## 0.2.0

### Minor Changes

- 76330c8: Grow Pixelshift from a converter into an image toolkit.
  - **Core:** `compressImage` (quality search for a target size, palette-quantized PNGs, never returns a larger file), `resizeImage` with cover/contain/fill/inside fitting, `cropImage` by rectangle or aspect ratio, `transformImage`, `extractColors` and color helpers, `imageToBase64` with embed snippets, `resizeForSocial` with typed `SOCIAL_PRESETS` (including the YouTube thumbnail and its 2 MB limit), `removeBackground` with a pluggable `segmenter`, `createZip`, and `readImageData`. Works in Web Workers through `OffscreenCanvas`. Results gain `originalWidth` and `originalHeight`.
  - **Web components:** new `<pixelshift-image-compressor>`, `<pixelshift-image-resizer>`, `<pixelshift-image-cropper>`, `<pixelshift-color-picker>`, `<pixelshift-image-to-base64>`, `<pixelshift-social-resizer>`, `<pixelshift-youtube-thumbnail>`, `<pixelshift-background-remover>`, and `<pixelshift-studio>`. Every tool shares paste support, per-file errors, cancellation, ZIP downloads, `bare` embedding, `--pixelshift-*` theming tokens, and `process-*` events. `pixelshift-web-core/define` now registers all of them; unused elements tree-shake when you register them individually.
  - **Converter:** rebuilt on the shared base with the refreshed look. Its properties, `convert()`, and `conversion-*` events are unchanged, and it also fires the shared `process-*` events.
  - **Adapters:** a React, Vue, and Angular component for every tool. Each registers only the elements you import. The Vue and Angular converter wrappers gain `isDarkMode`.
