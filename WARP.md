# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Tooling and common commands

This project is a Mantine + Next.js App Router template using TypeScript, Jest, Storybook, ESLint, Stylelint, Prettier, and Yarn 4.

### Dependency management

- Install dependencies (preferred): `yarn`
  - The repo is configured for Yarn 4 via `.yarn/` and `packageManager`.

### Application lifecycle

- Start dev server: `npm run dev`
- Build production bundle: `npm run build`
- Start production server (after build): `npm run start`
- Analyze bundle with `@next/bundle-analyzer`: `npm run analyze`

### Testing

Jest is wired through `next/jest` with a jsdom environment and custom setup in `jest.setup.cjs`.

- Full test pipeline (typegen + formatting + lint + types + Jest): `npm test`
  - Expands to `npx next typegen`, `npm run prettier:check`, `npm run lint`, `npm run typecheck`, and `npm run jest`.
- Run Jest tests only (no typegen/lint/format): `npm run jest`
- Watch mode: `npm run jest:watch`
- Run a single test file, e.g. the Welcome component tests:
  - `npm run jest -- components/Welcome/Welcome.test.tsx`

Testing helpers:

- Prefer importing from `@/test-utils` in tests (see `test-utils/`):
  - Re-exports `@testing-library/react` and `userEvent`.
  - Provides a `render` helper that wraps components in a `MantineProvider` configured with the shared `theme` and `env="test"`.

### Linting, formatting, and type checking

- TypeScript type check: `npm run typecheck`
- ESLint + Stylelint: `npm run lint`
  - `npm run eslint` runs ESLint with `eslint-config-mantine` and TypeScript project config.
  - `npm run stylelint` runs Stylelint over `**/*.css` using the SCSS-standard config.
- Prettier check: `npm run prettier:check`
- Apply Prettier formatting: `npm run prettier:write`

### Storybook

Storybook is configured via `.storybook/main.ts` and `.storybook/preview.tsx` with `@storybook/nextjs` and `@storybook/addon-themes`.

- Run Storybook dev server (port 6006 by default): `npm run storybook`
- Build static Storybook bundle to `storybook-static/`: `npm run storybook:build`

## Architecture and code structure

### Next.js App Router and layout

- Uses the Next.js App Router with the `app/` directory.
- `app/layout.tsx` defines `RootLayout` and is responsible for global HTML shell and Mantine wiring:
  - Imports global Mantine styles from `@mantine/core/styles.css`.
  - Applies `mantineHtmlProps` to the `<html>` element.
  - Injects `ColorSchemeScript` into `<head>` to keep color scheme in sync between client and server.
  - Wraps the entire app tree in `MantineProvider` with the shared `theme` from `theme.ts`.
- `app/page.tsx` defines the home page and currently composes two key UI building blocks:
  - `Welcome` (intro content) and
  - `ColorSchemeToggle` (light/dark/auto switching).

### Theming and styling

- Global theme:
  - `theme.ts` exports a Mantine `createTheme` instance and is the single source of truth for theming.
  - The same `theme` is used in three places:
    - `app/layout.tsx` (runtime app),
    - `.storybook/preview.tsx` (Storybook), and
    - `test-utils/render.tsx` (tests).
- Mantine integration:
  - Components use Mantine UI primitives (`Title`, `Text`, `Anchor`, `Button`, `Group`, etc.) for layout and styling.
  - `ColorSchemeToggle` is a client component (`'use client'`) that calls `useMantineColorScheme()` to switch between `light`, `dark`, and `auto` color schemes.
- CSS and PostCSS:
  - Component-specific styles live in CSS Modules (e.g. `components/Welcome/Welcome.module.css`).
  - Mantine PostCSS preset and related tooling are enabled (see `postcss.config.cjs` and README) to support features like `light-dark()` and `rem()` helpers and Mantine design tokens.

### Components and co-location pattern

- Components live under `components/`, typically in folders named after the component:
  - Example: `components/Welcome/Welcome.tsx` uses Mantine primitives and CSS modules for layout and text.
  - Example: `components/ColorSchemeToggle/ColorSchemeToggle.tsx` provides color scheme switcher buttons wired to Mantine color scheme API.
- Co-located artifacts follow a consistent pattern:
  - Component implementation: `ComponentName.tsx`
  - Styles: `ComponentName.module.css`
  - Tests: `ComponentName.test.tsx` (Jest + React Testing Library)
  - Storybook stories: `ComponentName.story.tsx`
- Imports commonly use the `@/*` path alias configured in `tsconfig.json` (e.g. `@/test-utils`).

### Testing setup details

- Jest configuration (`jest.config.cjs`):
  - Built on top of `next/jest` via `createJestConfig` with `dir: './'`.
  - Sets up `jest.setup.cjs` via `setupFilesAfterEnv`.
  - Maps component/page imports for Jest using `moduleNameMapper` so aliases like `@/components/*` and `@/pages/*` resolve to their filesystem counterparts.
  - Uses `jest-environment-jsdom` to simulate the browser.
- Jest setup (`jest.setup.cjs`):
  - Registers `@testing-library/jest-dom` matchers.
  - Polyfills `getComputedStyle`, `scrollIntoView`, `matchMedia`, and `ResizeObserver` to avoid missing-API issues in jsdom.
- Test utilities (`test-utils/`):
  - `render.tsx` wraps React Testing Library’s `render` with a `MantineProvider` so components under test see the same theme configuration as in the app and Storybook.
  - `index.ts` re-exports React Testing Library helpers, the custom `render`, and `userEvent` for ergonomic imports.

### Storybook configuration

- `.storybook/main.ts`:
  - Uses `@storybook/nextjs` as the framework.
  - Loads stories from `components/**/*.(stories|story).@(js|jsx|ts|tsx)`.
  - Enables `@storybook/addon-themes` and disables telemetry / crash reports.
- `.storybook/preview.tsx`:
  - Applies global Storybook parameters:
    - `layout: 'fullscreen'`,
    - disabled backgrounds, and
    - a custom `storySort` that orders stories lexicographically by title.
  - Declares a `theme` global with toolbar controls for `light` and `dark` modes.
  - Wraps all stories in a `MantineProvider` (using the shared `theme`) and includes `ColorSchemeScript`, mirroring the runtime layout’s theming behavior.

### Linting, formatting, and TypeScript configuration

- ESLint (`eslint.config.mjs`):
  - Based on `eslint-config-mantine` and `typescript-eslint` recommended configs.
  - Configures TypeScript parser options to use `tsconfig.json` as the project and sets `tsconfigRootDir` to `process.cwd()`.
  - Ignores built assets and JS-only files (e.g. `.next/`, `*.mjs`, `*.cjs`, etc.).
  - Allows `console` in Storybook stories by disabling `no-console` for `**/*.story.tsx`.
- Stylelint:
  - Configured via `.stylelintrc.json` with `stylelint-config-standard-scss` for CSS (including Mantine/PostCSS helpers) and runs over `**/*.css`.
- TypeScript (`tsconfig.json`):
  - Enables strict type checking and modern module resolution (`moduleResolution: 'bundler'`).
  - Adds a path alias `@/*` -> `./*` used across app, stories, and tests.
  - Includes Storybook config files and Next.js generated type definitions so tooling works consistently across environments.
