import { describe, expect, it } from "vitest";
import {
  ImageConversionError,
  clampRect,
  fitAspectRatio,
  parseAspectRatio,
  planResize,
  planTransform,
  resolvePosition,
} from "./index.js";

const full = (width: number, height: number) => ({
  x: 0,
  y: 0,
  width,
  height,
});

describe("planResize", () => {
  it("derives the missing dimension from the aspect ratio", () => {
    expect(planResize({ width: 2000, height: 1000 }, { width: 800 })).toEqual({
      width: 800,
      height: 400,
      source: full(2000, 1000),
      target: full(800, 400),
    });
    expect(
      planResize({ width: 2000, height: 1000 }, { height: 250 }).width,
    ).toBe(500);
  });

  it("scales uniformly", () => {
    const plan = planResize({ width: 1201, height: 801 }, { scale: 0.5 });
    expect([plan.width, plan.height]).toEqual([601, 401]);
  });

  it("upscales by default and stops at the source size when asked", () => {
    expect(planResize({ width: 100, height: 50 }, { width: 400 }).width).toBe(
      400,
    );
    expect(
      planResize(
        { width: 100, height: 50 },
        { width: 400, withoutEnlargement: true },
      ).width,
    ).toBe(100);
  });

  it("covers by cropping the centered overflow", () => {
    const plan = planResize(
      { width: 2000, height: 1000 },
      { width: 500, height: 500 },
    );
    expect(plan).toEqual({
      width: 500,
      height: 500,
      source: { x: 500, y: 0, width: 1000, height: 1000 },
      target: full(500, 500),
    });
  });

  it("moves the cover window with the position", () => {
    const left = planResize(
      { width: 2000, height: 1000 },
      { width: 500, height: 500, position: "left" },
    );
    const focal = planResize(
      { width: 2000, height: 1000 },
      { width: 500, height: 500, position: { x: 1, y: 0.5 } },
    );
    expect(left.source.x).toBe(0);
    expect(focal.source.x).toBe(1000);
  });

  it("contains by letterboxing inside the requested box", () => {
    expect(
      planResize(
        { width: 2000, height: 1000 },
        { width: 500, height: 500, fit: "contain" },
      ),
    ).toEqual({
      width: 500,
      height: 500,
      source: full(2000, 1000),
      target: { x: 0, y: 125, width: 500, height: 250 },
    });
  });

  it("fits inside without padding", () => {
    const plan = planResize(
      { width: 2000, height: 1000 },
      { width: 500, height: 500, fit: "inside" },
    );
    expect([plan.width, plan.height]).toEqual([500, 250]);
  });

  it("stretches with fill", () => {
    const plan = planResize(
      { width: 2000, height: 1000 },
      { width: 300, height: 300, fit: "fill" },
    );
    expect(plan.target).toEqual(full(300, 300));
    expect(plan.source).toEqual(full(2000, 1000));
  });

  it("rejects nonsense dimensions", () => {
    expect(() => planResize({ width: 10, height: 10 }, { width: -1 })).toThrow(
      ImageConversionError,
    );
  });
});

describe("cropping", () => {
  it("parses aspect ratios", () => {
    expect(parseAspectRatio("16:9")).toBeCloseTo(16 / 9);
    expect(parseAspectRatio("1.5")).toBe(1.5);
    expect(parseAspectRatio(2)).toBe(2);
    expect(() => parseAspectRatio("wide")).toThrow(ImageConversionError);
  });

  it("finds the largest rectangle of a ratio", () => {
    expect(fitAspectRatio({ width: 1600, height: 1200 }, 1)).toEqual({
      x: 200,
      y: 0,
      width: 1200,
      height: 1200,
    });
    expect(
      fitAspectRatio({ width: 1600, height: 1200 }, 16 / 9, "top"),
    ).toEqual({
      x: 0,
      y: 0,
      width: 1600,
      height: 900,
    });
  });

  it("clamps crop boxes to the image and whole pixels", () => {
    expect(
      clampRect(
        { x: -20.4, y: 10.6, width: 5000, height: 50 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ x: 0, y: 11, width: 800, height: 50 });
  });

  it("crops before resizing", () => {
    const plan = planTransform(
      { width: 1600, height: 1200 },
      { crop: { aspectRatio: "1:1" }, resize: { width: 300 } },
    );
    expect(plan).toEqual({
      width: 300,
      height: 300,
      source: { x: 200, y: 0, width: 1200, height: 1200 },
      target: full(300, 300),
    });
  });

  it("names positions as focal points", () => {
    expect(resolvePosition("top-right")).toEqual({ x: 1, y: 0 });
    expect(resolvePosition()).toEqual({ x: 0.5, y: 0.5 });
  });
});
