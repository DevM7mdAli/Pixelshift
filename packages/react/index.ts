import { createComponent, type EventName } from "@lit/react";
import React from "react";
import {
  BACKGROUND_REMOVER_TAG,
  BackgroundRemoverElement,
  COLOR_PICKER_TAG,
  ColorPickerElement,
  IMAGE_COMPRESSOR_TAG,
  IMAGE_CONVERTER_TAG,
  IMAGE_CROPPER_TAG,
  IMAGE_RESIZER_TAG,
  IMAGE_TO_BASE64_TAG,
  ImageCompressorElement,
  ImageConverterElement,
  ImageCropperElement,
  ImageResizerElement,
  ImageToBase64Element,
  PixelshiftStudioElement,
  SOCIAL_RESIZER_TAG,
  STUDIO_TAG,
  SocialResizerElement,
  YOUTUBE_THUMBNAIL_TAG,
  YouTubeThumbnailElement,
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
  type BackgroundRemovalResult,
  type Base64Result,
  type ColorInfo,
  type ColorPickerResult,
  type CompressionResult,
  type ConversionResult,
  type ImageResult,
  type Rect,
  type SocialResizeResult,
  type StudioTool,
} from "pixelshift-web-core";

type Detail<T> = EventName<CustomEvent<T>>;

export interface ProcessErrorDetail {
  file: File;
  error: unknown;
}

/** The events every tool fires, typed by its result. */
function toolEvents<TResult>() {
  return {
    onFilesSelected: "files-selected" as Detail<File[]>,
    onProcessStart: "process-start" as Detail<File[]>,
    onProcessComplete: "process-complete" as Detail<TResult[]>,
    onProcessError: "process-error" as Detail<ProcessErrorDetail>,
  };
}

/**
 * Registers the element and wraps it. Every call site is marked pure, so a
 * bundler drops — and never registers — the components an app does not use.
 */
function wrap<
  E extends HTMLElement,
  Events extends Record<string, EventName | string>,
>(
  tagName: string,
  elementClass: new () => E,
  events: Events,
  define: () => void,
) {
  define();
  return createComponent({ tagName, elementClass, react: React, events });
}

export const ImageConverter = /* @__PURE__ */ wrap(
  IMAGE_CONVERTER_TAG,
  ImageConverterElement,
  {
    ...toolEvents<ConversionResult>(),
    onConversionStart: "conversion-start" as Detail<void>,
    onConversionComplete: "conversion-complete" as Detail<ConversionResult[]>,
    onConversionError: "conversion-error" as Detail<unknown>,
  },
  defineImageConverter,
);

export const ImageCompressor = /* @__PURE__ */ wrap(
  IMAGE_COMPRESSOR_TAG,
  ImageCompressorElement,
  toolEvents<CompressionResult>(),
  defineImageCompressor,
);

export const ImageResizer = /* @__PURE__ */ wrap(
  IMAGE_RESIZER_TAG,
  ImageResizerElement,
  toolEvents<ImageResult>(),
  defineImageResizer,
);

export const ImageCropper = /* @__PURE__ */ wrap(
  IMAGE_CROPPER_TAG,
  ImageCropperElement,
  { ...toolEvents<ImageResult>(), onCropChange: "crop-change" as Detail<Rect> },
  defineImageCropper,
);

export const ColorPicker = /* @__PURE__ */ wrap(
  COLOR_PICKER_TAG,
  ColorPickerElement,
  {
    ...toolEvents<ColorPickerResult>(),
    onColorPick: "color-pick" as Detail<ColorInfo>,
  },
  defineColorPicker,
);

export const ImageToBase64 = /* @__PURE__ */ wrap(
  IMAGE_TO_BASE64_TAG,
  ImageToBase64Element,
  toolEvents<Base64Result>(),
  defineImageToBase64,
);

export const SocialResizer = /* @__PURE__ */ wrap(
  SOCIAL_RESIZER_TAG,
  SocialResizerElement,
  toolEvents<SocialResizeResult>(),
  defineSocialResizer,
);

export const YouTubeThumbnail = /* @__PURE__ */ wrap(
  YOUTUBE_THUMBNAIL_TAG,
  YouTubeThumbnailElement,
  toolEvents<SocialResizeResult>(),
  defineYouTubeThumbnail,
);

export const BackgroundRemover = /* @__PURE__ */ wrap(
  BACKGROUND_REMOVER_TAG,
  BackgroundRemoverElement,
  toolEvents<BackgroundRemovalResult>(),
  defineBackgroundRemover,
);

/** Every tool behind one tab bar. Tool events bubble through it. */
export const PixelshiftStudio = /* @__PURE__ */ wrap(
  STUDIO_TAG,
  PixelshiftStudioElement,
  {
    ...toolEvents<unknown>(),
    onToolChange: "tool-change" as Detail<StudioTool>,
  },
  defineStudio,
);

export { ar, en, registerLocale, registeredLocales } from "pixelshift-web-core";
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
  PixelshiftMessages,
  PixelshiftMessagesInput,
  Rect,
  Segmenter,
  SocialResizeResult,
  StudioTool,
} from "pixelshift-web-core";
