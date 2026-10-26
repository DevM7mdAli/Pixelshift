import type {
  EmbedSnippetFormat,
  FitMode,
  ImageErrorCode,
  Position,
  SocialPresetId,
} from "pixelshift-core";
import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Localization for every Pixelshift element.
 *
 * - Messages are plain, serializable strings. `{name}` placeholders are
 *   filled at render time; counts use CLDR plural categories, so languages
 *   with richer plural rules (Arabic has six forms) translate naturally.
 * - English ships with each element. Other languages are registered once with
 *   `registerLocale()`, or passed per element through the `messages` property.
 * - The locale is the element's `locale` attribute, else the nearest `lang`
 *   attribute up the tree (crossing shadow roots), else English — so an app
 *   that sets `<html lang="ar">` is followed automatically, including live
 *   language switches.
 */

/** A message that depends on a count. `other` is required; add the categories your language uses. */
export type Plural = { other: string } & Partial<
  Record<"zero" | "one" | "two" | "few" | "many", string>
>;

/** Shared strings used by every tool. */
export interface CommonMessages {
  /** Dropzone prompt for one file. `{browse}` becomes the underlined browse link. */
  dropSingle: string;
  /** Dropzone prompt for several files. `{browse}` becomes the underlined browse link. */
  dropMultiple: string;
  browse: string;
  /** Line under the prompt. `{formats}` is the accepted formats. */
  acceptLine: string;
  acceptFormats: string;
  addOrReplace: string;
  chooseDifferent: string;
  selectedFiles: string;
  /** `{name}` is the file name. */
  removeFile: string;
  /** Action button with a count, e.g. "Compress 3 images". `{action}`, `{count}`. */
  actionWithCount: Plural;
  /** Busy button label. `{label}` is the tool's busy verb. */
  busy: string;
  /** Busy button label in a batch. `{label}`, `{current}`, `{total}`. */
  busyProgress: string;
  cancel: string;
  clear: string;
  result: string;
  /** `{count}` */
  results: Plural;
  download: string;
  downloadAll: string;
  compare: string;
  hideCompare: string;
  original: string;
  resultLabel: string;
  compareLabel: string;
  copied: string;
  /** `{value}` is what was copied. */
  copiedValue: string;
  copyFailed: string;
  outputFormat: string;
  sameAsOriginal: string;
  quality: string;
  lossless: string;
  maximumWidth: string;
  maximumHeight: string;
  placeholderOriginal: string;
  placeholderNoLimit: string;
  placeholderAuto: string;
  unitPixels: string;
  unitKilobytes: string;
  /** A before → after pair; flip the arrow for right-to-left languages. `{from}`, `{to}`. */
  sizeChange: string;
  /** `{percent}` */
  smaller: string;
  /** `{percent}` */
  larger: string;
  sameSize: string;
  loadingImage: string;
  genericError: string;
}

/** Shown instead of the core's English error text, keyed by `ImageConversionError.code`. */
export type ErrorMessages = Record<ImageErrorCode, string>;

export interface ToolMessages {
  heading: string;
  description: string;
  /** The action button, e.g. "Compress". */
  action: string;
  /** The busy verb, e.g. "Compressing". */
  busy: string;
}

export interface CompressorMessages extends ToolMessages {
  targetSize: string;
  /** `{saved}`, `{percent}`, `{count}` */
  savedSummary: Plural;
  alreadyOptimal: string;
  aboveTarget: string;
}

export interface ResizerMessages extends ToolMessages {
  resizeBy: string;
  pixels: string;
  percentage: string;
  scale: string;
  width: string;
  height: string;
  keepAspectRatio: string;
  fit: string;
  fits: Record<FitMode, string>;
  noUpscale: string;
}

export interface CropperMessages extends ToolMessages {
  aspectRatio: string;
  free: string;
  /** Tooltips for the aspect-ratio presets, keyed by id such as `"16:9"`. */
  ratios: Record<string, string>;
  resetBox: string;
  x: string;
  y: string;
  width: string;
  height: string;
  /** Screen-reader label of the crop box. `{width}`, `{height}`. */
  cropArea: string;
  imageAlt: string;
}

export interface ColorPickerMessages extends ToolMessages {
  colorFormat: string;
  imageLabel: string;
  clickToPick: string;
  /** `{format}` such as HEX. */
  copyValue: string;
  palette: string;
  copyCss: string;
  copiedCss: string;
  /** `{value}` */
  copyColor: string;
}

export interface Base64Messages extends ToolMessages {
  acceptFormats: string;
  /** `{type}`, `{from}`, `{to}`, `{percent}` */
  encodedSummary: string;
  snippetFormat: string;
  snippets: Record<EmbedSnippetFormat, string>;
  /** `{format}` */
  copySnippet: string;
  /** `{format}` */
  copiedSnippet: string;
  downloadText: string;
  altText: string;
  largeWarning: string;
  /** `{count}` */
  moreCharacters: Plural;
}

export interface SocialMessages extends ToolMessages {
  platform: string;
  size: string;
  framing: string;
  fillFrame: string;
  fitInside: string;
  focus: string;
  positions: Record<Position, string>;
  background: string;
  previewCaption: string;
  previewEmpty: string;
  /** `{size}` */
  maxFileSize: string;
  /** `{limit}` */
  overLimit: string;
  /** Preset names. Missing ids fall back to the English name from the core. */
  presets: Partial<Record<SocialPresetId, string>>;
}

export interface YouTubeMessages {
  heading: string;
  /** `{width}`, `{height}`, `{limit}` */
  description: string;
  previewTitle: string;
  previews: { home: string; search: string; upNext: string };
  /** `{label}` */
  previewAlt: string;
}

export interface BackgroundMessages extends ToolMessages {
  tolerance: string;
  softness: string;
  sharp: string;
  backgroundColor: string;
  detected: string;
  pick: string;
  auto: string;
  pickHint: string;
  pickAlt: string;
  replaceWith: string;
  transparency: string;
  color: string;
  fillColor: string;
  keepFormat: string;
  contiguous: string;
  /** `{percent}` */
  removed: string;
  compareLabel: string;
}

export interface StudioMessages {
  toolsLabel: string;
  tabs: Record<
    | "compress"
    | "resize"
    | "convert"
    | "crop"
    | "colors"
    | "base64"
    | "social"
    | "youtube"
    | "background",
    string
  >;
}

/** Every string the elements render. Translate all of it with `satisfies PixelshiftMessages`. */
export interface PixelshiftMessages {
  common: CommonMessages;
  errors: ErrorMessages;
  converter: ToolMessages;
  compressor: CompressorMessages;
  resizer: ResizerMessages;
  cropper: CropperMessages;
  colorPicker: ColorPickerMessages;
  base64: Base64Messages;
  social: SocialMessages;
  youtube: YouTubeMessages;
  background: BackgroundMessages;
  studio: StudioMessages;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? T[K] : DeepPartial<T[K]>;
};

/** Translations or overrides; any subset of {@link PixelshiftMessages}. */
export type PixelshiftMessagesInput = DeepPartial<PixelshiftMessages>;

export const commonMessages: CommonMessages = {
  dropSingle: "Drop an image here, or {browse}",
  dropMultiple: "Drop images here, or {browse}",
  browse: "browse",
  acceptLine: "{formats} · or paste",
  acceptFormats: "PNG, JPEG, WebP, GIF or BMP",
  addOrReplace: "Add or replace images",
  chooseDifferent: "Choose a different image",
  selectedFiles: "Selected files",
  removeFile: "Remove {name}",
  actionWithCount: {
    one: "{action} {count} image",
    other: "{action} {count} images",
  },
  busy: "{label}…",
  busyProgress: "{label} {current} of {total}…",
  cancel: "Cancel",
  clear: "Clear",
  result: "Result",
  results: { one: "{count} result", other: "{count} results" },
  download: "Download",
  downloadAll: "Download all (.zip)",
  compare: "Compare",
  hideCompare: "Hide",
  original: "Original",
  resultLabel: "Result",
  compareLabel: "Compare original and result",
  copied: "Copied",
  copiedValue: "Copied {value}",
  copyFailed: "Copy failed — select the text and copy it manually",
  outputFormat: "Output format",
  sameAsOriginal: "Same as original",
  quality: "Quality",
  lossless: "Lossless",
  maximumWidth: "Maximum width",
  maximumHeight: "Maximum height",
  placeholderOriginal: "Original",
  placeholderNoLimit: "No limit",
  placeholderAuto: "Auto",
  unitPixels: "px",
  unitKilobytes: "KB",
  sizeChange: "{from} → {to}",
  smaller: "{percent} smaller",
  larger: "{percent} larger",
  sameSize: "same size",
  loadingImage: "Loading image…",
  genericError: "Something went wrong.",
};

export const errorMessages: ErrorMessages = {
  ABORTED: "Cancelled.",
  DECODE_FAILED: "The browser could not decode this image.",
  EMPTY_FILE: "The file is empty.",
  FILE_TOO_LARGE: "The file is too large.",
  IMAGE_TOO_LARGE: "The image dimensions are too large.",
  INVALID_OPTION: "One of the settings is not valid.",
  UNSUPPORTED_INPUT: "This image format is not supported.",
  UNSUPPORTED_OUTPUT: "This browser cannot save images in that format.",
};

const registry = new Map<string, PixelshiftMessagesInput>();
const subscribers = new Set<ReactiveControllerHost>();
let version = 0;
let langObserver: MutationObserver | undefined;

/**
 * Registers a translation for a BCP 47 locale such as `"ar"` or `"fr-CA"`.
 * Calling it again merges into the existing entry. Connected elements
 * re-render immediately.
 *
 * ```ts
 * import { registerLocale, ar } from "pixelshift-web-core";
 * registerLocale("ar", ar);
 * ```
 */
export function registerLocale(
  locale: string,
  messages: PixelshiftMessagesInput,
): void {
  const key = normalizeLocale(locale);
  registry.set(key, deepMerge(registry.get(key) ?? {}, messages));
  version += 1;
  subscribers.forEach((host) => host.requestUpdate());
}

/** The locales registered so far, normalized to lower case. */
export function registeredLocales(): string[] {
  return [...registry.keys()];
}

/**
 * Merges `defaults` (English), every registered catalog from least to most
 * specific (`ar` before `ar-SA`), and `overrides`, in that order.
 */
export function resolveMessages<T extends object>(
  locale: string,
  defaults: T,
  overrides?: PixelshiftMessagesInput,
): T {
  let messages: object = defaults;
  for (const candidate of fallbackChain(locale).reverse()) {
    const catalog = registry.get(candidate);
    if (catalog) messages = deepMerge(messages, pick(catalog, defaults));
  }
  return (
    overrides ? deepMerge(messages, pick(overrides, defaults)) : messages
  ) as T;
}

/** `"ar-SA"` → `["ar-sa", "ar"]`. */
export function fallbackChain(locale: string): string[] {
  const parts = normalizeLocale(locale).split("-");
  return parts.map((_, index) =>
    parts.slice(0, parts.length - index).join("-"),
  );
}

/** Fills `{name}` placeholders. Unknown placeholders are left as written. */
export function formatMessage(
  template: string,
  values: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** Picks the plural form for `count` under `locale`'s CLDR rules. */
export function selectPlural(
  plural: Plural,
  count: number,
  locale: string,
): string {
  const category = pluralRules(locale).select(count) as keyof Plural;
  return plural[category] ?? plural.other;
}

const RTL_LANGUAGES = new Set([
  "ar",
  "arc",
  "ckb",
  "dv",
  "fa",
  "he",
  "iw",
  "ks",
  "ps",
  "sd",
  "syr",
  "ug",
  "ur",
  "yi",
]);

/** The writing direction of a locale, using `Intl.Locale` text info where available. */
export function localeDirection(locale: string): "ltr" | "rtl" {
  try {
    const info = new Intl.Locale(locale) as Intl.Locale & {
      getTextInfo?: () => { direction?: string };
      textInfo?: { direction?: string };
    };
    const direction =
      info.getTextInfo?.().direction ?? info.textInfo?.direction;
    if (direction === "rtl" || direction === "ltr") return direction;
  } catch {
    // Invalid tags fall through to the language list.
  }
  return RTL_LANGUAGES.has(normalizeLocale(locale).split("-")[0]!)
    ? "rtl"
    : "ltr";
}

/** The nearest `lang` attribute, walking up through shadow roots. */
export function inheritedLang(start: Node): string | undefined {
  let node: Node | null = start;
  while (node) {
    if (node instanceof Element) {
      const lang = node.getAttribute("lang");
      if (lang) return lang;
    }
    node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null);
  }
  return undefined;
}

export interface Formatters {
  number(value: number): string;
  /** `0.42` → `"42%"`. */
  percent(ratio: number): string;
  /** Binary units (1 KB = 1024 bytes), labeled and digit-shaped for the locale. */
  bytes(bytes: number): string;
  /** `1600, 900` → `"1600×900"`, without digit grouping. */
  dimensions(width: number, height: number): string;
}

const formatterCache = new Map<string, Formatters>();

export function formattersFor(locale: string): Formatters {
  let formatters = formatterCache.get(locale);
  if (formatters) return formatters;

  const safe = supportedLocale(locale);
  const number = new Intl.NumberFormat(safe, { maximumFractionDigits: 1 });
  const plain = new Intl.NumberFormat(safe, { useGrouping: false });
  const percent = new Intl.NumberFormat(safe, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const unit = (name: string) =>
    new Intl.NumberFormat(safe, {
      style: "unit",
      unit: name,
      unitDisplay: "short",
      maximumFractionDigits: 1,
    });
  const byte = unit("byte");
  const kilobyte = unit("kilobyte");
  const megabyte = unit("megabyte");

  formatters = {
    number: (value) => number.format(value),
    percent: (ratio) => percent.format(ratio),
    bytes: (bytes) => {
      const size = Math.abs(bytes);
      if (size < 1024) return byte.format(bytes);
      if (size < 1024 * 1024) return kilobyte.format(bytes / 1024);
      return megabyte.format(bytes / (1024 * 1024));
    },
    dimensions: (width, height) =>
      `${plain.format(width)}×${plain.format(height)}`,
  };
  formatterCache.set(locale, formatters);
  return formatters;
}

/** What an element needs to opt into localization. */
export interface LocalizedHost extends ReactiveControllerHost, HTMLElement {
  /** Explicit BCP 47 locale; overrides the inherited `lang`. */
  locale: string | undefined;
  /** Per-element translations or overrides. */
  messages: PixelshiftMessagesInput | undefined;
}

/**
 * Resolves messages, formatters, and direction for one element, and
 * re-renders it when a locale is registered or a `lang`/`dir` attribute
 * changes anywhere in the document.
 */
export class LocaleController<T extends object> implements ReactiveController {
  private cache: { key: string; overrides: unknown; messages: T } | undefined;

  constructor(
    private readonly host: LocalizedHost,
    private readonly defaults: () => T,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    subscribers.add(this.host);
    observeLangChanges();
  }

  hostDisconnected(): void {
    subscribers.delete(this.host);
  }

  /** The active locale: explicit, inherited from `lang`, or `"en"`. */
  get locale(): string {
    return this.host.locale || inheritedLang(this.host) || "en";
  }

  get messages(): T {
    const locale = this.locale;
    const key = `${locale}|${version}`;
    if (
      this.cache?.key !== key ||
      this.cache.overrides !== this.host.messages
    ) {
      this.cache = {
        key,
        overrides: this.host.messages,
        messages: resolveMessages(locale, this.defaults(), this.host.messages),
      };
    }
    return this.cache.messages;
  }

  get formatters(): Formatters {
    return formattersFor(this.locale);
  }

  /**
   * `dir` for the element's root: set only when the author chose a locale on
   * the element itself and no `dir`, so an Arabic widget on an English page
   * still reads right to left. Otherwise direction inherits like any HTML.
   */
  get direction(): "ltr" | "rtl" | undefined {
    if (this.host.hasAttribute("dir") || !this.host.locale) return undefined;
    return localeDirection(this.host.locale);
  }
}

function observeLangChanges(): void {
  if (langObserver || typeof MutationObserver === "undefined") return;
  if (typeof document === "undefined") return;
  langObserver = new MutationObserver(() =>
    subscribers.forEach((host) => host.requestUpdate()),
  );
  langObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang", "dir"],
    subtree: true,
  });
}

function normalizeLocale(locale: string): string {
  return locale.trim().replace(/_/g, "-").toLowerCase();
}

const pluralCache = new Map<string, Intl.PluralRules>();

function pluralRules(locale: string): Intl.PluralRules {
  let rules = pluralCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(supportedLocale(locale));
    pluralCache.set(locale, rules);
  }
  return rules;
}

/** Intl constructors throw on malformed tags; fall back to English. */
function supportedLocale(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? "en";
  } catch {
    return "en";
  }
}

/** Keeps only the sections an element actually renders. */
function pick(source: object, shape: object): object {
  const picked: Record<string, unknown> = {};
  for (const key of Object.keys(shape)) {
    if (key in source) picked[key] = (source as Record<string, unknown>)[key];
  }
  return picked;
}

function deepMerge<T extends object>(base: T, extra: object): T {
  const merged = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined) continue;
    const current = merged[key];
    merged[key] =
      isPlainObject(value) && isPlainObject(current)
        ? deepMerge(current, value)
        : value;
  }
  return merged as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
