import { YOUTUBE_THUMBNAIL } from "pixelshift-core";
import {
  LitElement,
  html,
  nothing,
  type CSSResultGroup,
  type PropertyDeclarations,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { register, type PixelshiftTool } from "./base.js";
import { TWStyles } from "./CSS/twlit.js";
import {
  backgroundMessages,
  defineBackgroundRemover,
} from "./background-remover.js";
import { colorPickerMessages, defineColorPicker } from "./color-picker.js";
import {
  LocaleController,
  commonMessages,
  errorMessages,
  formatMessage,
  type PixelshiftMessages,
  type PixelshiftMessagesInput,
  type StudioMessages,
} from "./i18n.js";
import {
  compressorMessages,
  defineImageCompressor,
} from "./image-compressor.js";
import { converterMessages, defineImageConverter } from "./image-converter.js";
import { cropperMessages, defineImageCropper } from "./image-cropper.js";
import { defineImageResizer, resizerMessages } from "./image-resizer.js";
import { base64Messages, defineImageToBase64 } from "./image-to-base64.js";
import { defineSocialResizer, socialMessages } from "./social-resizer.js";
import { themeStyles } from "./theme.js";
import { ui } from "./ui.js";
import {
  defineYouTubeThumbnail,
  youtubeMessages,
} from "./youtube-thumbnail.js";

export const STUDIO_TAG = "pixelshift-studio";

export const STUDIO_TOOLS = [
  "compress",
  "resize",
  "convert",
  "crop",
  "colors",
  "base64",
  "social",
  "youtube",
  "background",
] as const;

export type StudioTool = (typeof STUDIO_TOOLS)[number];

export const studioMessages: StudioMessages = {
  toolsLabel: "Image tools",
  tabs: {
    compress: "Compress",
    resize: "Resize",
    convert: "Convert",
    crop: "Crop",
    colors: "Colors",
    base64: "Base64",
    social: "Social",
    youtube: "YouTube",
    background: "Background",
  },
};

interface ToolProps {
  dark: boolean;
  disabled: boolean;
  locale: string | undefined;
  messages: PixelshiftMessagesInput | undefined;
}

/** Literal tags per tool: Lit templates cannot interpolate tag names. */
const TOOLS: Record<StudioTool, (props: ToolProps) => TemplateResult> = {
  compress: ({ dark, disabled, locale, messages }) =>
    html`<pixelshift-image-compressor
      bare
      multiple
      ?is-dark-mode=${dark}
      ?disabled=${disabled}
      locale=${locale ?? nothing}
      .messages=${messages}
    ></pixelshift-image-compressor>`,
  resize: ({ dark, disabled, locale, messages }) =>
    html`<pixelshift-image-resizer
      bare
      multiple
      ?is-dark-mode=${dark}
      ?disabled=${disabled}
      locale=${locale ?? nothing}
      .messages=${messages}
    ></pixelshift-image-resizer>`,
  convert: ({ dark, disabled, locale, messages }) =>
    html`<pixelshift-image-converter
      bare
      multiple
      ?is-dark-mode=${dark}
      ?disabled=${disabled}
      locale=${locale ?? nothing}
      .messages=${messages}
    ></pixelshift-image-converter>`,
  crop: ({ dark, disabled, locale, messages }) =>
    html`<pixelshift-image-cropper
      bare
      ?is-dark-mode=${dark}
      ?disabled=${disabled}
      locale=${locale ?? nothing}
      .messages=${messages}
    ></pixelshift-image-cropper>`,
  colors: ({ dark, disabled, locale, messages }) =>
    html`<pixelshift-color-picker
      bare
      ?is-dark-mode=${dark}
      ?disabled=${disabled}
      locale=${locale ?? nothing}
      .messages=${messages}
    ></pixelshift-color-picker>`,
  base64: ({ dark, disabled, locale, messages }) =>
    html`<pixelshift-image-to-base64
      bare
      ?is-dark-mode=${dark}
      ?disabled=${disabled}
      locale=${locale ?? nothing}
      .messages=${messages}
    ></pixelshift-image-to-base64>`,
  social: ({ dark, disabled, locale, messages }) =>
    html`<pixelshift-social-resizer
      bare
      multiple
      ?is-dark-mode=${dark}
      ?disabled=${disabled}
      locale=${locale ?? nothing}
      .messages=${messages}
    ></pixelshift-social-resizer>`,
  youtube: ({ dark, disabled, locale, messages }) =>
    html`<pixelshift-youtube-thumbnail
      bare
      ?is-dark-mode=${dark}
      ?disabled=${disabled}
      locale=${locale ?? nothing}
      .messages=${messages}
    ></pixelshift-youtube-thumbnail>`,
  background: ({ dark, disabled, locale, messages }) =>
    html`<pixelshift-background-remover
      bare
      multiple
      ?is-dark-mode=${dark}
      ?disabled=${disabled}
      locale=${locale ?? nothing}
      .messages=${messages}
    ></pixelshift-background-remover>`,
};

/**
 * `<pixelshift-studio>` — every Pixelshift tool behind one tab bar. Files
 * carry over between tabs, and each visited tool keeps its results.
 *
 * `tools="compress,crop,colors"` picks and orders the tabs; `tool` selects
 * one. Fires `tool-change` with the new tool id, and every event of the
 * tools inside bubbles through it.
 */
export class PixelshiftStudioElement extends LitElement {
  static get properties(): PropertyDeclarations {
    return {
      tools: { type: String },
      tool: { type: String, reflect: true },
      disabled: { type: Boolean, reflect: true },
      isDarkMode: { type: Boolean, attribute: "is-dark-mode", reflect: true },
      bare: { type: Boolean, reflect: true },
      locale: { type: String },
      messages: { attribute: false },
      visited: { state: true },
    };
  }

  static get styles(): CSSResultGroup {
    return [TWStyles, themeStyles];
  }

  /** Comma-separated tool ids to show, in order. Defaults to all. */
  tools: string | undefined;
  /** The active tool id. */
  tool: StudioTool = "compress";
  disabled = false;
  isDarkMode = false;
  /** Drops the outer panel border and padding. */
  bare = false;
  /** BCP 47 locale for the studio and every tool. Defaults to the nearest `lang`. */
  locale: string | undefined;
  /** Translations or overrides, passed to every tool. */
  messages: PixelshiftMessagesInput | undefined;

  private readonly i18n = new LocaleController<PixelshiftMessages>(
    this,
    () =>
      ({
        common: commonMessages,
        errors: errorMessages,
        converter: converterMessages,
        compressor: compressorMessages,
        resizer: resizerMessages,
        cropper: cropperMessages,
        colorPicker: colorPickerMessages,
        base64: base64Messages,
        social: socialMessages,
        youtube: youtubeMessages,
        background: backgroundMessages,
        studio: studioMessages,
      }) satisfies PixelshiftMessages,
  );

  private visited = new Set<StudioTool>();
  private sharedFiles: readonly File[] = [];

  constructor() {
    super();
    this.addEventListener("files-selected", (event) => {
      this.sharedFiles = (event as CustomEvent<File[]>).detail;
    });
  }

  /** The tool ids currently offered. */
  get availableTools(): StudioTool[] {
    const requested = this.tools
      ?.split(",")
      .map((id) => id.trim())
      .filter((id): id is StudioTool => id in TOOLS);
    return requested?.length ? requested : [...STUDIO_TOOLS];
  }

  /** The element of the active tool. */
  get activeTool(): PixelshiftTool<unknown> | null {
    return this.renderRoot.querySelector<PixelshiftTool<unknown>>(
      `[data-tool="${this.currentTool}"] > *`,
    );
  }

  private get currentTool(): StudioTool {
    const available = this.availableTools;
    return available.includes(this.tool) ? this.tool : available[0]!;
  }

  protected willUpdate(): void {
    if (!this.visited.has(this.currentTool)) {
      this.visited = new Set([...this.visited, this.currentTool]);
    }
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has("tool") && !changed.has("tools")) return;
    const active = this.activeTool;
    if (active && !active.files.length && this.sharedFiles.length) {
      active.loadFiles(this.sharedFiles);
    }
  }

  private select(tool: StudioTool): void {
    if (tool === this.tool) return;
    this.tool = tool;
    this.dispatchEvent(
      new CustomEvent("tool-change", {
        detail: tool,
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Heading and description of a tool, in the studio's language. */
  private describe(tool: StudioTool): { title: string; description: string } {
    const t = this.i18n.messages;
    const section = {
      compress: t.compressor,
      resize: t.resizer,
      convert: t.converter,
      crop: t.cropper,
      colors: t.colorPicker,
      base64: t.base64,
      social: t.social,
      background: t.background,
    } as const;
    if (tool === "youtube") {
      const fmt = this.i18n.formatters;
      return {
        title: t.youtube.heading,
        description: formatMessage(t.youtube.description, {
          width: fmt.number(YOUTUBE_THUMBNAIL.width),
          height: fmt.number(YOUTUBE_THUMBNAIL.height),
          limit: fmt.bytes(YOUTUBE_THUMBNAIL.maxFileSize ?? 0),
        }),
      };
    }
    return {
      title: section[tool].heading,
      description: section[tool].description,
    };
  }

  private onTabKey(event: KeyboardEvent): void {
    const tools = this.availableTools;
    const index = tools.indexOf(this.currentTool);
    // Tabs run right to left under RTL, so the arrows swap meaning.
    const nav = event.currentTarget as HTMLElement;
    const forward =
      getComputedStyle(nav).direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backward = forward === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
    const next =
      event.key === forward
        ? tools[(index + 1) % tools.length]
        : event.key === backward
          ? tools[(index - 1 + tools.length) % tools.length]
          : event.key === "Home"
            ? tools[0]
            : event.key === "End"
              ? tools[tools.length - 1]
              : undefined;
    if (!next) return;
    event.preventDefault();
    this.select(next);
    void this.updateComplete.then(() =>
      this.renderRoot
        .querySelector<HTMLElement>(`[role="tab"][aria-selected="true"]`)
        ?.focus(),
    );
  }

  render() {
    const current = this.currentTool;
    const definition = this.describe(current);
    const t = this.i18n.messages;
    const props: ToolProps = {
      dark: this.isDarkMode,
      disabled: this.disabled,
      locale: this.locale,
      messages: this.messages,
    };

    return html`
      <section
        part="panel"
        class=${this.bare ? ui.bare : `${ui.panel} !pt-2 sm:!pt-3`}
        dir=${this.i18n.direction ?? nothing}
        lang=${this.locale ?? nothing}
      >
        <nav
          class=${ui.tabs}
          role="tablist"
          aria-label=${t.studio.toolsLabel}
          @keydown=${this.onTabKey}
        >
          ${this.availableTools.map(
            (tool) =>
              html`<button
                class=${ui.tab}
                type="button"
                role="tab"
                id=${`tab-${tool}`}
                aria-selected=${String(tool === current)}
                aria-controls=${`panel-${tool}`}
                tabindex=${tool === current ? "0" : "-1"}
                @click=${() => this.select(tool)}
              >
                ${t.studio.tabs[tool]}
              </button>`,
          )}
        </nav>
        <header class="mb-4 mt-4">
          <h2 part="heading" class=${ui.heading}>${definition.title}</h2>
          <p class=${ui.description}>${definition.description}</p>
        </header>
        ${[...this.visited].map(
          (tool) =>
            html`<div
              id=${`panel-${tool}`}
              role="tabpanel"
              aria-labelledby=${`tab-${tool}`}
              data-tool=${tool}
              ?hidden=${tool !== current}
            >
              ${TOOLS[tool](props)}
            </div>`,
        )}
      </section>
    `;
  }
}

/** Registers the studio and every tool it contains. */
export function defineStudio(): void {
  defineImageCompressor();
  defineImageResizer();
  defineImageConverter();
  defineImageCropper();
  defineColorPicker();
  defineImageToBase64();
  defineSocialResizer();
  defineYouTubeThumbnail();
  defineBackgroundRemover();
  register(STUDIO_TAG, PixelshiftStudioElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "pixelshift-studio": PixelshiftStudioElement;
  }
}
