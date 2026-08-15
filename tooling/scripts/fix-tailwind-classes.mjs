import { readdir, readFile, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const docsRoot = join(repositoryRoot, "apps/docs");
const checkOnly = process.argv.includes("--check");
const sourceExtensions = new Set([".js", ".jsx", ".mdx", ".ts", ".tsx"]);
const sourceRoots = ["app", "components", "content", "lib"];

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) return collectSourceFiles(path);
      return sourceExtensions.has(extname(entry.name)) ? [path] : [];
    }),
  );

  return files.flat();
}

const postcssPackage = await realpath(
  join(docsRoot, "node_modules/@tailwindcss/postcss/package.json"),
);
const requireFromPostcss = createRequire(pathToFileURL(postcssPackage));
const oxideEntry = requireFromPostcss.resolve("@tailwindcss/oxide");
const tailwindEntry = await realpath(
  join(docsRoot, "node_modules/tailwindcss/dist/lib.mjs"),
);

const [{ Scanner }, { __unstable__loadDesignSystem }] = await Promise.all([
  import(pathToFileURL(oxideEntry)),
  import(pathToFileURL(tailwindEntry)),
]);

const [defaultTheme, globalCss] = await Promise.all([
  readFile(join(docsRoot, "node_modules/tailwindcss/theme.css"), "utf8"),
  readFile(join(docsRoot, "app/global.css"), "utf8"),
]);
const localTheme = globalCss.replace(/^@import\s+[^;]+;\s*$/gm, "");
const designSystem = await __unstable__loadDesignSystem(
  `${defaultTheme}\n${localTheme}\n@tailwind utilities;`,
);
const scanner = new Scanner({});
const sourceFiles = (
  await Promise.all(
    sourceRoots.map((directory) =>
      collectSourceFiles(join(docsRoot, directory)),
    ),
  )
).flat();

let changedFiles = 0;
let changedClasses = 0;

for (const path of sourceFiles) {
  const source = await readFile(path, "utf8");
  const candidates = scanner.getCandidatesWithPositions({
    content: source,
    extension: extname(path).slice(1),
  });
  const replacements = candidates
    .map(({ candidate, position }) => ({
      candidate,
      canonical: designSystem.canonicalizeCandidates([candidate], {
        rem: 16,
      })[0],
      position,
    }))
    .filter(
      ({ candidate, canonical, position }) =>
        canonical !== candidate &&
        source.slice(position, position + candidate.length) === candidate,
    )
    .sort((left, right) => right.position - left.position);

  if (replacements.length === 0) continue;

  let updated = source;
  for (const { candidate, canonical, position } of replacements) {
    updated =
      updated.slice(0, position) +
      canonical +
      updated.slice(position + candidate.length);
  }

  changedFiles += 1;
  changedClasses += replacements.length;
  console.log(
    `${checkOnly ? "Would fix" : "Fixed"} ${replacements.length} classes in ${path.slice(repositoryRoot.length + 1)}`,
  );

  if (!checkOnly) await writeFile(path, updated);
}

if (changedClasses === 0) {
  console.log("Tailwind classes are already canonical.");
} else {
  console.log(
    `${checkOnly ? "Found" : "Fixed"} ${changedClasses} classes across ${changedFiles} files.`,
  );
}

if (checkOnly && changedClasses > 0) process.exitCode = 1;
