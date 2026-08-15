import { describe, expect, it } from "vitest";
import { ImageConverter } from "./index.js";

describe("React wrapper", () => {
  it("exports the framework component", () => {
    expect(ImageConverter).toBeTypeOf("object");
  });
});
