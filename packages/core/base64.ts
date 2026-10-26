import {
  ImageConversionError,
  invalidOption,
  throwIfAborted,
} from "./errors.js";
import { detectImageType } from "./formats.js";
import { DEFAULT_MAX_BYTES, inputName, type ImageLimits } from "./pipeline.js";

export interface Base64Result {
  /** `data:image/png;base64,iVBORw0…` — ready for `src` or `url()`. */
  dataUrl: string;
  /** The encoded payload without the `data:` prefix. */
  base64: string;
  mimeType: string;
  fileName: string;
  /** Bytes of the original file. */
  originalSize: number;
  /** Characters of the data URL, which is also its byte length. */
  encodedSize: number;
}

export interface EmbedSnippets {
  dataUrl: string;
  base64: string;
  html: string;
  css: string;
  markdown: string;
  json: string;
}

export type EmbedSnippetFormat = keyof EmbedSnippets;

export const EMBED_SNIPPET_FORMATS: readonly EmbedSnippetFormat[] = [
  "dataUrl",
  "base64",
  "html",
  "css",
  "markdown",
  "json",
];

/** Types that embed fine but never pass through a canvas. */
const EMBEDDABLE_TYPES = new Set([
  "image/svg+xml",
  "image/avif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

/** Encodes bytes as Base64 in chunks, so large images never overflow the call stack. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\s/g, ""));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/**
 * Turns a data URL — or bare Base64 plus its MIME type — back into a Blob.
 *
 * ```ts
 * const blob = base64ToBlob("data:image/png;base64,iVBORw0…");
 * ```
 */
export function base64ToBlob(value: string, mimeType?: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(value.trim());
  if (match && !match[2]) {
    throw invalidOption("Only Base64 data URLs are supported.");
  }
  const type = match?.[1] ?? mimeType ?? "application/octet-stream";
  return new Blob([base64ToBytes(match ? match[3]! : value) as BlobPart], {
    type,
  });
}

/**
 * Reads an image file as a Base64 data URL. Unlike the pixel tools, this
 * keeps the original bytes, so SVG, AVIF, and ICO files work too.
 *
 * ```ts
 * const { dataUrl } = await imageToBase64(file);
 * ```
 */
export async function imageToBase64(
  input: Blob,
  options: Pick<ImageLimits, "maxBytes" | "signal"> = {},
): Promise<Base64Result> {
  throwIfAborted(options.signal);
  if (input.size === 0) {
    throw new ImageConversionError("The selected file is empty.", "EMPTY_FILE");
  }
  if (input.size > (options.maxBytes ?? DEFAULT_MAX_BYTES)) {
    throw new ImageConversionError(
      "The selected file is too large.",
      "FILE_TOO_LARGE",
    );
  }

  const mimeType = EMBEDDABLE_TYPES.has(input.type)
    ? input.type
    : await detectImageType(input);
  if (!mimeType) {
    throw new ImageConversionError(
      "The selected image format is not supported.",
      "UNSUPPORTED_INPUT",
    );
  }

  const base64 = bytesToBase64(new Uint8Array(await input.arrayBuffer()));
  throwIfAborted(options.signal);
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return {
    dataUrl,
    base64,
    mimeType,
    fileName: inputName(input),
    originalSize: input.size,
    encodedSize: dataUrl.length,
  };
}

/**
 * Copy-paste snippets for embedding a data URL in markup, styles, docs, or
 * configuration.
 */
export function createEmbedSnippets(
  result: Pick<Base64Result, "dataUrl" | "base64" | "mimeType" | "fileName">,
  options: { alt?: string } = {},
): EmbedSnippets {
  const alt = escapeHtml(
    options.alt ?? result.fileName.replace(/\.[^/.]+$/, ""),
  );
  return {
    dataUrl: result.dataUrl,
    base64: result.base64,
    html: `<img src="${result.dataUrl}" alt="${alt}" />`,
    css: `background-image: url("${result.dataUrl}");`,
    markdown: `![${alt.replace(/[[\]]/g, "")}](${result.dataUrl})`,
    json: JSON.stringify(
      { name: result.fileName, type: result.mimeType, data: result.base64 },
      null,
      2,
    ),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
