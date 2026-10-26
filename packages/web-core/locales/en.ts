import { backgroundMessages } from "../background-remover.js";
import { colorPickerMessages } from "../color-picker.js";
import {
  commonMessages,
  errorMessages,
  type PixelshiftMessages,
} from "../i18n.js";
import { compressorMessages } from "../image-compressor.js";
import { converterMessages } from "../image-converter.js";
import { cropperMessages } from "../image-cropper.js";
import { resizerMessages } from "../image-resizer.js";
import { base64Messages } from "../image-to-base64.js";
import { socialMessages } from "../social-resizer.js";
import { studioMessages } from "../studio.js";
import { youtubeMessages } from "../youtube-thumbnail.js";

/**
 * The complete English catalog — the source to translate from. Elements
 * already include the English sections they render, so you never need to
 * register this one.
 */
export const en: PixelshiftMessages = {
  common: commonMessages,
  errors: errorMessages,
  converter: converterMessages,
  compressor: compressorMessages,
  resizer: resizerMessages,
  cropper: cropperMessages,
  colorPicker: colorPickerMessages,
  base64: base64Messages,
  social: socialMessages,
  youtube: youtubeMessages,
  background: backgroundMessages,
  studio: studioMessages,
};
