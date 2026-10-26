import { ImageConversionError, throwIfAborted } from "./errors.js";
import {
  MIME_BY_FORMAT,
  createOutputName,
  detectImageType,
  normalizeQuality,
  type OutputFormat,
} from "./formats.js";
import type { DrawPlan } from "./geometry.js";

export const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
export const DEFAULT_MAX_PIXELS = 40_000_000;

/** Safety limits shared by every operation that decodes an image. */
export interface ImageLimits {
  /** Reject larger input files. Defaults to 25 MiB. */
  maxBytes?: number;
  /** Reject larger decoded images. Defaults to 40 million pixels. */
  maxPixels?: number;
  /** Cooperatively cancel at the next operation boundary. */
  signal?: AbortSignal;
}

/** Output settings shared by every operation that encodes an image. */
export interface EncodeOptions {
  /** Defaults to the input's own format (PNG for GIF and BMP). */
  format?: OutputFormat;
  /** JPEG/WebP encoder quality from `0` to `1`. Defaults to `0.85`. */
  quality?: number;
  /** CSS color behind transparent pixels. Defaults to white for JPEG. */
  background?: string;
  /** Output file name. Defaults to the input name with a new extension. */
  fileName?: string;
}

/** What every pixel-producing operation resolves with. */
export interface ImageResult {
  blob: Blob;
  file: File;
  inputType: string;
  outputType: string;
  originalSize: number;
  convertedSize: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  durationMs: number;
}

export type Canvas = HTMLCanvasElement | OffscreenCanvas;
export type Context2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export interface LoadedImage {
  drawable: CanvasImageSource;
  width: number;
  height: number;
  inputType: string;
  startedAt: number;
  close(): void;
}

/** Validates, sniffs, and decodes an input with EXIF orientation applied. */
export async function loadImage(
  input: Blob,
  limits: ImageLimits = {},
): Promise<LoadedImage> {
  throwIfAborted(limits.signal);

  if (input.size === 0) {
    throw new ImageConversionError("The selected file is empty.", "EMPTY_FILE");
  }
  if (input.size > (limits.maxBytes ?? DEFAULT_MAX_BYTES)) {
    throw new ImageConversionError(
      "The selected file is too large.",
      "FILE_TOO_LARGE",
    );
  }

  const inputType = await detectImageType(input);
  if (!inputType) {
    throw new ImageConversionError(
      "The selected image format is not supported.",
      "UNSUPPORTED_INPUT",
    );
  }

  const startedAt = performance.now();
  const decoded = await decodeImage(input);

  try {
    throwIfAborted(limits.signal);
    if (
      decoded.width * decoded.height >
      (limits.maxPixels ?? DEFAULT_MAX_PIXELS)
    ) {
      throw new ImageConversionError(
        "The image dimensions are too large.",
        "IMAGE_TOO_LARGE",
      );
    }
  } catch (error) {
    decoded.close();
    throw error;
  }

  return { ...decoded, inputType, startedAt };
}

/** Works on the main thread and inside workers, where only OffscreenCanvas exists. */
export function createCanvas(
  width: number,
  height: number,
): { canvas: Canvas; context: Context2D } {
  let canvas: Canvas;
  if (typeof document !== "undefined") {
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
  } else if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(width, height);
  } else {
    throw new ImageConversionError(
      "No canvas implementation is available in this environment.",
      "DECODE_FAILED",
    );
  }

  const context = canvas.getContext("2d") as Context2D | null;
  if (!context) {
    throw new ImageConversionError(
      "The browser could not create a canvas context.",
      "DECODE_FAILED",
    );
  }
  return { canvas, context };
}

/** Executes a {@link DrawPlan}, flattening onto `background` when given. */
export function paint(
  image: Pick<LoadedImage, "drawable">,
  plan: DrawPlan,
  background?: string,
): { canvas: Canvas; context: Context2D } {
  const surface = createCanvas(plan.width, plan.height);
  const { context } = surface;

  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, plan.width, plan.height);
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image.drawable,
    plan.source.x,
    plan.source.y,
    plan.source.width,
    plan.source.height,
    plan.target.x,
    plan.target.y,
    plan.target.width,
    plan.target.height,
  );
  return surface;
}

/** JPEG has no alpha channel, so it always gets a background. */
export function backgroundFor(
  format: OutputFormat,
  background?: string,
): string | undefined {
  return format === "jpeg" ? (background ?? "#ffffff") : background;
}

export async function encodeCanvas(
  canvas: Canvas,
  format: OutputFormat,
  quality?: number,
): Promise<Blob> {
  const type = MIME_BY_FORMAT[format];
  const blob = await canvasToBlob(canvas, type, normalizeQuality(quality));
  if (blob.type !== type) {
    throw new ImageConversionError(
      `This browser cannot encode ${format.toUpperCase()} images.`,
      "UNSUPPORTED_OUTPUT",
    );
  }
  return blob;
}

export function inputName(input: Blob): string {
  return "name" in input && typeof input.name === "string" && input.name
    ? input.name
    : "image";
}

export function outputName(
  input: Blob,
  format: OutputFormat,
  options: { fileName?: string | undefined; suffix?: string } = {},
): string {
  return (
    options.fileName ??
    createOutputName(
      inputName(input).replace(/(\.[^/.]+)?$/, `${options.suffix ?? ""}$1`),
      format,
    )
  );
}

export function createResult(
  input: Blob,
  blob: Blob,
  details: {
    image: Pick<LoadedImage, "inputType" | "width" | "height" | "startedAt">;
    name: string;
    width: number;
    height: number;
  },
): ImageResult {
  return {
    blob,
    file: new File([blob], details.name, {
      type: blob.type,
      lastModified: Date.now(),
    }),
    inputType: details.image.inputType,
    outputType: blob.type,
    originalSize: input.size,
    convertedSize: blob.size,
    width: details.width,
    height: details.height,
    originalWidth: details.image.width,
    originalHeight: details.image.height,
    durationMs: performance.now() - details.image.startedAt,
  };
}

export interface ImagePixels {
  imageData: ImageData;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  inputType: string;
}

/**
 * Decodes an image into raw RGBA pixels, optionally downscaled so its longer
 * side is at most `maxSize`. The basis for color sampling and masking.
 */
export async function readImageData(
  input: Blob,
  options: ImageLimits & { maxSize?: number } = {},
): Promise<ImagePixels> {
  const image = await loadImage(input, options);
  try {
    const scale = options.maxSize
      ? Math.min(1, options.maxSize / Math.max(image.width, image.height))
      : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const { context } = paint(image, {
      width,
      height,
      source: { x: 0, y: 0, width: image.width, height: image.height },
      target: { x: 0, y: 0, width, height },
    });
    return {
      imageData: readPixels(context, width, height),
      width,
      height,
      originalWidth: image.width,
      originalHeight: image.height,
      inputType: image.inputType,
    };
  } finally {
    image.close();
  }
}

/**
 * Lets the browser paint (a busy indicator, say) before synchronous pixel
 * work. Unlike `setTimeout`, neither path is throttled in background tabs.
 */
export function yieldToBrowser(): Promise<void> {
  const scheduler = (
    globalThis as { scheduler?: { yield?: () => Promise<void> } }
  ).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

/** Reads the pixels of `canvas` back as RGBA bytes. */
export function readPixels(
  context: Context2D,
  width: number,
  height: number,
): ImageData {
  return context.getImageData(0, 0, width, height);
}

interface DecodedImage {
  drawable: CanvasImageSource;
  width: number;
  height: number;
  close(): void;
}

async function decodeImage(input: Blob): Promise<DecodedImage> {
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(input, {
        imageOrientation: "from-image",
      });
      return {
        drawable: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    }

    return await decodeWithImageElement(input);
  } catch {
    throw new ImageConversionError(
      "The browser could not decode this image.",
      "DECODE_FAILED",
    );
  }
}

function decodeWithImageElement(input: Blob): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(input);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        drawable: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close: () => undefined,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed."));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: Canvas,
  type: string,
  quality: number,
): Promise<Blob> {
  if (!("toBlob" in canvas)) {
    return canvas.convertToBlob({ type, quality }).catch(() => {
      throw encodeFailed();
    });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(encodeFailed())),
      type,
      quality,
    );
  });
}

function encodeFailed(): ImageConversionError {
  return new ImageConversionError(
    "The browser could not encode this image.",
    "UNSUPPORTED_OUTPUT",
  );
}
