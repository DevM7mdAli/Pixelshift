import {
  YOUTUBE_THUMBNAIL,
  formatBytes,
  type SocialResizeResult,
} from "pixelshift-core";
import { html, nothing } from "lit";
import { register } from "./base.js";
import { SocialResizerElement } from "./social-resizer.js";

export const YOUTUBE_THUMBNAIL_TAG = "pixelshift-youtube-thumbnail";

/** Widths at which YouTube shows thumbnails: home feed, search, and up-next. */
const PREVIEW_WIDTHS = [
  { width: 320, label: "Home feed" },
  { width: 210, label: "Search" },
  { width: 168, label: "Up next" },
];

/**
 * `<pixelshift-youtube-thumbnail>` — resizes any image to YouTube's
 * 1280 × 720 thumbnail size and compresses it under the 2 MB upload limit,
 * then previews it at the sizes viewers will see.
 */
export class YouTubeThumbnailElement extends SocialResizerElement {
  preset = YOUTUBE_THUMBNAIL.id;
  format: SocialResizerElement["format"] = "jpeg";

  protected get defaultHeading() {
    return "YouTube thumbnail resizer";
  }
  protected get defaultDescription() {
    return `Resize any image to ${YOUTUBE_THUMBNAIL.width} × ${YOUTUBE_THUMBNAIL.height} and keep it under YouTube's ${formatBytes(YOUTUBE_THUMBNAIL.maxFileSize ?? 0)} limit.`;
  }

  protected get selectedPreset() {
    return YOUTUBE_THUMBNAIL;
  }

  protected renderPresetPicker(): typeof nothing {
    return nothing;
  }

  protected renderResults() {
    const result = this.output[0] as SocialResizeResult | undefined;
    return html`
      ${super.renderResults()}
      ${result
        ? html`<div class="mt-4">
            <h3 class="m-0 mb-3 text-sm font-semibold text-ink">
              How it looks on YouTube
            </h3>
            <div class="flex flex-wrap items-end gap-4">
              ${PREVIEW_WIDTHS.map(
                ({ width, label }) =>
                  html`<figure
                    class="m-0 grid gap-1.5"
                    style=${`width:${width}px;max-width:100%`}
                  >
                    <img
                      class="block aspect-video w-full rounded-[6px] border border-solid border-line object-cover"
                      src=${this.urlFor(result.blob)}
                      alt=${`Thumbnail at ${label} size`}
                    />
                    <figcaption class="text-xs text-muted">
                      ${label} · ${width}px
                    </figcaption>
                  </figure>`,
              )}
            </div>
          </div>`
        : nothing}
    `;
  }
}

export function defineYouTubeThumbnail(): void {
  register(YOUTUBE_THUMBNAIL_TAG, YouTubeThumbnailElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "pixelshift-youtube-thumbnail": YouTubeThumbnailElement;
  }
}
