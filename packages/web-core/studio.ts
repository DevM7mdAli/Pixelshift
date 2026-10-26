import {
  LitElement,
  html,
  type CSSResultGroup,
  type PropertyDeclarations,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { register, type PixelshiftTool } from "./base.js";
import { TWStyles } from "./CSS/twlit.js";
import { defineBackgroundRemover } from "./background-remover.js";
import { defineColorPicker } from "./color-picker.js";
import { defineImageCompressor } from "./image-compressor.js";
import { defineImageConverter } from "./image-converter.js";
import { defineImageCropper } from "./image-cropper.js";
import { defineImageResizer } from "./image-resizer.js";
import { defineImageToBase64 } from "./image-to-base64.js";
import { defineSocialResizer } from "./social-resizer.js";
import { themeStyles } from "./theme.js";
import { ui } from "./ui.js";
import { defineYouTubeThumbnail } from "./youtube-thumbnail.js";

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

interface ToolDefinition {
  label: string;
  title: string;
  description: string;
  render(props: { dark: boolean; disabled: boolean }): TemplateResult;
}

/** Literal tags per tool: Lit templates cannot interpolate tag names. */
const TOOLS: Record<StudioTool, ToolDefinition> = {
  compress: {
    label: "Compress",
    title: "Image compressor",
    description:
      "Reduce file size of JPEG, PNG, and WebP images without visible quality loss.",
    render: ({ dark, disabled }) =>
      html`<pixelshift-image-compressor
        bare
        multiple
        ?is-dark-mode=${dark}
        ?disabled=${disabled}
      ></pixelshift-image-compressor>`,
  },
  resize: {
    label: "Resize",
    title: "Image resizer",
    description: "Resize images to exact dimensions or a percentage.",
    render: ({ dark, disabled }) =>
      html`<pixelshift-image-resizer
        bare
        multiple
        ?is-dark-mode=${dark}
        ?disabled=${disabled}
      ></pixelshift-image-resizer>`,
  },
  convert: {
    label: "Convert",
    title: "Image converter",
    description: "Convert JPEG, PNG, GIF, and BMP to WebP, PNG, or JPEG.",
    render: ({ dark, disabled }) =>
      html`<pixelshift-image-converter
        bare
        multiple
        ?is-dark-mode=${dark}
        ?disabled=${disabled}
      ></pixelshift-image-converter>`,
  },
  crop: {
    label: "Crop",
    title: "Image cropper",
    description: "Crop with a preset aspect ratio or exact pixel dimensions.",
    render: ({ dark, disabled }) =>
      html`<pixelshift-image-cropper
        bare
        ?is-dark-mode=${dark}
        ?disabled=${disabled}
      ></pixelshift-image-cropper>`,
  },
  colors: {
    label: "Colors",
    title: "Color picker",
    description: "Extract colors from any image as HEX, RGB, or HSL.",
    render: ({ dark, disabled }) =>
      html`<pixelshift-color-picker
        bare
        ?is-dark-mode=${dark}
        ?disabled=${disabled}
      ></pixelshift-color-picker>`,
  },
  base64: {
    label: "Base64",
    title: "Image to Base64",
    description: "Encode images as Base64 data URLs for embedding in code.",
    render: ({ dark, disabled }) =>
      html`<pixelshift-image-to-base64
        bare
        ?is-dark-mode=${dark}
        ?disabled=${disabled}
      ></pixelshift-image-to-base64>`,
  },
  social: {
    label: "Social",
    title: "Social media resizer",
    description:
      "Resize for Instagram, Facebook, X, YouTube, LinkedIn, Snapchat, and more.",
    render: ({ dark, disabled }) =>
      html`<pixelshift-social-resizer
        bare
        multiple
        ?is-dark-mode=${dark}
        ?disabled=${disabled}
      ></pixelshift-social-resizer>`,
  },
  youtube: {
    label: "YouTube",
    title: "YouTube thumbnail resizer",
    description:
      "Resize any image to 1280 × 720 and keep it under YouTube's 2 MB limit.",
    render: ({ dark, disabled }) =>
      html`<pixelshift-youtube-thumbnail
        bare
        ?is-dark-mode=${dark}
        ?disabled=${disabled}
      ></pixelshift-youtube-thumbnail>`,
  },
  background: {
    label: "Background",
    title: "Background remover",
    description:
      "Remove plain backgrounds from product photos, logos, and signatures.",
    render: ({ dark, disabled }) =>
      html`<pixelshift-background-remover
        bare
        multiple
        ?is-dark-mode=${dark}
        ?disabled=${disabled}
      ></pixelshift-background-remover>`,
  },
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

  private onTabKey(event: KeyboardEvent): void {
    const tools = this.availableTools;
    const index = tools.indexOf(this.currentTool);
    const next =
      event.key === "ArrowRight"
        ? tools[(index + 1) % tools.length]
        : event.key === "ArrowLeft"
          ? tools[(index - 1 + tools.length) % tools.length]
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
    const definition = TOOLS[current];
    const props = { dark: this.isDarkMode, disabled: this.disabled };

    return html`
      <section
        part="panel"
        class=${this.bare ? ui.bare : `${ui.panel} !pt-2 sm:!pt-3`}
      >
        <nav
          class=${ui.tabs}
          role="tablist"
          aria-label="Image tools"
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
                ${TOOLS[tool].label}
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
              ${TOOLS[tool].render(props)}
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
