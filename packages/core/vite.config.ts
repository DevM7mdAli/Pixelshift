import { defineConfig } from "vite";
import { libraryConfig } from "../../tooling/vite/library.js";

export default defineConfig(
  libraryConfig({
    root: import.meta.dirname,
    entries: { index: "index.ts" },
  }),
);
