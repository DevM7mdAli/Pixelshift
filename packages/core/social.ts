import { invalidOption, throwIfAborted } from "./errors.js";
import { formatForMimeType } from "./formats.js";
import { encodeCompressed } from "./compress.js";
import { planResize, type FocalPoint, type Position } from "./geometry.js";
import {
  backgroundFor,
  createResult,
  encodeCanvas,
  loadImage,
  outputName,
  paint,
  type EncodeOptions,
  type ImageLimits,
  type ImageResult,
} from "./pipeline.js";

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "x"
  | "youtube"
  | "linkedin"
  | "snapchat"
  | "pinterest"
  | "tiktok";

export type SocialPresetKind = "profile" | "cover" | "post" | "story";

export interface SocialPreset {
  id: string;
  /** `"custom"` for dimensions passed directly to `resizeForSocial`. */
  platform: SocialPlatform | "custom";
  kind: SocialPresetKind;
  name: string;
  width: number;
  height: number;
  /** The platform's upload limit, which the output is compressed to fit. */
  maxFileSize?: number;
}

export const SOCIAL_PLATFORMS: readonly { id: SocialPlatform; name: string }[] =
  [
    { id: "instagram", name: "Instagram" },
    { id: "facebook", name: "Facebook" },
    { id: "x", name: "X" },
    { id: "youtube", name: "YouTube" },
    { id: "linkedin", name: "LinkedIn" },
    { id: "snapchat", name: "Snapchat" },
    { id: "pinterest", name: "Pinterest" },
    { id: "tiktok", name: "TikTok" },
  ];

const MB = 1024 * 1024;

// A plain literal rather than a lookup, so importing it stays tree-shakeable.
const youtubeThumbnail = {
  id: "youtube-thumbnail",
  platform: "youtube",
  kind: "post",
  name: "Video thumbnail",
  width: 1280,
  height: 720,
  maxFileSize: 2 * MB,
} as const;

/**
 * Recommended upload sizes per platform. Platforms change these from time to
 * time; pass your own `{ width, height }` to `resizeForSocial` whenever a
 * preset falls behind.
 */
export const SOCIAL_PRESETS = [
  {
    id: "instagram-profile",
    platform: "instagram",
    kind: "profile",
    name: "Profile photo",
    width: 320,
    height: 320,
  },
  {
    id: "instagram-square",
    platform: "instagram",
    kind: "post",
    name: "Square post",
    width: 1080,
    height: 1080,
  },
  {
    id: "instagram-portrait",
    platform: "instagram",
    kind: "post",
    name: "Portrait post",
    width: 1080,
    height: 1350,
  },
  {
    id: "instagram-landscape",
    platform: "instagram",
    kind: "post",
    name: "Landscape post",
    width: 1080,
    height: 566,
  },
  {
    id: "instagram-story",
    platform: "instagram",
    kind: "story",
    name: "Story & Reel",
    width: 1080,
    height: 1920,
  },
  {
    id: "facebook-profile",
    platform: "facebook",
    kind: "profile",
    name: "Profile photo",
    width: 320,
    height: 320,
  },
  {
    id: "facebook-cover",
    platform: "facebook",
    kind: "cover",
    name: "Cover photo",
    width: 851,
    height: 315,
  },
  {
    id: "facebook-post",
    platform: "facebook",
    kind: "post",
    name: "Shared image",
    width: 1200,
    height: 630,
  },
  {
    id: "facebook-story",
    platform: "facebook",
    kind: "story",
    name: "Story",
    width: 1080,
    height: 1920,
  },
  {
    id: "facebook-event",
    platform: "facebook",
    kind: "cover",
    name: "Event cover",
    width: 1920,
    height: 1005,
  },
  {
    id: "x-profile",
    platform: "x",
    kind: "profile",
    name: "Profile photo",
    width: 400,
    height: 400,
  },
  {
    id: "x-header",
    platform: "x",
    kind: "cover",
    name: "Header",
    width: 1500,
    height: 500,
  },
  {
    id: "x-post",
    platform: "x",
    kind: "post",
    name: "Post image",
    width: 1600,
    height: 900,
  },
  youtubeThumbnail,
  {
    id: "youtube-banner",
    platform: "youtube",
    kind: "cover",
    name: "Channel banner",
    width: 2560,
    height: 1440,
    maxFileSize: 6 * MB,
  },
  {
    id: "youtube-profile",
    platform: "youtube",
    kind: "profile",
    name: "Profile picture",
    width: 800,
    height: 800,
  },
  {
    id: "linkedin-profile",
    platform: "linkedin",
    kind: "profile",
    name: "Profile photo",
    width: 400,
    height: 400,
  },
  {
    id: "linkedin-cover",
    platform: "linkedin",
    kind: "cover",
    name: "Profile background",
    width: 1584,
    height: 396,
  },
  {
    id: "linkedin-company-cover",
    platform: "linkedin",
    kind: "cover",
    name: "Company cover",
    width: 1128,
    height: 191,
  },
  {
    id: "linkedin-post",
    platform: "linkedin",
    kind: "post",
    name: "Shared image",
    width: 1200,
    height: 627,
  },
  {
    id: "snapchat-story",
    platform: "snapchat",
    kind: "story",
    name: "Story & Spotlight",
    width: 1080,
    height: 1920,
  },
  {
    id: "snapchat-geofilter",
    platform: "snapchat",
    kind: "story",
    name: "Geofilter",
    width: 1080,
    height: 2340,
  },
  {
    id: "pinterest-pin",
    platform: "pinterest",
    kind: "post",
    name: "Standard pin",
    width: 1000,
    height: 1500,
  },
  {
    id: "pinterest-square",
    platform: "pinterest",
    kind: "post",
    name: "Square pin",
    width: 1000,
    height: 1000,
  },
  {
    id: "pinterest-profile",
    platform: "pinterest",
    kind: "profile",
    name: "Profile photo",
    width: 280,
    height: 280,
  },
  {
    id: "tiktok-profile",
    platform: "tiktok",
    kind: "profile",
    name: "Profile photo",
    width: 200,
    height: 200,
  },
  {
    id: "tiktok-cover",
    platform: "tiktok",
    kind: "story",
    name: "Video cover",
    width: 1080,
    height: 1920,
  },
] as const satisfies readonly SocialPreset[];

export type SocialPresetId = (typeof SOCIAL_PRESETS)[number]["id"];

export const YOUTUBE_THUMBNAIL: SocialPreset = youtubeThumbnail;

export function getSocialPreset(id: string): SocialPreset | undefined {
  return SOCIAL_PRESETS.find((preset) => preset.id === id);
}

export function socialPresetsFor(platform: SocialPlatform): SocialPreset[] {
  return SOCIAL_PRESETS.filter((preset) => preset.platform === platform);
}

export interface SocialResizeOptions extends EncodeOptions, ImageLimits {
  /** `cover` crops to fill the frame; `contain` letterboxes. Defaults to `cover`. */
  fit?: "cover" | "contain";
  /** Which part of the image stays in frame. Defaults to `center`. */
  position?: Position | FocalPoint;
  /** Override the preset's upload limit; `false` disables the size check. */
  maxFileSize?: number | false;
}

export interface SocialResizeResult extends ImageResult {
  preset: SocialPreset;
  /** Whether the output fits the platform's upload limit. */
  withinLimit: boolean;
}

/**
 * Fits an image to a platform's recommended size in one step, compressing
 * to the platform's upload limit when it has one.
 *
 * ```ts
 * await resizeForSocial(file, "youtube-thumbnail");
 * await resizeForSocial(file, "instagram-story", { fit: "contain", background: "#000" });
 * await resizeForSocial(file, { width: 1200, height: 675 });
 * ```
 */
export async function resizeForSocial(
  input: Blob,
  preset: SocialPresetId | SocialPreset | { width: number; height: number },
  options: SocialResizeOptions = {},
): Promise<SocialResizeResult> {
  const resolved = resolvePreset(preset);
  const image = await loadImage(input, options);

  try {
    const format = options.format ?? formatForMimeType(image.inputType);
    const plan = planResize(image, {
      width: resolved.width,
      height: resolved.height,
      fit: options.fit ?? "cover",
      ...(options.position ? { position: options.position } : {}),
    });
    const surface = paint(
      image,
      plan,
      backgroundFor(format, options.background),
    );
    throwIfAborted(options.signal);

    const limit =
      options.maxFileSize === false
        ? undefined
        : (options.maxFileSize ?? resolved.maxFileSize);
    const quality = options.quality ?? 0.92;
    let blob = await encodeCanvas(surface.canvas, format, quality);
    // Only trade quality for size when the platform would reject the file.
    if (limit && blob.size > limit) {
      ({ blob } = await encodeCompressed(surface, plan, format, {
        quality,
        targetBytes: limit,
        ...(options.signal ? { signal: options.signal } : {}),
      }));
    }

    return {
      ...createResult(input, blob, {
        image,
        name: outputName(input, format, {
          fileName: options.fileName,
          suffix: `-${resolved.id}`,
        }),
        width: plan.width,
        height: plan.height,
      }),
      preset: resolved,
      withinLimit: limit === undefined || blob.size <= limit,
    };
  } finally {
    image.close();
  }
}

function resolvePreset(
  preset: SocialPresetId | SocialPreset | { width: number; height: number },
): SocialPreset {
  if (typeof preset === "string") {
    const found = getSocialPreset(preset);
    if (!found) throw invalidOption(`"${preset}" is not a social preset.`);
    return found;
  }
  if ("id" in preset) return preset;
  return {
    id: `${preset.width}x${preset.height}`,
    platform: "custom",
    kind: "post",
    name: "Custom",
    ...preset,
  };
}
