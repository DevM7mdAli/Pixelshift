import { invalidOption, throwIfAborted } from "./errors.js";
import {
  formatForMimeType,
  normalizeQuality,
  type OutputFormat,
} from "./formats.js";
import { planTransform } from "./geometry.js";
import {
  backgroundFor,
  createResult,
  encodeCanvas,
  loadImage,
  outputName,
  paint,
  readPixels,
  yieldToBrowser,
  type Canvas,
  type Context2D,
  type EncodeOptions,
  type ImageLimits,
  type ImageResult,
} from "./pipeline.js";
import {
  encodeIndexedPng,
  sortPaletteForPng,
  supportsCompressionStream,
} from "./png.js";
import { quantize, remap } from "./quantize.js";

export interface CompressOptions extends EncodeOptions, ImageLimits {
  /** Starting JPEG/WebP quality. Defaults to `0.8`. */
  quality?: number;
  /** Lower quality (or palette size, for PNG) until the output fits. */
  targetBytes?: number;
  /** Downscale to at most this width while compressing. */
  maxWidth?: number;
  /** Downscale to at most this height while compressing. */
  maxHeight?: number;
  /** PNG palette size, from 2 to 256. Defaults to `256`. */
  colors?: number;
  /** Diffuse PNG quantization error to hide banding. Defaults to `true`. */
  dither?: boolean;
  /** Re-encode PNG without reducing colors. */
  lossless?: boolean;
  /**
   * Keep a result that is larger than the input. By default the original
   * bytes come back instead, so compressing never makes a file worse.
   */
  allowLarger?: boolean;
}

export interface CompressionResult extends ImageResult {
  /** Final JPEG/WebP encoder quality; `undefined` for PNG. */
  quality: number | undefined;
  /** Final PNG palette size; `undefined` for lossy or lossless output. */
  colors: number | undefined;
  /** Fraction of bytes saved: `0.4` means 40% smaller. Negative if larger. */
  savings: number;
  /** The original file came back because compression could not beat it. */
  unchanged: boolean;
  /** Whether the output fits `targetBytes`; `true` when no target was set. */
  targetMet: boolean;
}

const MIN_QUALITY = 0.05;
const QUALITY_STEPS = 7;
const PALETTE_STEPS = [256, 128, 64, 32, 16, 8, 4];

/**
 * Shrinks an image while keeping its format. JPEG and WebP are re-encoded at
 * a lower quality; PNG is quantized to an indexed palette, the same approach
 * TinyPNG and pngquant use.
 *
 * ```ts
 * const result = await compressImage(file, { quality: 0.75 });
 * const small = await compressImage(file, { targetBytes: 200 * 1024 });
 * ```
 */
export async function compressImage(
  input: Blob,
  options: CompressOptions = {},
): Promise<CompressionResult> {
  if (
    options.targetBytes !== undefined &&
    !(Number.isFinite(options.targetBytes) && options.targetBytes > 0)
  ) {
    throw invalidOption("targetBytes must be a positive number.");
  }
  const image = await loadImage(input, options);

  try {
    const format = options.format ?? formatForMimeType(image.inputType);
    const plan = planTransform(image, {
      resize:
        options.maxWidth || options.maxHeight
          ? {
              ...(options.maxWidth ? { width: options.maxWidth } : {}),
              ...(options.maxHeight ? { height: options.maxHeight } : {}),
              fit: "inside",
              withoutEnlargement: true,
            }
          : undefined,
    });
    const surface = paint(
      image,
      plan,
      backgroundFor(format, options.background),
    );
    throwIfAborted(options.signal);

    const encoded = await encodeCompressed(surface, plan, format, options);

    const resized = plan.width !== image.width || plan.height !== image.height;
    const keepOriginal =
      !options.allowLarger &&
      !resized &&
      formatForMimeType(image.inputType) === format &&
      image.inputType !== "image/gif" &&
      image.inputType !== "image/bmp" &&
      encoded.blob.size >= input.size;

    const blob = keepOriginal
      ? new Blob([input], { type: image.inputType })
      : encoded.blob;
    const result = createResult(input, blob, {
      image,
      name: outputName(input, format, options),
      width: plan.width,
      height: plan.height,
    });

    return {
      ...result,
      quality: keepOriginal ? undefined : encoded.quality,
      colors: keepOriginal ? undefined : encoded.colors,
      savings: 1 - blob.size / input.size,
      unchanged: keepOriginal,
      targetMet:
        options.targetBytes === undefined || blob.size <= options.targetBytes,
    };
  } finally {
    image.close();
  }
}

export interface Encoded {
  blob: Blob;
  quality: number | undefined;
  colors: number | undefined;
}

/** Encodes a painted canvas as small as the options allow. */
export function encodeCompressed(
  surface: { canvas: Canvas; context: Context2D },
  size: { width: number; height: number },
  format: OutputFormat,
  options: Pick<
    CompressOptions,
    "quality" | "targetBytes" | "colors" | "dither" | "lossless" | "signal"
  >,
): Promise<Encoded> {
  return format === "png"
    ? encodePng(surface.canvas, surface.context, size, options)
    : encodeLossy(surface.canvas, format, options);
}

/** Binary-searches quality for the best result that still fits the target. */
async function encodeLossy(
  canvas: Canvas,
  format: "jpeg" | "webp",
  options: Pick<CompressOptions, "quality" | "targetBytes" | "signal">,
): Promise<Encoded> {
  const start = normalizeQuality(options.quality ?? 0.8);
  const first = await encodeCanvas(canvas, format, start);
  const target = options.targetBytes;
  if (target === undefined || first.size <= target) {
    return { blob: first, quality: start, colors: undefined };
  }

  let low = MIN_QUALITY;
  let high = start;
  let best: Encoded | undefined;
  for (let step = 0; step < QUALITY_STEPS; step += 1) {
    throwIfAborted(options.signal);
    const quality = (low + high) / 2;
    const blob = await encodeCanvas(canvas, format, quality);
    if (blob.size <= target) {
      best = { blob, quality, colors: undefined };
      low = quality;
    } else {
      high = quality;
    }
  }

  if (best) return best;
  const floor = await encodeCanvas(canvas, format, MIN_QUALITY);
  return { blob: floor, quality: MIN_QUALITY, colors: undefined };
}

async function encodePng(
  canvas: Canvas,
  context: Context2D,
  size: { width: number; height: number },
  options: Pick<
    CompressOptions,
    "targetBytes" | "colors" | "dither" | "lossless" | "signal"
  >,
): Promise<Encoded> {
  if (options.lossless || !supportsCompressionStream()) {
    return {
      blob: await encodeCanvas(canvas, "png"),
      quality: undefined,
      colors: undefined,
    };
  }

  const pixels = readPixels(context, size.width, size.height).data;
  const requested = Math.round(
    Math.min(256, Math.max(2, options.colors ?? 256)),
  );
  const steps = [
    requested,
    ...PALETTE_STEPS.filter((colors) => colors < requested),
  ];

  let encoded: Encoded | undefined;
  for (const colors of steps) {
    throwIfAborted(options.signal);
    // Quantizing is synchronous; yield so a busy indicator can paint first.
    await yieldToBrowser();

    const blob = await quantizeToPng(pixels, size, colors, options.dither);
    encoded = { blob, quality: undefined, colors };
    if (options.targetBytes === undefined || blob.size <= options.targetBytes) {
      break;
    }
  }
  return encoded!;
}

/** Quantizes RGBA pixels to `colors` entries and encodes an indexed PNG. */
export function quantizeToPng(
  pixels: Uint8ClampedArray,
  size: { width: number; height: number },
  colors: number,
  dither = true,
): Promise<Blob> {
  const palette = sortPaletteForPng(
    quantize(pixels, { colors, includeAlpha: true }),
  );
  const indices = remap(pixels, size.width, size.height, palette, { dither });
  return encodeIndexedPng(size.width, size.height, indices, palette);
}
