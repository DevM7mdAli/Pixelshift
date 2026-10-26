# Pixelshift

Pixelshift is a browser image toolkit: a framework-free core, Lit web components, and thin React, Angular, and Vue wrappers. Every tool runs locally; files are never uploaded.

## Tools

Each tool is a function in `pixelshift-core` and an element in `pixelshift-web-core`, wrapped by every adapter.

| Tool                      | Core function                                | Element                           |
| ------------------------- | -------------------------------------------- | --------------------------------- |
| Image compressor          | `compressImage`                              | `<pixelshift-image-compressor>`   |
| Image resizer             | `resizeImage`                                | `<pixelshift-image-resizer>`      |
| Image / WebP converter    | `convertImage`                               | `<pixelshift-image-converter>`    |
| Image cropper             | `cropImage`                                  | `<pixelshift-image-cropper>`      |
| Color picker              | `extractColors`, `getPixelColor`             | `<pixelshift-color-picker>`       |
| Image to Base64           | `imageToBase64`, `createEmbedSnippets`       | `<pixelshift-image-to-base64>`    |
| Social media resizer      | `resizeForSocial`, `SOCIAL_PRESETS`          | `<pixelshift-social-resizer>`     |
| YouTube thumbnail resizer | `resizeForSocial(file, "youtube-thumbnail")` | `<pixelshift-youtube-thumbnail>`  |
| Background remover        | `removeBackground`                           | `<pixelshift-background-remover>` |
| All of the above, tabbed  | —                                            | `<pixelshift-studio>`             |

- Input: PNG, JPEG, WebP, GIF (first frame), and BMP. Base64 also accepts SVG, AVIF, and ICO.
- Output: PNG, JPEG, and WebP when supported by the browser.
- PNG compression quantizes to an indexed palette (the pngquant/TinyPNG approach) and writes it with a built-in PNG encoder, because canvas only encodes truecolor PNGs.
- The background remover keys out plain or gently graded backgrounds — product shots, logos, signatures, screenshots. For busy photos, pass a `segmenter` (any function returning a foreground mask, such as an ML model) and it is used instead.

## Prerequisites

- **Node.js**: >=24.x
- **pnpm**: 10.x

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start one integration app:

   ```bash
   pnpm dev:vanila
   pnpm dev:react
   pnpm dev:angular
   pnpm dev:vue
   pnpm dev:docs
   ```

## Project Structure

```text
apps/
├── vanila/       # Direct custom-element consumer
├── react-app/    # React wrapper consumer
├── angular-app/  # Angular wrapper consumer
├── vue-app/      # Vue wrapper consumer
└── docs/         # Fumadocs landing page and documentation

packages/
├── core/         # Framework-independent image operations
├── web-core/     # Lit elements, shared tool base, and Tailwind styles
├── react/        # React adapter
├── angular/      # Angular adapter
└── vue/          # Vue adapter
```

## Scripts

- `pnpm build`: Build every package and app with Nx.
- `pnpm test`: Run package and app tests.
- `pnpm typecheck`: Type-check all ten Nx projects.
- `pnpm check:bundle`: Audit the built packages (run after `pnpm build`).
- `pnpm dev`: Start all five development apps.
- `pnpm dev:docs`: Start the Fumadocs site at `http://localhost:3000`.
- `pnpm format`: Format source and documentation.

## Design

`core` owns all image behavior. Every geometric operation — crop, resize, fit, format change — is planned as a single `drawImage` call by pure functions in `geometry.ts`, then executed by one decode → draw → encode pipeline in `pipeline.ts`. The pixel algorithms (median-cut quantization, the indexed PNG and ZIP writers, background masking, palette extraction) are pure functions over byte arrays, so they are unit-tested without a canvas.

`web-core` owns the Lit interface and delegates work to `core`. Every tool extends `PixelshiftTool` in `base.ts`, which provides file intake (drop, browse, paste), batch processing with per-file errors and cancellation, result downloads (including a ZIP of all results), theming, and object-URL cleanup. Framework wrappers only translate properties, events, and public methods; they contain no image logic.

Colors are CSS custom properties (`--pixelshift-accent`, `--pixelshift-surface`, …, defined in `web-core/theme.ts`), so consumers can restyle any element from outside its shadow root. Dark mode follows the `is-dark-mode` attribute.

The `web-core` build runs Tailwind 3 and converts the generated CSS to a Lit stylesheet with `twlitme` before bundling. Generated `tailwind.css` and `twlit.ts` files are intentionally ignored.

## Library build

`core`, `web-core`, `react`, and `vue` are bundled with Vite in library mode. Each has an eight-line `vite.config.ts` that delegates to the shared factory in [`tooling/vite/library.ts`](tooling/vite/library.ts); that file is the one place to change build policy.

`angular` stays on `ng-packagr`. It is the only tool that emits the Angular Package Format with partial-Ivy compilation, which is what lets the consuming app's compiler re-compile the component against its own Angular version.

The output is deliberately shaped for the consumer's bundler:

- **ESM only, unminified.** Consumers minify; shipping readable modules keeps their tree shaking and their stack traces working.
- **Dependencies stay external.** Everything a package declares in `dependencies` or `peerDependencies` — including subpaths like `lit/decorators.js` — is left as a bare import, so no consumer ends up with two copies of `lit`, `react`, or `image-core`.
- **One entry per exported subpath.** `web-core` builds `index` and `define` as separate entries whose shared code lands in a single chunk, so importing both paths never duplicates the element.
- **`hoistTransitiveImports` is off.** Rollup otherwise pulls every transitive import up into the entry chunk, forcing consumers to load code they never reached.
- **`sideEffects` is honest.** Every package is `"sideEffects": false` except `web-core`, which lists `./dist/define.js` — the one module that registers the custom elements.
- **Per-file declarations.** `vite-plugin-dts` emits `.d.ts` alongside `.d.ts.map` rather than rolling types into one file, so go-to-definition still lands on the original source.

### Verifying it

`pnpm check:bundle` builds each package the way a real consumer does — by package name, through the `exports` map, from a workspace project that actually depends on it — and fails on regressions:

```bash
pnpm build && pnpm check:bundle
```

It asserts that every bare import in `dist` is a declared dependency (catching both phantom dependencies and accidentally inlined ones), that multi-entry packages share their common chunk, and that each probe drops the symbols it never touched and stays inside its size budget. Budgets live at the top of [`tooling/scripts/check-bundle.mjs`](tooling/scripts/check-bundle.mjs); raise one deliberately, in the same commit as whatever grew it.

Current headline numbers, as `check:bundle` reports them: a single `core` helper costs **0.13 kB**; one element (the converter, through the React adapter) reaches a consuming app at **~73 kB / 21.4 kB gzipped**, and the whole studio with all nine tools at **~159 kB / 42 kB gzipped**, `lit` included.

### Tree shaking per tool

Importing one tool never bundles the others:

- **Elements declare reactive properties in a `static get properties()` block, not decorators.** esbuild lowers Lit's `@property`/`@state` decorators into top-level `__decorateClass(...)` calls that Rollup cannot prove side-effect free, which kept every decorated class alive. A static getter runs nothing at module evaluation.
- **Adapters register lazily.** Each React and Vue component is created by a `/* @__PURE__ */` factory that registers its element, so a component the app never references is dropped and never defined. Angular components register in their constructor.
- **Core module-level values are literals.** A top-level call such as `SOCIAL_PRESETS.find(...)` is enough to keep a module alive; `YOUTUBE_THUMBNAIL` is therefore a plain object.

The probes above enforce all three: each single-tool probe fails if another tool's heading string appears in its bundle.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and every push to `main`:

- **Commit messages** — `commitlint` checks the commits in the pull request, or the range a push added, against [Conventional Commits](https://www.conventionalcommits.org/). The same rules run locally through the `commit-msg` hook.
- **Verify** — formatting, build, typecheck, tests, and `check:bundle`. These are the same checks the pre-commit hook runs, so a bypassed hook cannot land unformatted code. The Nx cache is restored between runs, keyed on the lockfile.
- **Release** — only on `main`, and only after the two jobs above pass.

## Versioning and Publishing

Versions are driven by [Changesets](https://github.com/changesets/changesets), not by commit types. Each publishable package moves independently, and dependents get a patch bump automatically.

**1. Describe your change.** In the pull request that makes it, run:

```bash
pnpm changeset
```

Pick the affected packages and bump types. Commit the generated file in `.changeset/`.

**2. Merge to `main`.** The release job collects every pending changeset and opens a pull request titled `chore(release): version packages`, which bumps each `package.json`, writes the `CHANGELOG.md` entries, and refreshes the lockfile. It stays open and updates itself as more changesets land.

**3. Merge the version pull request.** With no changesets left, the same job builds and publishes to npm, pushes git tags, and creates a GitHub release per package.

Nothing reaches npm without that second, explicit merge.

### Required repository configuration

| Secret          | Required | Purpose                                                                                                                                                                                |
| --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NPM_TOKEN`     | Yes      | An npm **Automation** token with publish rights for the `pixelshift-*` packages. Granular tokens work too; classic "Publish" tokens fail 2FA-enforced accounts.                        |
| `RELEASE_TOKEN` | Optional | A personal access token with `repo` scope. Without it the version pull request is created by `GITHUB_TOKEN`, and **GitHub will not run CI on that pull request** — a known limitation. |

Packages publish publicly with [npm provenance](https://docs.npmjs.com/generating-provenance-statements), which is why the release job requests `id-token: write` and every package declares a `repository` field.

### Publishing manually

The pipeline is the supported path, but the same steps run locally:

```bash
pnpm changeset:version && pnpm changeset:publish
```

`changeset publish` shells out to `pnpm publish`, which rewrites each `workspace:*` dependency to the real version in the tarball. Provenance is skipped outside CI.

### A note on private apps

The apps are `private: true`, so they never publish, but Changesets still version-bumps them when a package they consume changes. That is cosmetic. If the churn becomes annoying, add their names to `ignore` in [`.changeset/config.json`](.changeset/config.json) — at the cost of maintaining that list as apps come and go.
