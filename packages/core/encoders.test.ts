import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  base64ToBlob,
  bytesToBase64,
  crc32,
  createEmbedSnippets,
  createZip,
  encodeIndexedPng,
  imageToBase64,
  quantize,
  remap,
} from "./index.js";

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

interface Chunk {
  type: string;
  data: Uint8Array;
  crcValid: boolean;
}

function readChunks(bytes: Uint8Array): Chunk[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  const chunks: Chunk[] = [];
  for (let offset = 8; offset < bytes.length; ) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const crc = view.getUint32(offset + 8 + length);
    chunks.push({
      type,
      data,
      crcValid: crc === crc32(bytes.subarray(offset + 4, offset + 8 + length)),
    });
    offset += length + 12;
  }
  return chunks;
}

describe("crc32", () => {
  it("matches the IEEE reference value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("quantize and remap", () => {
  it("finds the distinct colors of a small image", () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0,
    ]);
    const palette = quantize(data, { colors: 8, includeAlpha: true });
    expect(palette).toHaveLength(3);
    const indices = remap(data, 4, 1, palette, { dither: false });
    expect(palette[indices[0]!]).toMatchObject({ r: 255, g: 0, b: 0, a: 255 });
    expect(indices[0]).toBe(indices[1]);
    expect(palette[indices[3]!]!.a).toBe(0);
  });

  it("keeps small but distinct colors when one value dominates a box", () => {
    const data: number[] = [];
    const add = (count: number, color: number[]) => {
      for (let index = 0; index < count; index += 1) data.push(...color, 255);
    };
    add(900, [255, 255, 255]);
    add(60, [200, 90, 60]);
    add(40, [202, 255, 69]);
    const palette = quantize(new Uint8ClampedArray(data), { colors: 6 });
    expect(palette.slice(0, 3).map(({ r, g, b }) => [r, g, b])).toEqual([
      [255, 255, 255],
      [200, 90, 60],
      [202, 255, 69],
    ]);
  });

  it("never returns more colors than requested", () => {
    const data = new Uint8ClampedArray(256 * 4);
    for (let index = 0; index < 256; index += 1) {
      data.set([index, 255 - index, (index * 7) % 256, 255], index * 4);
    }
    expect(quantize(data, { colors: 16 }).length).toBeLessThanOrEqual(16);
  });
});

describe("encodeIndexedPng", () => {
  it("writes a valid palette PNG with transparency", async () => {
    const palette = [
      { r: 0, g: 0, b: 0, a: 0, population: 0.5 },
      { r: 255, g: 0, b: 0, a: 255, population: 0.5 },
    ];
    const indices = new Uint8Array([0, 1, 1, 0, 1, 0, 1, 1, 0]);
    const blob = await encodeIndexedPng(3, 3, indices, palette);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    expect(blob.type).toBe("image/png");
    expect([...bytes.subarray(0, 8)]).toEqual(PNG_HEADER);

    const chunks = readChunks(bytes);
    expect(chunks.map((chunk) => chunk.type)).toEqual([
      "IHDR",
      "PLTE",
      "tRNS",
      "IDAT",
      "IEND",
    ]);
    expect(chunks.every((chunk) => chunk.crcValid)).toBe(true);

    const header = chunks[0]!.data;
    expect(new DataView(header.buffer, header.byteOffset).getUint32(0)).toBe(3);
    expect(header[8]).toBe(1); // two colors fit in one bit per pixel
    expect(header[9]).toBe(3); // indexed color

    const raw = inflateSync(chunks[3]!.data);
    // Each row: filter byte + one packed byte, e.g. row 0 is 0,1,1 → 0b011xxxxx.
    expect([...raw]).toEqual([0, 0b01100000, 0, 0b01000000, 0, 0b11000000]);
  });
});

describe("createZip", () => {
  it("stores entries with unique names and a central directory", async () => {
    const zip = await createZip([
      new File(["first"], "photo.png"),
      new File(["second"], "photo.png"),
    ]);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    const text = new TextDecoder().decode(bytes);
    const view = new DataView(bytes.buffer);

    expect(zip.type).toBe("application/zip");
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(text).toContain("photo.png");
    expect(text).toContain("photo (2).png");
    expect(text).toContain("first");
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(bytes.length - 12, true)).toBe(2);
  });
});

describe("base64", () => {
  it("round-trips bytes larger than one encoding chunk", async () => {
    const bytes = Uint8Array.from(
      { length: 100_000 },
      (_, index) => index % 251,
    );
    const blob = base64ToBlob(bytesToBase64(bytes), "image/png");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
    expect(blob.type).toBe("image/png");
  });

  it("encodes images as data URLs, sniffing the type", async () => {
    const file = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
      "dot.png",
    );
    const result = await imageToBase64(file);
    expect(result.dataUrl).toBe("data:image/png;base64,iVBORw==");
    expect(result.encodedSize).toBe(result.dataUrl.length);
    expect(base64ToBlob(result.dataUrl).type).toBe("image/png");
  });

  it("accepts SVG without decoding it", async () => {
    const svg = new File(["<svg/>"], "icon.svg", { type: "image/svg+xml" });
    await expect(imageToBase64(svg)).resolves.toMatchObject({
      mimeType: "image/svg+xml",
    });
  });

  it("rejects files that are not images", async () => {
    await expect(
      imageToBase64(new File(["hello"], "notes.txt")),
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_INPUT",
    });
  });

  it("builds escaped snippets", () => {
    const snippets = createEmbedSnippets({
      dataUrl: "data:image/png;base64,AAAA",
      base64: "AAAA",
      mimeType: "image/png",
      fileName: 'logo "dark".png',
    });
    expect(snippets.html).toBe(
      '<img src="data:image/png;base64,AAAA" alt="logo &quot;dark&quot;" />',
    );
    expect(snippets.css).toBe(
      'background-image: url("data:image/png;base64,AAAA");',
    );
    expect(snippets.markdown).toContain("](data:image/png;base64,AAAA)");
    expect(JSON.parse(snippets.json)).toEqual({
      name: 'logo "dark".png',
      type: "image/png",
      data: "AAAA",
    });
  });
});
