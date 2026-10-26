// @vitest-environment jsdom
import { afterAll, describe, expect, it, vi } from "vitest";
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
  defineStudio,
} from "./index.js";
import { parseByteSize } from "./fields.js";

const toDataUrl = vi
  .spyOn(HTMLCanvasElement.prototype, "toDataURL")
  .mockImplementation((type) => `data:${type};base64,`);

afterAll(() => toDataUrl.mockRestore());

const notAnImage = (name: string) =>
  new File(["hello"], name, { type: "text/plain" });

async function mount<
  T extends HTMLElement & { updateComplete: Promise<boolean> },
>(element: T): Promise<T> {
  document.body.append(element);
  await element.updateComplete;
  return element;
}

describe("registration", () => {
  it("registers the studio and every tool idempotently", () => {
    defineStudio();
    defineStudio();
    const expected: [string, CustomElementConstructor][] = [
      [STUDIO_TAG, PixelshiftStudioElement],
      [IMAGE_CONVERTER_TAG, ImageConverterElement],
      [IMAGE_COMPRESSOR_TAG, ImageCompressorElement],
      [IMAGE_RESIZER_TAG, ImageResizerElement],
      [IMAGE_CROPPER_TAG, ImageCropperElement],
      [COLOR_PICKER_TAG, ColorPickerElement],
      [IMAGE_TO_BASE64_TAG, ImageToBase64Element],
      [SOCIAL_RESIZER_TAG, SocialResizerElement],
      [YOUTUBE_THUMBNAIL_TAG, YouTubeThumbnailElement],
      [BACKGROUND_REMOVER_TAG, BackgroundRemoverElement],
    ];
    for (const [tag, element] of expected) {
      expect(customElements.get(tag)).toBe(element);
    }
  });
});

describe("tool defaults", () => {
  it("starts every tool in a safe state", () => {
    expect(new ImageCompressorElement()).toMatchObject({
      quality: 0.8,
      multiple: false,
    });
    expect(new ImageResizerElement()).toMatchObject({
      keepAspectRatio: true,
      unit: "px",
    });
    expect(new ImageCropperElement().aspectRatio).toBe("free");
    expect(new ColorPickerElement()).toMatchObject({
      count: 6,
      colorFormat: "hex",
      auto: true,
    });
    expect(new ImageToBase64Element().snippet).toBe("dataUrl");
    expect(new SocialResizerElement()).toMatchObject({
      preset: "instagram-square",
      fit: "cover",
    });
    expect(new YouTubeThumbnailElement()).toMatchObject({
      preset: "youtube-thumbnail",
      format: "jpeg",
    });
    expect(new BackgroundRemoverElement()).toMatchObject({
      tolerance: 15,
      contiguous: true,
    });
  });

  it("parses target sizes with units from the attribute", async () => {
    const element = document.createElement(IMAGE_COMPRESSOR_TAG);
    element.setAttribute("target-size", "200kb");
    await mount(element);
    expect(element.targetSize).toBe(200 * 1024);
    element.remove();
  });
});

describe("file intake", () => {
  it("keeps one file unless multiple is set", async () => {
    const element = await mount(new ImageCompressorElement());
    const selected = vi.fn();
    element.addEventListener("files-selected", selected);

    element.loadFiles([notAnImage("a.txt"), notAnImage("b.txt")]);
    expect(element.files).toHaveLength(1);

    element.multiple = true;
    element.loadFiles([notAnImage("a.txt"), notAnImage("b.txt")]);
    expect(element.files).toHaveLength(2);
    expect(selected).toHaveBeenCalledTimes(2);
    element.remove();
  });

  it("reports each failed file and keeps going", async () => {
    const element = await mount(new ImageCompressorElement());
    element.multiple = true;
    const failures: string[] = [];
    const complete = vi.fn();
    element.addEventListener("process-error", (event) =>
      failures.push((event as CustomEvent<{ file: File }>).detail.file.name),
    );
    element.addEventListener("process-complete", complete);

    element.loadFiles([notAnImage("a.txt"), notAnImage("b.txt")]);
    await expect(element.process()).resolves.toEqual([]);
    await element.updateComplete;

    expect(failures).toEqual(["a.txt", "b.txt"]);
    expect(complete).toHaveBeenCalledOnce();
    expect(
      element.renderRoot.querySelector('[role="alert"]')?.textContent,
    ).toContain("not supported");
    element.remove();
  });

  it("keeps the converter fail-fast with its original events", async () => {
    const element = await mount(new ImageConverterElement());
    element.multiple = true;
    const legacy = vi.fn();
    const complete = vi.fn();
    element.addEventListener("conversion-error", legacy);
    element.addEventListener("conversion-complete", complete);

    element.loadFiles([notAnImage("a.txt"), notAnImage("b.txt")]);
    await expect(element.convert()).resolves.toEqual([]);

    expect(legacy).toHaveBeenCalledOnce();
    expect(complete).not.toHaveBeenCalled();
    element.remove();
  });

  it("drops a batch that new files replaced mid-run", async () => {
    const element = await mount(new ImageCompressorElement());
    const errors = vi.fn();
    element.addEventListener("process-error", errors);

    element.loadFiles([notAnImage("old.txt")]);
    const stale = element.process();
    element.loadFiles([notAnImage("new.txt")]);

    await expect(stale).resolves.toEqual([]);
    expect(errors).not.toHaveBeenCalled();
    expect(element.files.map((file) => file.name)).toEqual(["new.txt"]);

    await element.process();
    expect(errors).toHaveBeenCalledOnce();
    element.remove();
  });

  it("clears everything on reset", async () => {
    const element = await mount(new ImageResizerElement());
    element.loadFiles([notAnImage("a.txt")]);
    element.reset();
    expect(element.files).toEqual([]);
    expect(element.results).toEqual([]);
    element.remove();
  });
});

describe("studio", () => {
  it("shows the requested tools and switches between them", async () => {
    defineStudio();
    const studio = document.createElement(STUDIO_TAG);
    studio.setAttribute("tools", "crop, colors, nonsense");
    await mount(studio);

    const tabs = () =>
      [...studio.renderRoot.querySelectorAll('[role="tab"]')].map((tab) =>
        tab.textContent?.trim(),
      );
    expect(tabs()).toEqual(["Crop", "Colors"]);
    expect(studio.activeTool?.localName).toBe(IMAGE_CROPPER_TAG);

    const changes: string[] = [];
    studio.addEventListener("tool-change", (event) =>
      changes.push((event as CustomEvent<string>).detail),
    );
    studio.renderRoot
      .querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!
      .click();
    await studio.updateComplete;

    expect(changes).toEqual(["colors"]);
    expect(studio.activeTool?.localName).toBe(COLOR_PICKER_TAG);
    expect(
      studio.renderRoot.querySelector(IMAGE_CROPPER_TAG)?.closest("[hidden]"),
    ).not.toBeNull();
    studio.remove();
  });
});

describe("parseByteSize", () => {
  it("understands common units", () => {
    expect(parseByteSize("200kb")).toBe(204800);
    expect(parseByteSize("1.5 MB")).toBe(1572864);
    expect(parseByteSize("512")).toBe(512);
    expect(parseByteSize(1000)).toBe(1000);
    expect(parseByteSize("lots")).toBeUndefined();
    expect(parseByteSize(null)).toBeUndefined();
  });
});
