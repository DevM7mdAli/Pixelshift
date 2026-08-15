import "pixelshift-web-core/define";
import type {
  ConversionResult,
  ImageConverterElement,
  OutputFormat,
} from "pixelshift-web-core";
import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  type PropType,
} from "vue";

export const ImageConverter = defineComponent({
  name: "ImageConverter",
  inheritAttrs: false,
  props: {
    format: { type: String as PropType<OutputFormat>, default: "webp" },
    quality: { type: Number, default: 0.85 },
    maxWidth: Number,
    maxHeight: Number,
    multiple: Boolean,
    disabled: Boolean,
  },
  emits: [
    "conversionStart",
    "conversionComplete",
    "conversionError",
    "filesSelected",
  ],
  setup(props, { attrs, emit, expose }) {
    const element = ref<ImageConverterElement>();

    const listeners: Array<[string, EventListener]> = [
      ["conversion-start", () => emit("conversionStart")],
      [
        "conversion-complete",
        (event) => emit("conversionComplete", (event as CustomEvent).detail),
      ],
      [
        "conversion-error",
        (event) => emit("conversionError", (event as CustomEvent).detail),
      ],
      [
        "files-selected",
        (event) => emit("filesSelected", (event as CustomEvent).detail),
      ],
    ];

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
      convert: () =>
        element.value?.convert() ?? Promise.resolve([] as ConversionResult[]),
      reset: () => element.value?.reset(),
      element,
    });

    return () =>
      h("pixelshift-image-converter", {
        ...attrs,
        ref: element,
        format: props.format,
        quality: props.quality,
        maxWidth: props.maxWidth,
        maxHeight: props.maxHeight,
        multiple: props.multiple,
        disabled: props.disabled,
      });
  },
});

export type {
  ConversionOptions,
  ConversionResult,
  OutputFormat,
} from "pixelshift-web-core";
export { ImageConverterElement } from "pixelshift-web-core";
