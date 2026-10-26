import {
  ImageConversionError,
  compressImage,
  convertImage,
  cropImage,
  extractColors,
  formatBytes,
  imageToBase64,
  removeBackground,
  resizeForSocial,
  resizeImage,
  transformImage,
  type SocialPresetId,
} from "pixelshift-core";

type Options = Record<string, unknown>;

export interface CoreFunction {
  id: string;
  description: string;
  /** What the function resolves with, in one line. */
  returns: string;
  defaults: Options;
  call(file: File, options: Options): Promise<unknown>;
  /** The call as source code, for copying. */
  source(options: Options): string;
}

const asInput = (options: Options) => options as never;

export const CORE_FUNCTIONS: CoreFunction[] = [
  {
    id: "compressImage",
    description:
      "Shrinks an image in its own format; searches quality for a target size.",
    returns: "CompressionResult",
    defaults: { quality: 0.7 },
    call: (file, options) => compressImage(file, asInput(options)),
    source: (options) => `await compressImage(file, ${json(options)})`,
  },
  {
    id: "resizeImage",
    description:
      "Exact size, one dimension, or a scale factor, with fit modes.",
    returns: "ImageResult",
    defaults: { width: 800, fit: "cover" },
    call: (file, options) => resizeImage(file, asInput(options)),
    source: (options) => `await resizeImage(file, ${json(options)})`,
  },
  {
    id: "cropImage",
    description: "Crops to a pixel rectangle or an aspect ratio.",
    returns: "ImageResult",
    defaults: { aspectRatio: "16:9", position: "center" },
    call: (file, options) => cropImage(file, asInput(options)),
    source: (options) => `await cropImage(file, ${json(options)})`,
  },
  {
    id: "transformImage",
    description: "Crop, then resize, then re-encode — in one pass.",
    returns: "ImageResult",
    defaults: {
      crop: { aspectRatio: "1:1" },
      resize: { width: 512 },
      format: "webp",
    },
    call: (file, options) => transformImage(file, asInput(options)),
    source: (options) => `await transformImage(file, ${json(options)})`,
  },
  {
    id: "convertImage",
    description: "Converts to PNG, JPEG, or WebP, optionally downscaling.",
    returns: "ConversionResult",
    defaults: { format: "webp", quality: 0.85, maxWidth: 1200 },
    call: (file, options) => convertImage(file, asInput(options)),
    source: (options) => `await convertImage(file, ${json(options)})`,
  },
  {
    id: "resizeForSocial",
    description:
      "Fits a platform preset. `preset` is the first argument; the rest are options.",
    returns: "SocialResizeResult",
    defaults: { preset: "instagram-story", fit: "cover", position: "center" },
    call: (file, { preset, ...options }) =>
      resizeForSocial(file, String(preset) as SocialPresetId, asInput(options)),
    source: ({ preset, ...options }) =>
      `await resizeForSocial(file, ${JSON.stringify(preset)}, ${json(options)})`,
  },
  {
    id: "removeBackground",
    description: "Keys out the border colors; pass `segmenter` to use a model.",
    returns: "BackgroundRemovalResult",
    defaults: { tolerance: 15, feather: 1 },
    call: (file, options) => removeBackground(file, asInput(options)),
    source: (options) => `await removeBackground(file, ${json(options)})`,
  },
  {
    id: "extractColors",
    description: "Dominant palette and average color of an image.",
    returns: "ImageColors",
    defaults: { count: 6 },
    call: (file, options) => extractColors(file, asInput(options)),
    source: (options) => `await extractColors(file, ${json(options)})`,
  },
  {
    id: "imageToBase64",
    description:
      "Reads the original bytes as a data URL; SVG and ICO work too.",
    returns: "Base64Result",
    defaults: {},
    call: (file, options) => imageToBase64(file, asInput(options)),
    source: (options) => `await imageToBase64(file, ${json(options)})`,
  },
];

export function getCoreFunction(id: string): CoreFunction {
  return CORE_FUNCTIONS.find((fn) => fn.id === id) ?? CORE_FUNCTIONS[0]!;
}

export interface CoreOutcome {
  ms: number;
  stats: [label: string, value: string][];
  /** Present when the function produced an image. */
  image?: { blob: Blob; name: string };
  palette?: { hex: string; share: string }[];
  /** A truncated preview of text output such as a data URL. */
  text?: string;
  /** The result without blobs and files, for the JSON view. */
  json: unknown;
}

export interface CoreFailure {
  code: string | undefined;
  message: string;
}

/** Parses the options editor; the error mentions the line when the browser gives one. */
export function parseOptions(
  text: string,
): { options: Options } | { error: string } {
  try {
    const parsed: unknown = JSON.parse(text.trim() === "" ? "{}" : text);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { error: "Options must be a JSON object." };
    }
    return { options: parsed as Options };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid JSON.",
    };
  }
}

export async function runCoreFunction(
  fn: CoreFunction,
  file: File,
  options: Options,
  signal: AbortSignal,
): Promise<CoreOutcome> {
  const started = performance.now();
  const result = await fn.call(file, { ...options, signal });
  return describeResult(result, performance.now() - started);
}

export function describeFailure(error: unknown): CoreFailure {
  if (error instanceof ImageConversionError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: undefined,
    message: error instanceof Error ? error.message : String(error),
  };
}

const PREVIEW_CHARS = 240;

function describeResult(result: unknown, ms: number): CoreOutcome {
  const stats: CoreOutcome["stats"] = [["time", `${Math.round(ms)} ms`]];
  const value = result as Record<string, unknown>;
  const outcome: CoreOutcome = { ms, stats, json: stripBinary(result) };

  if (value.blob instanceof Blob && value.file instanceof File) {
    const original = Number(value.originalSize);
    const converted = Number(value.convertedSize);
    stats.unshift(
      ["output", value.file.name],
      ["type", String(value.outputType)],
      ["dimensions", `${value.width}×${value.height}`],
      [
        "size",
        `${formatBytes(original)} → ${formatBytes(converted)} (${percent(1 - converted / original)})`,
      ],
    );
    if (typeof value.quality === "number") {
      stats.push(["quality", value.quality.toFixed(2)]);
    }
    if (typeof value.colors === "number")
      stats.push(["colors", String(value.colors)]);
    if (value.unchanged === true)
      stats.push(["note", "original kept — already optimal"]);
    if (value.targetMet === false)
      stats.push(["note", "target size not reached"]);
    if (value.withinLimit === false)
      stats.push(["note", "over the platform limit"]);
    outcome.image = { blob: value.blob, name: value.file.name };
  } else if (Array.isArray(value.palette)) {
    stats.unshift(["colors", String(value.palette.length)]);
    outcome.palette = (
      value.palette as { hex: string; population: number }[]
    ).map((color) => ({
      hex: color.hex,
      share: `${Math.round(color.population * 100)}%`,
    }));
  } else if (typeof value.dataUrl === "string") {
    stats.unshift(
      ["type", String(value.mimeType)],
      [
        "size",
        `${formatBytes(Number(value.originalSize))} → ${formatBytes(Number(value.encodedSize))} encoded`,
      ],
    );
    outcome.text =
      value.dataUrl.length > PREVIEW_CHARS
        ? `${value.dataUrl.slice(0, PREVIEW_CHARS)}…`
        : value.dataUrl;
  }
  return outcome;
}

function stripBinary(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (key, entry: unknown) => {
      if (entry instanceof Blob)
        return `[${entry.constructor.name} ${formatBytes(entry.size)}]`;
      if (key === "dataUrl" || key === "base64") {
        return typeof entry === "string" && entry.length > 64
          ? `${entry.slice(0, 64)}… (${entry.length} chars)`
          : entry;
      }
      return entry;
    }),
  );
}

function percent(ratio: number): string {
  return `${ratio >= 0 ? "−" : "+"}${Math.abs(Math.round(ratio * 100))}%`;
}

function json(options: Options): string {
  const entries = Object.keys(options);
  return entries.length ? JSON.stringify(options, null, 2) : "{}";
}
