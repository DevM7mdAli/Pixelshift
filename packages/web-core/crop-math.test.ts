import { describe, expect, it } from "vitest";
import { dragCrop, initialCrop } from "./crop-math.js";

const bounds = { width: 1000, height: 500 };

describe("initialCrop", () => {
  it("centers a box of the requested ratio", () => {
    expect(initialCrop(bounds, 1)).toEqual({
      x: 300,
      y: 50,
      width: 400,
      height: 400,
    });
  });

  it("insets a free box on both axes", () => {
    expect(initialCrop(bounds, undefined)).toEqual({
      x: 100,
      y: 50,
      width: 800,
      height: 400,
    });
  });
});

describe("dragCrop", () => {
  const start = { x: 100, y: 100, width: 200, height: 100 };

  it("moves within the bounds", () => {
    expect(dragCrop(start, "move", 5000, -5000, bounds)).toEqual({
      ...start,
      x: 800,
      y: 0,
    });
  });

  it("resizes from an edge while anchoring the opposite one", () => {
    expect(dragCrop(start, "w", -50, 0, bounds)).toEqual({
      x: 50,
      y: 100,
      width: 250,
      height: 100,
    });
    expect(dragCrop(start, "s", 0, 1000, bounds)).toEqual({
      x: 100,
      y: 100,
      width: 200,
      height: 400,
    });
  });

  it("never shrinks below the minimum size", () => {
    expect(dragCrop(start, "e", -1000, 0, bounds, undefined, 10).width).toBe(
      10,
    );
  });

  it("keeps the aspect ratio and stays inside the bounds", () => {
    const ratio = 2;
    const grown = dragCrop(start, "se", 100, 0, bounds, ratio);
    expect(grown).toEqual({ x: 100, y: 100, width: 300, height: 150 });

    const clamped = dragCrop(start, "se", 5000, 0, bounds, ratio);
    expect(clamped.width / clamped.height).toBeCloseTo(ratio);
    expect(clamped.x + clamped.width).toBeLessThanOrEqual(bounds.width);
    expect(clamped.y + clamped.height).toBeLessThanOrEqual(bounds.height);
  });
});
