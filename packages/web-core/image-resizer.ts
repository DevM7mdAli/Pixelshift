import {
  planResize,
  resizeImage,
  type FitMode,
  type ImageResult,
  type OutputFormat,
  type ResizeOptions,
  type Size,
} from "pixelshift-core";
import { html, nothing, type PropertyDeclarations } from "lit";
import { PixelshiftTool, register } from "./base.js";
import {
  describeSize,
  formatSelect,
  numberInput,
  positiveNumberOrUndefined,
  rangeInput,
  selectField,
} from "./fields.js";
import { icon } from "./icons.js";
import { ui } from "./ui.js";

export const IMAGE_RESIZER_TAG = "pixelshift-image-resizer";

const FIT_LABELS: Record<FitMode, string> = {
  cover: "Crop to fill",
  contain: "Fit and pad",
  fill: "Stretch",
  inside: "Fit inside",
};

/**
 * `<pixelshift-image-resizer>` — resizes to exact pixels or a percentage,
 * with an aspect-ratio lock and cover/contain/fill/inside fitting. Unlike the
 * converter's maximum dimensions, it also enlarges unless `no-upscale` is set.
 */
export class ImageResizerElement extends PixelshiftTool<ImageResult> {
  static get properties(): PropertyDeclarations {
    return {
      width: { type: Number },
      height: { type: Number },
      percent: { type: Number },
      unit: { type: String },
      keepAspectRatio: {
        type: Boolean,
        attribute: "keep-aspect-ratio",
        converter: {
          fromAttribute: (value: string | null) => value !== "false",
        },
      },
      fit: { type: String },
      format: { type: String },
      quality: { type: Number },
      noUpscale: { type: Boolean, attribute: "no-upscale" },
      multiple: { type: Boolean },
      sourceSize: { state: true },
      lastEdited: { state: true },
    };
  }

  width: number | undefined;
  height: number | undefined;
  /** Scale in percent when `unit` is `"percent"`. */
  percent = 50;
  unit: "px" | "percent" = "px";
  /** Derive one dimension from the other. Set `keep-aspect-ratio="false"` to unlock. */
  keepAspectRatio = true;
  /** How to fill both dimensions when the aspect ratio is unlocked. */
  fit: FitMode = "cover";
  format: OutputFormat | undefined;
  quality = 0.9;
  /** Never enlarge beyond the source's own pixels. */
  noUpscale = false;
  multiple = false;

  private sourceSize: Size | undefined;
  private lastEdited: "width" | "height" = "width";

  protected get defaultHeading() {
    return "Image resizer";
  }
  protected get defaultDescription() {
    return "Resize images to exact dimensions or a percentage.";
  }
  protected get actionLabel() {
    return "Resize";
  }
  protected get busyLabel() {
    return "Resizing";
  }
  protected get allowsMultiple() {
    return this.multiple;
  }

  protected processFile(file: File, signal: AbortSignal) {
    return resizeImage(file, {
      ...this.resizeOptions(),
      quality: this.quality,
      signal,
      ...(this.format ? { format: this.format } : {}),
    });
  }

  /** The core options the current controls describe. */
  private resizeOptions(): ResizeOptions {
    const withoutEnlargement = this.noUpscale;
    if (this.unit === "percent") {
      return { scale: Math.max(1, this.percent) / 100, withoutEnlargement };
    }
    if (this.keepAspectRatio || !this.width || !this.height) {
      const side = this.keepAspectRatio
        ? this.lastEdited
        : this.width
          ? "width"
          : "height";
      const value = side === "width" ? this.width : this.height;
      return value
        ? { [side]: value, withoutEnlargement }
        : { withoutEnlargement };
    }
    return {
      width: this.width,
      height: this.height,
      fit: this.fit,
      withoutEnlargement,
    };
  }

  protected filesChanged(): void {
    this.sourceSize = undefined;
    const first = this.selected[0];
    if (!first) return;
    const image = new Image();
    image.onload = () => {
      if (this.selected[0] !== first) return;
      this.sourceSize = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      if (!this.width && !this.height) {
        this.width = image.naturalWidth;
        this.height = image.naturalHeight;
      }
    };
    image.src = this.urlFor(first);
  }

  private setDimension(side: "width" | "height", value: string): void {
    const number = positiveNumberOrUndefined(value);
    this.lastEdited = side;
    this[side] = number ? Math.round(number) : undefined;
    if (this.keepAspectRatio && this.sourceSize && number) {
      const ratio = this.sourceSize.width / this.sourceSize.height;
      if (side === "width")
        this.height = Math.max(1, Math.round(number / ratio));
      else this.width = Math.max(1, Math.round(number * ratio));
    }
  }

  protected renderSettings() {
    const preview = this.sourceSize
      ? planResize(this.sourceSize, this.resizeOptions())
      : undefined;

    return html`
      <div class="${ui.section} grid gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class=${ui.segmented} role="group" aria-label="Resize by">
            ${(["px", "percent"] as const).map(
              (unit) =>
                html`<button
                  class=${ui.segment}
                  type="button"
                  aria-pressed=${String(this.unit === unit)}
                  ?disabled=${this.locked}
                  @click=${() => (this.unit = unit)}
                >
                  ${unit === "px" ? "Pixels" : "Percentage"}
                </button>`,
            )}
          </div>
          ${this.sourceSize
            ? html`<span class="text-xs tabular-nums text-muted"
                >${this.sourceSize.width}×${this.sourceSize.height}
                ${preview
                  ? html`→
                      <span class="text-ink"
                        >${preview.width}×${preview.height}</span
                      >`
                  : nothing}</span
              >`
            : nothing}
        </div>

        ${this.unit === "percent"
          ? rangeInput({
              label: "Scale",
              value: this.percent,
              display: `${this.percent}%`,
              min: 5,
              max: 200,
              step: 5,
              disabled: this.locked,
              onInput: (value) => (this.percent = value),
            })
          : html`
              <div
                class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2"
              >
                ${numberInput({
                  label: "Width",
                  value: this.width,
                  placeholder: "Auto",
                  suffix: "px",
                  disabled: this.locked,
                  onInput: (value) => this.setDimension("width", value),
                })}
                <button
                  class="${ui.icon} mb-0.5 aria-pressed:text-ink"
                  type="button"
                  aria-pressed=${String(this.keepAspectRatio)}
                  aria-label="Keep aspect ratio"
                  title="Keep aspect ratio"
                  ?disabled=${this.locked}
                  @click=${() => (this.keepAspectRatio = !this.keepAspectRatio)}
                >
                  ${icon(this.keepAspectRatio ? "link" : "unlink")}
                </button>
                ${numberInput({
                  label: "Height",
                  value: this.height,
                  placeholder: "Auto",
                  suffix: "px",
                  disabled: this.locked,
                  onInput: (value) => this.setDimension("height", value),
                })}
              </div>
            `}

        <div class=${ui.grid}>
          ${this.unit === "px" && !this.keepAspectRatio
            ? selectField({
                label: "Fit",
                value: this.fit,
                options: (Object.keys(FIT_LABELS) as FitMode[]).map((fit) => ({
                  value: fit,
                  label: FIT_LABELS[fit],
                })),
                disabled: this.locked,
                onChange: (fit) => (this.fit = fit),
              })
            : nothing}
          ${formatSelect({
            value: this.format,
            disabled: this.locked,
            onChange: (format) => (this.format = format),
          })}
          <label class="${ui.check} self-end sm:h-9">
            <input
              type="checkbox"
              .checked=${this.noUpscale}
              ?disabled=${this.locked}
              @change=${(event: Event) =>
                (this.noUpscale = (
                  event.currentTarget as HTMLInputElement
                ).checked)}
            />
            Don't enlarge smaller images
          </label>
        </div>
      </div>
    `;
  }

  protected renderResults() {
    return this.renderImageResults(
      this.output,
      (result) =>
        `${result.originalWidth}×${result.originalHeight} → ${describeSize(result)}`,
    );
  }
}

export function defineImageResizer(): void {
  register(IMAGE_RESIZER_TAG, ImageResizerElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "pixelshift-image-resizer": ImageResizerElement;
  }
}
