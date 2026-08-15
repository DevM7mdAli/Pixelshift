import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

// static with for making it work with GitHub Pages, which only serves static files.
export const dynamic = "force-static";

export const { staticGET: GET } = createFromSource(source, {
  language: "english",
});
