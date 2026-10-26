import {
  INPUT_ACCEPT,
  ImageConversionError,
  createZip,
  type ImageResult,
} from "pixelshift-core";
import {
  LitElement,
  html,
  nothing,
  type CSSResultGroup,
  type PropertyDeclarations,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { TWStyles } from "./CSS/twlit.js";
import {
  LocaleController,
  commonMessages,
  errorMessages,
  formatMessage,
  selectPlural,
  type Formatters,
  type PixelshiftMessages,
  type PixelshiftMessagesInput,
  type Plural,
  type ToolMessages,
} from "./i18n.js";
import { icon } from "./icons.js";
import { themeStyles } from "./theme.js";
import { ui } from "./ui.js";

export interface FileFailure {
  file: File;
  error: unknown;
}

export interface ProcessProgress {
  done: number;
  total: number;
}

type Renderable = TemplateResult | typeof nothing;

/**
 * Shared chrome and lifecycle for every Pixelshift tool: file intake (drop,
 * browse, paste), batch processing with per-file errors and cancellation,
 * result downloads, theming, and object-URL cleanup.
 *
 * Reactive properties are declared in a static getter instead of decorators
 * so bundlers can tree-shake any tool a consumer never imports.
 *
 * Every string comes from the message catalog (see `i18n.ts`), resolved for
 * the element's `locale` or the nearest `lang` attribute. Layout uses logical
 * properties, so the chrome mirrors under `dir="rtl"`; image-space controls
 * (crop box, comparison slider) stay physical on purpose.
 *
 * Events, all bubbling and composed:
 * - `files-selected` — `File[]`
 * - `process-start` — `File[]`
 * - `process-complete` — the tool's results
 * - `process-error` — `{ file, error }`, once per failed file
 */
export abstract class PixelshiftTool<TResult = ImageResult> extends LitElement {
  static get properties(): PropertyDeclarations {
    return {
      disabled: { type: Boolean, reflect: true },
      isDarkMode: { type: Boolean, attribute: "is-dark-mode", reflect: true },
      bare: { type: Boolean, reflect: true },
      auto: { type: Boolean },
      heading: { type: String },
      description: { type: String },
      locale: { type: String },
      messages: { attribute: false },
      selected: { state: true },
      output: { state: true },
      failures: { state: true },
      busy: { state: true },
      dragging: { state: true },
      progress: { state: true },
      notice: { state: true },
    };
  }

  static get styles(): CSSResultGroup {
    return [TWStyles, themeStyles];
  }

  /** Blocks all interaction. */
  disabled = false;
  /** Switches to the dark palette. */
  isDarkMode = false;
  /** Drops the panel border, padding, and header — for embedding in your own layout. */
  bare = false;
  /** Process as soon as files arrive instead of waiting for the action button. */
  auto = false;
  /** Replaces the default title. */
  heading: string | undefined;
  /** Replaces the default subtitle. */
  description: string | undefined;
  /** BCP 47 locale such as `"ar"`. Defaults to the nearest `lang` attribute. */
  locale: string | undefined;
  /** Translations or overrides for this element only. */
  messages: PixelshiftMessagesInput | undefined;

  protected selected: File[] = [];
  protected output: TResult[] = [];
  protected failures: FileFailure[] = [];
  protected busy = false;
  protected dragging = false;
  protected progress: ProcessProgress | undefined;
  /** Transient status such as "Copied". */
  protected notice = "";

  private controller: AbortController | undefined;
  private running: Promise<void> | undefined;
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly urls = new Map<Blob, string>();
  private readonly sources = new WeakMap<object, File>();

  protected readonly i18n = new LocaleController<PixelshiftMessages>(
    this,
    () =>
      ({
        common: commonMessages,
        errors: errorMessages,
        ...this.messageDefaults,
      }) as PixelshiftMessages,
  );

  /**
   * The English catalog sections this tool renders, e.g.
   * `{ compressor: compressorMessages }`. Only these sections are bundled
   * with the tool and looked up in registered translations.
   */
  protected abstract get messageDefaults(): Partial<PixelshiftMessages>;
  /** Heading, description, and action labels for this tool. */
  protected abstract get toolMessages(): ToolMessages;
  protected abstract processFile(
    file: File,
    signal: AbortSignal,
  ): Promise<TResult>;

  /** Whether more than one file may be selected. */
  protected get allowsMultiple(): boolean {
    return false;
  }

  /** The `accept` attribute of the file input. */
  protected get accept(): string {
    return INPUT_ACCEPT;
  }

  /** The formats line under the dropzone prompt. */
  protected get acceptHint(): string {
    return this.t.common.acceptFormats;
  }

  /** The resolved message catalog for this element's locale. */
  protected get t(): PixelshiftMessages {
    return this.i18n.messages;
  }

  /** Number, percent, byte, and dimension formatting for the locale. */
  protected get fmt(): Formatters {
    return this.i18n.formatters;
  }

  /** Fills a message's `{placeholders}`. */
  protected msg(
    template: string,
    values?: Record<string, string | number>,
  ): string {
    return formatMessage(template, values);
  }

  /** Picks the plural form for `count`; `{count}` is formatted for the locale. */
  protected plural(
    forms: Plural,
    count: number,
    values: Record<string, string | number> = {},
  ): string {
    return formatMessage(selectPlural(forms, count, this.i18n.locale), {
      ...values,
      count: this.fmt.number(count),
    });
  }

  /** A localized message for a failure, keyed by the core's error code. */
  protected errorText(error: unknown): string {
    if (error instanceof ImageConversionError && error.code in this.t.errors) {
      return this.t.errors[error.code];
    }
    return error instanceof Error ? error.message : this.t.common.genericError;
  }

  /** Stop at the first failure and discard partial results. */
  protected get failFast(): boolean {
    return false;
  }

  /** The files waiting to be processed. */
  get files(): readonly File[] {
    return this.selected;
  }

  /** Results of the last completed run. */
  get results(): readonly TResult[] {
    return this.output;
  }

  disconnectedCallback(): void {
    this.cancel();
    this.revokeUrls(new Set());
    clearTimeout(this.noticeTimer);
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.revokeUrls(new Set([...this.selected, ...this.liveBlobs()]));
  }

  /**
   * Replaces the selection programmatically, as if the user had dropped the
   * files. A batch still running for the previous selection is cancelled.
   */
  loadFiles(files: FileList | readonly File[]): void {
    this.cancel();
    const list = Array.from(files);
    this.selected = this.allowsMultiple ? list : list.slice(0, 1);
    this.output = [];
    this.failures = [];
    this.emit("files-selected", this.selected);
    this.filesChanged();
    if (this.auto && this.selected.length) void this.process();
  }

  /**
   * Runs the tool on every selected file. Failures are reported per file.
   * Resolves with `[]` when there is nothing to do, a batch is already
   * running, or the run was cancelled.
   */
  async process(): Promise<TResult[]> {
    // A cancelled batch may still be finishing its current file.
    if (this.busy && this.controller?.signal.aborted) await this.running;
    if (!this.selected.length || this.busy || this.disabled) {
      return [];
    }

    const run = this.runBatch([...this.selected]);
    this.running = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async runBatch(files: File[]): Promise<TResult[]> {
    const controller = new AbortController();
    this.controller = controller;
    this.busy = true;
    this.failures = [];
    this.progress = { done: 0, total: files.length };
    this.onStart(files);

    const results: TResult[] = [];
    const failures: FileFailure[] = [];
    try {
      for (const [index, file] of files.entries()) {
        if (controller.signal.aborted) break;
        try {
          const result = await this.processFile(file, controller.signal);
          if (result && typeof result === "object") {
            this.sources.set(result, file);
          }
          results.push(result);
        } catch (error) {
          if (controller.signal.aborted) break;
          failures.push({ file, error });
          this.onFailure(file, error);
          if (this.failFast) break;
        }
        this.progress = { done: index + 1, total: files.length };
      }

      // Whoever cancelled (new files, reset) owns the state now.
      if (controller.signal.aborted) return [];

      const kept = this.failFast && failures.length ? [] : results;
      this.output = kept;
      this.failures = failures;
      if (!(this.failFast && failures.length)) this.onComplete(kept);
      return kept;
    } finally {
      this.busy = false;
      this.progress = undefined;
      if (this.controller === controller) this.controller = undefined;
    }
  }

  /** Stops a running batch after the current file. */
  cancel(): void {
    this.controller?.abort();
  }

  /** Clears files, results, and errors. */
  reset(): void {
    this.cancel();
    this.selected = [];
    this.output = [];
    this.failures = [];
    this.filesChanged();
  }

  /** Called whenever the selection changes. */
  protected filesChanged(): void {}

  protected onStart(files: File[]): void {
    this.emit("process-start", files);
  }

  protected onComplete(results: TResult[]): void {
    this.emit("process-complete", results);
  }

  protected onFailure(file: File, error: unknown): void {
    this.emit("process-error", { file, error });
  }

  /** The selected file a result was produced from. */
  protected sourceOf(result: TResult): File | undefined {
    return result && typeof result === "object"
      ? this.sources.get(result)
      : undefined;
  }

  /** Blobs whose object URLs must survive the next render. */
  protected liveBlobs(): Blob[] {
    return this.output.flatMap((result) =>
      result && typeof result === "object" && "blob" in result
        ? [(result as { blob: Blob }).blob]
        : [],
    );
  }

  protected emit<T>(name: string, detail?: T): void {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true }),
    );
  }

  /** A cached object URL, revoked automatically once the blob leaves the UI. */
  protected urlFor(blob: Blob): string {
    let url = this.urls.get(blob);
    if (!url) {
      url = URL.createObjectURL(blob);
      this.urls.set(blob, url);
    }
    return url;
  }

  protected flash(message: string): void {
    this.notice = message;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => (this.notice = ""), 1800);
  }

  protected async copy(text: string, label?: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.flash(label ?? this.t.common.copied);
    } catch {
      this.flash(this.t.common.copyFailed);
    }
  }

  protected get locked(): boolean {
    return this.disabled || this.busy;
  }

  render() {
    return html`
      <section
        part="panel"
        class=${this.bare ? ui.bare : ui.panel}
        dir=${this.i18n.direction ?? nothing}
        lang=${this.locale ?? nothing}
        @paste=${this.onPaste}
      >
        ${this.bare ? nothing : this.renderHeader()} ${this.renderBody()}
      </section>
    `;
  }

  protected renderHeader(): Renderable {
    return html`
      <header class="mb-4 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 part="heading" class=${ui.heading}>
            ${this.heading ?? this.toolMessages.heading}
          </h2>
          <p class=${ui.description}>
            ${this.description ?? this.toolMessages.description}
          </p>
        </div>
        ${this.renderHeaderAside()}
      </header>
    `;
  }

  protected renderHeaderAside(): Renderable {
    return nothing;
  }

  /** The batch layout. Interactive tools replace it. */
  protected renderBody(): Renderable {
    return html`
      ${this.renderDropzone()} ${this.renderFileList()} ${this.renderSettings()}
      ${this.renderActions()} ${this.renderFailures()} ${this.renderResults()}
    `;
  }

  protected renderSettings(): Renderable {
    return nothing;
  }

  protected renderResults(): Renderable {
    return nothing;
  }

  protected renderDropzone(compact = this.selected.length > 0): Renderable {
    const multiple = this.allowsMultiple;
    const common = this.t.common;
    return html`
      <label
        part="dropzone"
        class=${`dropzone flex cursor-pointer rounded-control border border-dashed border-line-strong text-center transition-colors duration-150 hover:bg-hover ${
          compact
            ? "items-center justify-center gap-2 px-3 py-2.5"
            : "flex-col items-center justify-center gap-1 bg-sunken px-4 py-8 sm:py-10"
        } ${this.disabled ? "pointer-events-none opacity-50" : ""}`}
        ?data-dragging=${this.dragging}
        @dragover=${this.onDragOver}
        @dragleave=${this.onDragLeave}
        @drop=${this.onDrop}
      >
        <span class="inline-flex text-muted"
          >${icon("upload", compact ? 16 : 20)}</span
        >
        <span class="text-sm font-medium text-ink">
          ${compact
            ? multiple
              ? common.addOrReplace
              : common.chooseDifferent
            : richText(multiple ? common.dropMultiple : common.dropSingle, {
                browse: html`<u>${common.browse}</u>`,
              })}
        </span>
        ${compact
          ? nothing
          : html`<span class="text-xs text-muted"
              >${this.msg(common.acceptLine, {
                formats: this.acceptHint,
              })}</span
            >`}
        <input
          class="sr-only"
          type="file"
          accept=${this.accept}
          ?multiple=${multiple}
          ?disabled=${this.disabled}
          @change=${this.onFileInput}
        />
      </label>
    `;
  }

  protected renderFileList(): Renderable {
    if (!this.selected.length) return nothing;
    return html`
      <ul
        class="m-0 mt-3 grid max-h-64 list-none gap-2 overflow-y-auto p-0"
        aria-label=${this.t.common.selectedFiles}
      >
        ${this.selected.map(
          (file, index) => html`
            <li class=${ui.row}>
              <img
                class="${ui.thumb} bg-sunken"
                src=${this.urlFor(file)}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <div class="min-w-0 flex-1">
                <p class=${ui.name}><bdi>${file.name}</bdi></p>
                <p class=${ui.meta}>${this.fmt.bytes(file.size)}</p>
              </div>
              <button
                class=${ui.icon}
                type="button"
                aria-label=${this.msg(this.t.common.removeFile, {
                  name: file.name,
                })}
                ?disabled=${this.locked}
                @click=${() => this.removeFile(index)}
              >
                ${icon("x")}
              </button>
            </li>
          `,
        )}
      </ul>
    `;
  }

  protected renderActions(): Renderable {
    const count = this.selected.length;
    const common = this.t.common;
    const { action, busy } = this.toolMessages;
    return html`
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button
          part="action"
          class=${ui.primary}
          type="button"
          ?disabled=${this.locked || count === 0}
          @click=${() => void this.process()}
        >
          ${this.busy
            ? html`<span class="spinner" aria-hidden="true"></span> ${this
                  .progress && this.progress.total > 1
                  ? this.msg(common.busyProgress, {
                      label: busy,
                      current: this.fmt.number(this.progress.done + 1),
                      total: this.fmt.number(this.progress.total),
                    })
                  : this.msg(common.busy, { label: busy })}`
            : count > 1
              ? this.plural(common.actionWithCount, count, { action })
              : action}
        </button>
        ${this.busy && count > 1
          ? html`<button
              class=${ui.secondary}
              type="button"
              @click=${this.cancel}
            >
              ${common.cancel}
            </button>`
          : html`<button
              class=${ui.secondary}
              type="button"
              ?disabled=${this.locked ||
              (count === 0 && this.output.length === 0)}
              @click=${this.reset}
            >
              ${common.clear}
            </button>`}
        <span class="text-[13px] text-muted" role="status" aria-live="polite"
          >${this.notice}</span
        >
      </div>
    `;
  }

  protected renderFailures(): Renderable {
    if (!this.failures.length) return nothing;
    return html`
      <div class=${ui.error} role="alert">
        ${this.failures.map(
          ({ file, error }) => html`
            <p class="m-0 flex items-start gap-2">
              ${icon("alert")}
              <span class="min-w-0"
                >${this.failures.length > 1 || this.selected.length > 1
                  ? html`<strong class="font-semibold"
                      ><bdi>${file.name}</bdi>:</strong
                    > `
                  : nothing}${this.errorText(error)}</span
              >
            </p>
          `,
        )}
      </div>
    `;
  }

  /**
   * A result list for tools that produce images. `describe` supplies the
   * secondary line, `actions` adds buttons beside Download, and `extra`
   * renders below a row, e.g. a comparison.
   */
  protected renderImageResults(
    results: readonly ImageResult[],
    describe: (result: ImageResult) => unknown,
    options: {
      actions?: (result: ImageResult) => Renderable;
      extra?: (result: ImageResult) => Renderable;
    } = {},
  ): Renderable {
    if (!results.length) return nothing;
    return html`
      <div class="mt-5 border-0 border-t border-solid border-line pt-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 class="m-0 text-sm font-semibold text-ink">
            ${results.length === 1
              ? this.t.common.result
              : this.plural(this.t.common.results, results.length)}
          </h3>
          ${results.length > 1
            ? html`<button
                class=${ui.small}
                type="button"
                @click=${() => this.downloadZip(results)}
              >
                ${icon("archive")} ${this.t.common.downloadAll}
              </button>`
            : nothing}
        </div>
        <ul part="results" class="m-0 grid list-none gap-2 p-0">
          ${results.map(
            (result) => html`
              <li class="grid gap-2">
                <div class=${ui.row}>
                  <img
                    class="${ui.thumb} checker"
                    src=${this.urlFor(result.blob)}
                    alt=""
                    decoding="async"
                  />
                  <div class="min-w-0 flex-1">
                    <p class=${ui.name}><bdi>${result.file.name}</bdi></p>
                    <p class=${ui.meta}>${describe(result)}</p>
                  </div>
                  ${options.actions?.(result) ?? nothing}
                  <a
                    part="download"
                    class=${ui.small}
                    href=${this.urlFor(result.blob)}
                    download=${result.file.name}
                  >
                    ${icon("download")}<span class="max-sm:sr-only"
                      >${this.t.common.download}</span
                    >
                  </a>
                </div>
                ${options.extra?.(result) ?? nothing}
              </li>
            `,
          )}
        </ul>
      </div>
    `;
  }

  /**
   * A before/after slider over two image URLs. It is pinned left-to-right:
   * the halves map to the image itself, which never mirrors.
   */
  protected renderCompare(
    before: string,
    after: string,
    options: { checker?: boolean; label?: string } = {},
  ): TemplateResult {
    const update = (event: Event) => {
      const input = event.currentTarget as HTMLInputElement;
      input.parentElement?.style.setProperty("--position", `${input.value}%`);
    };
    const common = this.t.common;
    return html`
      <div
        dir="ltr"
        class="compare h-64 rounded-control border border-solid border-line sm:h-80 ${options.checker
          ? "checker"
          : "bg-sunken"}"
      >
        <img
          class="before"
          src=${before}
          alt=${common.original}
          draggable="false"
        />
        <img
          class="after"
          src=${after}
          alt=${common.resultLabel}
          draggable="false"
        />
        <span class="divider"></span>
        <input
          type="range"
          min="0"
          max="100"
          value="50"
          aria-label=${options.label ?? common.compareLabel}
          @input=${update}
        />
        <span
          class="pointer-events-none absolute left-2 top-2 rounded-[6px] bg-surface px-1.5 py-0.5 text-[11px] font-medium text-body"
          >${common.original}</span
        >
        <span
          class="pointer-events-none absolute right-2 top-2 rounded-[6px] bg-surface px-1.5 py-0.5 text-[11px] font-medium text-body"
          >${common.resultLabel}</span
        >
      </div>
    `;
  }

  protected async downloadZip(results: readonly ImageResult[]): Promise<void> {
    const zip = await createZip(results.map((result) => result.file));
    const url = URL.createObjectURL(zip);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${this.localName.replace(/^pixelshift-/, "")}.zip`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private removeFile(index: number): void {
    this.selected = this.selected.filter((_, position) => position !== index);
    this.output = [];
    this.failures = [];
    this.emit("files-selected", this.selected);
    this.filesChanged();
  }

  private revokeUrls(keep: Set<Blob>): void {
    for (const [blob, url] of this.urls) {
      if (!keep.has(blob)) {
        URL.revokeObjectURL(url);
        this.urls.delete(blob);
      }
    }
  }

  private onFileInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    if (input.files?.length) this.loadFiles(input.files);
    // Allow choosing the same file again.
    input.value = "";
  }

  private onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled) this.dragging = true;
  }

  private onDragLeave(event: DragEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (!target.contains(event.relatedTarget as Node | null)) {
      this.dragging = false;
    }
  }

  private onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    if (!this.disabled && event.dataTransfer?.files.length) {
      this.loadFiles(event.dataTransfer.files);
    }
  }

  private onPaste(event: ClipboardEvent): void {
    const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length && !this.disabled) {
      event.preventDefault();
      this.loadFiles(files);
    }
  }
}

/**
 * Splits a message around `{name}` slots and drops templates into them, for
 * messages that contain markup such as an underlined link.
 */
export function richText(
  template: string,
  slots: Record<string, TemplateResult>,
): unknown[] {
  return template
    .split(/(\{\w+\})/)
    .map((part) =>
      /^\{\w+\}$/.test(part) ? (slots[part.slice(1, -1)] ?? part) : part,
    );
}

/** Registers `element` under `tag` once; safe to call repeatedly and during SSR. */
export function register(tag: string, element: CustomElementConstructor): void {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, element);
  }
}
