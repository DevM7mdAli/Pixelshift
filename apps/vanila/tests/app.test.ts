// @vitest-environment jsdom
import "pixelshift-web-core/define";
import {
  IMAGE_CONVERTER_TAG,
  ImageConverterElement,
} from "pixelshift-web-core";
import { describe, expect, it } from "vitest";

describe("vanilla app", () => {
  it("registers and creates the web component", () => {
    expect(IMAGE_CONVERTER_TAG).toBe("pixelshift-image-converter");
    const element = document.createElement(IMAGE_CONVERTER_TAG);
    expect(element).toBeInstanceOf(ImageConverterElement);
  });
});
