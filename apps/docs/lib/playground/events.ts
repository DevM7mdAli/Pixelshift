/** Every event any Pixelshift element can fire. */
export const EVENT_NAMES = [
  "files-selected",
  "process-start",
  "process-complete",
  "process-error",
  "conversion-start",
  "conversion-complete",
  "conversion-error",
  "crop-change",
  "color-pick",
  "tool-change",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

function bytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/** One line describing an event's `detail`, for the log. */
export function summarizeDetail(name: string, detail: unknown): string {
  switch (name) {
    case "files-selected":
    case "process-start": {
      const files = (detail as File[] | undefined) ?? [];
      return `${plural(files.length, "file")}${files.length ? `: ${files.map((file) => file.name).join(", ")}` : ""}`;
    }
    case "process-complete":
    case "conversion-complete": {
      const results =
        (detail as Array<Record<string, unknown>> | undefined) ?? [];
      const first = results[0];
      const size =
        first && typeof first.convertedSize === "number"
          ? ` · first ${bytes(first.convertedSize)}`
          : "";
      return `${plural(results.length, "result")}${size}`;
    }
    case "process-error": {
      const { file, error } = detail as { file: File; error: unknown };
      const code = (error as { code?: string })?.code;
      return `${file.name}${code ? ` · ${code}` : ""} · ${(error as Error)?.message ?? String(error)}`;
    }
    case "conversion-error":
      return (detail as Error | undefined)?.message ?? String(detail);
    case "crop-change": {
      const { x, y, width, height } = detail as Record<string, number>;
      return `x ${x}, y ${y} · ${width}×${height}`;
    }
    case "color-pick":
      return (detail as { hex: string }).hex;
    case "tool-change":
      return String(detail);
    default:
      return "";
  }
}
