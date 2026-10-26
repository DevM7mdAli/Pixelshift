import {
  SOCIAL_PLATFORMS,
  SOCIAL_PRESETS,
  formatBytes,
  getSocialPreset,
  resizeForSocial,
  resolvePosition,
  type OutputFormat,
  type Position,
  type SocialPlatform,
  type SocialPreset,
  type SocialResizeResult,
} from "pixelshift-core";
import {
  html,
  nothing,
  type PropertyDeclarations,
  type TemplateResult,
} from "lit";
import { PixelshiftTool, register } from "./base.js";
import { formatSelect, rangeInput } from "./fields.js";
import { ui } from "./ui.js";

export const SOCIAL_RESIZER_TAG = "pixelshift-social-resizer";

const POSITIONS: Position[] = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

/**
 * `<pixelshift-social-resizer>` — fits images to Instagram, Facebook, X,
 * YouTube, LinkedIn, Snapchat, Pinterest, and TikTok sizes, with a live
 * framing preview and a focus point for the crop.
 *
 * `preset="instagram-story"` selects a size; `platforms="instagram,x"`
 * limits the choices.
 */
export class SocialResizerElement extends PixelshiftTool<SocialResizeResult> {
  static get properties(): PropertyDeclarations {
    return {
      preset: { type: String },
      platforms: { type: String },
      fit: { type: String },
      position: { type: String },
      background: { type: String },
      format: { type: String },
      quality: { type: Number },
      multiple: { type: Boolean },
      platform: { state: true },
    };
  }

  /** The selected preset id, e.g. `"youtube-thumbnail"`. */
  preset = "instagram-square";
  /** Comma-separated platform ids to offer. Defaults to all. */
  platforms: string | undefined;
  /** `cover` crops to fill the frame; `contain` letterboxes. */
  fit: "cover" | "contain" = "cover";
  /** The part of the image kept in frame when cropping. */
  position: Position = "center";
  /** Letterbox color for `contain`. */
  background = "#ffffff";
  format: OutputFormat | undefined;
  quality = 0.92;
  multiple = false;

  private platform: SocialPlatform | undefined;

  protected get defaultHeading() {
    return "Social media resizer";
  }
  protected get defaultDescription() {
    return "Resize for Instagram, Facebook, X, YouTube, LinkedIn, Snapchat, and more.";
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

  protected get selectedPreset(): SocialPreset {
    return getSocialPreset(this.preset) ?? SOCIAL_PRESETS[0];
  }

  private get availablePlatforms() {
    const allowed = this.platforms
      ?.split(",")
      .map((value) => value.trim().toLowerCase());
    return allowed?.length
      ? SOCIAL_PLATFORMS.filter((platform) => allowed.includes(platform.id))
      : SOCIAL_PLATFORMS;
  }

  protected processFile(file: File, signal: AbortSignal) {
    return resizeForSocial(file, this.selectedPreset, {
      fit: this.fit,
      position: this.position,
      quality: this.quality,
      signal,
      ...(this.fit === "contain" ? { background: this.background } : {}),
      ...(this.format ? { format: this.format } : {}),
    });
  }

  protected renderSettings() {
    return html`
      ${this.renderPresetPicker()}
      <div
        class="${ui.section} grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      >
        ${this.renderPreview()}
        <div class="grid content-start gap-3">${this.renderFraming()}</div>
      </div>
    `;
  }

  protected renderPresetPicker(): TemplateResult | typeof nothing {
    const platforms = this.availablePlatforms;
    const active =
      platforms.find((platform) => platform.id === this.platform) ??
      platforms.find(
        (platform) => platform.id === this.selectedPreset.platform,
      ) ??
      platforms[0];
    if (!active) return nothing;
    const presets = SOCIAL_PRESETS.filter(
      (preset) => preset.platform === active.id,
    );

    return html`
      <div class="mt-4">
        ${platforms.length > 1
          ? html`<div class=${ui.tabs} role="tablist" aria-label="Platform">
              ${platforms.map(
                (platform) =>
                  html`<button
                    class=${ui.tab}
                    type="button"
                    role="tab"
                    aria-selected=${String(platform.id === active.id)}
                    @click=${() => (this.platform = platform.id)}
                  >
                    ${platform.name}
                  </button>`,
              )}
            </div>`
          : nothing}
        <div
          class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
          role="radiogroup"
          aria-label="Size"
        >
          ${presets.map((preset) => this.renderPresetOption(preset))}
        </div>
      </div>
    `;
  }

  private renderPresetOption(preset: SocialPreset) {
    const selected = preset.id === this.preset;
    const scale = 24 / Math.max(preset.width, preset.height);
    return html`
      <button
        class="flex min-w-0 items-center gap-3 rounded-control border border-solid bg-transparent p-2.5 text-left transition-colors duration-150 hover:bg-hover ${selected
          ? "border-accent"
          : "border-line"}"
        type="button"
        role="radio"
        aria-checked=${String(selected)}
        ?disabled=${this.locked}
        @click=${() => {
          this.preset = preset.id;
          this.output = [];
        }}
      >
        <span
          class="flex size-7 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <span
            class="block rounded-[2px] border-[1.5px] border-solid ${selected
              ? "border-accent"
              : "border-muted"}"
            style=${`width:${Math.round(preset.width * scale)}px;height:${Math.round(preset.height * scale)}px`}
          ></span>
        </span>
        <span class="min-w-0">
          <span class="block truncate text-sm font-medium text-ink"
            >${preset.name}</span
          >
          <span class="block text-xs tabular-nums text-muted"
            >${preset.width} ×
            ${preset.height}${preset.maxFileSize
              ? ` · max ${formatBytes(preset.maxFileSize)}`
              : ""}</span
          >
        </span>
      </button>
    `;
  }

  protected renderPreview() {
    const preset = this.selectedPreset;
    const file = this.selected[0];
    const focus = resolvePosition(this.position);
    return html`
      <figure class="m-0 grid min-w-0 content-start gap-2">
        <div
          class="flex h-56 items-center justify-center rounded-control bg-sunken p-3 sm:h-64"
        >
          <div
            class="relative max-h-full max-w-full overflow-hidden border border-solid border-line ${this
              .fit === "contain"
              ? ""
              : "checker"}"
            style=${`aspect-ratio:${preset.width}/${preset.height};height:${preset.height >= preset.width ? "100%" : "auto"};width:${preset.height >= preset.width ? "auto" : "100%"};${this.fit === "contain" ? `background:${this.background}` : ""}`}
          >
            ${file
              ? html`<img
                  class="block size-full"
                  src=${this.urlFor(file)}
                  alt="Framing preview"
                  style=${`object-fit:${this.fit};object-position:${focus.x * 100}% ${focus.y * 100}%`}
                />`
              : html`<span
                  class="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-muted"
                  >${preset.width} × ${preset.height}</span
                >`}
          </div>
        </div>
        <figcaption class="text-xs text-muted">
          ${file
            ? "Preview of the first image"
            : "Add an image to preview the framing"}
        </figcaption>
      </figure>
    `;
  }

  protected renderFraming() {
    return html`
      <div class=${ui.label}>
        Framing
        <div class=${ui.segmented} role="group" aria-label="Framing">
          ${(["cover", "contain"] as const).map(
            (fit) =>
              html`<button
                class=${ui.segment}
                type="button"
                aria-pressed=${String(this.fit === fit)}
                ?disabled=${this.locked}
                @click=${() => (this.fit = fit)}
              >
                ${fit === "cover" ? "Fill frame" : "Fit inside"}
              </button>`,
          )}
        </div>
      </div>
      ${this.fit === "cover"
        ? html`<div class=${ui.label}>
            Focus
            <div
              class="grid w-fit grid-cols-3 gap-1"
              role="group"
              aria-label="Focus point"
            >
              ${POSITIONS.map(
                (position) =>
                  html`<button
                    class="size-7 rounded-[6px] border border-solid p-0 transition-colors duration-150 ${this
                      .position === position
                      ? "border-accent bg-accent"
                      : "border-line-strong bg-transparent hover:bg-hover"}"
                    type="button"
                    aria-label=${position.replace("-", " ")}
                    aria-pressed=${String(this.position === position)}
                    ?disabled=${this.locked}
                    @click=${() => (this.position = position)}
                  ></button>`,
              )}
            </div>
          </div>`
        : html`<label class=${ui.label}>
            Background
            <span class="flex items-center gap-2">
              <input
                class="h-9 w-12 shrink-0 cursor-pointer rounded-control border border-solid border-line-strong bg-field p-1"
                type="color"
                .value=${this.background}
                ?disabled=${this.locked}
                @input=${(event: Event) =>
                  (this.background = (
                    event.currentTarget as HTMLInputElement
                  ).value)}
              />
              <span class="${ui.mono} text-body">${this.background}</span>
            </span>
          </label>`}
      ${formatSelect({
        value: this.format,
        disabled: this.locked,
        onChange: (format) => (this.format = format),
      })}
      ${this.format === "png"
        ? nothing
        : rangeInput({
            label: "Quality",
            value: this.quality,
            display: `${Math.round(this.quality * 100)}%`,
            min: 0.5,
            max: 1,
            step: 0.01,
            disabled: this.locked,
            onInput: (value) => (this.quality = value),
          })}
    `;
  }

  protected renderResults() {
    return this.renderImageResults(this.output, (result) => {
      const social = result as SocialResizeResult;
      return `${social.width}×${social.height} · ${formatBytes(social.convertedSize)}${
        social.withinLimit
          ? ""
          : ` · over the ${formatBytes(social.preset.maxFileSize ?? 0)} limit`
      }`;
    });
  }
}

export function defineSocialResizer(): void {
  register(SOCIAL_RESIZER_TAG, SocialResizerElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "pixelshift-social-resizer": SocialResizerElement;
  }
}
