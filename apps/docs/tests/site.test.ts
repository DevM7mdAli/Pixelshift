import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const fromDocsRoot = (path: string) => resolve(import.meta.dirname, "..", path);

describe("documentation site", () => {
  it("ships the live converter on the landing page", () => {
    const page = readFileSync(fromDocsRoot("app/(home)/page.tsx"), "utf8");
    const demo = readFileSync(
      fromDocsRoot("components/converter-demo.tsx"),
      "utf8",
    );
    const reveal = readFileSync(fromDocsRoot("components/reveal.tsx"), "utf8");

    expect(page).toContain("<ConverterDemo />");
    expect(page).toContain("<Float");
    expect(page).toContain("<Reveal");
    expect(demo).toContain("<ImageConverter");
    expect(demo).toContain('import("pixelshift-react")');
    expect(page).toContain("max-[430px]:w-full");
    expect(page).toContain("max-[430px]:text-[2.35rem]");
    expect(demo).toContain("w-full min-w-0 max-w-215");
    expect(reveal).toContain("IntersectionObserver");
    expect(reveal).toContain("iterations: Infinity");
    expect(reveal).toContain("prefers-reduced-motion: reduce");
    expect(reveal).toContain('rootMargin: "0px 0px 12%"');
    expect(reveal).toContain("useLayoutEffect");
  });

  it("documents every public integration package", () => {
    const frameworks = readFileSync(
      fromDocsRoot("content/docs/frameworks.mdx"),
      "utf8",
    );

    expect(frameworks).toContain("pixelshift-react");
    expect(frameworks).toContain("pixelshift-angular");
    expect(frameworks).toContain("pixelshift-vue");
    expect(frameworks).toContain(
      'import { Component, ViewChild } from "@angular/core"',
    );
    expect(frameworks).toContain("standalone: true");
    expect(frameworks).toContain("<pixelshift-converter");
    expect(frameworks).toContain("onConversionError");
    expect(frameworks).toContain("@conversion-error");
  });

  it("documents registration and core failure behavior", () => {
    const webComponent = readFileSync(
      fromDocsRoot("content/docs/web-component.mdx"),
      "utf8",
    );
    const api = readFileSync(fromDocsRoot("content/docs/api.mdx"), "utf8");

    expect(webComponent).toContain("pnpm add pixelshift-web-core");
    expect(webComponent).toContain('import "pixelshift-web-core/define"');
    expect(webComponent).toContain("<pixelshift-image-converter");
    expect(webComponent).toContain("CustomEvent<File[]>");
    expect(api).toContain("Batch conversion is fail-fast");
    expect(api).toContain("UNSUPPORTED_OUTPUT");
    expect(api).toContain("AbortController");
  });

  it("shows meaningful icons in docs navigation", () => {
    const source = readFileSync(fromDocsRoot("lib/source.ts"), "utf8");
    const layout = readFileSync(fromDocsRoot("lib/layout.shared.tsx"), "utf8");
    const pages = [
      ["index.mdx", "BookOpenText"],
      ["getting-started.mdx", "Rocket"],
      ["web-component.mdx", "Box"],
      ["frameworks.mdx", "Blocks"],
      ["api.mdx", "Braces"],
      ["development.mdx", "Wrench"],
    ] as const;

    expect(source).toContain("lucideIconsPlugin()");
    expect(layout).toContain("BookOpenText");
    expect(layout).toContain("Boxes");
    expect(layout).toContain("Play");

    for (const [file, icon] of pages) {
      const content = readFileSync(
        fromDocsRoot(`content/docs/${file}`),
        "utf8",
      );
      expect(content).toContain(`icon: ${icon}`);
    }
  });

  it("publishes the Pixelshift mark in search and social metadata", () => {
    const layout = readFileSync(fromDocsRoot("app/layout.tsx"), "utf8");
    const socialImage = readFileSync(
      fromDocsRoot("app/opengraph-image.tsx"),
      "utf8",
    );

    expect(layout).toContain("metadataBase");
    expect(layout).toContain("logo: logoUrl");
    expect(layout).toContain("summary_large_image");
    expect(socialImage).toContain("data:image/svg+xml;base64");
    expect(socialImage).toContain("width: 1200");
  });
});
