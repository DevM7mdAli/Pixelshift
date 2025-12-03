# Monorepo Starter Template

This is a starter template for a modern monorepo setup using **pnpm workspaces** and **Turbo**. It comes pre-configured with essential tooling for code quality, versioning, and development workflow.

## Features

- **Package Manager**: [pnpm](https://pnpm.io/) for fast, disk-efficient package management.
- **Build System**: [Turbo](https://turbo.build/) for high-performance build caching and task orchestration.
- **Versioning**: [Changesets](https://github.com/changesets/changesets) for managing versioning and changelogs.
- **Code Quality**:
  - [TypeScript](https://www.typescriptlang.org/) for static type checking.
  - [Prettier](https://prettier.io/) for code formatting.
  - [Husky](https://typicode.github.io/husky/) for git hooks.
  - [Lint-staged](https://github.com/okonet/lint-staged) for running linters on staged files.

## Prerequisites

- **Node.js**: >=22.x
- **pnpm**: 10.x

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

## Project Structure

```text
.
├── apps/           # Application packages (e.g., web apps, docs)
├── packages/       # Shared libraries and utilities
├── package.json    # Root configuration and scripts
├── pnpm-workspace.yaml # pnpm workspace configuration
└── turbo.json      # Turbo configuration (create this if not present)
```

## Scripts

- `pnpm build`: Build the project using Turbo.
- `pnpm dev`: Start the development server using Turbo.
- `pnpm lint`: Lint the project using Turbo.
- `pnpm format`: Format the code using Prettier.

## Versioning and Publishing

This template uses **Changesets** for version management.

1. **Generate a changeset:**
   When you make changes that require a version bump, run:

   ```bash
   pnpm changeset
   ```

   Follow the prompts to select packages and bump types (major, minor, patch).

2. **Version packages:**
   To apply the changesets and update versions/changelogs:

   ```bash
   pnpm changeset version
   ```

3. **Publish:**
   To publish the packages to npm (or a private registry):

   ```bash
   pnpm changeset publish
   ```

## Tooling Configuration

- **TypeScript**: Configured in `tsconfig.json`.
- **Prettier**: Configured in `.prettierrc`.
- **Lint-staged**: Configured in `package.json`.
- **Husky**: Configured in `.husky/`.
