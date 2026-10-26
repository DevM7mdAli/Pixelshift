export type ImageErrorCode =
  | "ABORTED"
  | "DECODE_FAILED"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "IMAGE_TOO_LARGE"
  | "INVALID_OPTION"
  | "UNSUPPORTED_INPUT"
  | "UNSUPPORTED_OUTPUT";

/**
 * Every known failure in the library rejects with this class, so callers can
 * branch on `code` instead of parsing messages.
 */
export class ImageConversionError extends Error {
  constructor(
    message: string,
    readonly code: ImageErrorCode,
  ) {
    super(message);
    this.name = "ImageConversionError";
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ImageConversionError(
      "Image conversion was cancelled.",
      "ABORTED",
    );
  }
}

export function invalidOption(message: string): ImageConversionError {
  return new ImageConversionError(message, "INVALID_OPTION");
}
