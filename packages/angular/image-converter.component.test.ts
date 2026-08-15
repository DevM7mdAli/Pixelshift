import "@angular/compiler";
import { reflectComponentType } from "@angular/core";
import { describe, expect, it } from "vitest";
import { ImageConverterComponent } from "./image-converter.component.js";

describe("Angular wrapper", () => {
  it("exposes safe defaults", () => {
    const component = new ImageConverterComponent();
    expect(component.format).toBe("webp");
    expect(component.multiple).toBe(false);
  });

  it("uses the branded public selector", () => {
    expect(reflectComponentType(ImageConverterComponent)?.selector).toBe(
      "pixelshift-converter",
    );
  });
});
