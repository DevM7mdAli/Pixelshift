/**
 * Conventional Commits, enforced by the `commit-msg` hook locally and by the
 * `commitlint` CI job on every pull request and push to main.
 *
 * Versioning itself is driven by Changesets, not by these commit types — run
 * `pnpm changeset` to describe a release. Conventional commits keep the git
 * history and the generated release notes readable.
 */

/** @type {import("@commitlint/types").UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // The workspace projects, plus the areas that sit outside them.
    "scope-enum": [
      2,
      "always",
      [
        "core",
        "web-core",
        "react",
        "vue",
        "angular",
        "apps",
        "build",
        "ci",
        "deps",
        "docs",
        "release",
      ],
    ],
  },
};
