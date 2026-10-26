import { describe, expect, it } from "vitest";
import {
  BackgroundRemover,
  ColorPicker,
  ImageCompressor,
  ImageConverter,
  ImageCropper,
  ImageResizer,
  ImageToBase64,
  PixelshiftStudio,
  SocialResizer,
  YouTubeThumbnail,
} from "./index.js";

describe("Vue wrapper", () => {
  it("exports a named component for every tool", () => {
    expect(
      [
        ImageConverter,
        ImageCompressor,
        ImageResizer,
        ImageCropper,
        ColorPicker,
        ImageToBase64,
        SocialResizer,
        YouTubeThumbnail,
        BackgroundRemover,
        PixelshiftStudio,
      ].map((component) => component.name),
    ).toEqual([
      "ImageConverter",
      "ImageCompressor",
      "ImageResizer",
      "ImageCropper",
      "ColorPicker",
      "ImageToBase64",
      "SocialResizer",
      "YouTubeThumbnail",
      "BackgroundRemover",
      "PixelshiftStudio",
    ]);
  });

  it("does not give optional props Vue defaults", () => {
    const props = ImageResizer.props as Record<string, { default?: unknown }>;
    expect(props.keepAspectRatio?.default).toBeUndefined();
    expect(props.isDarkMode?.default).toBeUndefined();
  });
});
