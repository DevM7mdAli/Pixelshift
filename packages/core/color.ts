import { invalidOption } from "./errors.js";
import { calculateTargetSize } from "./geometry.js";
import { loadImage, paint, readPixels, type ImageLimits } from "./pipeline.js";
import { quantize } from "./quantize.js";

/** One color in every notation a designer or stylesheet asks for. */
export interface ColorInfo {
  r: number;
  g: number;
  b: number;
  /** Hue in degrees, 0–360. */
  h: number;
  /** Saturation in percent, 0–100. */
  s: number;
  /** Lightness in percent, 0–100. */
  l: number;
  /** `"#1e90ff"` */
  hex: string;
  /** `"rgb(30, 144, 255)"` */
  rgb: string;
  /** `"hsl(210, 100%, 56%)"` */
  hsl: string;
}

export interface PaletteColor extends ColorInfo {
  /** Share of the image this color represents, from 0 to 1. */
  population: number;
}

export type ColorFormat = "hex" | "rgb" | "hsl";

export const COLOR_FORMATS: readonly ColorFormat[] = ["hex", "rgb", "hsl"];

export function describeColor(r: number, g: number, b: number): ColorInfo {
  const [h, s, l] = rgbToHsl(r, g, b);
  return {
    r,
    g,
    b,
    h,
    s,
    l,
    hex: rgbToHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${h}, ${s}%, ${l}%)`,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => clampByte(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Accepts `#rgb`, `#rrggbb`, and either without the hash. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? [...value].map((digit) => digit + digit).join("")
      : value;
  if (!/^[\da-f]{6}$/i.test(full)) {
    throw invalidOption(`"${hex}" is not a hex color.`);
  }
  const number = Number.parseInt(full, 16);
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
}

/** Rounded to whole degrees and percents, the precision CSS authors use. */
export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return [0, 0, Math.round(lightness * 100)];
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue =
    max === red
      ? ((green - blue) / delta) % 6
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  return [hue % 360, Math.round(saturation * 100), Math.round(lightness * 100)];
}

/** Relative luminance from WCAG 2, from 0 (black) to 1 (white). */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Black or white, whichever reads better on top of the given color. */
export function readableTextColor(color: {
  r: number;
  g: number;
  b: number;
}): "#000000" | "#ffffff" {
  return relativeLuminance(color.r, color.g, color.b) > 0.179
    ? "#000000"
    : "#ffffff";
}

/** The color of one pixel in an `ImageData`, with coordinates clamped inside it. */
export function getPixelColor(
  image: Pick<ImageData, "data" | "width" | "height">,
  x: number,
  y: number,
): ColorInfo {
  const column = Math.min(Math.max(Math.floor(x), 0), image.width - 1);
  const row = Math.min(Math.max(Math.floor(y), 0), image.height - 1);
  const offset = (row * image.width + column) * 4;
  return describeColor(
    image.data[offset]!,
    image.data[offset + 1]!,
    image.data[offset + 2]!,
  );
}

export interface PaletteOptions {
  /** Number of colors to return. Defaults to `6`. */
  count?: number;
}

/**
 * Dominant colors of raw RGBA pixels, most common first. Transparent pixels
 * are ignored and near-duplicates are merged.
 */
export function extractPaletteFromPixels(
  data: Uint8ClampedArray | Uint8Array,
  options: PaletteOptions = {},
): PaletteColor[] {
  const count = Math.max(1, Math.round(options.count ?? 6));
  // Over-split, then merge entries a viewer could not tell apart.
  const candidates = quantize(data, { colors: Math.min(256, count * 3) });
  const merged: PaletteColor[] = [];

  for (const candidate of candidates) {
    const twin = merged.find(
      (color) => colorDistance(color, candidate) < MERGE_DISTANCE,
    );
    if (twin) {
      twin.population += candidate.population;
    } else {
      merged.push({
        ...describeColor(candidate.r, candidate.g, candidate.b),
        population: candidate.population,
      });
    }
  }

  return merged
    .sort((first, second) => second.population - first.population)
    .slice(0, count);
}

const MERGE_DISTANCE = 22;
const ANALYSIS_SIZE = 256;

export interface ImageColors {
  palette: PaletteColor[];
  /** The most common color — `palette[0]`. */
  dominant: PaletteColor | undefined;
  /** Average of every opaque pixel. */
  average: ColorInfo;
}

/**
 * Decodes an image and extracts its palette. The image is analyzed at a
 * reduced size, which keeps it fast without changing the result.
 *
 * ```ts
 * const { dominant, palette } = await extractColors(file, { count: 5 });
 * dominant?.hex; // "#1e90ff"
 * ```
 */
export async function extractColors(
  input: Blob,
  options: PaletteOptions & ImageLimits = {},
): Promise<ImageColors> {
  const image = await loadImage(input, options);
  try {
    const size = calculateTargetSize(
      image.width,
      image.height,
      ANALYSIS_SIZE,
      ANALYSIS_SIZE,
    );
    const { context } = paint(image, {
      ...size,
      source: { x: 0, y: 0, width: image.width, height: image.height },
      target: { x: 0, y: 0, ...size },
    });
    const { data } = readPixels(context, size.width, size.height);
    const palette = extractPaletteFromPixels(data, options);
    return { palette, dominant: palette[0], average: averageColor(data) };
  } finally {
    image.close();
  }
}

export function averageColor(data: Uint8ClampedArray | Uint8Array): ColorInfo {
  let r = 0;
  let g = 0;
  let b = 0;
  let weight = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    const alpha = data[offset + 3]! / 255;
    r += data[offset]! * alpha;
    g += data[offset + 1]! * alpha;
    b += data[offset + 2]! * alpha;
    weight += alpha;
  }
  return weight === 0
    ? describeColor(0, 0, 0)
    : describeColor(
        Math.round(r / weight),
        Math.round(g / weight),
        Math.round(b / weight),
      );
}

/** "Redmean" distance: a cheap perceptual approximation, 0 to ~765. */
export function colorDistance(
  first: { r: number; g: number; b: number },
  second: { r: number; g: number; b: number },
): number {
  const redMean = (first.r + second.r) / 2;
  const red = first.r - second.r;
  const green = first.g - second.g;
  const blue = first.b - second.b;
  return Math.sqrt(
    (2 + redMean / 256) * red * red +
      4 * green * green +
      (2 + (255 - redMean) / 256) * blue * blue,
  );
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}
