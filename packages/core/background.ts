import { invalidOption, throwIfAborted } from "./errors.js";
import {
  colorDistance,
  describeColor,
  hexToRgb,
  type ColorInfo,
} from "./color.js";
import { type OutputFormat } from "./formats.js";
import {
  createCanvas,
  createResult,
  encodeCanvas,
  loadImage,
  outputName,
  paint,
  readPixels,
  yieldToBrowser,
  type EncodeOptions,
  type ImageLimits,
  type ImageResult,
} from "./pipeline.js";
import { quantize } from "./quantize.js";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface BackgroundMaskOptions {
  /** How different a pixel may be from the background, 0–100. Defaults to `15`. */
  tolerance?: number;
  /** Background color to key out. Defaults to the dominant colors along the edges. */
  color?: string | Rgb;
  /**
   * Only remove background connected to the image edges, like a magic wand.
   * `false` removes every matching pixel, including enclosed areas such as
   * the inside of an "O". Defaults to `true`.
   */
  contiguous?: boolean;
  /** Soften the cut-out edge by this many pixels. Defaults to `1`. */
  feather?: number;
}

export interface BackgroundMask {
  /** One alpha value per pixel: `0` background, `255` foreground. */
  alpha: Uint8ClampedArray;
  /** The background colors that were keyed out. */
  colors: ColorInfo[];
  /** Fraction of the image classified as background, 0–1. */
  coverage: number;
}

/**
 * A custom foreground model — for example an ML segmentation network. It
 * receives the decoded pixels and resolves with one foreground value per
 * pixel: `0–255` in a `Uint8Array`/`Uint8ClampedArray`, `0–1` in a
 * `Float32Array`, or an `ImageData` whose alpha channel is the mask.
 */
export type Segmenter = (
  image: ImageData,
  context: { signal?: AbortSignal },
) => Promise<Uint8Array | Uint8ClampedArray | Float32Array | ImageData>;

export interface RemoveBackgroundOptions
  extends BackgroundMaskOptions, EncodeOptions, ImageLimits {
  /** Replace the built-in edge-keying with your own model. */
  segmenter?: Segmenter;
}

export interface BackgroundRemovalResult extends ImageResult {
  /** Hex codes of the keyed-out colors; empty when a segmenter ran. */
  backgroundColors: string[];
  /** Fraction of pixels removed, 0–1. */
  removed: number;
}

const MAX_TOLERANCE_DISTANCE = 384;
const TRANSPARENT = 16;

/**
 * Classifies background pixels by keying out the colors that dominate the
 * image border — reliable for product shots, logos, signatures, and
 * screenshots on a plain or gently graded backdrop. Pure: runs without a canvas.
 */
export function createBackgroundMask(
  image: Pick<ImageData, "data" | "width" | "height">,
  options: BackgroundMaskOptions = {},
): BackgroundMask {
  const { data, width, height } = image;
  const tolerance = options.tolerance ?? 15;
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 100) {
    throw invalidOption("Tolerance must be between 0 and 100.");
  }
  const threshold = (tolerance / 100) * MAX_TOLERANCE_DISTANCE;
  const references = options.color
    ? [
        typeof options.color === "string"
          ? hexToRgb(options.color)
          : options.color,
      ]
    : borderColors(image);

  const pixels = width * height;
  const background = new Uint8Array(pixels);
  const distanceAt = (pixel: number): number => {
    const offset = pixel * 4;
    if (data[offset + 3]! < TRANSPARENT) return 0;
    const color = {
      r: data[offset]!,
      g: data[offset + 1]!,
      b: data[offset + 2]!,
    };
    let nearest = Infinity;
    for (const reference of references) {
      nearest = Math.min(nearest, colorDistance(color, reference));
    }
    return nearest;
  };

  if (options.contiguous ?? true) {
    floodFromEdges(image, background, distanceAt, threshold);
  } else {
    for (let pixel = 0; pixel < pixels; pixel += 1) {
      if (distanceAt(pixel) <= threshold) background[pixel] = 1;
    }
  }

  const alpha = new Uint8ClampedArray(pixels);
  let removed = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (background[pixel]) {
      removed += 1;
      continue;
    }
    // Pixels just past the threshold are likely edge blends: fade them in.
    const distance = distanceAt(pixel);
    alpha[pixel] =
      threshold > 0 &&
      distance < threshold * 2 &&
      touchesBackground(background, pixel, width, height)
        ? Math.round(((distance - threshold) / threshold) * 255)
        : 255;
  }

  const feather = Math.max(0, Math.round(options.feather ?? 1));
  if (feather > 0) blurAlpha(alpha, width, height, feather);

  return {
    alpha,
    colors: references.map(({ r, g, b }) => describeColor(r, g, b)),
    coverage: removed / pixels,
  };
}

/**
 * Removes the background of an image and returns a transparent PNG (or WebP
 * for WebP input). Pass `background` to fill the removed area with a color
 * instead, or `segmenter` to plug in your own model.
 *
 * ```ts
 * const { file } = await removeBackground(photo, { tolerance: 20 });
 * const onWhite = await removeBackground(photo, { background: "#fff", format: "jpeg" });
 * ```
 */
export async function removeBackground(
  input: Blob,
  options: RemoveBackgroundOptions = {},
): Promise<BackgroundRemovalResult> {
  const image = await loadImage(input, options);

  try {
    const format: OutputFormat =
      options.format ?? (image.inputType === "image/webp" ? "webp" : "png");
    const { width, height } = image;
    const full = { x: 0, y: 0, width, height };
    const { context } = paint(image, {
      width,
      height,
      source: full,
      target: full,
    });
    const pixels = readPixels(context, width, height);
    throwIfAborted(options.signal);

    let alpha: Uint8ClampedArray;
    let colors: ColorInfo[] = [];
    if (options.segmenter) {
      alpha = normalizeMask(
        await options.segmenter(
          pixels,
          options.signal ? { signal: options.signal } : {},
        ),
        width * height,
      );
    } else {
      // Masking is synchronous; yield so a busy indicator can paint first.
      await yieldToBrowser();
      ({ alpha, colors } = createBackgroundMask(pixels, options));
    }
    throwIfAborted(options.signal);

    const removed = applyMask(pixels, alpha, colors);
    context.putImageData(pixels, 0, 0);

    let canvas = context.canvas;
    if (options.background || format === "jpeg") {
      const flattened = createCanvas(width, height);
      flattened.context.fillStyle = options.background ?? "#ffffff";
      flattened.context.fillRect(0, 0, width, height);
      flattened.context.drawImage(canvas, 0, 0);
      canvas = flattened.canvas;
    }

    const blob = await encodeCanvas(canvas, format, options.quality);
    return {
      ...createResult(input, blob, {
        image,
        name: outputName(input, format, {
          fileName: options.fileName,
          suffix: "-no-bg",
        }),
        width,
        height,
      }),
      backgroundColors: colors.map((color) => color.hex),
      removed,
    };
  } finally {
    image.close();
  }
}

/**
 * Writes `alpha` into `pixels` and, for partially transparent edge pixels,
 * subtracts the background color that bled into them. Returns the removed share.
 */
function applyMask(
  pixels: ImageData,
  alpha: Uint8ClampedArray,
  backgrounds: readonly Rgb[],
): number {
  const { data } = pixels;
  let removed = 0;
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const offset = pixel * 4;
    const mask = alpha[pixel]!;
    const coverage = mask / 255;
    if (mask < 128) removed += 1;

    if (mask > 0 && mask < 255 && backgrounds.length) {
      const color = {
        r: data[offset]!,
        g: data[offset + 1]!,
        b: data[offset + 2]!,
      };
      let reference = backgrounds[0]!;
      for (const candidate of backgrounds) {
        if (colorDistance(color, candidate) < colorDistance(color, reference)) {
          reference = candidate;
        }
      }
      data[offset] = (color.r - (1 - coverage) * reference.r) / coverage;
      data[offset + 1] = (color.g - (1 - coverage) * reference.g) / coverage;
      data[offset + 2] = (color.b - (1 - coverage) * reference.b) / coverage;
    }
    data[offset + 3] = Math.min(data[offset + 3]!, mask);
  }
  return removed / alpha.length;
}

function normalizeMask(
  mask: Uint8Array | Uint8ClampedArray | Float32Array | ImageData,
  pixels: number,
): Uint8ClampedArray {
  if ("data" in mask) {
    const alpha = new Uint8ClampedArray(pixels);
    for (let pixel = 0; pixel < pixels; pixel += 1)
      alpha[pixel] = mask.data[pixel * 4 + 3]!;
    return alpha;
  }
  if (mask.length !== pixels) {
    throw invalidOption(
      `The segmenter returned ${mask.length} values for ${pixels} pixels.`,
    );
  }
  return mask instanceof Float32Array
    ? Uint8ClampedArray.from(mask, (value) => value * 255)
    : new Uint8ClampedArray(mask);
}

/** The colors covering most of the image border, ignoring transparent pixels. */
function borderColors(
  image: Pick<ImageData, "data" | "width" | "height">,
): Rgb[] {
  const { data, width, height } = image;
  const perimeter = 2 * (width + height);
  const step = Math.max(1, Math.floor(perimeter / 4000));
  const samples: number[] = [];

  const sample = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    samples.push(
      data[offset]!,
      data[offset + 1]!,
      data[offset + 2]!,
      data[offset + 3]!,
    );
  };
  for (let x = 0; x < width; x += step) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    sample(0, y);
    sample(width - 1, y);
  }

  const palette = quantize(Uint8Array.from(samples), {
    colors: 4,
    alphaThreshold: TRANSPARENT,
  });
  const dominant = palette.filter((color) => color.population >= 0.12);
  return (dominant.length ? dominant : palette.slice(0, 1)).map(
    ({ r, g, b }) => ({ r, g, b }),
  );
}

/**
 * Breadth-first fill from every border pixel close to the background. A pixel
 * joins when it is near a background color, or slightly further away but
 * nearly identical to the neighbor it was reached from — which lets the fill
 * follow soft gradients and shadows without leaking into the subject.
 */
function floodFromEdges(
  image: Pick<ImageData, "data" | "width" | "height">,
  background: Uint8Array,
  distanceAt: (pixel: number) => number,
  threshold: number,
): void {
  const { data, width, height } = image;
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const seed = (pixel: number) => {
    if (!background[pixel] && distanceAt(pixel) <= threshold) {
      background[pixel] = 1;
      queue[tail++] = pixel;
    }
  };
  for (let x = 0; x < width; x += 1) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  const stepLimit = threshold * 0.35;
  const visit = (from: number, to: number) => {
    if (background[to]) return;
    const distance = distanceAt(to);
    if (distance <= threshold) {
      background[to] = 1;
      queue[tail++] = to;
      return;
    }
    if (distance <= threshold * 2) {
      const a = from * 4;
      const b = to * 4;
      const step = colorDistance(
        { r: data[a]!, g: data[a + 1]!, b: data[a + 2]! },
        { r: data[b]!, g: data[b + 1]!, b: data[b + 2]! },
      );
      if (step <= stepLimit) {
        background[to] = 1;
        queue[tail++] = to;
      }
    }
  };

  while (head < tail) {
    const pixel = queue[head++]!;
    const x = pixel % width;
    if (x > 0) visit(pixel, pixel - 1);
    if (x < width - 1) visit(pixel, pixel + 1);
    if (pixel >= width) visit(pixel, pixel - width);
    if (pixel < width * (height - 1)) visit(pixel, pixel + width);
  }
}

function touchesBackground(
  background: Uint8Array,
  pixel: number,
  width: number,
  height: number,
): boolean {
  const x = pixel % width;
  return (
    (x > 0 && background[pixel - 1] === 1) ||
    (x < width - 1 && background[pixel + 1] === 1) ||
    (pixel >= width && background[pixel - width] === 1) ||
    (pixel < width * (height - 1) && background[pixel + width] === 1)
  );
}

/** Separable box blur, O(pixels) regardless of radius. */
function blurAlpha(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void {
  const scratch = new Float32Array(alpha.length);
  const span = radius * 2 + 1;

  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    let sum = 0;
    for (let x = -radius; x <= radius; x += 1) {
      sum += alpha[row + Math.min(Math.max(x, 0), width - 1)]!;
    }
    for (let x = 0; x < width; x += 1) {
      scratch[row + x] = sum / span;
      sum +=
        alpha[row + Math.min(x + radius + 1, width - 1)]! -
        alpha[row + Math.max(x - radius, 0)]!;
    }
  }

  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -radius; y <= radius; y += 1) {
      sum += scratch[Math.min(Math.max(y, 0), height - 1) * width + x]!;
    }
    for (let y = 0; y < height; y += 1) {
      alpha[y * width + x] = sum / span;
      sum +=
        scratch[Math.min(y + radius + 1, height - 1) * width + x]! -
        scratch[Math.max(y - radius, 0) * width + x]!;
    }
  }
}
