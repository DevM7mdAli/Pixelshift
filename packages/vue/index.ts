import {
  BACKGROUND_REMOVER_TAG,
  COLOR_PICKER_TAG,
  IMAGE_COMPRESSOR_TAG,
  IMAGE_CONVERTER_TAG,
  IMAGE_CROPPER_TAG,
  IMAGE_RESIZER_TAG,
  IMAGE_TO_BASE64_TAG,
  SOCIAL_RESIZER_TAG,
  STUDIO_TAG,
  YOUTUBE_THUMBNAIL_TAG,
  defineBackgroundRemover,
  defineColorPicker,
  defineImageCompressor,
  defineImageConverter,
  defineImageCropper,
  defineImageResizer,
  defineImageToBase64,
  defineSocialResizer,
  defineStudio,
  defineYouTubeThumbnail,
  type FitMode,
  type OutputFormat,
  type PixelshiftTool,
  type Segmenter,
  type StudioTool,
} from "pixelshift-web-core";
import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComponentObjectPropsOptions,
  type PropType,
} from "vue";

/**
 * Optional props without Vue defaults: an omitted prop stays `undefined` and
 * is never forwarded, so the element keeps its own default. (Vue would
 * otherwise cast an omitted Boolean to `false`.)
 */
const optional = {
  string: { type: String, default: undefined },
  number: { type: Number, default: undefined },
  boolean: { type: Boolean, default: undefined },
} as const;

const sharedProps = {
  disabled: optional.boolean,
  isDarkMode: optional.boolean,
  bare: optional.boolean,
  auto: optional.boolean,
  heading: optional.string,
  description: optional.string,
};

const sharedEvents = {
  filesSelected: "files-selected",
  processStart: "process-start",
  processComplete: "process-complete",
  processError: "process-error",
} as const;

type ToolHandle = Pick<
  PixelshiftTool<unknown>,
  "process" | "reset" | "cancel" | "loadFiles"
>;

/**
 * Builds a Vue component around a custom element: props become element
 * properties, DOM events become emits, and the tool's methods are exposed
 * on the component ref. Pure, so unused components are tree-shaken and
 * their elements never registered.
 */
function wrap<
  Props extends ComponentObjectPropsOptions,
  Events extends Record<string, string>,
>(options: {
  name: string;
  tag: string;
  define: () => void;
  props: Props;
  events: Events;
  /** Extra element methods to expose on the component ref. */
  methods?: readonly string[];
}) {
  options.define();
  const events = Object.entries({ ...sharedEvents, ...options.events });

  return defineComponent({
    name: options.name,
    inheritAttrs: false,
    props: { ...sharedProps, ...options.props },
    emits: events.map(([emit]) => emit),
    setup(props, { attrs, emit, expose }) {
      const element = ref<HTMLElement & ToolHandle>();
      const listeners = events.map(
        ([emitName, domEvent]) =>
          [
            domEvent,
            (event: Event) => emit(emitName, (event as CustomEvent).detail),
          ] as const,
      );

      onMounted(() =>
        listeners.forEach(([name, listener]) =>
          element.value?.addEventListener(name, listener),
        ),
      );
      onBeforeUnmount(() =>
        listeners.forEach(([name, listener]) =>
          element.value?.removeEventListener(name, listener),
        ),
      );

      expose({
        process: () => element.value?.process() ?? Promise.resolve([]),
        reset: () => element.value?.reset(),
        cancel: () => element.value?.cancel(),
        loadFiles: (files: FileList | readonly File[]) =>
          element.value?.loadFiles(files),
        ...Object.fromEntries(
          (options.methods ?? []).map((method) => [
            method,
            (...args: unknown[]) =>
              (
                element.value as unknown as Record<
                  string,
                  (...args: unknown[]) => unknown
                >
              )?.[method]?.(...args),
          ]),
        ),
        element,
      });

      return () =>
        h(options.tag, {
          ...attrs,
          ref: element,
          ...Object.fromEntries(
            Object.entries(props).filter(([, value]) => value !== undefined),
          ),
        });
    },
  });
}

const format = { type: String as PropType<OutputFormat>, default: undefined };

export const ImageConverter = /* @__PURE__ */ wrap({
  name: "ImageConverter",
  tag: IMAGE_CONVERTER_TAG,
  define: defineImageConverter,
  props: {
    format,
    quality: optional.number,
    maxWidth: optional.number,
    maxHeight: optional.number,
    multiple: optional.boolean,
  },
  events: {
    conversionStart: "conversion-start",
    conversionComplete: "conversion-complete",
    conversionError: "conversion-error",
  },
  methods: ["convert"],
});

export const ImageCompressor = /* @__PURE__ */ wrap({
  name: "ImageCompressor",
  tag: IMAGE_COMPRESSOR_TAG,
  define: defineImageCompressor,
  props: {
    format,
    quality: optional.number,
    targetSize: optional.number,
    maxWidth: optional.number,
    multiple: optional.boolean,
  },
  events: {},
});

export const ImageResizer = /* @__PURE__ */ wrap({
  name: "ImageResizer",
  tag: IMAGE_RESIZER_TAG,
  define: defineImageResizer,
  props: {
    width: optional.number,
    height: optional.number,
    percent: optional.number,
    unit: { type: String as PropType<"px" | "percent">, default: undefined },
    keepAspectRatio: optional.boolean,
    fit: { type: String as PropType<FitMode>, default: undefined },
    format,
    quality: optional.number,
    noUpscale: optional.boolean,
    multiple: optional.boolean,
  },
  events: {},
});

export const ImageCropper = /* @__PURE__ */ wrap({
  name: "ImageCropper",
  tag: IMAGE_CROPPER_TAG,
  define: defineImageCropper,
  props: {
    aspectRatio: optional.string,
    format,
    quality: optional.number,
  },
  events: { cropChange: "crop-change" },
});

export const ColorPicker = /* @__PURE__ */ wrap({
  name: "ColorPicker",
  tag: COLOR_PICKER_TAG,
  define: defineColorPicker,
  props: {
    count: optional.number,
    colorFormat: {
      type: String as PropType<"hex" | "rgb" | "hsl">,
      default: undefined,
    },
  },
  events: { colorPick: "color-pick" },
});

export const ImageToBase64 = /* @__PURE__ */ wrap({
  name: "ImageToBase64",
  tag: IMAGE_TO_BASE64_TAG,
  define: defineImageToBase64,
  props: { snippet: optional.string, alt: optional.string },
  events: {},
});

const socialProps = {
  preset: optional.string,
  platforms: optional.string,
  fit: { type: String as PropType<"cover" | "contain">, default: undefined },
  position: optional.string,
  background: optional.string,
  format,
  quality: optional.number,
  multiple: optional.boolean,
};

export const SocialResizer = /* @__PURE__ */ wrap({
  name: "SocialResizer",
  tag: SOCIAL_RESIZER_TAG,
  define: defineSocialResizer,
  props: socialProps,
  events: {},
});

export const YouTubeThumbnail = /* @__PURE__ */ wrap({
  name: "YouTubeThumbnail",
  tag: YOUTUBE_THUMBNAIL_TAG,
  define: defineYouTubeThumbnail,
  props: socialProps,
  events: {},
});

export const BackgroundRemover = /* @__PURE__ */ wrap({
  name: "BackgroundRemover",
  tag: BACKGROUND_REMOVER_TAG,
  define: defineBackgroundRemover,
  props: {
    tolerance: optional.number,
    feather: optional.number,
    contiguous: optional.boolean,
    color: optional.string,
    background: optional.string,
    format,
    multiple: optional.boolean,
    segmenter: { type: Function as PropType<Segmenter>, default: undefined },
  },
  events: {},
});

export const PixelshiftStudio = /* @__PURE__ */ wrap({
  name: "PixelshiftStudio",
  tag: STUDIO_TAG,
  define: defineStudio,
  props: {
    tools: optional.string,
    tool: { type: String as PropType<StudioTool>, default: undefined },
  },
  events: { toolChange: "tool-change" },
});

export type {
  BackgroundRemovalResult,
  Base64Result,
  ColorInfo,
  ColorPickerResult,
  CompressionResult,
  ConversionOptions,
  ConversionResult,
  ImageResult,
  OutputFormat,
  PaletteColor,
  Rect,
  Segmenter,
  SocialResizeResult,
  StudioTool,
} from "pixelshift-web-core";
export {
  BackgroundRemoverElement,
  ColorPickerElement,
  ImageCompressorElement,
  ImageConverterElement,
  ImageCropperElement,
  ImageResizerElement,
  ImageToBase64Element,
  PixelshiftStudioElement,
  SocialResizerElement,
  YouTubeThumbnailElement,
} from "pixelshift-web-core";
