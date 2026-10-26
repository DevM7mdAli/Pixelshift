import { svg, type SVGTemplateResult } from "lit";

const paths = {
  upload: svg`<path d="M12 15V3m0 0 4.5 4.5M12 3 7.5 7.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>`,
  download: svg`<path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>`,
  copy: svg`<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>`,
  check: svg`<path d="m5 12.5 4.5 4.5L19 7.5"/>`,
  chevron: svg`<path d="m7 10 5 5 5-5"/>`,
  x: svg`<path d="M6 6l12 12M18 6 6 18"/>`,
  link: svg`<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>`,
  unlink: svg`<path d="m18.5 13.5 1-1a4 4 0 0 0-5.7-5.7l-1 1M5.5 10.5l-1 1a4 4 0 0 0 5.7 5.7l1-1M8 3v2M3 8h2M16 21v-2M21 16h-2"/>`,
  archive: svg`<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>`,
  reset: svg`<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5M4 4v4.5h4.5"/>`,
  pipette: svg`<path d="m14.5 6.5 3 3M4 20l1-4 9.5-9.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/>`,
  image: svg`<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.75"/><path d="m21 16-5-5-9 9"/>`,
  alert: svg`<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16v.5"/>`,
} as const;

export type IconName = keyof typeof paths;

/** 16px stroke icons that follow `currentColor`. */
export function icon(name: IconName, size = 16): SVGTemplateResult {
  return svg`<svg
    aria-hidden="true"
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    style="flex-shrink:0"
  >${paths[name]}</svg>`;
}
