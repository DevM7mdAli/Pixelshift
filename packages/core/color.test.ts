import { describe, expect, it } from "vitest";
import {
  ImageConversionError,
  averageColor,
  describeColor,
  extractPaletteFromPixels,
  getPixelColor,
  hexToRgb,
  readableTextColor,
  rgbToHex,
  rgbToHsl,
} from "./index.js";

function pixels(...colors: [number, number, number, number, number][]) {
  const data: number[] = [];
  for (const [r, g, b, a, count] of colors) {
    for (let index = 0; index < count; index += 1) data.push(r, g, b, a);
  }
  return new Uint8ClampedArray(data);
}

describe("color notation", () => {
  it("converts between notations", () => {
    expect(rgbToHex(30, 144, 255)).toBe("#1e90ff");
    expect(hexToRgb("#1E90FF")).toEqual({ r: 30, g: 144, b: 255 });
    expect(hexToRgb("fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(rgbToHsl(30, 144, 255)).toEqual([210, 100, 56]);
    expect(rgbToHsl(128, 128, 128)).toEqual([0, 0, 50]);
    expect(() => hexToRgb("#12")).toThrow(ImageConversionError);
  });

  it("describes a color in every CSS notation", () => {
    expect(describeColor(255, 0, 0)).toMatchObject({
      hex: "#ff0000",
      rgb: "rgb(255, 0, 0)",
      hsl: "hsl(0, 100%, 50%)",
    });
  });

  it("chooses readable text", () => {
    expect(readableTextColor({ r: 250, g: 250, b: 210 })).toBe("#000000");
    expect(readableTextColor({ r: 20, g: 30, b: 80 })).toBe("#ffffff");
  });

  it("samples a pixel with clamped coordinates", () => {
    const image = {
      data: pixels([0, 0, 0, 255, 1], [9, 8, 7, 255, 1]),
      width: 2,
      height: 1,
    };
    expect(getPixelColor(image, 1.7, 0).hex).toBe("#090807");
    expect(getPixelColor(image, 99, -4).hex).toBe("#090807");
  });
});

describe("palette extraction", () => {
  it("orders colors by how much of the image they cover", () => {
    const palette = extractPaletteFromPixels(
      pixels([255, 0, 0, 255, 60], [0, 0, 255, 255, 30], [0, 200, 0, 255, 10]),
      { count: 3 },
    );
    expect(palette.map((color) => color.hex)).toEqual([
      "#ff0000",
      "#0000ff",
      "#00c800",
    ]);
    expect(palette[0]!.population).toBeCloseTo(0.6);
  });

  it("merges near-duplicates and ignores transparent pixels", () => {
    const palette = extractPaletteFromPixels(
      pixels(
        [250, 250, 250, 255, 50],
        [252, 251, 249, 255, 50],
        [0, 0, 0, 0, 500],
      ),
      { count: 4 },
    );
    expect(palette).toHaveLength(1);
    expect(palette[0]!.population).toBeCloseTo(1);
  });

  it("averages by opacity", () => {
    expect(
      averageColor(pixels([255, 0, 0, 255, 1], [0, 0, 255, 0, 1])).hex,
    ).toBe("#ff0000");
  });
});
