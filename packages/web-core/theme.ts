import { css } from "lit";

/**
 * Theme tokens and the few styles utilities cannot express. Public
 * `--pixelshift-*` properties feed private `--ps-*` ones, so a consumer can
 * override any token from an ancestor without touching the shadow root:
 *
 *   pixelshift-image-compressor { --pixelshift-accent: #ff6838; }
 *
 * Dark mode follows the `is-dark-mode` attribute rather than
 * `prefers-color-scheme`: the element cannot see a host page's own theme
 * state through the shadow boundary, so the consumer sets it explicitly.
 */
export const themeStyles = css`
  :host {
    --ps-surface: var(--pixelshift-surface, #fdfcf8);
    --ps-sunken: var(--pixelshift-surface-muted, #f2f0e8);
    --ps-field: var(--pixelshift-field, #ffffff);
    --ps-hover: var(--pixelshift-hover, #f2f0e8);
    --ps-line: var(--pixelshift-border, rgba(21, 22, 20, 0.12));
    --ps-line-strong: var(--pixelshift-border-strong, rgba(21, 22, 20, 0.26));
    --ps-text: var(--pixelshift-text, #151614);
    --ps-text-2: var(--pixelshift-text-muted, #45473f);
    --ps-muted: var(--pixelshift-text-subtle, #686a63);
    --ps-accent: var(--pixelshift-accent, #151614);
    --ps-accent-hover: var(--pixelshift-accent-hover, #33352f);
    --ps-accent-content: var(--pixelshift-accent-content, #f7f5ed);
    --ps-focus: var(--pixelshift-focus, #ff6838);
    --ps-focus-ring: color-mix(in srgb, var(--ps-focus) 22%, transparent);
    --ps-danger: var(--pixelshift-danger, #b42318);
    --ps-danger-surface: var(--pixelshift-danger-surface, #fdeeec);
    --ps-success: var(--pixelshift-success, #2f7d45);
    --ps-checker-a: #ffffff;
    --ps-checker-b: #e6e3d8;
    --ps-radius: var(--pixelshift-radius, 8px);
    --ps-radius-panel: var(--pixelshift-panel-radius, 12px);
    --ps-font-mono: var(
      --pixelshift-font-mono,
      ui-monospace,
      "SFMono-Regular",
      Menlo,
      Consolas,
      monospace
    );

    display: block;
    box-sizing: border-box;
    min-width: 0;
    color: var(--ps-text);
    font-family: var(
      --pixelshift-font-family,
      ui-sans-serif,
      system-ui,
      -apple-system,
      sans-serif
    );
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  :host([is-dark-mode]) {
    --ps-surface: var(--pixelshift-surface, #201e15);
    --ps-sunken: var(--pixelshift-surface-muted, #17160f);
    --ps-field: var(--pixelshift-field, #17160f);
    --ps-hover: var(--pixelshift-hover, #2c2a1e);
    --ps-line: var(--pixelshift-border, rgba(243, 241, 231, 0.12));
    --ps-line-strong: var(
      --pixelshift-border-strong,
      rgba(243, 241, 231, 0.24)
    );
    --ps-text: var(--pixelshift-text, #f3f1e7);
    --ps-text-2: var(--pixelshift-text-muted, #c9c5b4);
    --ps-muted: var(--pixelshift-text-subtle, #9a978a);
    --ps-accent: var(--pixelshift-accent, #caff45);
    --ps-accent-hover: var(--pixelshift-accent-hover, #b8ea38);
    --ps-accent-content: var(--pixelshift-accent-content, #151614);
    --ps-focus: var(--pixelshift-focus, #caff45);
    --ps-focus-ring: color-mix(in srgb, var(--ps-focus) 25%, transparent);
    --ps-danger: var(--pixelshift-danger, #fca5a5);
    --ps-danger-surface: var(--pixelshift-danger-surface, #3d1210);
    --ps-success: var(--pixelshift-success, #8fd694);
    --ps-checker-a: #2c2a1e;
    --ps-checker-b: #201e15;
  }

  :host([hidden]) {
    display: none;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
    color: inherit;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
  }

  input[type="range"],
  input[type="checkbox"],
  input[type="radio"] {
    accent-color: var(--ps-accent);
  }

  /* The native spinner collides with the unit suffix; arrow keys still step. */
  input[type="number"] {
    appearance: textfield;
    -moz-appearance: textfield;
  }

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Buttons, links, and toggles get an offset outline on keyboard focus. */
  :is(button, a, [tabindex]):focus-visible,
  input:is(
      [type="range"],
      [type="checkbox"],
      [type="radio"],
      [type="color"]
    ):focus-visible {
    outline: 2px solid var(--ps-focus);
    outline-offset: 2px;
  }

  /* Bordered fields recolor their own border and add a soft ring flush with
     it, rather than a second outline floating outside. */
  :is(
    select,
    textarea,
    input:not([type="range"], [type="checkbox"], [type="radio"], [type="color"])
  ):focus {
    outline: none;
    border-color: var(--ps-focus);
    box-shadow: 0 0 0 3px var(--ps-focus-ring);
  }

  /* Tab bars and segmented controls scroll sideways on narrow screens. */
  .scroll-x {
    overflow-x: auto;
    scrollbar-width: none;
  }

  .scroll-x::-webkit-scrollbar {
    display: none;
  }

  /* Only keyboard focus: clicking the dropzone also focuses its input. */
  .dropzone:has(input:focus-visible) {
    border-color: var(--ps-focus);
    box-shadow: 0 0 0 3px var(--ps-focus-ring);
  }

  .dropzone[data-dragging] {
    border-color: var(--ps-accent);
    background: var(--ps-hover);
  }

  .checker {
    background-color: var(--ps-checker-a);
    background-image: conic-gradient(
      var(--ps-checker-b) 25%,
      transparent 0 50%,
      var(--ps-checker-b) 0 75%,
      transparent 0
    );
    background-size: 16px 16px;
  }

  /* Before/after slider: both layers are clipped at --position, so a
     transparent result never shows the original through it. */
  .compare {
    position: relative;
    overflow: hidden;
    touch-action: none;
  }

  .compare img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    pointer-events: none;
  }

  .compare .before {
    clip-path: inset(0 calc(100% - var(--position, 50%)) 0 0);
  }

  .compare .after {
    position: absolute;
    inset: 0;
    clip-path: inset(0 0 0 var(--position, 50%));
  }

  .compare .divider {
    position: absolute;
    top: 0;
    bottom: 0;
    left: var(--position, 50%);
    width: 2px;
    margin-left: -1px;
    background: var(--ps-surface);
    box-shadow: 0 0 0 1px var(--ps-line-strong);
    pointer-events: none;
  }

  .compare input[type="range"] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: ew-resize;
  }

  .compare:focus-within .divider {
    background: var(--ps-focus);
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: ps-spin 0.7s linear infinite;
  }

  @keyframes ps-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 2s;
    }
  }
`;
