import { ImageConversionError } from "./errors.js";

export const OUTPUT_FORMATS = ["png", "jpeg", "webp"] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const MIME_BY_FORMAT: Record<OutputFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** Raster types every supported browser can decode onto a canvas. */
export const INPUT_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/x-ms-bmp",
]);

/** The `accept` attribute value matching {@link INPUT_MIME_TYPES}. */
export const INPUT_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,image/bmp";

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

/**
 * The output format that keeps an input's type. GIF and BMP have no canvas
 * encoder, so they fall back to lossless PNG.
 */
export function formatForMimeType(mimeType: string): OutputFormat {
  if (mimeType === "image/jpeg") return "jpeg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

export function isLossyFormat(format: OutputFormat): boolean {
  return format !== "png";
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

/** `1536` → `"1.5 KB"`. Binary units, one decimal above a kilobyte. */
export function formatBytes(bytes: number): string {
  const sign = bytes < 0 ? "-" : "";
  const size = Math.abs(bytes);
  if (size < 1024) return `${sign}${size} B`;
  if (size < 1024 * 1024) return `${sign}${(size / 1024).toFixed(1)} KB`;
  return `${sign}${(size / (1024 * 1024)).toFixed(1)} MB`;
}
