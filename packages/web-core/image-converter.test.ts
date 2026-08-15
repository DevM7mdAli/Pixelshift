// @vitest-environment jsdom
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  IMAGE_CONVERTER_TAG,
  ImageConverterElement,
  defineImageConverter,
} from "./image-converter.js";

const toDataUrl = vi
  .spyOn(HTMLCanvasElement.prototype, "toDataURL")
  .mockImplementation((type) => `data:${type};base64,`);

afterAll(() => toDataUrl.mockRestore());

describe("image converter element", () => {
  it("registers idempotently", () => {
    defineImageConverter();
    defineImageConverter();
    expect(IMAGE_CONVERTER_TAG).toBe("pixelshift-image-converter");
    expect(customElements.get(IMAGE_CONVERTER_TAG)).toBe(ImageConverterElement);
  });

  it("uses safe defaults", () => {
    const element = new ImageConverterElement();
    expect(element.format).toBe("webp");
    expect(element.quality).toBe(0.85);
    expect(element.multiple).toBe(false);
  });

  it("keeps full-width controls inside their grid columns", async () => {
    const element = new ImageConverterElement();

    try {
      document.body.append(element);
      await element.updateComplete;

      const controls = element.renderRoot.querySelectorAll(
        'select, input[type="range"], input[type="number"]',
      );

      expect(controls).toHaveLength(4);
      for (const control of controls) {
        expect(control.classList.contains("box-border")).toBe(true);
      }
    } finally {
      element.remove();
    }
  });
});
