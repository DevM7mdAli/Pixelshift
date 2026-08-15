import "pixelshift-web-core/define";
import { ImageConverterElement } from "pixelshift-web-core";
import { createComponent, type EventName } from "@lit/react";
import React from "react";
import type { ConversionResult } from "pixelshift-web-core";

export const ImageConverter = createComponent({
  tagName: "pixelshift-image-converter",
  elementClass: ImageConverterElement,
  react: React,
  events: {
    onConversionStart: "conversion-start" as EventName<CustomEvent<void>>,
    onConversionComplete: "conversion-complete" as EventName<
      CustomEvent<ConversionResult[]>
    >,
    onConversionError: "conversion-error" as EventName<CustomEvent<unknown>>,
    onFilesSelected: "files-selected" as EventName<CustomEvent<File[]>>,
  },
});

export type {
  ConversionOptions,
  ConversionResult,
  OutputFormat,
} from "pixelshift-web-core";
export { ImageConverterElement } from "pixelshift-web-core";
