import { describe, expect, it } from "vitest";
import { ImageConverter } from "./index.js";

describe("Vue wrapper", () => {
  it("exports the framework component", () => {
    expect(ImageConverter.name).toBe("ImageConverter");
  });
});
