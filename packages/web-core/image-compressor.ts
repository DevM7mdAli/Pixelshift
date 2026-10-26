import {
  compressImage,
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
import type { CompressorMessages } from "./i18n.js";
import { ui } from "./ui.js";

export const IMAGE_COMPRESSOR_TAG = "pixelshift-image-compressor";

export const compressorMessages: CompressorMessages = {
  heading: "Image compressor",
  description:
    "Reduce file size of JPEG, PNG, and WebP images without visible quality loss.",
  action: "Compress",
  busy: "Compressing",
  targetSize: "Target size",
  savedSummary: {
    one: "Saved {saved} ({percent}) on {count} image.",
    other: "Saved {saved} ({percent}) across {count} images.",
  },
  alreadyOptimal: "already optimal",
  aboveTarget: "above target",
};

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

  protected get messageDefaults() {
    return { compressor: compressorMessages };
  }
  protected get toolMessages() {
    return this.t.compressor;
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
    const common = this.t.common;
    return html`
      <div class="${ui.section} ${ui.grid}">
        ${rangeInput({
          label: common.quality,
          value: this.quality,
          display: this.fmt.percent(this.quality),
          min: 0.1,
          max: 1,
          step: 0.05,
          disabled: this.locked,
          onInput: (value) => (this.quality = value),
        })}
        ${formatSelect({
          value: this.format,
          messages: common,
          disabled: this.locked,
          onChange: (format) => (this.format = format),
        })}
        ${numberInput({
          label: this.t.compressor.targetSize,
          value: this.targetSize
            ? Math.round(this.targetSize / 1024)
            : undefined,
          placeholder: common.placeholderNoLimit,
          suffix: common.unitKilobytes,
          disabled: this.locked,
          onInput: (value) => {
            const kilobytes = positiveNumberOrUndefined(value);
            this.targetSize = kilobytes ? kilobytes * 1024 : undefined;
          },
        })}
        ${numberInput({
          label: common.maximumWidth,
          value: this.maxWidth,
          placeholder: common.placeholderOriginal,
          suffix: common.unitPixels,
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
            ${this.plural(this.t.compressor.savedSummary, this.output.length, {
              saved: this.fmt.bytes(before - after),
              percent: this.fmt.percent(1 - after / before),
            })}
          </p>`
        : nothing}
      ${this.renderImageResults(
        this.output,
        (result) => {
          const compressed = result as CompressionResult;
          const { common, compressor } = this.t;
          return html`${this.msg(common.sizeChange, {
              from: this.fmt.bytes(compressed.originalSize),
              to: this.fmt.bytes(compressed.convertedSize),
            })}
            ·
            <span
              class=${compressed.savings > 0.005
                ? "font-medium text-success"
                : ""}
              >${compressed.unchanged
                ? compressor.alreadyOptimal
                : this.msg(common.smaller, {
                    percent: this.fmt.percent(Math.max(0, compressed.savings)),
                  })}</span
            >${compressed.targetMet ? "" : ` · ${compressor.aboveTarget}`}`;
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
                  ${this.comparing === result
                    ? this.t.common.hideCompare
                    : this.t.common.compare}
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
