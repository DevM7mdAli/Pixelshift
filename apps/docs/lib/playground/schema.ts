import { SOCIAL_PRESETS } from "pixelshift-core";

/**
 * What the playground lets you change on each element. Defaults are never
 * written here: they are read from a fresh element instance, so they cannot
 * drift from the library. `schema.test.ts` checks every `key` exists on the
 * element it is attached to.
 */

interface ControlBase {
  /** The element property this control sets. */
  key: string;
  hint?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export type Control = ControlBase &
  (
    | { kind: "boolean"; htmlFalse?: boolean }
    | {
        kind: "number";
        min?: number;
        max?: number;
        step?: number;
        /** The element stores `value`; the control shows `value / scale` in `unit`. */
        scale?: number;
        unit?: string;
      }
    | { kind: "range"; min: number; max: number; step: number }
    | { kind: "text"; placeholder?: string }
    | { kind: "color" }
    | { kind: "select"; options: SelectOption[] }
  );

export interface ToolSchema {
  id: string;
  label: string;
  tag: string;
  /** The React component exported by `pixelshift-react`. */
  react: string;
  summary: string;
  controls: Control[];
  /** Shared controls this element does not have. */
  omitShared?: string[];
}

const formats: SelectOption[] = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];

/** Output format where unset means "keep the input's format". */
const optionalFormat: Control = {
  key: "format",
  kind: "select",
  options: [{ value: "", label: "Same as original" }, ...formats],
  hint: "Output format",
};

const quality = (min = 0.1, max = 1, step = 0.05): Control => ({
  key: "quality",
  kind: "range",
  min,
  max,
  step,
  hint: "JPEG and WebP encoder quality",
});

const multiple: Control = {
  key: "multiple",
  kind: "boolean",
  hint: "Allow selecting several files",
};

const fit: Control = {
  key: "fit",
  kind: "select",
  options: [
    { value: "cover", label: "Fill frame (crop)" },
    { value: "contain", label: "Fit inside (letterbox)" },
  ],
  hint: "How the image fills the frame",
};

const position: Control = {
  key: "position",
  kind: "select",
  options: [
    "top-left",
    "top",
    "top-right",
    "left",
    "center",
    "right",
    "bottom-left",
    "bottom",
    "bottom-right",
  ].map((value) => ({ value, label: value })),
  hint: "Which part stays in frame",
};

/** Properties every element has. */
export const SHARED_CONTROLS: Control[] = [
  { key: "disabled", kind: "boolean", hint: "Block all interaction" },
  { key: "isDarkMode", kind: "boolean", hint: "Use the dark palette" },
  { key: "bare", kind: "boolean", hint: "Drop the panel chrome and header" },
  { key: "auto", kind: "boolean", hint: "Process as soon as files arrive" },
  { key: "heading", kind: "text", placeholder: "Default title" },
  { key: "description", kind: "text", placeholder: "Default subtitle" },
  {
    key: "locale",
    kind: "select",
    options: [
      { value: "", label: "Follow page (lang)" },
      { value: "en", label: "English" },
      { value: "ar", label: "العربية (RTL)" },
    ],
    hint: "UI language",
  },
];

export const TOOLS: ToolSchema[] = [
  {
    id: "compress",
    label: "Compress",
    tag: "pixelshift-image-compressor",
    react: "ImageCompressor",
    summary: "Shrink JPEG, PNG, and WebP; optionally to a target size.",
    controls: [
      quality(),
      optionalFormat,
      {
        key: "targetSize",
        kind: "number",
        min: 1,
        scale: 1024,
        unit: "KB",
        hint: "Upper bound; quality is searched to fit",
      },
      { key: "maxWidth", kind: "number", min: 1, unit: "px" },
      multiple,
    ],
  },
  {
    id: "resize",
    label: "Resize",
    tag: "pixelshift-image-resizer",
    react: "ImageResizer",
    summary: "Exact pixels or a percentage, with an aspect lock.",
    controls: [
      {
        key: "unit",
        kind: "select",
        options: [
          { value: "px", label: "Pixels" },
          { value: "percent", label: "Percentage" },
        ],
      },
      { key: "width", kind: "number", min: 1, unit: "px" },
      { key: "height", kind: "number", min: 1, unit: "px" },
      { key: "percent", kind: "range", min: 5, max: 200, step: 5 },
      {
        key: "keepAspectRatio",
        kind: "boolean",
        htmlFalse: true,
        hint: "Derive one dimension from the other",
      },
      {
        key: "fit",
        kind: "select",
        options: [
          { value: "cover", label: "Crop to fill" },
          { value: "contain", label: "Fit and pad" },
          { value: "fill", label: "Stretch" },
          { value: "inside", label: "Fit inside" },
        ],
        hint: "Used when the ratio is unlocked",
      },
      optionalFormat,
      quality(),
      { key: "noUpscale", kind: "boolean", hint: "Never enlarge" },
      multiple,
    ],
  },
  {
    id: "convert",
    label: "Convert",
    tag: "pixelshift-image-converter",
    react: "ImageConverter",
    summary: "Convert between PNG, JPEG, and WebP.",
    controls: [
      { key: "format", kind: "select", options: formats },
      quality(),
      { key: "maxWidth", kind: "number", min: 1, unit: "px" },
      { key: "maxHeight", kind: "number", min: 1, unit: "px" },
      multiple,
    ],
  },
  {
    id: "crop",
    label: "Crop",
    tag: "pixelshift-image-cropper",
    react: "ImageCropper",
    summary: "Drag a crop box, or lock a preset aspect ratio.",
    controls: [
      {
        key: "aspectRatio",
        kind: "select",
        options: [
          "free",
          "1:1",
          "4:5",
          "3:4",
          "2:3",
          "9:16",
          "4:3",
          "3:2",
          "16:9",
          "21:9",
        ].map((value) => ({ value, label: value })),
      },
      optionalFormat,
      quality(0.5, 1, 0.01),
    ],
  },
  {
    id: "colors",
    label: "Colors",
    tag: "pixelshift-color-picker",
    react: "ColorPicker",
    summary: "Dominant palette plus a magnifier for any pixel.",
    controls: [
      { key: "count", kind: "number", min: 1, max: 16, hint: "Palette size" },
      {
        key: "colorFormat",
        kind: "select",
        options: ["hex", "rgb", "hsl"].map((value) => ({
          value,
          label: value.toUpperCase(),
        })),
      },
    ],
  },
  {
    id: "base64",
    label: "Base64",
    tag: "pixelshift-image-to-base64",
    react: "ImageToBase64",
    summary: "Data URLs with HTML, CSS, Markdown, and JSON snippets.",
    controls: [
      {
        key: "snippet",
        kind: "select",
        options: ["dataUrl", "base64", "html", "css", "markdown", "json"].map(
          (value) => ({ value, label: value }),
        ),
        hint: "Snippet tab shown first",
      },
      { key: "alt", kind: "text", placeholder: "File name" },
    ],
  },
  {
    id: "social",
    label: "Social",
    tag: "pixelshift-social-resizer",
    react: "SocialResizer",
    summary: "Platform-sized images with a framing preview.",
    controls: [
      {
        key: "preset",
        kind: "select",
        options: SOCIAL_PRESETS.map((preset) => ({
          value: preset.id,
          label: `${preset.platform} · ${preset.name}`,
        })),
      },
      {
        key: "platforms",
        kind: "text",
        placeholder: "instagram,x",
        hint: "Comma-separated platforms to offer",
      },
      fit,
      position,
      { key: "background", kind: "color", hint: "Letterbox color" },
      optionalFormat,
      quality(0.5, 1, 0.01),
      multiple,
    ],
  },
  {
    id: "youtube",
    label: "YouTube",
    tag: "pixelshift-youtube-thumbnail",
    react: "YouTubeThumbnail",
    summary: "1280 × 720, compressed under YouTube's 2 MB limit.",
    controls: [
      fit,
      position,
      { key: "background", kind: "color", hint: "Letterbox color" },
      optionalFormat,
      quality(0.5, 1, 0.01),
      multiple,
    ],
  },
  {
    id: "background",
    label: "Background",
    tag: "pixelshift-background-remover",
    react: "BackgroundRemover",
    summary: "Key out plain backgrounds; re-runs live as you adjust.",
    controls: [
      { key: "tolerance", kind: "range", min: 0, max: 60, step: 1 },
      { key: "feather", kind: "range", min: 0, max: 6, step: 1 },
      {
        key: "contiguous",
        kind: "boolean",
        htmlFalse: true,
        hint: "Only background touching the edges",
      },
      { key: "color", kind: "color", hint: "Background to remove" },
      {
        key: "background",
        kind: "color",
        hint: "Fill instead of transparency",
      },
      optionalFormat,
      multiple,
    ],
  },
  {
    id: "studio",
    label: "Studio",
    tag: "pixelshift-studio",
    react: "PixelshiftStudio",
    summary: "Every tool behind one tab bar.",
    omitShared: ["auto", "heading", "description"],
    controls: [
      {
        key: "tool",
        kind: "select",
        options: [
          "compress",
          "resize",
          "convert",
          "crop",
          "colors",
          "base64",
          "social",
          "youtube",
          "background",
        ].map((value) => ({ value, label: value })),
        hint: "Active tool",
      },
      {
        key: "tools",
        kind: "text",
        placeholder: "compress,crop,colors",
        hint: "Tabs to show, in order",
      },
    ],
  },
];

export const DEFAULT_TOOL = "compress";

export function getTool(id: string): ToolSchema {
  return TOOLS.find((tool) => tool.id === id) ?? TOOLS[0]!;
}

/** Every control for a tool: its own first, then the shared ones. */
export function controlsFor(tool: ToolSchema): Control[] {
  return [
    ...tool.controls,
    ...SHARED_CONTROLS.filter(
      (control) => !tool.omitShared?.includes(control.key),
    ),
  ];
}
