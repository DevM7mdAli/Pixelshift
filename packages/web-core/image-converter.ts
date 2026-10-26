import {
  convertImage,
  formatBytes,
  type ConversionResult,
  type OutputFormat,
} from "pixelshift-core";
import { html, type PropertyDeclarations } from "lit";
import { PixelshiftTool, register } from "./base.js";
import {
  describeSavings,
  formatOptions,
  numberInput,
  positiveNumberOrUndefined,
  rangeInput,
  selectField,
} from "./fields.js";
import { ui } from "./ui.js";

export const IMAGE_CONVERTER_TAG = "pixelshift-image-converter";

/**
 * `<pixelshift-image-converter>` — converts PNG, JPEG, WebP, GIF, and BMP to
 * PNG, JPEG, or WebP, optionally downscaling. Set `format="webp"` for a WebP
 * converter.
 *
 * Besides the shared `process-*` events it keeps its original
 * `conversion-start`, `conversion-complete`, and `conversion-error` events,
 * and stays fail-fast: one failed file rejects the whole batch.
 */
export class ImageConverterElement extends PixelshiftTool<ConversionResult> {
  static get properties(): PropertyDeclarations {
    return {
      format: { type: String },
      quality: { type: Number },
      maxWidth: { type: Number, attribute: "max-width" },
      maxHeight: { type: Number, attribute: "max-height" },
      multiple: { type: Boolean },
    };
  }

  format: OutputFormat = "webp";
  quality = 0.85;
  maxWidth: number | undefined;
  maxHeight: number | undefined;
  multiple = false;

  protected get defaultHeading() {
    return "Image converter";
  }
  protected get defaultDescription() {
    return "Convert images locally in your browser.";
  }
  protected get actionLabel() {
    return "Convert";
  }
  protected get busyLabel() {
    return "Converting";
  }
  protected get allowsMultiple() {
    return this.multiple;
  }
  protected get failFast() {
    return true;
  }

  /** Converts every selected file. Resolves with `[]` if any of them fails. */
  convert(): Promise<ConversionResult[]> {
    return this.process();
  }

  protected processFile(file: File, signal: AbortSignal) {
    return convertImage(file, {
      format: this.format,
      quality: this.quality,
      signal,
      ...(this.maxWidth ? { maxWidth: this.maxWidth } : {}),
      ...(this.maxHeight ? { maxHeight: this.maxHeight } : {}),
    });
  }

  protected onStart(files: File[]): void {
    this.emit("conversion-start");
    super.onStart(files);
  }

  protected onComplete(results: ConversionResult[]): void {
    this.emit("conversion-complete", results);
    super.onComplete(results);
  }

  protected onFailure(file: File, error: unknown): void {
    this.emit("conversion-error", error);
    super.onFailure(file, error);
  }

  protected renderSettings() {
    return html`
      <div class="${ui.section} ${ui.grid}">
        ${selectField({
          label: "Output format",
          value: this.format,
          options: formatOptions(),
          disabled: this.locked,
          onChange: (format) => (this.format = format),
        })}
        ${rangeInput({
          label: "Quality",
          value: this.quality,
          display:
            this.format === "png"
              ? "Lossless"
              : `${Math.round(this.quality * 100)}%`,
          min: 0.1,
          max: 1,
          step: 0.05,
          disabled: this.locked || this.format === "png",
          onInput: (value) => (this.quality = value),
        })}
        ${numberInput({
          label: "Maximum width",
          value: this.maxWidth,
          placeholder: "Original",
          disabled: this.locked,
          onInput: (value) =>
            (this.maxWidth = positiveNumberOrUndefined(value)),
        })}
        ${numberInput({
          label: "Maximum height",
          value: this.maxHeight,
          placeholder: "Original",
          disabled: this.locked,
          onInput: (value) =>
            (this.maxHeight = positiveNumberOrUndefined(value)),
        })}
      </div>
    `;
  }

  protected renderResults() {
    return this.renderImageResults(
      this.output,
      (result) =>
        `${result.width}×${result.height} · ${formatBytes(result.convertedSize)} · ${describeSavings(result)}`,
    );
  }
}

export function defineImageConverter(): void {
  register(IMAGE_CONVERTER_TAG, ImageConverterElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "pixelshift-image-converter": ImageConverterElement;
  }
}
