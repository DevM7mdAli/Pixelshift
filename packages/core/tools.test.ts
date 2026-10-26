import { describe, expect, it } from "vitest";
import {
  ImageConversionError,
  SOCIAL_PLATFORMS,
  SOCIAL_PRESETS,
  YOUTUBE_THUMBNAIL,
  createBackgroundMask,
  getSocialPreset,
  socialPresetsFor,
} from "./index.js";

/** A white canvas with a solid red square in the middle. */
function productShot(size = 20, inset = 5) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inside =
        x >= inset && x < size - inset && y >= inset && y < size - inset;
      data.set(
        inside ? [200, 20, 20, 255] : [255, 255, 255, 255],
        (y * size + x) * 4,
      );
    }
  }
  return { data, width: size, height: size };
}

describe("social presets", () => {
  it("covers every platform with unique ids", () => {
    const ids = SOCIAL_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const platform of SOCIAL_PLATFORMS) {
      expect(socialPresetsFor(platform.id).length).toBeGreaterThan(0);
    }
  });

  it("knows the YouTube thumbnail size and upload limit", () => {
    expect(YOUTUBE_THUMBNAIL).toMatchObject({
      width: 1280,
      height: 720,
      maxFileSize: 2 * 1024 * 1024,
    });
    expect(getSocialPreset("instagram-story")).toMatchObject({
      width: 1080,
      height: 1920,
    });
    expect(getSocialPreset("myspace-banner")).toBeUndefined();
  });
});

describe("createBackgroundMask", () => {
  it("removes a plain backdrop and keeps the subject", () => {
    const mask = createBackgroundMask(productShot(), { feather: 0 });
    expect(mask.colors[0]!.hex).toBe("#ffffff");
    expect(mask.alpha[0]).toBe(0);
    expect(mask.alpha[10 * 20 + 10]).toBe(255);
    expect(mask.coverage).toBeCloseTo(1 - 100 / 400);
  });

  it("keeps enclosed background unless contiguity is off", () => {
    const image = productShot(20, 3);
    // Punch a white hole into the subject.
    image.data.set([255, 255, 255, 255], (10 * 20 + 10) * 4);

    const contiguous = createBackgroundMask(image, { feather: 0 });
    const global = createBackgroundMask(image, {
      feather: 0,
      contiguous: false,
    });
    expect(contiguous.alpha[10 * 20 + 10]).toBe(255);
    expect(global.alpha[10 * 20 + 10]).toBe(0);
  });

  it("keys an explicit color", () => {
    const mask = createBackgroundMask(productShot(), {
      color: "#c81414",
      feather: 0,
      contiguous: false,
    });
    expect(mask.alpha[10 * 20 + 10]).toBe(0);
    expect(mask.alpha[0]).toBe(255);
  });

  it("feathers the edge", () => {
    const mask = createBackgroundMask(productShot(), { feather: 1 });
    const edge = mask.alpha[10 * 20 + 5]!;
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(255);
    expect(mask.alpha[10 * 20 + 10]).toBe(255);
  });

  it("validates tolerance", () => {
    expect(() =>
      createBackgroundMask(productShot(), { tolerance: 140 }),
    ).toThrow(ImageConversionError);
  });
});
