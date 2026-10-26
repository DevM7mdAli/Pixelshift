import {
  getPixelColor,
  readImageData,
  removeBackground,
  type BackgroundRemovalResult,
  type OutputFormat,
  type Segmenter,
} from "pixelshift-core";
import {
  html,
  nothing,
  type PropertyDeclarations,
  type PropertyValues,
} from "lit";
import { PixelshiftTool, register } from "./base.js";
import { describeSize, formatSelect, rangeInput } from "./fields.js";
import { icon } from "./icons.js";
import type { BackgroundMessages } from "./i18n.js";
import { ui } from "./ui.js";

export const BACKGROUND_REMOVER_TAG = "pixelshift-background-remover";

export const backgroundMessages: BackgroundMessages = {
  heading: "Background remover",
  description:
    "Remove plain backgrounds from product photos, logos, and signatures.",
  action: "Remove background",
  busy: "Removing",
  tolerance: "Tolerance",
  softness: "Edge softness",
  sharp: "Sharp",
  backgroundColor: "Background color",
  detected: "Detected from edges",
  pick: "Pick",
  auto: "Auto",
  pickHint: "Click the background you want removed.",
  pickAlt: "Pick a background color",
  replaceWith: "Replace with",
  transparency: "Transparency",
  color: "Color",
  fillColor: "Fill color",
  keepFormat: "PNG (WebP stays WebP)",
  contiguous: "Only remove background touching the edges",
  removed: "{percent} removed",
  compareLabel: "Compare original and cut-out",
};

/** Settings that re-run a single-image result while the user adjusts them. */
const LIVE_SETTINGS = [
  "tolerance",
  "feather",
  "contiguous",
  "color",
  "background",
  "format",
] as const;

/**
 * `<pixelshift-background-remover>` — removes plain or gently graded
 * backgrounds (product shots, logos, signatures, screenshots) by keying out
 * the colors along the image edges. Adjust `tolerance` and `feather`, pick
 * the background color from the image, or fill the removed area with
 * `background`.
 *
 * For photos with busy backgrounds, assign a `segmenter` — any function that
 * returns a foreground mask, such as an ML model — and the element uses it
 * instead of color keying.
 */
export class BackgroundRemoverElement extends PixelshiftTool<BackgroundRemovalResult> {
  static get properties(): PropertyDeclarations {
    return {
      tolerance: { type: Number },
      feather: { type: Number },
      contiguous: {
        type: Boolean,
        converter: {
          fromAttribute: (value: string | null) => value !== "false",
        },
      },
      color: { type: String },
      background: { type: String },
      format: { type: String },
      multiple: { type: Boolean },
      segmenter: { attribute: false },
      picking: { state: true },
      samplePixels: { state: true },
    };
  }

  /** How far a pixel may stray from the background color, 0–100. */
  tolerance = 15;
  /** Edge softness in pixels. */
  feather = 1;
  /** Only remove background connected to the edges. `contiguous="false"` removes enclosed areas too. */
  contiguous = true;
  /** Background color to remove, e.g. `"#ffffff"`. Unset detects it from the edges. */
  color: string | undefined;
  /** Fill color for the removed area. Unset keeps it transparent. */
  background: string | undefined;
  format: OutputFormat | undefined;
  multiple = false;
  /** A custom foreground model that replaces color keying. */
  segmenter: Segmenter | undefined;

  private picking = false;
  private samplePixels: ImageData | undefined;
  private liveTimer: ReturnType<typeof setTimeout> | undefined;

  protected get messageDefaults() {
    return { background: backgroundMessages };
  }
  protected get toolMessages() {
    return this.t.background;
  }
  protected get allowsMultiple() {
    return this.multiple;
  }

  protected processFile(file: File, signal: AbortSignal) {
    return removeBackground(file, {
      tolerance: this.tolerance,
      feather: this.feather,
      contiguous: this.contiguous,
      signal,
      ...(this.color ? { color: this.color } : {}),
      ...(this.background ? { background: this.background } : {}),
      ...(this.format ? { format: this.format } : {}),
      ...(this.segmenter ? { segmenter: this.segmenter } : {}),
    });
  }

  protected filesChanged(): void {
    this.picking = false;
    this.samplePixels = undefined;
  }

  disconnectedCallback(): void {
    clearTimeout(this.liveTimer);
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const live =
      this.selected.length === 1 &&
      this.output.length === 1 &&
      LIVE_SETTINGS.some((key) => changed.has(key));
    if (live) {
      clearTimeout(this.liveTimer);
      this.liveTimer = setTimeout(() => {
        // Restart with the latest settings rather than waiting on a stale run.
        this.cancel();
        void this.process();
      }, 300);
    }
  }

  private async startPicking(): Promise<void> {
    const file = this.selected[0];
    if (!file) return;
    this.picking = true;
    this.samplePixels ??= (
      await readImageData(file, { maxSize: 1200 })
    ).imageData;
  }

  private onPick(event: MouseEvent): void {
    const image = event.currentTarget as HTMLImageElement;
    const pixels = this.samplePixels;
    if (!pixels) return;
    const rect = image.getBoundingClientRect();
    // object-fit: contain letterboxes the image inside its box.
    const scale = Math.min(
      rect.width / pixels.width,
      rect.height / pixels.height,
    );
    const left = (rect.width - pixels.width * scale) / 2;
    const top = (rect.height - pixels.height * scale) / 2;
    const x = (event.clientX - rect.left - left) / scale;
    const y = (event.clientY - rect.top - top) / scale;
    if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) return;
    this.color = getPixelColor(pixels, x, y).hex;
    this.picking = false;
  }

  protected renderSettings() {
    const file = this.selected[0];
    const { common, background } = this.t;
    return html`
      ${this.picking && file
        ? html`<div class="mt-4 grid gap-2">
            <p class="m-0 text-sm text-body">${background.pickHint}</p>
            <img
              class="h-64 w-full cursor-crosshair rounded-control border border-solid border-line bg-sunken object-contain"
              src=${this.urlFor(file)}
              alt=${background.pickAlt}
              @click=${this.onPick}
            />
            <button
              class="${ui.small} justify-self-start"
              type="button"
              @click=${() => (this.picking = false)}
            >
              ${common.cancel}
            </button>
          </div>`
        : nothing}
      <div class="${ui.section} ${ui.grid}">
        ${this.segmenter
          ? nothing
          : rangeInput({
              label: background.tolerance,
              value: this.tolerance,
              display: this.fmt.number(this.tolerance),
              min: 0,
              max: 60,
              step: 1,
              disabled: this.locked,
              onInput: (value) => (this.tolerance = value),
            })}
        ${rangeInput({
          label: background.softness,
          value: this.feather,
          display: this.feather
            ? `${this.fmt.number(this.feather)} ${common.unitPixels}`
            : background.sharp,
          min: 0,
          max: 6,
          step: 1,
          disabled: this.locked,
          onInput: (value) => (this.feather = value),
        })}
        ${this.segmenter
          ? nothing
          : html`<div class=${ui.label}>
              ${background.backgroundColor}
              <div class="flex items-center gap-2">
                <span
                  class="size-9 shrink-0 rounded-control border border-solid border-line-strong ${this
                    .color
                    ? ""
                    : "checker"}"
                  style=${this.color ? `background:${this.color}` : ""}
                  aria-hidden="true"
                ></span>
                <span class="min-w-0 flex-1 truncate text-body"
                  >${this.color
                    ? html`<bdi class=${ui.mono} dir="ltr">${this.color}</bdi>`
                    : background.detected}</span
                >
                <button
                  class=${ui.small}
                  type="button"
                  ?disabled=${this.locked || !file}
                  @click=${() => void this.startPicking()}
                >
                  ${icon("pipette")} ${background.pick}
                </button>
                ${this.color
                  ? html`<button
                      class=${ui.small}
                      type="button"
                      @click=${() => (this.color = undefined)}
                    >
                      ${background.auto}
                    </button>`
                  : nothing}
              </div>
            </div>`}
        <div class=${ui.label}>
          ${background.replaceWith}
          <div class="flex items-center gap-2">
            <div
              class=${ui.segmented}
              role="group"
              aria-label=${background.replaceWith}
            >
              <button
                class=${ui.segment}
                type="button"
                aria-pressed=${String(!this.background)}
                ?disabled=${this.locked}
                @click=${() => (this.background = undefined)}
              >
                ${background.transparency}
              </button>
              <button
                class=${ui.segment}
                type="button"
                aria-pressed=${String(Boolean(this.background))}
                ?disabled=${this.locked}
                @click=${() => (this.background ??= "#ffffff")}
              >
                ${background.color}
              </button>
            </div>
            ${this.background
              ? html`<input
                  class="h-9 w-12 shrink-0 cursor-pointer rounded-control border border-solid border-line-strong bg-field p-1"
                  type="color"
                  aria-label=${background.fillColor}
                  .value=${this.background}
                  @input=${(event: Event) =>
                    (this.background = (
                      event.currentTarget as HTMLInputElement
                    ).value)}
                />`
              : nothing}
          </div>
        </div>
        ${formatSelect({
          value: this.format,
          messages: common,
          keepLabel: background.keepFormat,
          disabled: this.locked,
          onChange: (format) => (this.format = format),
        })}
        ${this.segmenter
          ? nothing
          : html`<label class="${ui.check} self-end sm:h-9">
              <input
                type="checkbox"
                .checked=${this.contiguous}
                ?disabled=${this.locked}
                @change=${(event: Event) =>
                  (this.contiguous = (
                    event.currentTarget as HTMLInputElement
                  ).checked)}
              />
              ${background.contiguous}
            </label>`}
      </div>
    `;
  }

  protected renderResults() {
    return this.renderImageResults(
      this.output,
      (result) => {
        const removal = result as BackgroundRemovalResult;
        return `${describeSize(removal, this.fmt)} · ${this.msg(
          this.t.background.removed,
          { percent: this.fmt.percent(removal.removed) },
        )}`;
      },
      {
        extra: (result) => {
          const original = this.sourceOf(result as BackgroundRemovalResult);
          return original
            ? this.renderCompare(
                this.urlFor(original),
                this.urlFor(result.blob),
                {
                  checker: true,
                  label: this.t.background.compareLabel,
                },
              )
            : nothing;
        },
      },
    );
  }
}

export function defineBackgroundRemover(): void {
  register(BACKGROUND_REMOVER_TAG, BackgroundRemoverElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "pixelshift-background-remover": BackgroundRemoverElement;
  }
}
