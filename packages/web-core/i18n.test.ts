// @vitest-environment jsdom
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import {
  ImageCompressorElement,
  PixelshiftStudioElement,
  ar,
  defineStudio,
  en,
  formatMessage,
  formattersFor,
  localeDirection,
  registerLocale,
  resolveMessages,
  selectPlural,
} from "./index.js";
import { fallbackChain } from "./i18n.js";

const toDataUrl = vi
  .spyOn(HTMLCanvasElement.prototype, "toDataURL")
  .mockImplementation((type) => `data:${type};base64,`);

afterAll(() => toDataUrl.mockRestore());
afterEach(() => {
  document.documentElement.removeAttribute("lang");
  document.body.replaceChildren();
});

registerLocale("ar", ar);
defineStudio();

const notAnImage = (name: string) =>
  new File(["hello"], name, { type: "text/plain" });

async function mount<
  T extends HTMLElement & { updateComplete: Promise<boolean> },
>(element: T, parent: HTMLElement = document.body): Promise<T> {
  parent.append(element);
  await element.updateComplete;
  return element;
}

const heading = (element: HTMLElement) =>
  element.shadowRoot?.querySelector("h2")?.textContent?.trim();

describe("message helpers", () => {
  it("falls back from region to language", () => {
    expect(fallbackChain("ar-SA")).toEqual(["ar-sa", "ar"]);
    expect(fallbackChain("pt_BR")).toEqual(["pt-br", "pt"]);
  });

  it("merges defaults, registered catalogs, and overrides in order", () => {
    registerLocale("xx", { converter: { action: "Base" } });
    registerLocale("xx-yy", { converter: { action: "Regional" } });
    const defaults = { converter: { ...en.converter } };

    expect(resolveMessages("xx", defaults).converter.action).toBe("Base");
    expect(resolveMessages("xx-YY", defaults).converter.action).toBe(
      "Regional",
    );
    expect(
      resolveMessages("xx-yy", defaults, { converter: { action: "Mine" } })
        .converter,
    ).toEqual({ ...en.converter, action: "Mine" });
    // Only the sections an element renders are resolved.
    expect(resolveMessages("ar", defaults)).not.toHaveProperty("studio");
  });

  it("fills placeholders and leaves unknown ones visible", () => {
    expect(formatMessage("Remove {name}", { name: "a.png" })).toBe(
      "Remove a.png",
    );
    expect(formatMessage("{missing} stays")).toBe("{missing} stays");
  });

  it("uses every Arabic plural category", () => {
    const forms = ar.common.results;
    expect(
      [0, 1, 2, 3, 11, 100].map((count) => selectPlural(forms, count, "ar")),
    ).toEqual([
      forms.zero,
      forms.one,
      forms.two,
      forms.few,
      forms.many,
      forms.other,
    ]);
    expect(selectPlural(en.common.results, 1, "en")).toBe("{count} result");
  });

  it("knows which languages read right to left", () => {
    expect(localeDirection("ar")).toBe("rtl");
    expect(localeDirection("he-IL")).toBe("rtl");
    expect(localeDirection("fa")).toBe("rtl");
    expect(localeDirection("en-GB")).toBe("ltr");
    expect(localeDirection("not a locale")).toBe("ltr");
  });

  it("formats numbers for the locale", () => {
    const english = formattersFor("en");
    expect(english.percent(0.42)).toBe("42%");
    expect(english.bytes(1536)).toBe("1.5 kB");
    expect(english.dimensions(1600, 900)).toBe("1600×900");
    expect(formattersFor("ar-EG").percent(0.42)).not.toBe("42%");
  });
});

describe("catalogs", () => {
  /** Every string leaf with its dotted path. */
  function leaves(value: unknown, path = ""): [string, string][] {
    if (typeof value === "string") return [[path, value]];
    return Object.entries(value as object).flatMap(([key, child]) =>
      leaves(child, path ? `${path}.${key}` : key),
    );
  }
  const placeholders = (text: string) =>
    [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

  it("translates every English string into Arabic, keeping its placeholders", () => {
    const arabic = new Map(leaves(ar));
    for (const [path, english] of leaves(en)) {
      // Plural forms may differ by category; compare against `other`.
      const translated =
        arabic.get(path) ?? arabic.get(path.replace(/\.(one|two)$/, ".other"));
      expect(translated, path).toBeTruthy();
      if (path.endsWith(".one") || path.endsWith(".two")) continue;
      expect(placeholders(translated!), path).toEqual(placeholders(english));
    }
  });
});

describe("localized elements", () => {
  it("renders English by default", async () => {
    const element = await mount(new ImageCompressorElement());
    expect(heading(element)).toBe("Image compressor");
    expect(
      element.shadowRoot?.querySelector("section")?.hasAttribute("dir"),
    ).toBe(false);
  });

  it("switches language and direction with the locale attribute", async () => {
    const element = document.createElement("pixelshift-image-compressor");
    element.setAttribute("locale", "ar");
    await mount(element);

    const section = element.shadowRoot!.querySelector("section")!;
    expect(heading(element)).toBe(ar.compressor.heading);
    expect(section.getAttribute("dir")).toBe("rtl");
    expect(section.getAttribute("lang")).toBe("ar");
  });

  it("follows the nearest lang attribute and leaves direction to the page", async () => {
    const wrapper = document.createElement("div");
    wrapper.lang = "ar";
    document.body.append(wrapper);
    const element = await mount(new ImageCompressorElement(), wrapper);

    expect(heading(element)).toBe(ar.compressor.heading);
    expect(
      element.shadowRoot?.querySelector("section")?.hasAttribute("dir"),
    ).toBe(false);
  });

  it("re-renders when the page language changes", async () => {
    const element = await mount(new ImageCompressorElement());
    document.documentElement.lang = "ar";
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(heading(element)).toBe(ar.compressor.heading);
  });

  it("re-renders when a locale is registered later", async () => {
    const element = document.createElement("pixelshift-image-compressor");
    element.setAttribute("locale", "de");
    await mount(element);
    expect(heading(element)).toBe("Image compressor");

    registerLocale("de", { compressor: { heading: "Bildkompressor" } });
    await element.updateComplete;
    expect(heading(element)).toBe("Bildkompressor");
  });

  it("applies per-element overrides", async () => {
    const element = new ImageCompressorElement();
    element.messages = { compressor: { heading: "Shrink images" } };
    await mount(element);
    expect(heading(element)).toBe("Shrink images");
  });

  it("pluralizes the action and localizes errors", async () => {
    const element = document.createElement("pixelshift-image-compressor");
    element.setAttribute("locale", "ar");
    element.multiple = true;
    await mount(element);

    element.loadFiles([
      notAnImage("a.txt"),
      notAnImage("b.txt"),
      notAnImage("c.txt"),
    ]);
    await element.updateComplete;
    const action = element.shadowRoot!.querySelector('[part="action"]')!;
    expect(action.textContent).toContain("صور");

    await element.process();
    await element.updateComplete;
    expect(
      element.shadowRoot!.querySelector('[role="alert"]')?.textContent,
    ).toContain(ar.errors.UNSUPPORTED_INPUT);
  });

  it("passes its locale to every tool in the studio", async () => {
    const studio = document.createElement(
      "pixelshift-studio",
    ) as PixelshiftStudioElement;
    studio.setAttribute("locale", "ar");
    await mount(studio);

    const tabs = [...studio.shadowRoot!.querySelectorAll('[role="tab"]')].map(
      (tab) => tab.textContent?.trim(),
    );
    expect(tabs[0]).toBe(ar.studio.tabs.compress);
    expect(studio.activeTool?.locale).toBe("ar");
  });
});
