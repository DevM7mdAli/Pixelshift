import { ImageConversionError, invalidOption } from "./errors.js";

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

/**
 * How an image fills a requested box, matching sharp and CSS `object-fit`:
 *
 * - `cover` fills the box and crops the overflow.
 * - `contain` fits inside the box and pads the rest with `background`.
 * - `fill` stretches to the exact box, ignoring aspect ratio.
 * - `inside` fits inside the box; the output takes the scaled size.
 */
export type FitMode = "cover" | "contain" | "fill" | "inside";

export const FIT_MODES: readonly FitMode[] = [
  "cover",
  "contain",
  "fill",
  "inside",
];

export type Position =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/** A point inside the image, each axis from `0` (start) to `1` (end). */
export interface FocalPoint {
  x: number;
  y: number;
}

export interface ResizeOptions {
  /** Target width in pixels. Alone, the height follows the aspect ratio. */
  width?: number;
  /** Target height in pixels. Alone, the width follows the aspect ratio. */
  height?: number;
  /** Uniform scale factor, e.g. `0.5`. Ignored when width or height is set. */
  scale?: number;
  /** Defaults to `cover`. Only applies when both width and height are set. */
  fit?: FitMode;
  /** Which part stays visible for `cover`, or where `contain` places it. */
  position?: Position | FocalPoint;
  /** Never scale beyond the source's own pixels. */
  withoutEnlargement?: boolean;
}

/**
 * One `drawImage(source, sx, sy, sw, sh, tx, ty, tw, th)` call on a
 * `width` × `height` canvas. Crop, resize, and fit all collapse into this.
 */
export interface DrawPlan extends Size {
  source: Rect;
  target: Rect;
}

export interface AspectRatioPreset {
  id: string;
  label: string;
  /** Width divided by height; `undefined` means free-form. */
  ratio: number | undefined;
}

export const ASPECT_RATIOS: readonly AspectRatioPreset[] = [
  { id: "free", label: "Free", ratio: undefined },
  { id: "1:1", label: "Square", ratio: 1 },
  { id: "4:5", label: "Portrait", ratio: 4 / 5 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "2:3", label: "2:3", ratio: 2 / 3 },
  { id: "9:16", label: "Story", ratio: 9 / 16 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "16:9", label: "Widescreen", ratio: 16 / 9 },
  { id: "21:9", label: "Cinema", ratio: 21 / 9 },
];

export function calculateTargetSize(
  width: number,
  height: number,
  maxWidth?: number,
  maxHeight?: number,
): Size {
  if (width <= 0 || height <= 0) {
    throw new ImageConversionError(
      "Image dimensions must be positive.",
      "INVALID_OPTION",
    );
  }

  const widthScale = maxWidth ? maxWidth / width : 1;
  const heightScale = maxHeight ? maxHeight / height : 1;
  const scale = Math.min(widthScale, heightScale, 1);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** `"16:9"`, `"1.5"`, or `1.5` → width divided by height. */
export function parseAspectRatio(value: string | number): number {
  const ratio =
    typeof value === "number"
      ? value
      : value.includes(":")
        ? divide(value.split(":"))
        : Number(value);

  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw invalidOption(`"${value}" is not a valid aspect ratio.`);
  }
  return ratio;
}

function divide([width, height]: string[]): number {
  return Number(width) / Number(height);
}

export function resolvePosition(
  position: Position | FocalPoint = "center",
): FocalPoint {
  if (typeof position === "object") {
    return { x: clamp(position.x, 0, 1), y: clamp(position.y, 0, 1) };
  }

  return {
    x: position.includes("left") ? 0 : position.includes("right") ? 1 : 0.5,
    y: position.includes("top") ? 0 : position.includes("bottom") ? 1 : 0.5,
  };
}

/**
 * Intersects a rectangle with the image bounds and snaps it to whole pixels,
 * so user-drawn crop boxes can never sample outside the source.
 */
export function clampRect(rect: Rect, bounds: Size): Rect {
  const x = clamp(Math.round(rect.x), 0, bounds.width - 1);
  const y = clamp(Math.round(rect.y), 0, bounds.height - 1);
  const right = clamp(Math.round(rect.x + rect.width), x + 1, bounds.width);
  const bottom = clamp(Math.round(rect.y + rect.height), y + 1, bounds.height);

  return { x, y, width: right - x, height: bottom - y };
}

/** The largest rectangle of `ratio` that fits in `bounds`, placed by `position`. */
export function fitAspectRatio(
  bounds: Size,
  ratio: number,
  position?: Position | FocalPoint,
): Rect {
  const width = Math.min(bounds.width, bounds.height * ratio);
  const height = width / ratio;
  const focus = resolvePosition(position);

  return {
    x: (bounds.width - width) * focus.x,
    y: (bounds.height - height) * focus.y,
    width,
    height,
  };
}

/**
 * Plans a resize of `source` — the whole image as a `Size`, or an already
 * cropped region as a `Rect` — without touching any pixels.
 */
export function planResize(
  source: Size | Rect,
  options: ResizeOptions = {},
): DrawPlan {
  const region: Rect = {
    x: "x" in source ? source.x : 0,
    y: "y" in source ? source.y : 0,
    width: source.width,
    height: source.height,
  };
  if (region.width <= 0 || region.height <= 0) {
    throw invalidOption("Image dimensions must be positive.");
  }

  const { fit = "cover", withoutEnlargement = false } = options;
  const width = positiveOrUndefined(options.width, "width");
  const height = positiveOrUndefined(options.height, "height");
  const scale = positiveOrUndefined(options.scale, "scale");

  if (width === undefined || height === undefined) {
    let factor = scale ?? 1;
    if (width !== undefined) factor = width / region.width;
    if (height !== undefined) factor = height / region.height;
    if (withoutEnlargement) factor = Math.min(factor, 1);

    return stretch(region, {
      width: region.width * factor,
      height: region.height * factor,
    });
  }

  const box =
    withoutEnlargement && fit !== "contain" && fit !== "inside"
      ? {
          width: Math.min(width, region.width),
          height: Math.min(height, region.height),
        }
      : { width, height };

  if (fit === "fill") {
    return stretch(region, box);
  }

  const widthScale = box.width / region.width;
  const heightScale = box.height / region.height;
  const focus = resolvePosition(options.position);

  if (fit === "cover") {
    const factor = Math.max(widthScale, heightScale);
    const visibleWidth = Math.min(region.width, box.width / factor);
    const visibleHeight = Math.min(region.height, box.height / factor);

    return {
      width: whole(box.width),
      height: whole(box.height),
      source: {
        x: region.x + (region.width - visibleWidth) * focus.x,
        y: region.y + (region.height - visibleHeight) * focus.y,
        width: visibleWidth,
        height: visibleHeight,
      },
      target: {
        x: 0,
        y: 0,
        width: whole(box.width),
        height: whole(box.height),
      },
    };
  }

  let factor = Math.min(widthScale, heightScale);
  if (withoutEnlargement) factor = Math.min(factor, 1);
  const scaled = {
    width: whole(region.width * factor),
    height: whole(region.height * factor),
  };

  if (fit === "inside") {
    return stretch(region, scaled);
  }

  if (fit !== "contain") {
    throw invalidOption(`"${String(fit)}" is not a supported fit mode.`);
  }

  const canvas = { width: whole(box.width), height: whole(box.height) };
  return {
    ...canvas,
    source: region,
    target: {
      x: Math.round((canvas.width - scaled.width) * focus.x),
      y: Math.round((canvas.height - scaled.height) * focus.y),
      ...scaled,
    },
  };
}

/** Crop to an aspect ratio without knowing the image size up front. */
export interface AspectCrop {
  aspectRatio: string | number;
  position?: Position | FocalPoint;
}

export type CropRegion = Rect | AspectCrop;

export function resolveCrop(crop: CropRegion, bounds: Size): Rect {
  return clampRect(
    "aspectRatio" in crop
      ? fitAspectRatio(
          bounds,
          parseAspectRatio(crop.aspectRatio),
          crop.position,
        )
      : crop,
    bounds,
  );
}

/** Crop first, then resize — the order every image editor uses. */
export function planTransform(
  source: Size,
  options: {
    crop?: CropRegion | undefined;
    resize?: ResizeOptions | undefined;
  } = {},
): DrawPlan {
  const region = options.crop
    ? resolveCrop(options.crop, source)
    : { x: 0, y: 0, ...source };
  return planResize(region, options.resize);
}

function stretch(region: Rect, size: Size): DrawPlan {
  const width = whole(size.width);
  const height = whole(size.height);
  return {
    width,
    height,
    source: region,
    target: { x: 0, y: 0, width, height },
  };
}

function positiveOrUndefined(
  value: number | undefined,
  name: string,
): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value <= 0) {
    throw invalidOption(`Resize ${name} must be a positive number.`);
  }
  return value;
}

function whole(value: number): number {
  return Math.max(1, Math.round(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
