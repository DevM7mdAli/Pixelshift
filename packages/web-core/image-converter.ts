import {
  OUTPUT_FORMATS,
  convertImages,
  supportsOutputFormat,
  type ConversionResult,
  type OutputFormat,
} from "pixelshift-core";
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { TWStyles } from "./CSS/twlit.js";

export const IMAGE_CONVERTER_TAG = "pixelshift-image-converter";

export class ImageConverterElement extends LitElement {
  static styles = [
    TWStyles,
    css`
      :host {
        display: block;
        color: #0f172a;
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }

      button,
      input,
      select {
        font: inherit;
      }

      .drop-active {
        border-color: #2563eb;
        background: #eff6ff;
      }

      /* Driven by the isDarkMode property (reflected as an attribute), not
         prefers-color-scheme: this element has no way to see a host page's
         own theme state through the shadow boundary, so the consumer sets
         it explicitly instead of it being guessed from the OS preference. */
      :host([is-dark-mode]) {
        color: #f1f5f9;
      }

      :host([is-dark-mode]) .drop-active {
        border-color: #caff45;
        background: rgba(202, 255, 69, 0.14);
      }
    `,
  ];

  @property({ type: String }) format: OutputFormat = "webp";
  @property({ type: Number }) quality = 0.85;
  @property({ type: Number, attribute: "max-width" }) maxWidth:
    | number
    | undefined;
  @property({ type: Number, attribute: "max-height" }) maxHeight:
    | number
    | undefined;
  @property({ type: Boolean }) multiple = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, attribute: "is-dark-mode", reflect: true })
  isDarkMode = false;

  @state() private files: File[] = [];
  @state() private results: ConversionResult[] = [];
  @state() private resultUrls: string[] = [];
  @state() private converting = false;
  @state() private dragging = false;
  @state() private errorMessage = "";

  disconnectedCallback(): void {
    this.revokeResultUrls();
    super.disconnectedCallback();
  }

  /**
   * Resolves each role to a Tailwind class string from the palette in
   * tailwind.config.cjs, so render() names roles rather than repeating
   * shade picks at every call site.
   */
  private themeClasses() {
    return this.isDarkMode
      ? {
          panel: "border-panel-border-dark bg-panel-dark",
          heading: "text-heading-dark",
          body: "text-body-dark",
          dropzoneBorder:
            "border-field-border-dark hover:border-drag-dark hover:bg-hover-surface-dark",
          strong: "text-strong-dark",
          muted: "text-muted-dark",
          label: "text-label-dark",
          field: "border-field-border-dark bg-field-dark text-heading-dark",
          resetButton:
            "border-field-border-dark text-label-dark hover:bg-hover-surface-dark",
          danger: "bg-danger-surface-dark text-danger-text-dark",
          resultBorder: "border-panel-border-dark",
          preview: "bg-preview-dark",
          accent:
            "bg-accent-dark text-accent-content-dark hover:bg-accent-dark-hover",
        }
      : {
          panel: "border-panel-border bg-panel",
          heading: "text-heading",
          body: "text-body",
          dropzoneBorder:
            "border-field-border hover:border-drag hover:bg-hover-surface",
          strong: "text-strong",
          muted: "text-muted",
          label: "text-label",
          field: "border-field-border bg-field text-heading",
          resetButton: "border-field-border text-label hover:bg-hover-surface",
          danger: "bg-danger-surface text-danger-text",
          resultBorder: "border-panel-border",
          preview: "bg-preview",
          accent: "bg-accent text-accent-content hover:bg-accent-hover",
        };
  }

  render() {
    const theme = this.themeClasses();

    return html`
      <section
        class="mx-auto box-border w-full min-w-0 max-w-3xl rounded-2xl border p-4 shadow-lg sm:p-5 ${theme.panel}"
      >
        <header class="mb-5">
          <h2 class="m-0 text-2xl font-bold ${theme.heading}">
            Image converter
          </h2>
          <p class="mb-0 mt-1 text-sm ${theme.body}">
            Convert images locally in your browser.
          </p>
        </header>

        <label
          class=${`block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition sm:p-8 ${
            this.dragging ? "drop-active" : theme.dropzoneBorder
          }`}
          @dragover=${this.onDragOver}
          @dragleave=${this.onDragLeave}
          @drop=${this.onDrop}
        >
          <span class="block font-semibold ${theme.strong}"
            >Drop images here or browse</span
          >
          <span class="mt-1 block text-xs ${theme.muted}"
            >PNG, JPEG, WebP, GIF or BMP</span
          >
          <input
            class="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
            ?multiple=${this.multiple}
            ?disabled=${this.disabled}
            @change=${this.onFileInput}
          />
        </label>

        ${this.files.length
          ? html`<p class="my-3 text-sm ${theme.body}">
              ${this.files.length} image(s) selected
            </p>`
          : nothing}

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <label class="grid min-w-0 gap-1 text-sm font-medium ${theme.label}">
            Output format
            <select
              class="box-border w-full min-w-0 rounded-lg border px-3 py-2 ${theme.field}"
              .value=${this.format}
              ?disabled=${this.disabled || this.converting}
              @change=${this.onFormatChange}
            >
              ${OUTPUT_FORMATS.map(
                (format) => html`
                  <option
                    value=${format}
                    ?disabled=${!supportsOutputFormat(format)}
                  >
                    ${format.toUpperCase()}
                  </option>
                `,
              )}
            </select>
          </label>

          <label class="grid min-w-0 gap-1 text-sm font-medium ${theme.label}">
            Quality: ${Math.round(this.quality * 100)}%
            <input
              class="box-border w-full min-w-0"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              .value=${String(this.quality)}
              ?disabled=${this.disabled ||
              this.converting ||
              this.format === "png"}
              @input=${this.onQualityInput}
            />
          </label>

          <label class="grid min-w-0 gap-1 text-sm font-medium ${theme.label}">
            Maximum width
            <input
              class="box-border w-full min-w-0 rounded-lg border px-3 py-2 ${theme.field}"
              type="number"
              min="1"
              placeholder="Original"
              .value=${this.maxWidth ? String(this.maxWidth) : ""}
              ?disabled=${this.disabled || this.converting}
              @input=${this.onMaxWidthInput}
            />
          </label>

          <label class="grid min-w-0 gap-1 text-sm font-medium ${theme.label}">
            Maximum height
            <input
              class="box-border w-full min-w-0 rounded-lg border px-3 py-2 ${theme.field}"
              type="number"
              min="1"
              placeholder="Original"
              .value=${this.maxHeight ? String(this.maxHeight) : ""}
              ?disabled=${this.disabled || this.converting}
              @input=${this.onMaxHeightInput}
            />
          </label>
        </div>

        <div class="mt-5 flex flex-wrap gap-3">
          <button
            class="rounded-lg px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${theme.accent}"
            type="button"
            ?disabled=${this.disabled ||
            this.converting ||
            this.files.length === 0}
            @click=${this.convert}
          >
            ${this.converting ? "Converting…" : "Convert"}
          </button>
          <button
            class="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50 ${theme.resetButton}"
            type="button"
            ?disabled=${this.disabled ||
            this.converting ||
            (this.files.length === 0 && this.results.length === 0)}
            @click=${this.reset}
          >
            Reset
          </button>
        </div>

        ${this.errorMessage
          ? html`<p
              class="mt-4 rounded-lg p-3 text-sm ${theme.danger}"
              role="alert"
            >
              ${this.errorMessage}
            </p>`
          : nothing}
        ${this.results.length
          ? html`
              <ul class="mt-5 grid list-none gap-3 p-0">
                ${this.results.map(
                  (result, index) => html`
                    <li
                      class="flex flex-col items-stretch gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-4 ${theme.resultBorder}"
                    >
                      <img
                        class="h-16 w-16 shrink-0 self-start rounded-lg object-contain ${theme.preview}"
                        src=${this.resultUrls[index] ?? ""}
                        alt="Converted preview"
                      />
                      <div class="min-w-0 flex-1">
                        <p class="m-0 truncate font-medium">
                          ${result.file.name}
                        </p>
                        <p class="m-0 mt-1 text-xs ${theme.muted}">
                          ${result.width}×${result.height} ·
                          ${formatBytes(result.convertedSize)}
                        </p>
                      </div>
                      <a
                        class="box-border w-full rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white no-underline sm:w-auto"
                        href=${this.resultUrls[index] ?? ""}
                        download=${result.file.name}
                        >Download</a
                      >
                    </li>
                  `,
                )}
              </ul>
            `
          : nothing}
      </section>
    `;
  }

  async convert(): Promise<ConversionResult[]> {
    if (!this.files.length || this.converting || this.disabled) {
      return [];
    }

    this.converting = true;
    this.errorMessage = "";
    this.dispatchEvent(
      new CustomEvent("conversion-start", { bubbles: true, composed: true }),
    );

    try {
      const options = {
        format: this.format,
        quality: this.quality,
        ...(this.maxWidth ? { maxWidth: this.maxWidth } : {}),
        ...(this.maxHeight ? { maxHeight: this.maxHeight } : {}),
      };
      const results = await convertImages(this.files, options);
      this.revokeResultUrls();
      this.results = results;
      this.resultUrls = results.map(({ blob }) => URL.createObjectURL(blob));
      this.dispatchEvent(
        new CustomEvent<ConversionResult[]>("conversion-complete", {
          detail: results,
          bubbles: true,
          composed: true,
        }),
      );
      return results;
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : "Image conversion failed.";
      this.dispatchEvent(
        new CustomEvent("conversion-error", {
          detail: error,
          bubbles: true,
          composed: true,
        }),
      );
      return [];
    } finally {
      this.converting = false;
    }
  }

  reset(): void {
    this.revokeResultUrls();
    this.files = [];
    this.results = [];
    this.errorMessage = "";
  }

  private selectFiles(files: FileList | readonly File[]): void {
    this.files = Array.from(files).slice(0, this.multiple ? undefined : 1);
    this.results = [];
    this.errorMessage = "";
    this.dispatchEvent(
      new CustomEvent<File[]>("files-selected", {
        detail: this.files,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onFileInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    if (input.files) {
      this.selectFiles(input.files);
    }
  }

  private onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled) this.dragging = true;
  }

  private onDragLeave(): void {
    this.dragging = false;
  }

  private onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    if (!this.disabled && event.dataTransfer?.files.length) {
      this.selectFiles(event.dataTransfer.files);
    }
  }

  private onFormatChange(event: Event): void {
    this.format = (event.currentTarget as HTMLSelectElement)
      .value as OutputFormat;
  }

  private onQualityInput(event: Event): void {
    this.quality = Number((event.currentTarget as HTMLInputElement).value);
  }

  private onMaxWidthInput(event: Event): void {
    this.maxWidth = positiveNumberOrUndefined(
      (event.currentTarget as HTMLInputElement).value,
    );
  }

  private onMaxHeightInput(event: Event): void {
    this.maxHeight = positiveNumberOrUndefined(
      (event.currentTarget as HTMLInputElement).value,
    );
  }

  private revokeResultUrls(): void {
    this.resultUrls.forEach((url) => URL.revokeObjectURL(url));
    this.resultUrls = [];
  }
}

export function defineImageConverter(): void {
  if (
    typeof customElements !== "undefined" &&
    !customElements.get(IMAGE_CONVERTER_TAG)
  ) {
    customElements.define(IMAGE_CONVERTER_TAG, ImageConverterElement);
  }
}

function positiveNumberOrUndefined(value: string): number | undefined {
  const number = Number(value);
  return number > 0 ? number : undefined;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

declare global {
  interface HTMLElementTagNameMap {
    "pixelshift-image-converter": ImageConverterElement;
  }
}
