import { defineConfig } from "vite";
import { libraryConfig } from "../../tooling/vite/library.js";

export default defineConfig(
  libraryConfig({
    root: import.meta.dirname,
    // `define` registers the custom element; `index` stays side-effect free so
    // consumers can import the class and control registration themselves.
    entries: { index: "index.ts", define: "define.ts" },
  }),
);
