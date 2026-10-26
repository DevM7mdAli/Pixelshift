import {
  EMBED_SNIPPET_FORMATS,
  createEmbedSnippets,
  formatBytes,
  imageToBase64,
  type Base64Result,
  type EmbedSnippetFormat,
} from "pixelshift-core";
import { html, nothing, type PropertyDeclarations } from "lit";
import { PixelshiftTool, register } from "./base.js";
import { icon } from "./icons.js";
import { ui } from "./ui.js";

export const IMAGE_TO_BASE64_TAG = "pixelshift-image-to-base64";

const SNIPPET_LABELS: Record<EmbedSnippetFormat, string> = {
  dataUrl: "Data URL",
  base64: "Base64",
  html: "HTML",
  css: "CSS",
  markdown: "Markdown",
  json: "JSON",
};

/** Characters shown in the preview; copying and downloading use the full text. */
const PREVIEW_LENGTH = 1500;
const LARGE_EMBED = 50 * 1024;

/**
 * `<pixelshift-image-to-base64>` — encodes an image as a Base64 data URL
 * with ready-to-paste HTML, CSS, Markdown, and JSON snippets. Keeps the
 * original bytes, so SVG, AVIF, and ICO work too.
 */
export class ImageToBase64Element extends PixelshiftTool<Base64Result> {
  static get properties(): PropertyDeclarations {
    return {
      snippet: { type: String },
      alt: { type: String },
    };
  }

  /** The snippet tab shown first. */
  snippet: EmbedSnippetFormat = "dataUrl";
  /** Alt text for the HTML and Markdown snippets. Defaults to the file name. */
  alt: string | undefined;
  auto = true;

  protected get defaultHeading() {
    return "Image to Base64";
  }
  protected get defaultDescription() {
    return "Encode images as Base64 data URLs for embedding in code.";
  }
  protected get actionLabel() {
    return "Encode";
  }
  protected get busyLabel() {
    return "Encoding";
  }
  protected get accept() {
    return "image/*";
  }
  protected get acceptHint() {
    return "Any image, including SVG and ICO";
  }

  protected processFile(file: File, signal: AbortSignal) {
    return imageToBase64(file, { signal });
  }

  protected renderBody() {
    if (!this.selected.length) return this.renderDropzone();
    const result = this.output[0];
    const file = this.selected[0]!;

    return html`
      <div class=${ui.row}>
        <img class="${ui.thumb} checker" src=${this.urlFor(file)} alt="" />
        <div class="min-w-0 flex-1">
          <p class=${ui.name}>${file.name}</p>
          <p class=${ui.meta}>
            ${result
              ? html`${result.mimeType} · ${formatBytes(result.originalSize)} →
                ${formatBytes(result.encodedSize)} encoded
                (+${Math.round(
                  (result.encodedSize / result.originalSize - 1) * 100,
                )}%)`
              : formatBytes(file.size)}
          </p>
        </div>
        ${result
          ? nothing
          : html`<button
              class=${ui.primary}
              type="button"
              ?disabled=${this.locked}
              @click=${() => void this.process()}
            >
              ${this.busy
                ? html`<span class="spinner" aria-hidden="true"></span>`
                : nothing}
              ${this.actionLabel}
            </button>`}
      </div>
      ${this.renderFailures()} ${result ? this.renderSnippets(result) : nothing}
      <div class="mt-4">${this.renderDropzone(true)}</div>
    `;
  }

  private renderSnippets(result: Base64Result) {
    const snippets = createEmbedSnippets(
      result,
      this.alt ? { alt: this.alt } : {},
    );
    const text = snippets[this.snippet];
    const hidden = text.length - PREVIEW_LENGTH;

    return html`
      <div class="mt-4">
        <div class=${ui.tabs} role="tablist" aria-label="Snippet format">
          ${EMBED_SNIPPET_FORMATS.map(
            (format) =>
              html`<button
                class=${ui.tab}
                type="button"
                role="tab"
                aria-selected=${String(this.snippet === format)}
                @click=${() => (this.snippet = format)}
              >
                ${SNIPPET_LABELS[format]}
              </button>`,
          )}
        </div>
        <pre
          class="m-0 mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-control border border-solid border-line bg-sunken p-3 ${ui.mono} leading-5 text-body"
          role="tabpanel"
        ><code>${hidden > 0
          ? text.slice(0, PREVIEW_LENGTH)
          : text}</code>${hidden > 0
          ? html`<span class="text-muted"
              >… ${hidden.toLocaleString()} more characters</span
            >`
          : nothing}</pre>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button
            class=${ui.primary}
            type="button"
            @click=${() =>
              void this.copy(text, `Copied ${SNIPPET_LABELS[this.snippet]}`)}
          >
            ${icon("copy")} Copy ${SNIPPET_LABELS[this.snippet]}
          </button>
          <button
            class=${ui.secondary}
            type="button"
            @click=${() => this.download(text)}
          >
            ${icon("download")} Download .txt
          </button>
          <span class="text-[13px] text-muted" role="status" aria-live="polite"
            >${this.notice}</span
          >
        </div>
        ${this.snippet === "html" || this.snippet === "markdown"
          ? html`<label class="${ui.label} mt-3 max-w-sm">
              Alt text
              <input
                class=${ui.field}
                type="text"
                placeholder=${result.fileName.replace(/\.[^/.]+$/, "")}
                .value=${this.alt ?? ""}
                @input=${(event: Event) =>
                  (this.alt =
                    (event.currentTarget as HTMLInputElement).value ||
                    undefined)}
              />
            </label>`
          : nothing}
        ${result.encodedSize > LARGE_EMBED
          ? html`<p class="m-0 mt-3 text-[13px] text-muted">
              Data URLs over 50 KB slow down the page that embeds them. Compress
              the image first if you can.
            </p>`
          : nothing}
      </div>
    `;
  }

  private download(text: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${this.selected[0]?.name.replace(/\.[^/.]+$/, "") ?? "image"}-${this.snippet}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function defineImageToBase64(): void {
  register(IMAGE_TO_BASE64_TAG, ImageToBase64Element);
}

declare global {
  interface HTMLElementTagNameMap {
    "pixelshift-image-to-base64": ImageToBase64Element;
  }
}
