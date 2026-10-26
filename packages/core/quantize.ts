/**
 * Median-cut color quantization over raw RGBA bytes. Pure and synchronous, so
 * it runs anywhere — including tests without a canvas.
 */

export interface QuantizeOptions {
  /** Palette size, from 2 to 256. */
  colors: number;
  /** Treat alpha as a fourth channel instead of ignoring transparent pixels. */
  includeAlpha?: boolean;
  /** Without `includeAlpha`, pixels with alpha below this are skipped. */
  alphaThreshold?: number;
  /** Upper bound on pixels examined while building the palette. */
  sampleSize?: number;
}

export interface QuantizedColor {
  r: number;
  g: number;
  b: number;
  a: number;
  /** Share of the examined pixels this entry represents, from 0 to 1. */
  population: number;
}

interface Box {
  pixels: Uint8Array;
  count: number;
}

const CHANNELS = 4;

export function quantize(
  data: Uint8ClampedArray | Uint8Array,
  options: QuantizeOptions,
): QuantizedColor[] {
  const colors = Math.round(Math.min(256, Math.max(2, options.colors)));
  const includeAlpha = options.includeAlpha ?? false;
  const alphaThreshold = options.alphaThreshold ?? 125;
  const pixelCount = data.length / CHANNELS;
  const step = Math.max(
    1,
    Math.floor(pixelCount / (options.sampleSize ?? 120_000)),
  );

  const samples = new Uint8Array(Math.ceil(pixelCount / step) * CHANNELS);
  let count = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += step) {
    const offset = pixel * CHANNELS;
    const alpha = data[offset + 3]!;
    if (!includeAlpha && alpha < alphaThreshold) continue;
    // Invisible pixels carry arbitrary RGB; collapse them so they share one entry.
    if (alpha === 0) {
      samples.fill(0, count * CHANNELS, (count + 1) * CHANNELS);
    } else {
      samples.set(data.subarray(offset, offset + CHANNELS), count * CHANNELS);
    }
    count += 1;
  }

  if (count === 0) {
    return [];
  }

  const boxes: Box[] = [
    { pixels: samples.subarray(0, count * CHANNELS), count },
  ];
  const channels = includeAlpha ? 4 : 3;

  while (boxes.length < colors) {
    let target = -1;
    let targetRange = 0;
    let targetChannel = 0;

    for (let index = 0; index < boxes.length; index += 1) {
      const box = boxes[index]!;
      if (box.count < 2) continue;
      const [channel, range] = widestChannel(box, channels);
      // Weighting by population splits busy regions before rare outliers.
      const score = range * Math.sqrt(box.count);
      if (score > targetRange) {
        target = index;
        targetRange = score;
        targetChannel = channel;
      }
    }
    if (target < 0) break;

    const [low, high] = split(boxes[target]!, targetChannel);
    boxes.splice(target, 1, low, high);
  }

  return boxes
    .map((box) => average(box, count))
    .sort((first, second) => second.population - first.population);
}

function widestChannel(box: Box, channels: number): [number, number] {
  let bestChannel = 0;
  let bestRange = -1;
  for (let channel = 0; channel < channels; channel += 1) {
    let min = 255;
    let max = 0;
    for (let index = channel; index < box.pixels.length; index += CHANNELS) {
      const value = box.pixels[index]!;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (max - min > bestRange) {
      bestRange = max - min;
      bestChannel = channel;
    }
  }
  return [bestChannel, bestRange];
}

/** Splits a box along `channel` with a counting sort — O(n) per split. */
function split(box: Box, channel: number): [Box, Box] {
  const histogram = new Uint32Array(256);
  for (let index = channel; index < box.pixels.length; index += CHANNELS) {
    histogram[box.pixels[index]!]! += 1;
  }

  // Split between two distinct values, as close to the median as possible.
  // Splitting "at the median" alone can peel off a single pixel per round
  // when most of the box shares one value.
  const starts = new Uint32Array(256);
  let running = 0;
  let lowCount = 0;
  for (let value = 0; value < 256; value += 1) {
    starts[value] = running;
    running += histogram[value]!;
    if (
      histogram[value]! > 0 &&
      running < box.count &&
      Math.abs(running - box.count / 2) < Math.abs(lowCount - box.count / 2)
    ) {
      lowCount = running;
    }
  }
  if (lowCount === 0) lowCount = Math.floor(box.count / 2);

  const sorted = new Uint8Array(box.pixels.length);
  for (let offset = 0; offset < box.pixels.length; offset += CHANNELS) {
    const value = box.pixels[offset + channel]!;
    sorted.set(
      box.pixels.subarray(offset, offset + CHANNELS),
      starts[value]! * CHANNELS,
    );
    starts[value]! += 1;
  }

  return [
    { pixels: sorted.subarray(0, lowCount * CHANNELS), count: lowCount },
    {
      pixels: sorted.subarray(lowCount * CHANNELS),
      count: box.count - lowCount,
    },
  ];
}

function average(box: Box, total: number): QuantizedColor {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (let offset = 0; offset < box.pixels.length; offset += CHANNELS) {
    r += box.pixels[offset]!;
    g += box.pixels[offset + 1]!;
    b += box.pixels[offset + 2]!;
    a += box.pixels[offset + 3]!;
  }
  return {
    r: Math.round(r / box.count),
    g: Math.round(g / box.count),
    b: Math.round(b / box.count),
    a: Math.round(a / box.count),
    population: box.count / total,
  };
}

/**
 * Maps every pixel to its nearest palette entry, optionally with
 * Floyd–Steinberg error diffusion. Lookups are memoized on a 5-bit-per-channel
 * key, so large images cost one nearest-color search per distinct bucket.
 */
export function remap(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  palette: readonly QuantizedColor[],
  options: { dither?: boolean } = {},
): Uint8Array {
  const indices = new Uint8Array(width * height);
  const cache = new Int16Array(1 << 19).fill(-1);
  const dither = options.dither ?? true;
  const errors = dither ? new Float32Array((width + 2) * 2 * CHANNELS) : null;

  const nearest = (r: number, g: number, b: number, a: number): number => {
    const key = ((r >> 3) << 14) | ((g >> 3) << 9) | ((b >> 3) << 4) | (a >> 4);
    const cached = cache[key]!;
    if (cached >= 0) return cached;

    let best = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < palette.length; index += 1) {
      const color = palette[index]!;
      const distance =
        (color.r - r) ** 2 * 2 +
        (color.g - g) ** 2 * 4 +
        (color.b - b) ** 2 * 3 +
        (color.a - a) ** 2 * 4;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    cache[key] = best;
    return best;
  };

  for (let y = 0; y < height; y += 1) {
    const current = (y & 1) * (width + 2) * CHANNELS;
    const next = ((y + 1) & 1) * (width + 2) * CHANNELS;
    errors?.fill(0, next, next + (width + 2) * CHANNELS);

    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * CHANNELS;
      let r = data[offset]!;
      let g = data[offset + 1]!;
      let b = data[offset + 2]!;
      let a = data[offset + 3]!;

      if (a === 0) {
        indices[y * width + x] = nearest(0, 0, 0, 0);
        continue;
      }

      if (errors) {
        const slot = current + (x + 1) * CHANNELS;
        r = clampByte(r + errors[slot]!);
        g = clampByte(g + errors[slot + 1]!);
        b = clampByte(b + errors[slot + 2]!);
        a = clampByte(a + errors[slot + 3]!);
      }

      const index = nearest(r, g, b, a);
      indices[y * width + x] = index;

      if (errors) {
        const chosen = palette[index]!;
        const delta = [r - chosen.r, g - chosen.g, b - chosen.b, a - chosen.a];
        for (let channel = 0; channel < CHANNELS; channel += 1) {
          const error = delta[channel]!;
          errors[current + (x + 2) * CHANNELS + channel]! += (error * 7) / 16;
          errors[next + x * CHANNELS + channel]! += (error * 3) / 16;
          errors[next + (x + 1) * CHANNELS + channel]! += (error * 5) / 16;
          errors[next + (x + 2) * CHANNELS + channel]! += error / 16;
        }
      }
    }
  }

  return indices;
}

function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}
