import type { Rect, Size } from "pixelshift-core";

/** Which part of the crop box is being dragged. */
export type CropHandle =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "nw"
  | "ne"
  | "sw"
  | "se";

export const RESIZE_HANDLES: readonly Exclude<CropHandle, "move">[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

/** A centered box of `ratio` covering `coverage` of the largest that fits. */
export function initialCrop(
  bounds: Size,
  ratio: number | undefined,
  coverage = 0.8,
  center = { x: bounds.width / 2, y: bounds.height / 2 },
): Rect {
  const target = ratio ?? bounds.width / bounds.height;
  let width = Math.min(bounds.width, bounds.height * target) * coverage;
  let height = width / target;
  if (!ratio) {
    width = bounds.width * coverage;
    height = bounds.height * coverage;
  }
  return {
    x: clamp(center.x - width / 2, 0, bounds.width - width),
    y: clamp(center.y - height / 2, 0, bounds.height - height),
    width,
    height,
  };
}

/**
 * Applies a drag of (`dx`, `dy`) source pixels to `start`. Opposite edges stay
 * anchored, the box never leaves `bounds` or shrinks below `minSize`, and a
 * `ratio` is preserved by letting the dragged axis drive the other one.
 */
export function dragCrop(
  start: Rect,
  handle: CropHandle,
  dx: number,
  dy: number,
  bounds: Size,
  ratio?: number,
  minSize = 8,
): Rect {
  if (handle === "move") {
    return {
      ...start,
      x: clamp(start.x + dx, 0, bounds.width - start.width),
      y: clamp(start.y + dy, 0, bounds.height - start.height),
    };
  }

  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;

  if (handle.includes("w")) left = clamp(left + dx, 0, right - minSize);
  if (handle.includes("e"))
    right = clamp(right + dx, left + minSize, bounds.width);
  if (handle.includes("n")) top = clamp(top + dy, 0, bottom - minSize);
  if (handle.includes("s"))
    bottom = clamp(bottom + dy, top + minSize, bounds.height);

  if (!ratio) {
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  const horizontal = handle.includes("e") || handle.includes("w");
  const vertical = handle.includes("n") || handle.includes("s");
  let width = right - left;
  let height = bottom - top;
  if (horizontal && (!vertical || Math.abs(dx) >= Math.abs(dy) * ratio)) {
    height = width / ratio;
  } else {
    width = height * ratio;
  }

  // Anchor: the opposite edge for corners, the center line for side handles.
  const anchorX = handle.includes("w")
    ? start.x + start.width
    : handle.includes("e")
      ? start.x
      : start.x + start.width / 2;
  const anchorY = handle.includes("n")
    ? start.y + start.height
    : handle.includes("s")
      ? start.y
      : start.y + start.height / 2;
  const towardX = handle.includes("w") ? -1 : handle.includes("e") ? 1 : 0;
  const towardY = handle.includes("n") ? -1 : handle.includes("s") ? 1 : 0;

  // The largest size the anchored box can take before it leaves the bounds.
  const roomX =
    towardX < 0
      ? anchorX
      : towardX > 0
        ? bounds.width - anchorX
        : 2 * Math.min(anchorX, bounds.width - anchorX);
  const roomY =
    towardY < 0
      ? anchorY
      : towardY > 0
        ? bounds.height - anchorY
        : 2 * Math.min(anchorY, bounds.height - anchorY);
  const scale = Math.min(1, roomX / width, roomY / height);
  width = Math.max(width * scale, Math.min(minSize, roomX));
  height = width / ratio;

  const x =
    towardX < 0 ? anchorX - width : towardX > 0 ? anchorX : anchorX - width / 2;
  const y =
    towardY < 0
      ? anchorY - height
      : towardY > 0
        ? anchorY
        : anchorY - height / 2;
  return { x, y, width, height };
}

/** Rounds a crop box to whole pixels for display and inputs. */
export function roundRect(rect: Rect): Rect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
