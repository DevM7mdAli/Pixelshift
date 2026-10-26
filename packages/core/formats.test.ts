import { describe, expect, it } from "vitest";
import {
  ImageConversionError,
  calculateTargetSize,
  createOutputName,
  detectImageType,
  formatBytes,
  formatForMimeType,
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

  it("keeps the input format where a canvas encoder exists", () => {
    expect(formatForMimeType("image/jpeg")).toBe("jpeg");
    expect(formatForMimeType("image/webp")).toBe("webp");
    expect(formatForMimeType("image/gif")).toBe("png");
    expect(formatForMimeType("image/bmp")).toBe("png");
  });

  it("formats byte counts for people", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(-2048)).toBe("-2.0 KB");
  });
});
