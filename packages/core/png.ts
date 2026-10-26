import { ImageConversionError } from "./errors.js";
import type { QuantizedColor } from "./quantize.js";

let crcTable: Uint32Array | undefined;

/** CRC-32 (IEEE 802.3), as used by PNG chunks and ZIP entries. */
export function crc32(bytes: Uint8Array, seed = 0): number {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });

  let crc = ~seed >>> 0;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return ~crc >>> 0;
}

export function supportsCompressionStream(): boolean {
  return typeof CompressionStream === "function";
}

/**
 * Encodes palette indices as an 8-, 4-, 2-, or 1-bit indexed PNG. Browsers'
 * canvas encoders only write truecolor PNGs, which is why a quantized image
 * needs its own encoder to actually get smaller.
 */
export async function encodeIndexedPng(
  width: number,
  height: number,
  indices: Uint8Array,
  palette: readonly QuantizedColor[],
): Promise<Blob> {
  if (!supportsCompressionStream()) {
    throw new ImageConversionError(
      "This browser cannot compress PNG data.",
      "UNSUPPORTED_OUTPUT",
    );
  }
  if (palette.length === 0 || palette.length > 256) {
    throw new ImageConversionError(
      "A PNG palette needs between 1 and 256 colors.",
      "INVALID_OPTION",
    );
  }

  const bitDepth =
    palette.length <= 2
      ? 1
      : palette.length <= 4
        ? 2
        : palette.length <= 16
          ? 4
          : 8;
  const perByte = 8 / bitDepth;
  const stride = Math.ceil(width / perByte);
  const raw = new Uint8Array((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    // Filter type 0 per row: the PNG spec's recommendation for palette images.
    const rowStart = y * (stride + 1) + 1;
    for (let x = 0; x < width; x += 1) {
      const index = indices[y * width + x]!;
      const byte = rowStart + Math.floor(x / perByte);
      const shift = 8 - bitDepth * ((x % perByte) + 1);
      raw[byte]! |= index << shift;
    }
  }

  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([bitDepth, 3, 0, 0, 0], 8);

  const plte = new Uint8Array(palette.length * 3);
  palette.forEach((color, index) =>
    plte.set([color.r, color.g, color.b], index * 3),
  );

  let lastTranslucent = -1;
  palette.forEach((color, index) => {
    if (color.a < 255) lastTranslucent = index;
  });
  const trns = Uint8Array.from(
    palette.slice(0, lastTranslucent + 1),
    (color) => color.a,
  );

  const chunks: Uint8Array[] = [
    Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    chunk("IHDR", header),
    chunk("PLTE", plte),
    ...(trns.length ? [chunk("tRNS", trns)] : []),
    chunk("IDAT", await deflate(raw)),
    chunk("IEND", new Uint8Array(0)),
  ];
  return new Blob(chunks as BlobPart[], { type: "image/png" });
}

/** Translucent entries first, keeping the `tRNS` chunk as short as possible. */
export function sortPaletteForPng(
  palette: readonly QuantizedColor[],
): QuantizedColor[] {
  return [...palette].sort(
    (first, second) => Number(first.a === 255) - Number(second.a === 255),
  );
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(data.length + 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  for (let index = 0; index < 4; index += 1) {
    bytes[4 + index] = type.charCodeAt(index);
  }
  bytes.set(data, 8);
  view.setUint32(8 + data.length, crc32(bytes.subarray(4, 8 + data.length)));
  return bytes;
}

/** `CompressionStream("deflate")` emits the zlib wrapper PNG requires. */
async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
