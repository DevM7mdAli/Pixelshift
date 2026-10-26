import {
  ASPECT_RATIOS,
  ImageConversionError,
  cropImage,
  parseAspectRatio,
  type ImageResult,
  type OutputFormat,
  type Rect,
  type Size,
} from "pixelshift-core";
import {
  css,
  html,
  nothing,
  type PropertyDeclarations,
  type PropertyValues,
} from "lit";
import { PixelshiftTool, register } from "./base.js";
import {
  RESIZE_HANDLES,
  dragCrop,
  initialCrop,
  roundRect,
  type CropHandle,
} from "./crop-math.js";
import { describeSize, formatSelect, numberInput } from "./fields.js";
import { icon } from "./icons.js";
import type { CropperMessages } from "./i18n.js";
import { ui } from "./ui.js";

export const IMAGE_CROPPER_TAG = "pixelshift-image-cropper";

export const cropperMessages: CropperMessages = {
  heading: "Image cropper",
  description: "Crop with a preset aspect ratio or exact pixel dimensions.",
  action: "Crop image",
  busy: "Cropping",
  aspectRatio: "Aspect ratio",
  free: "Free",
  ratios: {
    free: "Free",
    "1:1": "Square",
    "4:5": "Portrait",
    "3:4": "3:4",
    "2:3": "2:3",
    "9:16": "Story",
    "4:3": "4:3",
    "3:2": "3:2",
    "16:9": "Widescreen",
    "21:9": "Cinema",
  },
  resetBox: "Reset box",
  x: "X",
  y: "Y",
  width: "Width",
  height: "Height",
  cropArea:
    "Crop area {width} by {height} pixels. Use the arrow keys to move it.",
  imageAlt: "Image being cropped",
};

interface Drag {
  handle: CropHandle;
  start: Rect;
  pointerX: number;
  pointerY: number;
  /** Source pixels per displayed pixel. */
  scale: number;
}

/**
 * `<pixelshift-image-cropper>` — drag a crop box over the image, pick a
 * preset aspect ratio or type exact pixels, then export the region.
 *
 * Fires `crop-change` with the crop `Rect` (in source pixels) whenever the
 * box settles.
 */
export class ImageCropperElement extends PixelshiftTool<ImageResult> {
  static get properties(): PropertyDeclarations {
    return {
      aspectRatio: { type: String, attribute: "aspect-ratio" },
      format: { type: String },
      quality: { type: Number },
      crop: { attribute: false },
      source: { state: true },
    };
  }

  static get styles() {
    return [
      super.styles,
      css`
        .stage {
          position: relative;
          display: inline-block;
          max-width: 100%;
          line-height: 0;
          overflow: hidden;
          user-select: none;
          touch-action: none;
        }
        .stage img {
          display: block;
          max-width: 100%;
          max-height: 26rem;
          width: auto;
          height: auto;
          pointer-events: none;
        }
        .crop {
          position: absolute;
          cursor: move;
          box-shadow: 0 0 0 9999px rgba(10, 10, 8, 0.55);
          outline: 1px solid rgba(255, 255, 255, 0.95);
        }
        .crop::before,
        .crop::after {
          content: "";
          position: absolute;
          pointer-events: none;
          border: 0 solid rgba(255, 255, 255, 0.4);
        }
        .crop::before {
          inset: 0 33.333%;
          border-left-width: 1px;
          border-right-width: 1px;
        }
        .crop::after {
          inset: 33.333% 0;
          border-top-width: 1px;
          border-bottom-width: 1px;
        }
        .handle {
          position: absolute;
          width: 14px;
          height: 14px;
          margin: -7px 0 0 -7px;
          border: 1px solid rgba(10, 10, 8, 0.45);
          border-radius: 3px;
          background: #ffffff;
        }
        .handle[data-handle="n"],
        .handle[data-handle="s"] {
          left: 50%;
          cursor: ns-resize;
        }
        .handle[data-handle="e"],
        .handle[data-handle="w"] {
          top: 50%;
          cursor: ew-resize;
        }
        .handle[data-handle*="n"] {
          top: 0;
        }
        .handle[data-handle*="s"] {
          top: 100%;
        }
        .handle[data-handle*="w"] {
          left: 0;
        }
        .handle[data-handle*="e"] {
          left: 100%;
        }
        .handle[data-handle="nw"],
        .handle[data-handle="se"] {
          cursor: nwse-resize;
        }
        .handle[data-handle="ne"],
        .handle[data-handle="sw"] {
          cursor: nesw-resize;
        }
      `,
    ];
  }

  /** `"free"` or a ratio such as `"16:9"`, `"1:1"`, or `"1.91"`. */
  aspectRatio = "free";
  format: OutputFormat | undefined;
  quality = 0.92;
  /** The crop box in source pixels. Set it to position the box programmatically. */
  crop: Rect | undefined;

  private source: (Size & { file: File }) | undefined;
  private drag: Drag | undefined;

  protected get messageDefaults() {
    return { cropper: cropperMessages };
  }
  protected get toolMessages() {
    return this.t.cropper;
  }

  private get ratio(): number | undefined {
    if (!this.aspectRatio || this.aspectRatio === "free") return undefined;
    try {
      return parseAspectRatio(this.aspectRatio);
    } catch {
      return undefined;
    }
  }

  protected processFile(file: File, signal: AbortSignal) {
    const crop = this.crop ?? { x: 0, y: 0, ...this.source! };
    return cropImage(file, {
      ...roundRect(crop),
      quality: this.quality,
      signal,
      ...(this.format ? { format: this.format } : {}),
    });
  }

  protected filesChanged(): void {
    this.source = undefined;
    this.crop = undefined;
    const file = this.selected[0];
    if (!file) return;
    const image = new Image();
    image.onload = () => {
      if (this.selected[0] !== file) return;
      this.source = {
        width: image.naturalWidth,
        height: image.naturalHeight,
        file,
      };
      this.crop = initialCrop(this.source, this.ratio);
      this.emitCrop();
    };
    image.onerror = () => {
      this.failures = [
        {
          file,
          error: new ImageConversionError(
            "The browser could not decode this image.",
            "DECODE_FAILED",
          ),
        },
      ];
    };
    image.src = this.urlFor(file);
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (
      changed.has("aspectRatio") &&
      this.source &&
      changed.get("aspectRatio") !== undefined
    ) {
      const current = this.crop;
      this.crop = initialCrop(
        this.source,
        this.ratio,
        0.8,
        current
          ? {
              x: current.x + current.width / 2,
              y: current.y + current.height / 2,
            }
          : undefined,
      );
      this.output = [];
      this.emitCrop();
    }
  }

  private emitCrop(): void {
    if (this.crop) this.emit("crop-change", roundRect(this.crop));
  }

  protected renderBody() {
    if (!this.selected.length) return this.renderDropzone();
    return html`
      ${this.renderAspectPicker()}
      <div
        class="mt-3 flex justify-center rounded-control bg-sunken p-2 sm:p-3"
      >
        ${this.source && this.crop
          ? this.renderStage(this.source, this.crop)
          : html` <div
              class="flex h-48 items-center justify-center gap-2 text-sm text-muted"
              role="status"
            >
              <span class="spinner" aria-hidden="true"></span>
              ${this.t.common.loadingImage}
            </div>`}
      </div>
      ${this.renderCropFields()} ${this.renderActions()}
      ${this.renderFailures()}
      ${this.renderImageResults(this.output, (result) =>
        describeSize(result, this.fmt),
      )}
      <div class="mt-3">${this.renderDropzone(true)}</div>
    `;
  }

  private renderAspectPicker() {
    return html`
      <div
        class=${ui.segmented}
        role="group"
        aria-label=${this.t.cropper.aspectRatio}
      >
        ${ASPECT_RATIOS.map(
          (preset) =>
            html`<button
              class=${ui.segment}
              type="button"
              title=${this.t.cropper.ratios[preset.id] ?? preset.label}
              aria-pressed=${String(this.aspectRatio === preset.id)}
              ?disabled=${this.locked}
              @click=${() => (this.aspectRatio = preset.id)}
            >
              ${preset.id === "free" ? this.t.cropper.free : preset.id}
            </button>`,
        )}
      </div>
    `;
  }

  private renderStage(source: Size & { file: File }, crop: Rect) {
    const percent = (value: number, total: number) =>
      `${(value / total) * 100}%`;
    return html`
      <div
        class="stage"
        dir="ltr"
        @pointermove=${this.onPointerMove}
        @pointerup=${this.onPointerUp}
        @pointercancel=${this.onPointerUp}
      >
        <img
          src=${this.urlFor(source.file)}
          alt=${this.t.cropper.imageAlt}
          draggable="false"
        />
        <div
          class="crop"
          tabindex="0"
          role="group"
          aria-label=${this.msg(this.t.cropper.cropArea, {
            width: this.fmt.number(Math.round(crop.width)),
            height: this.fmt.number(Math.round(crop.height)),
          })}
          style=${`left:${percent(crop.x, source.width)};top:${percent(crop.y, source.height)};width:${percent(crop.width, source.width)};height:${percent(crop.height, source.height)}`}
          @pointerdown=${(event: PointerEvent) =>
            this.onPointerDown(event, "move")}
          @keydown=${this.onKeyDown}
        >
          ${RESIZE_HANDLES.map(
            (handle) =>
              html`<span
                class="handle"
                data-handle=${handle}
                @pointerdown=${(event: PointerEvent) =>
                  this.onPointerDown(event, handle)}
              ></span>`,
          )}
        </div>
      </div>
    `;
  }

  private renderCropFields() {
    const crop = this.crop ? roundRect(this.crop) : undefined;
    const set = (key: keyof Rect, value: string) => {
      if (!this.crop || !this.source) return;
      const number = Number(value);
      if (!Number.isFinite(number)) return;
      const next = { ...this.crop, [key]: number };
      const ratio = this.ratio;
      if (ratio && key === "width") next.height = number / ratio;
      if (ratio && key === "height") next.width = number * ratio;
      next.width = Math.min(Math.max(1, next.width), this.source.width);
      next.height = Math.min(Math.max(1, next.height), this.source.height);
      next.x = Math.min(Math.max(0, next.x), this.source.width - next.width);
      next.y = Math.min(Math.max(0, next.y), this.source.height - next.height);
      this.crop = next;
      this.output = [];
      this.emitCrop();
    };
    const disabled = this.locked || !crop;
    return html`
      <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
        ${(["x", "y", "width", "height"] as const).map((key) =>
          numberInput({
            label: this.t.cropper[key],
            value: crop?.[key],
            min: key === "x" || key === "y" ? 0 : 1,
            suffix: this.t.common.unitPixels,
            disabled,
            onInput: (value) => set(key, value),
          }),
        )}
        <div class="col-span-2 sm:col-span-1">
          ${formatSelect({
            value: this.format,
            messages: this.t.common,
            disabled: this.locked,
            onChange: (format) => (this.format = format),
          })}
        </div>
      </div>
    `;
  }

  protected renderActions() {
    return html`
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button
          part="action"
          class=${ui.primary}
          type="button"
          ?disabled=${this.locked || !this.crop}
          @click=${() => void this.process()}
        >
          ${this.busy
            ? html`<span class="spinner" aria-hidden="true"></span> ${this.msg(
                  this.t.common.busy,
                  { label: this.t.cropper.busy },
                )}`
            : this.t.cropper.action}
        </button>
        <button
          class=${ui.secondary}
          type="button"
          ?disabled=${this.locked || !this.source}
          @click=${() => {
            if (!this.source) return;
            this.crop = initialCrop(this.source, this.ratio);
            this.output = [];
            this.emitCrop();
          }}
        >
          ${icon("reset")} ${this.t.cropper.resetBox}
        </button>
        <button
          class=${ui.secondary}
          type="button"
          ?disabled=${this.locked}
          @click=${this.reset}
        >
          ${this.t.common.clear}
        </button>
      </div>
    `;
  }

  private onPointerDown(event: PointerEvent, handle: CropHandle): void {
    if (this.locked || !this.crop || !this.source || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const stage = this.renderRoot.querySelector<HTMLElement>(".stage");
    const image = stage?.querySelector("img");
    if (!stage || !image) return;
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured; dragging still works.
    }
    (event.currentTarget as HTMLElement)
      .closest<HTMLElement>(".crop")
      ?.focus({ preventScroll: true });
    this.drag = {
      handle,
      start: { ...this.crop },
      pointerX: event.clientX,
      pointerY: event.clientY,
      scale: this.source.width / image.getBoundingClientRect().width,
    };
  }

  private onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || !this.source) return;
    this.crop = dragCrop(
      drag.start,
      drag.handle,
      (event.clientX - drag.pointerX) * drag.scale,
      (event.clientY - drag.pointerY) * drag.scale,
      this.source,
      this.ratio,
      16 * drag.scale,
    );
  }

  private onPointerUp(): void {
    if (!this.drag) return;
    this.drag = undefined;
    this.output = [];
    this.emitCrop();
  }

  private onKeyDown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 10 : 1;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move || !this.crop || !this.source || this.locked) return;
    event.preventDefault();
    this.crop = dragCrop(this.crop, "move", move[0], move[1], this.source);
    this.output = [];
    this.emitCrop();
  }
}

export function defineImageCropper(): void {
  register(IMAGE_CROPPER_TAG, ImageCropperElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "pixelshift-image-cropper": ImageCropperElement;
  }
}
