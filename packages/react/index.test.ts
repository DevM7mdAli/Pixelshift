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

describe("React wrapper", () => {
  it("exports a component for every tool", () => {
    for (const component of [
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
    ]) {
      expect(component).toBeTypeOf("object");
    }
  });
});
