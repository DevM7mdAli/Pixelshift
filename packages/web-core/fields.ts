import {
  OUTPUT_FORMATS,
  formatBytes,
  supportsOutputFormat,
  type ImageResult,
  type OutputFormat,
} from "pixelshift-core";
import { html, nothing, type TemplateResult } from "lit";
import { icon } from "./icons.js";
import { ui } from "./ui.js";

/** Form controls several tools share, so each renders identically everywhere. */

export const FORMAT_LABELS: Record<OutputFormat, string> = {
  png: "PNG",
  jpeg: "JPEG",
  webp: "WebP",
};

export function numberInput(options: {
  label: string;
  value: number | undefined;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  onInput: (value: string) => void;
}): TemplateResult {
  return html`
    <label class=${ui.label}>
      ${options.label}
      <span class="relative flex min-w-0">
        <input
          class="${ui.field} ${options.suffix ? "pr-10" : ""}"
          type="number"
          inputmode="numeric"
          min=${options.min ?? 1}
          max=${options.max ?? nothing}
          step=${options.step ?? 1}
          placeholder=${options.placeholder ?? ""}
          .value=${options.value === undefined ? "" : String(options.value)}
          ?disabled=${options.disabled}
          @input=${(event: Event) =>
            options.onInput((event.currentTarget as HTMLInputElement).value)}
        />
        ${options.suffix
          ? html`<span
              class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted"
              >${options.suffix}</span
            >`
          : nothing}
      </span>
    </label>
  `;
}

export function rangeInput(options: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onInput: (value: number) => void;
}): TemplateResult {
  return html`
    <label class=${ui.label}>
      <span class=${ui.labelRow}
        >${options.label}<span class=${ui.value}>${options.display}</span></span
      >
      <input
        class="${ui.range} h-9"
        type="range"
        min=${options.min}
        max=${options.max}
        step=${options.step}
        .value=${String(options.value)}
        ?disabled=${options.disabled}
        @input=${(event: Event) =>
          options.onInput(
            Number((event.currentTarget as HTMLInputElement).value),
          )}
      />
    </label>
  `;
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * A labeled select with its own chevron. The native arrow is hidden because
 * browsers pin it to the very edge of the control regardless of padding.
 */
export function selectField<T extends string>(options: {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  disabled?: boolean;
  onChange: (value: T) => void;
}): TemplateResult {
  return html`
    <label class=${ui.label}>
      ${options.label}
      <span class="relative flex min-w-0">
        <select
          class=${ui.select}
          ?disabled=${options.disabled}
          @change=${(event: Event) =>
            options.onChange(
              (event.currentTarget as HTMLSelectElement).value as T,
            )}
        >
          ${options.options.map(
            (option) => html`
              <option
                value=${option.value}
                ?disabled=${option.disabled}
                ?selected=${option.value === options.value}
              >
                ${option.label}
              </option>
            `,
          )}
        </select>
        <span
          class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-muted"
          >${icon("chevron")}</span
        >
      </span>
    </label>
  `;
}

/** The output formats this browser can encode, as select options. */
export function formatOptions(): SelectOption<OutputFormat>[] {
  return OUTPUT_FORMATS.map((format) => ({
    value: format,
    label: FORMAT_LABELS[format],
    disabled: !supportsOutputFormat(format),
  }));
}

/** A format picker whose empty value means "keep the input's format". */
export function formatSelect(options: {
  value: OutputFormat | undefined;
  disabled?: boolean;
  keepLabel?: string;
  onChange: (format: OutputFormat | undefined) => void;
}): TemplateResult {
  return selectField<OutputFormat | "">({
    label: "Output format",
    value: options.value ?? "",
    options: [
      { value: "", label: options.keepLabel ?? "Same as original" },
      ...formatOptions(),
    ],
    ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
    onChange: (value) => options.onChange(value || undefined),
  });
}

export function positiveNumberOrUndefined(value: string): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

/** `"62% smaller"`, `"8% larger"`, or `"same size"`. */
export function describeSavings(
  result: Pick<ImageResult, "originalSize" | "convertedSize">,
): string {
  const ratio = 1 - result.convertedSize / result.originalSize;
  if (Math.abs(ratio) < 0.005) return "same size";
  return ratio > 0
    ? `${Math.round(ratio * 100)}% smaller`
    : `${Math.round(-ratio * 100)}% larger`;
}

export function describeSize(result: ImageResult): string {
  return `${result.width}×${result.height} · ${formatBytes(result.convertedSize)}`;
}

/** Parses a value like `"200kb"`, `"1.5 MB"`, or `204800` into bytes. */
export function parseByteSize(
  value: string | number | null,
): number | undefined {
  if (value === null || value === "") return undefined;
  if (typeof value === "number") return value > 0 ? value : undefined;
  const match = /^\s*([\d.]+)\s*(b|kb|k|mb|m)?\s*$/i.exec(value);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "b").toLowerCase();
  const bytes = unit.startsWith("m")
    ? amount * 1024 * 1024
    : unit.startsWith("k")
      ? amount * 1024
      : amount;
  return bytes > 0 ? Math.round(bytes) : undefined;
}
