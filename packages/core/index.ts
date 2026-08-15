export const OUTPUT_FORMATS = ["png", "jpeg", "webp"] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export interface ConversionOptions {
  format: OutputFormat;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  background?: string;
  maxBytes?: number;
  maxPixels?: number;
  signal?: AbortSignal;
}

export interface ConversionResult {
  blob: Blob;
  file: File;
  inputType: string;
  outputType: string;
  originalSize: number;
  convertedSize: number;
  width: number;
  height: number;
  durationMs: number;
}

export class ImageConversionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "ABORTED"
      | "DECODE_FAILED"
      | "EMPTY_FILE"
      | "FILE_TOO_LARGE"
      | "IMAGE_TOO_LARGE"
      | "INVALID_OPTION"
      | "UNSUPPORTED_INPUT"
      | "UNSUPPORTED_OUTPUT",
  ) {
    super(message);
    this.name = "ImageConversionError";
  }
}

const MIME_BY_FORMAT: Record<OutputFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const INPUT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/x-ms-bmp",
]);

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_PIXELS = 40_000_000;

export function calculateTargetSize(
  width: number,
  height: number,
  maxWidth?: number,
  maxHeight?: number,
): { width: number; height: number } {
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

export function createOutputName(name: string, format: OutputFormat): string {
  const basename = name.replace(/\.[^/.]+$/, "") || "converted-image";
  const extension = format === "jpeg" ? "jpg" : format;
  return `${basename}.${extension}`;
}

export function normalizeQuality(quality = 0.85): number {
  if (!Number.isFinite(quality) || quality < 0 || quality > 1) {
    throw new ImageConversionError(
      "Quality must be between 0 and 1.",
      "INVALID_OPTION",
    );
  }

  return quality;
}

export async function detectImageType(blob: Blob): Promise<string | undefined> {
  if (INPUT_MIME_TYPES.has(blob.type)) {
    return blob.type === "image/x-ms-bmp" ? "image/bmp" : blob.type;
  }

  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  const signature = String.fromCharCode(...bytes.slice(0, 6));
  if (signature === "GIF87a" || signature === "GIF89a") {
    return "image/gif";
  }
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp";
  }

  return undefined;
}

export function supportsOutputFormat(format: OutputFormat): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  try {
    const encoded = document
      .createElement("canvas")
      .toDataURL(MIME_BY_FORMAT[format]);
    return (
      typeof encoded === "string" && encoded.startsWith(MIME_BY_FORMAT[format])
    );
  } catch {
    return false;
  }
}

export async function convertImage(
  input: File,
  options: ConversionOptions,
): Promise<ConversionResult> {
  throwIfAborted(options.signal);

  if (input.size === 0) {
    throw new ImageConversionError("The selected file is empty.", "EMPTY_FILE");
  }
  if (input.size > (options.maxBytes ?? DEFAULT_MAX_BYTES)) {
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
  const source = await decodeImage(input);

  try {
    throwIfAborted(options.signal);
    if (
      source.width * source.height >
      (options.maxPixels ?? DEFAULT_MAX_PIXELS)
    ) {
      throw new ImageConversionError(
        "The image dimensions are too large.",
        "IMAGE_TOO_LARGE",
      );
    }

    const size = calculateTargetSize(
      source.width,
      source.height,
      options.maxWidth,
      options.maxHeight,
    );
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new ImageConversionError(
        "The browser could not create a canvas context.",
        "DECODE_FAILED",
      );
    }

    if (options.format === "jpeg") {
      context.fillStyle = options.background ?? "#ffffff";
      context.fillRect(0, 0, size.width, size.height);
    }
    context.drawImage(source.drawable, 0, 0, size.width, size.height);

    const outputType = MIME_BY_FORMAT[options.format];
    const blob = await canvasToBlob(
      canvas,
      outputType,
      normalizeQuality(options.quality),
    );
    if (blob.type !== outputType) {
      throw new ImageConversionError(
        `This browser cannot encode ${options.format.toUpperCase()} images.`,
        "UNSUPPORTED_OUTPUT",
      );
    }

    const file = new File(
      [blob],
      createOutputName(input.name, options.format),
      {
        type: outputType,
        lastModified: Date.now(),
      },
    );

    return {
      blob,
      file,
      inputType,
      outputType,
      originalSize: input.size,
      convertedSize: blob.size,
      width: size.width,
      height: size.height,
      durationMs: performance.now() - startedAt,
    };
  } finally {
    source.close?.();
  }
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

interface DecodedImage {
  drawable: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
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
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(
            new ImageConversionError(
              "The browser could not encode this image.",
              "UNSUPPORTED_OUTPUT",
            ),
          );
        }
      },
      type,
      quality,
    );
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ImageConversionError(
      "Image conversion was cancelled.",
      "ABORTED",
    );
  }
}
