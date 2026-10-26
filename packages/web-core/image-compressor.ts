import {
  compressImage,
  formatBytes,
  type CompressionResult,
  type OutputFormat,
} from "pixelshift-core";
import { html, nothing, type PropertyDeclarations } from "lit";
import { PixelshiftTool, register } from "./base.js";
import {
  formatSelect,
  numberInput,
  parseByteSize,
  positiveNumberOrUndefined,
  rangeInput,
} from "./fields.js";
import { ui } from "./ui.js";

export const IMAGE_COMPRESSOR_TAG = "pixelshift-image-compressor";

/**
 * `<pixelshift-image-compressor>` — shrinks JPEG, PNG, and WebP files while
 * keeping their format. PNGs are quantized to an indexed palette; JPEG and
 * WebP are re-encoded, optionally searching for the quality that fits
 * `target-size` (e.g. `target-size="200kb"`). A file never comes back larger
 * than it went in.
 */
export class ImageCompressorElement extends PixelshiftTool<CompressionResult> {
  static get properties(): PropertyDeclarations {
    return {
      quality: { type: Number },
      format: { type: String },
      targetSize: {
        attribute: "target-size",
        converter: { fromAttribute: parseByteSize },
      },
      maxWidth: { type: Number, attribute: "max-width" },
      multiple: { type: Boolean },
      comparing: { state: true },
    };
  }

  /** Starting JPEG/WebP quality, 0–1. */
  quality = 0.8;
  /** Output format; unset keeps each file's own format. */
  format: OutputFormat | undefined;
  /** Upper bound in bytes. The attribute also accepts `"200kb"` or `"1.5mb"`. */
  targetSize: number | undefined;
  /** Downscale wider images while compressing. */
  maxWidth: number | undefined;
  multiple = false;

  private comparing: CompressionResult | undefined;

  protected get defaultHeading() {
    return "Image compressor";
  }
  protected get defaultDescription() {
    return "Reduce file size of JPEG, PNG, and WebP images without visible quality loss.";
  }
  protected get actionLabel() {
    return "Compress";
  }
  protected get busyLabel() {
    return "Compressing";
  }
  protected get allowsMultiple() {
    return this.multiple;
  }

  protected processFile(file: File, signal: AbortSignal) {
    return compressImage(file, {
      quality: this.quality,
      signal,
      ...(this.format ? { format: this.format } : {}),
      ...(this.targetSize ? { targetBytes: this.targetSize } : {}),
      ...(this.maxWidth ? { maxWidth: this.maxWidth } : {}),
    });
  }

  protected filesChanged(): void {
    this.comparing = undefined;
  }

  protected renderSettings() {
    return html`
      <div class="${ui.section} ${ui.grid}">
        ${rangeInput({
          label: "Quality",
          value: this.quality,
          display: `${Math.round(this.quality * 100)}%`,
          min: 0.1,
          max: 1,
          step: 0.05,
          disabled: this.locked,
          onInput: (value) => (this.quality = value),
        })}
        ${formatSelect({
          value: this.format,
          disabled: this.locked,
          onChange: (format) => (this.format = format),
        })}
        ${numberInput({
          label: "Target size",
          value: this.targetSize
            ? Math.round(this.targetSize / 1024)
            : undefined,
          placeholder: "No limit",
          suffix: "KB",
          disabled: this.locked,
          onInput: (value) => {
            const kilobytes = positiveNumberOrUndefined(value);
            this.targetSize = kilobytes ? kilobytes * 1024 : undefined;
          },
        })}
        ${numberInput({
          label: "Maximum width",
          value: this.maxWidth,
          placeholder: "Original",
          suffix: "px",
          disabled: this.locked,
          onInput: (value) =>
            (this.maxWidth = positiveNumberOrUndefined(value)),
        })}
      </div>
    `;
  }

  protected renderResults() {
    if (!this.output.length) return nothing;
    const before = this.output.reduce(
      (sum, result) => sum + result.originalSize,
      0,
    );
    const after = this.output.reduce(
      (sum, result) => sum + result.convertedSize,
      0,
    );

    return html`
      ${this.output.length > 1
        ? html`<p class="m-0 mt-4 text-sm text-body">
            Saved
            <strong class="font-semibold text-ink"
              >${formatBytes(before - after)}</strong
            >
            (${Math.round((1 - after / before) * 100)}%) across
            ${this.output.length} images.
          </p>`
        : nothing}
      ${this.renderImageResults(
        this.output,
        (result) => {
          const compressed = result as CompressionResult;
          return html`${formatBytes(compressed.originalSize)} →
            ${formatBytes(compressed.convertedSize)}
            <span
              class=${compressed.savings > 0.005
                ? "font-medium text-success"
                : ""}
              >${compressed.unchanged
                ? "· already optimal"
                : `· ${Math.max(0, Math.round(compressed.savings * 100))}% smaller`}</span
            >${compressed.targetMet ? "" : " · above target"}`;
        },
        {
          actions: (result) =>
            this.sourceOf(result as CompressionResult)
              ? html`<button
                  class=${ui.small}
                  type="button"
                  aria-expanded=${String(this.comparing === result)}
                  @click=${() =>
                    (this.comparing =
                      this.comparing === result
                        ? undefined
                        : (result as CompressionResult))}
                >
                  ${this.comparing === result ? "Hide" : "Compare"}
                </button>`
              : nothing,
          extra: (result) => {
            const original = this.sourceOf(result as CompressionResult);
            return original && this.comparing === result
              ? this.renderCompare(
                  this.urlFor(original),
                  this.urlFor(result.blob),
                )
              : nothing;
          },
        },
      )}
    `;
  }
}

export function defineImageCompressor(): void {
  register(IMAGE_COMPRESSOR_TAG, ImageCompressorElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "pixelshift-image-compressor": ImageCompressorElement;
  }
}
