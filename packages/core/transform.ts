import { throwIfAborted } from "./errors.js";
import { formatForMimeType, type OutputFormat } from "./formats.js";
import {
  planResize,
  planTransform,
  type CropRegion,
  type DrawPlan,
  type ResizeOptions,
  type Size,
} from "./geometry.js";
import {
  backgroundFor,
  createResult,
  encodeCanvas,
  loadImage,
  outputName,
  paint,
  type EncodeOptions,
  type ImageLimits,
  type ImageResult,
} from "./pipeline.js";

export interface TransformOptions extends EncodeOptions, ImageLimits {
  /** Region to keep, in source pixels or as an aspect ratio. Applied first. */
  crop?: CropRegion;
  /** Resize applied to the cropped region. */
  resize?: ResizeOptions;
  /** Appended to the output file name, e.g. `"-cropped"`. */
  suffix?: string;
}

/**
 * The single decode → draw → encode pass behind every geometric tool. Crop,
 * resize, fit, and format change all happen in one `drawImage` call.
 */
export function transformImage(
  input: Blob,
  options: TransformOptions = {},
): Promise<ImageResult> {
  return render(input, options, (size) => planTransform(size, options));
}

/**
 * Callers pass their own planner so a plain resize never bundles the crop
 * and aspect-ratio code it does not use.
 */
async function render(
  input: Blob,
  options: EncodeOptions & ImageLimits & { suffix?: string },
  planFor: (size: Size) => DrawPlan,
): Promise<ImageResult> {
  const image = await loadImage(input, options);

  try {
    const format = options.format ?? formatForMimeType(image.inputType);
    const plan = planFor(image);
    const { canvas } = paint(
      image,
      plan,
      backgroundFor(format, options.background),
    );
    throwIfAborted(options.signal);

    const blob = await encodeCanvas(canvas, format, options.quality);
    return createResult(input, blob, {
      image,
      name: outputName(input, format, options),
      width: plan.width,
      height: plan.height,
    });
  } finally {
    image.close();
  }
}

export interface ConversionOptions extends EncodeOptions, ImageLimits {
  format: OutputFormat;
  /** Downscale to at most this width, preserving aspect ratio. */
  maxWidth?: number;
  /** Downscale to at most this height, preserving aspect ratio. */
  maxHeight?: number;
}

/** Every operation resolves with the same shape; this is its historic name. */
export type ConversionResult = ImageResult;

export function convertImage(
  input: File,
  options: ConversionOptions,
): Promise<ConversionResult> {
  const { maxWidth, maxHeight, ...rest } = options;
  return render(input, rest, (size) =>
    planResize(size, {
      ...(maxWidth ? { width: maxWidth } : {}),
      ...(maxHeight ? { height: maxHeight } : {}),
      fit: "inside",
      withoutEnlargement: true,
    }),
  );
}

export async function convertImages(
  inputs: readonly File[],
  options: ConversionOptions,
): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];
  for (const input of inputs) {
    results.push(await convertImage(input, options));
  }
  return results;
}

export interface ResizeImageOptions
  extends ResizeOptions, EncodeOptions, ImageLimits {}

/**
 * Resize to exact dimensions, one dimension, or a scale factor. Unlike the
 * converter's `maxWidth`, this upscales unless `withoutEnlargement` is set.
 *
 * ```ts
 * await resizeImage(file, { width: 1200, height: 630, fit: "cover" });
 * await resizeImage(file, { width: 800 }); // height follows
 * await resizeImage(file, { scale: 0.5 });
 * ```
 */
export function resizeImage(
  input: Blob,
  options: ResizeImageOptions,
): Promise<ImageResult> {
  const { width, height, scale, fit, position, withoutEnlargement, ...encode } =
    options;
  const resize = definedOnly({
    width,
    height,
    scale,
    fit,
    position,
    withoutEnlargement,
  });
  return render(input, encode, (size) => planResize(size, resize));
}

export type CropImageOptions = CropRegion &
  EncodeOptions &
  ImageLimits & {
    /** Resize the cropped region in the same pass. */
    resize?: ResizeOptions;
  };

/**
 * Crop to a pixel rectangle or an aspect ratio, optionally resizing after.
 *
 * ```ts
 * await cropImage(file, { x: 40, y: 0, width: 800, height: 800 });
 * await cropImage(file, { aspectRatio: "16:9", position: "top" });
 * ```
 */
export function cropImage(
  input: Blob,
  options: CropImageOptions,
): Promise<ImageResult> {
  const { format, quality, background, fileName, resize, ...rest } = options;
  const { maxBytes, maxPixels, signal, ...crop } = rest;
  return transformImage(input, {
    ...definedOnly({
      format,
      quality,
      background,
      fileName,
      resize,
      maxBytes,
      maxPixels,
      signal,
    }),
    crop: crop as CropRegion,
    suffix: "-cropped",
  });
}

/** Drops `undefined` keys, which `exactOptionalPropertyTypes` rejects. */
function definedOnly<T extends object>(
  value: T,
): {
  [K in keyof T]?: Exclude<T[K], undefined>;
} {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as { [K in keyof T]?: Exclude<T[K], undefined> };
}
