import { describe, expect, it } from "vitest";
import {
  ImageConversionError,
  calculateTargetSize,
  createOutputName,
  detectImageType,
  normalizeQuality,
} from "./index.js";

describe("image core", () => {
  it("resizes within both bounds without upscaling", () => {
    expect(calculateTargetSize(2000, 1000, 800, 800)).toEqual({
      width: 800,
      height: 400,
    });
    expect(calculateTargetSize(320, 200, 800, 800)).toEqual({
      width: 320,
      height: 200,
    });
  });

  it("creates predictable output names", () => {
    expect(createOutputName("holiday.photo.png", "jpeg")).toBe(
      "holiday.photo.jpg",
    );
    expect(createOutputName("avatar", "webp")).toBe("avatar.webp");
  });

  it("validates quality", () => {
    expect(normalizeQuality()).toBe(0.85);
    expect(() => normalizeQuality(1.1)).toThrow(ImageConversionError);
  });

  it("detects image signatures when MIME metadata is absent", async () => {
    const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])]);
    const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff])]);

    await expect(detectImageType(png)).resolves.toBe("image/png");
    await expect(detectImageType(jpeg)).resolves.toBe("image/jpeg");
  });
});
