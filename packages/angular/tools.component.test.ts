import "@angular/compiler";
import { ElementRef, SimpleChange, reflectComponentType } from "@angular/core";
import { describe, expect, it } from "vitest";
import {
  BackgroundRemoverComponent,
  ColorPickerComponent,
  ImageCompressorComponent,
  ImageCropperComponent,
  ImageResizerComponent,
  ImageToBase64Component,
  PixelshiftStudioComponent,
  SocialResizerComponent,
  YouTubeThumbnailComponent,
} from "./tools.component.js";

describe("Angular tool components", () => {
  it("use the custom element tag as their selector", () => {
    const selectors = [
      ImageCompressorComponent,
      ImageResizerComponent,
      ImageCropperComponent,
      ColorPickerComponent,
      ImageToBase64Component,
      SocialResizerComponent,
      YouTubeThumbnailComponent,
      BackgroundRemoverComponent,
      PixelshiftStudioComponent,
    ].map((component) => reflectComponentType(component)?.selector);

    expect(selectors).toEqual([
      "pixelshift-image-compressor",
      "pixelshift-image-resizer",
      "pixelshift-image-cropper",
      "pixelshift-color-picker",
      "pixelshift-image-to-base64",
      "pixelshift-social-resizer",
      "pixelshift-youtube-thumbnail",
      "pixelshift-background-remover",
      "pixelshift-studio",
    ]);
  });

  it("forwards inputs to the element's properties", () => {
    const element = {} as HTMLElement;
    const component = new ImageCompressorComponent(new ElementRef(element));
    component.ngOnChanges({
      quality: new SimpleChange(undefined, 0.6, true),
      isDarkMode: new SimpleChange(undefined, true, true),
    });
    expect(element).toMatchObject({ quality: 0.6, isDarkMode: true });
  });

  it("exposes typed outputs", () => {
    const component = new ImageCropperComponent(
      new ElementRef({} as HTMLElement),
    );
    const reflected = reflectComponentType(ImageCropperComponent);
    expect(reflected?.outputs.map((output) => output.propName)).toEqual(
      expect.arrayContaining(["processComplete", "processError", "cropChange"]),
    );
    expect(component.cropChange).toBeDefined();
  });
});
