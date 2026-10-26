import {
  COLOR_FORMATS,
  averageColor,
  extractPaletteFromPixels,
  getPixelColor,
  readImageData,
  readableTextColor,
  type ColorFormat,
  type ColorInfo,
  type PaletteColor,
} from "pixelshift-core";
import {
  css,
  html,
  nothing,
  type PropertyDeclarations,
  type PropertyValues,
} from "lit";
import { PixelshiftTool, register } from "./base.js";
import { icon } from "./icons.js";
import type { ColorPickerMessages } from "./i18n.js";
import { ui } from "./ui.js";

export const COLOR_PICKER_TAG = "pixelshift-color-picker";

export const colorPickerMessages: ColorPickerMessages = {
  heading: "Color picker",
  description: "Extract colors from any image as HEX, RGB, or HSL.",
  action: "Extract colors",
  busy: "Reading colors",
  colorFormat: "Color format",
  imageLabel: "Image — click to pick a color",
  clickToPick: "Click the image to pick a color.",
  copyValue: "Copy {format} value",
  palette: "Palette",
  copyCss: "Copy as CSS variables",
  copiedCss: "Copied CSS variables",
  copyColor: "Copy {value}",
};

export interface ColorPickerResult {
  palette: PaletteColor[];
  average: ColorInfo;
  width: number;
  height: number;
}

const LOUPE_PIXELS = 11;
const MAX_ANALYSIS_SIZE = 1600;

/**
 * `<pixelshift-color-picker>` — extracts an image's dominant palette and
 * lets the user pick any pixel with a magnifier, copying HEX, RGB, or HSL.
 *
 * Fires `color-pick` with a `ColorInfo` whenever a color is chosen, and
 * `process-complete` with `[{ palette, average, width, height }]`.
 */
export class ColorPickerElement extends PixelshiftTool<ColorPickerResult> {
  static get properties(): PropertyDeclarations {
    return {
      count: { type: Number },
      colorFormat: { type: String, attribute: "color-format" },
      picked: { state: true },
      hover: { state: true },
    };
  }

  static get styles() {
    return [
      super.styles,
      css`
        .viewer {
          position: relative;
          display: inline-block;
          max-width: 100%;
          line-height: 0;
          cursor: crosshair;
          touch-action: none;
        }
        .viewer canvas.image {
          display: block;
          max-width: 100%;
          max-height: 24rem;
          width: auto;
          height: auto;
        }
        .loupe {
          position: absolute;
          z-index: 1;
          width: 99px;
          height: 99px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          pointer-events: none;
          transform: translate(-50%, calc(-100% - 14px));
        }
        .loupe canvas {
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
        }
        .loupe::after {
          content: "";
          position: absolute;
          left: 45px;
          top: 45px;
          width: 9px;
          height: 9px;
          outline: 1px solid #ffffff;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.45);
        }
      `,
    ];
  }

  /** Number of palette colors to extract. */
  count = 6;
  /** Notation used for labels and copying. */
  colorFormat: ColorFormat = "hex";
  auto = true;

  private picked: ColorInfo | undefined;
  private hover: { color: ColorInfo; x: number; y: number } | undefined;
  private pixels: ImageData | undefined;
  private readonly painted = new WeakMap<HTMLCanvasElement, ImageData>();

  protected get messageDefaults() {
    return { colorPicker: colorPickerMessages };
  }
  protected get toolMessages() {
    return this.t.colorPicker;
  }

  /** The most recently picked color. */
  get color(): ColorInfo | undefined {
    return this.picked;
  }

  protected async processFile(
    file: File,
    signal: AbortSignal,
  ): Promise<ColorPickerResult> {
    const { imageData, originalWidth, originalHeight } = await readImageData(
      file,
      {
        maxSize: MAX_ANALYSIS_SIZE,
        signal,
      },
    );
    this.pixels = imageData;
    const palette = extractPaletteFromPixels(imageData.data, {
      count: this.count,
    });
    this.picked = palette[0];
    return {
      palette,
      average: averageColor(imageData.data),
      width: originalWidth,
      height: originalHeight,
    };
  }

  protected filesChanged(): void {
    this.pixels = undefined;
    this.picked = undefined;
    this.hover = undefined;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    const result = this.output[0];
    if (changed.has("count") && result && this.pixels) {
      this.output = [
        {
          ...result,
          palette: extractPaletteFromPixels(this.pixels.data, {
            count: this.count,
          }),
        },
      ];
    }
  }

  protected updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const canvas =
      this.renderRoot.querySelector<HTMLCanvasElement>("canvas.image");
    if (canvas && this.pixels && this.painted.get(canvas) !== this.pixels) {
      canvas.width = this.pixels.width;
      canvas.height = this.pixels.height;
      canvas.getContext("2d")?.putImageData(this.pixels, 0, 0);
      this.painted.set(canvas, this.pixels);
    }
  }

  private format(color: ColorInfo): string {
    return color[this.colorFormat];
  }

  private choose(color: ColorInfo): void {
    this.picked = color;
    this.emit("color-pick", color);
  }

  protected renderBody() {
    if (!this.selected.length) return this.renderDropzone();
    const result = this.output[0];

    return html`
      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
        <div
          class="flex min-h-48 items-center justify-center rounded-control bg-sunken p-2 sm:p-3"
        >
          ${result && this.pixels
            ? html`<div
                class="viewer"
                dir="ltr"
                @pointermove=${this.onPointerMove}
                @pointerleave=${() => (this.hover = undefined)}
                @click=${this.onClick}
              >
                <canvas
                  class="image"
                  aria-label=${this.t.colorPicker.imageLabel}
                ></canvas>
                ${this.hover
                  ? html`<div
                      class="loupe"
                      style=${`left:${this.hover.x}px;top:${this.hover.y}px`}
                    >
                      <canvas
                        width=${LOUPE_PIXELS}
                        height=${LOUPE_PIXELS}
                      ></canvas>
                    </div>`
                  : nothing}
              </div>`
            : this.busy
              ? html`<span
                  class="flex items-center gap-2 text-sm text-muted"
                  role="status"
                  ><span class="spinner" aria-hidden="true"></span> ${this.msg(
                    this.t.common.busy,
                    {
                      label: this.toolMessages.busy,
                    },
                  )}</span
                >`
              : html`<button
                  class=${ui.primary}
                  type="button"
                  @click=${() => void this.process()}
                >
                  ${this.toolMessages.action}
                </button>`}
        </div>
        ${this.renderInspector()}
      </div>
      ${this.renderFailures()}
      ${result ? this.renderPalette(result.palette) : nothing}
      <div class="mt-4">${this.renderDropzone(true)}</div>
    `;
  }

  private renderInspector() {
    const color = this.hover?.color ?? this.picked;
    return html`
      <div class="flex min-w-0 flex-col gap-3">
        <div
          class=${ui.segmented}
          role="group"
          aria-label=${this.t.colorPicker.colorFormat}
        >
          ${COLOR_FORMATS.map(
            (format) =>
              html`<button
                class=${ui.segment}
                type="button"
                aria-pressed=${String(this.colorFormat === format)}
                @click=${() => (this.colorFormat = format)}
              >
                ${format.toUpperCase()}
              </button>`,
          )}
        </div>
        <div
          class="h-20 rounded-control border border-solid border-line"
          style=${color ? `background:${color.hex}` : ""}
          aria-hidden="true"
        ></div>
        ${color
          ? html`<dl class="m-0 grid gap-1.5">
              ${COLOR_FORMATS.map(
                (format) => html`
                  <div class="flex items-center justify-between gap-2">
                    <dt class="w-9 shrink-0 text-xs font-medium text-muted">
                      ${format.toUpperCase()}
                    </dt>
                    <dd class="m-0 min-w-0 flex-1 truncate ${ui.mono} text-ink">
                      <bdi dir="ltr">${color[format]}</bdi>
                    </dd>
                    <button
                      class=${ui.icon}
                      type="button"
                      aria-label=${this.msg(this.t.colorPicker.copyValue, {
                        format: format.toUpperCase(),
                      })}
                      @click=${() =>
                        void this.copy(
                          color[format],
                          this.msg(this.t.common.copiedValue, {
                            value: color[format],
                          }),
                        )}
                    >
                      ${icon("copy")}
                    </button>
                  </div>
                `,
              )}
            </dl>`
          : html`<p class="m-0 text-sm text-muted">
              ${this.t.colorPicker.clickToPick}
            </p>`}
        <p
          class="m-0 min-h-5 text-[13px] text-muted"
          role="status"
          aria-live="polite"
        >
          ${this.notice}
        </p>
      </div>
    `;
  }

  private renderPalette(palette: PaletteColor[]) {
    const variables = palette
      .map((color, index) => `  --color-${index + 1}: ${this.format(color)};`)
      .join("\n");
    return html`
      <div class="mt-5 border-0 border-t border-solid border-line pt-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 class="m-0 text-sm font-semibold text-ink">
            ${this.t.colorPicker.palette}
          </h3>
          <button
            class=${ui.small}
            type="button"
            @click=${() =>
              void this.copy(
                `:root {\n${variables}\n}`,
                this.t.colorPicker.copiedCss,
              )}
          >
            ${icon("copy")} ${this.t.colorPicker.copyCss}
          </button>
        </div>
        <ul
          class="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-6"
        >
          ${palette.map(
            (color) => html`
              <li>
                <button
                  class="flex w-full flex-col overflow-hidden rounded-control border border-solid border-line bg-surface p-0 text-start transition-colors duration-150 hover:border-line-strong"
                  type="button"
                  title=${this.msg(this.t.colorPicker.copyColor, {
                    value: this.format(color),
                  })}
                  @click=${() => {
                    this.choose(color);
                    void this.copy(
                      this.format(color),
                      this.msg(this.t.common.copiedValue, {
                        value: this.format(color),
                      }),
                    );
                  }}
                >
                  <span
                    class="flex h-14 w-full items-end p-1.5 text-[11px] font-medium tabular-nums"
                    style=${`background:${color.hex};color:${readableTextColor(color)}`}
                    >${this.fmt.percent(color.population)}</span
                  >
                  <span
                    class="block w-full truncate px-2 py-1.5 ${ui.mono} text-ink"
                    ><bdi dir="ltr">${this.format(color)}</bdi></span
                  >
                </button>
              </li>
            `,
          )}
        </ul>
      </div>
    `;
  }

  private locate(event: PointerEvent | MouseEvent) {
    const canvas =
      this.renderRoot.querySelector<HTMLCanvasElement>("canvas.image");
    if (!canvas || !this.pixels) return undefined;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * this.pixels.width;
    const y = ((event.clientY - rect.top) / rect.height) * this.pixels.height;
    return {
      pixelX: Math.floor(x),
      pixelY: Math.floor(y),
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
  }

  private onPointerMove(event: PointerEvent): void {
    const point = this.locate(event);
    if (!point || !this.pixels) return;
    this.hover = {
      color: getPixelColor(this.pixels, point.pixelX, point.pixelY),
      x: point.offsetX,
      y: point.offsetY,
    };
    void this.updateComplete.then(() =>
      this.drawLoupe(point.pixelX, point.pixelY),
    );
  }

  private drawLoupe(centerX: number, centerY: number): void {
    const loupe =
      this.renderRoot.querySelector<HTMLCanvasElement>(".loupe canvas");
    const pixels = this.pixels;
    if (!loupe || !pixels) return;
    const region = new ImageData(LOUPE_PIXELS, LOUPE_PIXELS);
    const half = Math.floor(LOUPE_PIXELS / 2);
    for (let row = 0; row < LOUPE_PIXELS; row += 1) {
      for (let column = 0; column < LOUPE_PIXELS; column += 1) {
        const x = centerX + column - half;
        const y = centerY + row - half;
        if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) continue;
        const from = (y * pixels.width + x) * 4;
        region.data.set(
          pixels.data.subarray(from, from + 4),
          (row * LOUPE_PIXELS + column) * 4,
        );
      }
    }
    loupe.getContext("2d")?.putImageData(region, 0, 0);
  }

  private onClick(event: MouseEvent): void {
    const point = this.locate(event);
    if (!point || !this.pixels) return;
    const color = getPixelColor(this.pixels, point.pixelX, point.pixelY);
    this.choose(color);
    void this.copy(
      this.format(color),
      this.msg(this.t.common.copiedValue, { value: this.format(color) }),
    );
  }
}

export function defineColorPicker(): void {
  register(COLOR_PICKER_TAG, ColorPickerElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "pixelshift-color-picker": ColorPickerElement;
  }
}
