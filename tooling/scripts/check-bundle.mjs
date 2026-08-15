/**
 * Guards the three properties that decide how much of this library lands in a
 * consumer's bundle. Run it after `pnpm build`:  pnpm check:bundle
 *
 *   1. Externals — every bare import in `dist` must be a declared dependency.
 *      An undeclared one is a phantom dependency; a declared one that never
 *      appears got inlined, and the consumer now ships two copies of it.
 *
 *   2. Chunk sharing — a package's entries must share one chunk for their
 *      common code, so importing two entry points never duplicates it.
 *
 *   3. Tree shaking and size budgets — each probe bundles the package the way
 *      a real consumer does (by package name, through the exports map, from a
 *      workspace project that actually depends on it), then asserts the
 *      untouched symbols are gone and the result fits its budget.
 *
 * Budgets are minified, un-gzipped bytes. Raise one deliberately, in the same
 * commit as whatever grew it.
 */
import { gzipSync } from "node:zlib";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const KB = 1024;

/**
 * `from` is a workspace project that depends on the package under test, so the
 * probe resolves through the published `exports` map rather than a file path.
 * `external` lists framework peers a consuming app already ships.
 */
const packages = [
  {
    dir: "packages/core",
    sharedChunkEntries: [],
    probes: [
      {
        label: "one pure helper, no conversion pipeline",
        from: "packages/web-core",
        specifier: "pixelshift-core",
        imports: ["createOutputName"],
        mustDrop: [
          "convertImages",
          "createImageBitmap",
          "detectImageType",
          "toBlob",
          "drawImage",
        ],
        maxBytes: 0.5 * KB,
      },
      {
        label: "whole conversion API",
        from: "packages/web-core",
        specifier: "pixelshift-core",
        imports: ["convertImages", "supportsOutputFormat"],
        mustDrop: [],
        maxBytes: 5 * KB,
      },
    ],
  },
  {
    dir: "packages/web-core",
    // Both entries re-export the element; it must live in one shared chunk.
    sharedChunkEntries: ["dist/index.js", "dist/define.js"],
    probes: [
      {
        label: "full component via /define",
        from: "packages/react",
        specifier: "pixelshift-web-core/define",
        imports: [],
        mustDrop: [],
        maxBytes: 49 * KB,
      },
    ],
  },
  {
    dir: "packages/react",
    sharedChunkEntries: [],
    probes: [
      {
        label: "wrapper + component, react external",
        from: "apps/react-app",
        specifier: "pixelshift-react",
        imports: ["ImageConverter"],
        external: ["react", "react-dom"],
        mustDrop: [],
        maxBytes: 51 * KB,
      },
    ],
  },
  {
    dir: "packages/vue",
    sharedChunkEntries: [],
    probes: [
      {
        label: "wrapper + component, vue external",
        from: "apps/vue-app",
        specifier: "pixelshift-vue",
        imports: ["ImageConverter"],
        external: ["vue"],
        mustDrop: [],
        maxBytes: 50 * KB,
      },
    ],
  },
];

let failures = 0;

const fail = (message) => {
  failures += 1;
  console.error(`  ✗ ${message}`);
};
const pass = (message) => console.log(`  ✓ ${message}`);
const note = (message) => console.log(`  · ${message}`);
const kB = (bytes) => `${(bytes / KB).toFixed(2)} kB`;

const readManifest = (packageDir) =>
  JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));

const declaredDependencies = (manifest) =>
  new Set(
    Object.keys({
      ...manifest.dependencies,
      ...manifest.peerDependencies,
      ...manifest.optionalDependencies,
    }),
  );

/** `@scope/name/sub` -> `@scope/name`; `lit/decorators.js` -> `lit`. */
function packageNameOf(specifier) {
  const segments = specifier.split("/");
  return specifier.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : segments[0];
}

function jsFilesIn(directory, prefix = "") {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...jsFilesIn(join(directory, entry.name), relativePath));
    } else if (entry.name.endsWith(".js")) {
      files.push(relativePath);
    }
  }
  return files;
}

function bareImportsOf(code) {
  const specifiers = new Set();
  const pattern =
    /(?:^|[\s;}])(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|(?:^|[\s;}])import\s*["']([^"']+)["']/g;
  for (const match of code.matchAll(pattern)) {
    const specifier = match[1] ?? match[2];
    if (specifier && !specifier.startsWith(".") && !specifier.startsWith("/")) {
      specifiers.add(specifier);
    }
  }
  return specifiers;
}

function relativeImportsOf(code) {
  const specifiers = new Set();
  for (const match of code.matchAll(/from\s*["'](\.[^"']+)["']/g)) {
    specifiers.add(match[1]);
  }
  return specifiers;
}

function auditExternals(packageDir, manifest) {
  let distFiles;
  try {
    distFiles = jsFilesIn(join(packageDir, "dist"));
  } catch {
    fail("dist is missing — run `pnpm build` first");
    return;
  }
  if (distFiles.length === 0) {
    fail("dist has no JavaScript — run `pnpm build` first");
    return;
  }

  const declared = declaredDependencies(manifest);
  const imported = new Set();
  const undeclared = [];

  for (const file of distFiles) {
    const code = readFileSync(join(packageDir, "dist", file), "utf8");
    note(
      `dist/${file} — ${kB(Buffer.byteLength(code))} (gzip ${kB(gzipSync(code).length)})`,
    );
    for (const specifier of bareImportsOf(code)) {
      const name = packageNameOf(specifier);
      imported.add(name);
      if (!declared.has(name) && !undeclared.includes(name)) {
        undeclared.push(name);
        fail(
          `dist/${file} imports "${specifier}" but "${name}" is not a declared dependency`,
        );
      }
    }
  }

  const inlined = [...declared].filter((name) => !imported.has(name));
  if (inlined.length > 0) {
    note(`declared but never imported: ${inlined.join(", ")}`);
  }
  if (undeclared.length === 0) {
    pass(
      `externals kept out of the bundle: ${[...imported].sort().join(", ") || "none"}`,
    );
  }
}

function auditChunkSharing(packageDir, entries) {
  if (entries.length < 2) return;

  const chunkSets = entries.map(
    (entry) =>
      new Set(
        [
          ...relativeImportsOf(readFileSync(join(packageDir, entry), "utf8")),
        ].filter((specifier) => specifier.includes("chunks/")),
      ),
  );

  const shared = [...chunkSets[0]].filter((chunk) =>
    chunkSets.every((set) => set.has(chunk)),
  );

  if (shared.length === 0) {
    fail(
      `${entries.join(" and ")} share no chunk — their common code is duplicated in each entry`,
    );
  } else {
    pass(`${entries.join(" and ")} share ${shared.join(", ")}`);
  }
}

async function runProbe(packageDir, probe) {
  const probeRoot = join(workspaceRoot, probe.from);
  const scratch = join(probeRoot, ".bundle-probe");
  const entryFile = join(scratch, "probe.js");

  const source = probe.imports.length
    ? `import { ${probe.imports.join(", ")} } from "${probe.specifier}";\n` +
      `globalThis.__probe = [${probe.imports.join(", ")}];\n`
    : `import "${probe.specifier}";\n`;

  mkdirSync(scratch, { recursive: true });
  writeFileSync(entryFile, source);

  try {
    const result = await build({
      root: probeRoot,
      configFile: false,
      logLevel: "silent",
      build: {
        write: false,
        target: "es2022",
        minify: "esbuild",
        lib: {
          entry: entryFile,
          formats: ["es"],
          fileName: () => "probe.js",
        },
        rollupOptions: { external: probe.external ?? [] },
      },
    });

    const bundle = Array.isArray(result) ? result[0] : result;
    const code = bundle.output
      .filter((item) => item.type === "chunk")
      .map((item) => item.code)
      .join("\n");

    const size = Buffer.byteLength(code);
    const label = `${probe.label} — ${kB(size)} minified (gzip ${kB(gzipSync(code).length)})`;

    const leaked = probe.mustDrop.filter((symbol) => code.includes(symbol));
    if (leaked.length > 0) {
      fail(`${label}; expected to be shaken out: ${leaked.join(", ")}`);
    } else if (size > probe.maxBytes) {
      fail(`${label}; over its ${kB(probe.maxBytes)} budget`);
    } else {
      pass(`${label}, budget ${kB(probe.maxBytes)}`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

for (const entry of packages) {
  const packageDir = join(workspaceRoot, entry.dir);
  const manifest = readManifest(packageDir);
  console.log(`\n${manifest.name}`);

  auditExternals(packageDir, manifest);
  auditChunkSharing(packageDir, entry.sharedChunkEntries);
  for (const probe of entry.probes) {
    await runProbe(packageDir, probe);
  }
}

console.log("");
if (failures > 0) {
  console.error(`${failures} bundle check(s) failed.`);
  process.exit(1);
}
console.log("All bundle checks passed.");
