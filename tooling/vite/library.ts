import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { resolve } from "node:path";
import type { PluginOption, UserConfig } from "vite";
import dts from "vite-plugin-dts";

export interface LibraryConfigOptions {
  /** Absolute path to the package root. Pass `import.meta.dirname`. */
  root: string;
  /**
   * Output name to entry module, relative to `root`. Every key becomes one
   * top-level file in `dist` and one importable entry point, so the keys must
   * match the subpaths declared in the package `exports` map.
   */
  entries: Record<string, string>;
  /** Extra ids to leave unbundled, on top of the package's own dependencies. */
  external?: (string | RegExp)[];
  /** tsconfig that drives declaration emit. Defaults to `<root>/tsconfig.json`. */
  tsconfigPath?: string;
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Shared Vite config for every publishable package in this workspace.
 */
export function libraryConfig({
  root,
  entries,
  external = [],
  tsconfigPath = resolve(root, "tsconfig.json"),
}: LibraryConfigOptions): UserConfig {
  return {
    build: {
      target: "es2022",
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      minify: "esbuild",
      reportCompressedSize: true,
      lib: {
        entry: Object.fromEntries(
          Object.entries(entries).map(([name, file]) => [
            name,
            resolve(root, file),
          ]),
        ),
        formats: ["es"],
        fileName: (_format, entryName) => `${entryName}.js`,
      },
      rollupOptions: {
        external: externalMatchers(root, external),
        output: {
          // Code shared between entries lands in one chunk instead of being
          // duplicated into each entry.
          chunkFileNames: "chunks/[name]-[hash].js",
          // Without this Rollup pulls every transitive import up into the
          // entry chunk, forcing consumers to load code they never reached.
          hoistTransitiveImports: false,
        },
      },
    },
    plugins: [typeDeclarations({ root, tsconfigPath })],
  };
}

/**
 * Declaration emit only runs for `vite build`; Vitest loads the same config
 * file and has no use for it.
 */
function typeDeclarations({
  root,
  tsconfigPath,
}: {
  root: string;
  tsconfigPath: string;
}): PluginOption {
  return {
    ...dts({
      tsconfigPath,
      entryRoot: root,
      // Per-file declarations rather than a rolled-up bundle, so
      // declaration maps keep resolving back to the original sources.
      rollupTypes: false,
      insertTypesEntry: false,
      staticImport: true,
      compilerOptions: {
        declaration: true,
        declarationMap: true,
        emitDeclarationOnly: true,
      },
    }),
    apply: "build",
  };
}

/**
 * Anything the package declares as a runtime dependency is a resolved,
 * versioned edge in the consumer's graph — inlining it would fork it.
 * Subpath imports (`lit/decorators.js`) have to match too.
 */
function externalMatchers(
  root: string,
  extra: (string | RegExp)[],
): (string | RegExp)[] {
  const manifest = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  ) as PackageManifest;

  const declared = Object.keys({
    ...manifest.dependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies,
  });

  return [
    ...declared.map((name) => new RegExp(`^${escapeRegExp(name)}(/.*)?$`)),
    ...builtinModules.map((name) => new RegExp(`^(node:)?${name}(/.*)?$`)),
    ...extra,
  ];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
