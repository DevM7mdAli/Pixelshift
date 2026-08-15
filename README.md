# Pixelshift

Pixelshift is a browser image-conversion library with a Lit web component and thin React, Angular, and Vue wrappers. Files are converted locally and are never uploaded.

## Supported formats

- Input: PNG, JPEG, WebP, GIF (first frame), and BMP.
- Output: PNG, JPEG, and WebP when supported by the browser.
- Options: quality, maximum width, maximum height, JPEG background, batch conversion, and file-size limits.

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
├── core/         # Framework-independent conversion logic
├── web-core/     # Main Lit component and Tailwind styles
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

`core` owns all conversion behavior. `web-core` owns the Lit interface and delegates conversions to `core`. Framework wrappers only translate properties, events, and public methods; they contain no conversion logic.

The `web-core` build runs Tailwind 3 and converts the generated CSS to a Lit stylesheet with `twlitme` before bundling. Generated `tailwind.css` and `twlit.ts` files are intentionally ignored.

## Library build

`core`, `web-core`, `react`, and `vue` are bundled with Vite in library mode. Each has an eight-line `vite.config.ts` that delegates to the shared factory in [`tooling/vite/library.ts`](tooling/vite/library.ts); that file is the one place to change build policy.

`angular` stays on `ng-packagr`. It is the only tool that emits the Angular Package Format with partial-Ivy compilation, which is what lets the consuming app's compiler re-compile the component against its own Angular version.

The output is deliberately shaped for the consumer's bundler:

- **ESM only, unminified.** Consumers minify; shipping readable modules keeps their tree shaking and their stack traces working.
- **Dependencies stay external.** Everything a package declares in `dependencies` or `peerDependencies` — including subpaths like `lit/decorators.js` — is left as a bare import, so no consumer ends up with two copies of `lit`, `react`, or `image-core`.
- **One entry per exported subpath.** `web-core` builds `index` and `define` as separate entries whose shared code lands in a single chunk, so importing both paths never duplicates the element.
- **`hoistTransitiveImports` is off.** Rollup otherwise pulls every transitive import up into the entry chunk, forcing consumers to load code they never reached.
- **`sideEffects` is honest.** Every package is `"sideEffects": false` except `web-core`, which lists `./dist/define.js` — the one module that registers the custom element.
- **Per-file declarations.** `vite-plugin-dts` emits `.d.ts` alongside `.d.ts.map` rather than rolling types into one file, so go-to-definition still lands on the original source.

### Verifying it

`pnpm check:bundle` builds each package the way a real consumer does — by package name, through the `exports` map, from a workspace project that actually depends on it — and fails on regressions:

```bash
pnpm build && pnpm check:bundle
```

It asserts that every bare import in `dist` is a declared dependency (catching both phantom dependencies and accidentally inlined ones), that multi-entry packages share their common chunk, and that each probe drops the symbols it never touched and stays inside its size budget. Budgets live at the top of [`tooling/scripts/check-bundle.mjs`](tooling/scripts/check-bundle.mjs); raise one deliberately, in the same commit as whatever grew it.

Current headline numbers: importing a single `core` helper costs **0.13 kB** out of a 6.88 kB module, and the whole component reaches a consuming app at **~41.6 kB minified / 12.2 kB gzipped**, `lit` included.

### Known limit

`ImageConverterElement` cannot be tree-shaken away by a consumer that imports `web-core` without using it. esbuild lowers Lit's `@property`/`@state` decorators into top-level `__decorateClass(...)` calls, which Rollup cannot prove side-effect free. This is inherent to legacy decorators plus esbuild, and it does not matter in practice: the element is the package's entire payload. Do not spend time chasing it — the fix would be dropping decorators for a static `properties` block.

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
