import { YOUTUBE_THUMBNAIL, type SocialResizeResult } from "pixelshift-core";
import { html, nothing } from "lit";
import { register } from "./base.js";
import type { ToolMessages, YouTubeMessages } from "./i18n.js";
import { SocialResizerElement, socialMessages } from "./social-resizer.js";

export const YOUTUBE_THUMBNAIL_TAG = "pixelshift-youtube-thumbnail";

export const youtubeMessages: YouTubeMessages = {
  heading: "YouTube thumbnail resizer",
  description:
    "Resize any image to {width} × {height} and keep it under YouTube's {limit} limit.",
  previewTitle: "How it looks on YouTube",
  previews: { home: "Home feed", search: "Search", upNext: "Up next" },
  previewAlt: "Thumbnail at {label} size",
};

/** Widths at which YouTube shows thumbnails: home feed, search, and up-next. */
const PREVIEW_WIDTHS = [
  { width: 320, key: "home" },
  { width: 210, key: "search" },
  { width: 168, key: "upNext" },
] as const;

/**
 * `<pixelshift-youtube-thumbnail>` — resizes any image to YouTube's
 * 1280 × 720 thumbnail size and compresses it under the 2 MB upload limit,
 * then previews it at the sizes viewers will see.
 */
export class YouTubeThumbnailElement extends SocialResizerElement {
  preset = YOUTUBE_THUMBNAIL.id;
  format: SocialResizerElement["format"] = "jpeg";

  protected get messageDefaults() {
    return { social: socialMessages, youtube: youtubeMessages };
  }

  protected get toolMessages(): ToolMessages {
    const { social, youtube } = this.t;
    return {
      action: social.action,
      busy: social.busy,
      heading: youtube.heading,
      description: this.msg(youtube.description, {
        width: this.fmt.number(YOUTUBE_THUMBNAIL.width),
        height: this.fmt.number(YOUTUBE_THUMBNAIL.height),
        limit: this.fmt.bytes(YOUTUBE_THUMBNAIL.maxFileSize ?? 0),
      }),
    };
  }

  protected get selectedPreset() {
    return YOUTUBE_THUMBNAIL;
  }

  protected renderPresetPicker(): typeof nothing {
    return nothing;
  }

  protected renderResults() {
    const result = this.output[0] as SocialResizeResult | undefined;
    const youtube = this.t.youtube;
    return html`
      ${super.renderResults()}
      ${result
        ? html`<div class="mt-4">
            <h3 class="m-0 mb-3 text-sm font-semibold text-ink">
              ${youtube.previewTitle}
            </h3>
            <div class="flex flex-wrap items-end gap-4">
              ${PREVIEW_WIDTHS.map(({ width, key }) => {
                const label = youtube.previews[key];
                return html`<figure
                  class="m-0 grid gap-1.5"
                  style=${`width:${width}px;max-width:100%`}
                >
                  <img
                    class="block aspect-video w-full rounded-[6px] border border-solid border-line object-cover"
                    src=${this.urlFor(result.blob)}
                    alt=${this.msg(youtube.previewAlt, { label })}
                  />
                  <figcaption class="text-xs text-muted">
                    ${label} · ${this.fmt.number(width)}
                    ${this.t.common.unitPixels}
                  </figcaption>
                </figure>`;
              })}
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
