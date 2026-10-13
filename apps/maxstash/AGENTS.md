# AGENTS

## Project Context

- Project: Maxstash (`github.com/maxmorhardt/maxstash`)
- Language: TypeScript, React 19
- Purpose: Personal portfolio site. Vite build routed and prerendered by React Router framework mode, styled with Material UI over Emotion from a single themed token set.
- Target environments: Fully prerendered static HTML served by NGINX in a container on Kubernetes. Public and search-indexed.
- Related repos: `charts` (the `maxstash` and `maxstash-gateway` Helm charts), `k8s` (the Argo CD Application), `workflows` (shared CI).

## Repository Layout

- `src/routes.ts` - React Router route config. `src/root.tsx` - the HTML document and providers. `src/App.tsx` - the app shell (header, `<Outlet/>`, footer).
- `src/pages/` - route-level views, lazy-loaded route modules.
- `src/components/` - reusable components grouped by area (`common/`, `header/`, `footer/`, `apps/`, `contact/`, `projects/`).
- `src/hooks/` - React hooks, for example `useScrollReveal`.
- `src/theme.ts` - the MUI theme, design tokens, and shared page scaffolding styles.
- `src/setupTests.ts`, `src/testUtils.tsx` - Vitest setup and the shared `renderWithProviders` helper.
- `public/` - static assets served as-is (`logo.svg`, `sitemap.xml`).
- `react-router.config.ts` - SPA mode plus the explicit `prerender()` route list.
- `Dockerfile`, `nginx.conf` - production container serving the prerendered site.

## Core Principles

1. Prerendering is the product
   - Every real route is prerendered to its own HTML file. There is deliberately no SPA fallback in production.
   - An unmatched path is genuinely missing and must return a real 404, not the homepage shell with a 200. Soft 404s are penalized by search engines.
2. SEO correctness is not optional
   - Every page needs a title, description, and self-referencing canonical baked into its prerendered HTML.
   - Missing metadata is what previously kept `/about`, `/contact`, and `/projects` out of Google's index.
3. Reach for MUI before writing `sx`
   - `Card`/`CardContent`/`CardActionArea` for surfaces, `Chip` for tags, `Button` for calls to action, `Avatar variant="rounded"` for icon tiles, `Divider` for rules, `Container` for page width, `AppBar`/`Toolbar` for the header.
   - Most of the look is already in the theme's `components` defaults, so a plain `<Card>` is usually correct with no props.
   - Use `sx` for layout and one-off accents. If you are writing `border + borderRadius + backgroundColor + hover`, you want a `Card` or `Paper`.
4. One source of design tokens
   - `src/theme.ts` owns the palette, breakpoints, radii, easing, fonts, and `pageSection` rhythm. Change the look there, not per page.
   - Use theme tokens (`bgcolor: 'background.paper'`, `color: 'text.primary'`, `borderColor: 'divider'`) rather than raw hex. For a tinted accent use `alpha(theme.palette.primary.main, n)`.
5. Prerender-safe code
   - Code touching `window`, `document`, or `localStorage` runs under Node during prerender. Guard it or put it in an effect.
6. Motion is always escapable
   - Every animation carries a `@media (prefers-reduced-motion: reduce)` escape hatch.
7. Typed everything
   - Never type with `any`. Use `unknown` when the type is genuinely unknown.

## Agent Instructions

- Make the smallest safe change that solves the requested problem.
- Components are function components in `.tsx`, one per file, with a `default` export.
- Props: export an `interface XxxProps` when the type is reused by a test or parent, otherwise inline the object type.
- Hooks live in `src/hooks/` and are named `useXxx`.
- **Every page must render `<PageMeta title description canonical />`.** It wraps `react-helmet-async` so the title, description, canonical, robots, and og/twitter tags land in that route's prerendered HTML. `robots` defaults to `index, follow`; `NotFoundPage.tsx` passes `noindex, follow` and omits `canonical`. Those tags live only in `PageMeta`, so do not reintroduce static copies in `root.tsx` or every page gets duplicates.
- Only three custom palette tokens exist (`codeBg`, `heroGlow1`, `heroGlow2`), declared in `theme.ts` with a matching `Palette`/`PaletteOptions` augmentation. Prefer MUI's own slots over adding a fourth.
- Page headings use `variant="h4"`; row and section labels use `variant="overline"`. Both are configured in the theme, so do not hand-set those font sizes.
- Prefer `Box` with flex or grid props over MUI `Stack`. Use `@mui/icons-material` rather than another icon library.
- Breakpoints are `sm: 600, md: 960, lg: 1200, xl: 1400`, so `<Container maxWidth="lg">` is the 1200px page width and `maxWidth="xl"` is the 1400px header and footer width. Do not hand-roll `maxWidth` plus `mx: 'auto'`.
- Use `RevealSection` for scroll reveals. `variant` picks the entrance offset (`up`, `left`, `scale`, `rise`); `delay` (0 to 4) staggers in 100ms steps.
- `MuiCssBaseline.styleOverrides` reads through `theme.vars` deliberately. Using `theme.palette` there bakes in one scheme's literal values and the toggle stops repainting.
- Theme preference lives in `localStorage` under `maxstash:theme`. `<InitColorSchemeScript>` in `root.tsx` applies it before first paint, and its `modeStorageKey` must stay in sync with the `ThemeProvider` in `providers.tsx` (both read `COLOR_SCHEME_STORAGE_KEY` from `theme.ts`).
- `AppHeader` holds the theme-toggle icon behind a `mounted` flag because `useColorScheme().mode` is undefined until the client reads storage. Keep that guard.
- `HeroTerminal` deliberately keeps its own hard-coded GitHub-dark palette in both color schemes. It is a terminal, not a themed surface.
- Avoid comments unless the code is genuinely non-obvious. When you do comment: **one line, lowercase, explaining the flow** (`// ensure not null and validate fields`, `// normalize to uppercase`, `// get the contest from the cache`). In JSX use section markers the same way (`{/* hero section */}`). No multi-line comment blocks, and no header comment above a function/type that just restates its name.
- **Always brace control statements.** Never a one-line `if (x) return;` — write it as `if (x) {`, newline, body, newline, `}`. Enforced by the `curly` ESLint rule.
- Do not change the Helm chart from this repo. Coordinate through the `charts` workspace.

## New Page Checklist

Missing any step ships a route that 404s in production or never gets indexed.

1. Add `XxxPage.tsx` in `src/pages/`.
2. Add a `route(...)` entry in `src/routes.ts`.
3. Add its path to `prerender()` in `react-router.config.ts`.
4. Render `<PageMeta title description canonical />` in the page.
5. Add the URL to `public/sitemap.xml`.
6. Add a colocated test.
7. Run `pnpm lint`, `pnpm type-check`, and `pnpm test:coverage`.

## Testing Guidance

- Tests are colocated as `Foo.test.tsx` and run under Vitest in jsdom.
- Use `renderWithProviders` from `src/testUtils.tsx`. It mirrors the real provider stack (Helmet, MUI theme, `CssBaseline`, `MemoryRouter`) and accepts a `route` option for asserting active-route behavior.
- `setupTests.ts` forces `prefers-reduced-motion`, so `HeroTerminal` prints its boot script synchronously instead of typing. To exercise the animated path, override `window.matchMedia` and drive it with `vi.useFakeTimers()` plus `vi.runAllTimersAsync()` (see `HeroTerminal.test.tsx`).
- `IntersectionObserver` is absent in jsdom. When stubbing it use a **class**, because the hook calls it with `new`, and restore it in `afterEach`. `useScrollReveal` falls back to immediately visible when the API is missing, so tests see revealed content.
- Prefer role-based queries (`getByRole('link', { name })`) over test ids.
- Coverage is gated at **80%** for statements, branches, functions, and lines in `vitest.config.ts`. Do not lower a threshold to get a build green.
- Always run `pnpm lint`, `pnpm type-check`, and `pnpm test` before committing.

## Dependency Checklist

Before adding a new dependency, verify:

- Can this be done with React, MUI, or an existing hook in `src/hooks/`?
- Does it work under prerender, where there is no `window` or `document`?
- What is the bundle size impact? This is a portfolio site where load time is part of the point.
- Is it compatible with pnpm's strict resolution? Only direct dependencies may be imported.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`, so a version published in the last 24 hours will be refused. That is deliberate.
- Is the trade-off recorded in the commit rationale?

## Build and Serve Contract

These two must change together or every route silently breaks.

- `pnpm build` runs React Router in SPA mode (`ssr: false`) with an explicit `prerender()` list, emitting one HTML file per route plus the catch-all as `/404`.
- Prerender output is nested (`dist/client/about/index.html`), matched by the `$uri/index.html` term of the `try_files` chain in `nginx.conf`.
- `buildDirectory` is `dist`, so client output lands in `dist/client/`. That is the path the `Dockerfile` copies and `preview` serves; CI uploads `dist` as the artifact.
- `nginx.conf` uses `try_files $uri $uri/index.html =404` with `error_page 404 /404/index.html`. React Router still emits `__spa-fallback.html`; it is unused in production by design.
- Hashed assets under `/assets/` are served `immutable` for a year. HTML is served `no-cache` so it always revalidates against current asset hashes.
- MUI's Emotion styles are extracted into the prerendered HTML automatically by React 19 SSR, so there is no unstyled flash and no custom `entry.server` is needed.

## Tooling

- Package manager is **pnpm**, pinned by the `packageManager` field. `npm` and `yarn` are blocked by an `only-allow pnpm` preinstall hook. Enable with `corepack enable`.
- `pnpm dev`, `pnpm build`, `pnpm preview`, all via the React Router CLI.
- `pnpm lint` (ESLint flat config), `pnpm type-check` (runs `react-router typegen` then `tsc -b`), `pnpm format` (Prettier).
- Prettier is enforced on commit via Husky and lint-staged.

## Commit Tags

Conventional commits, enforced on PR titles and consumed by release-please. The type determines the release, so it is a functional choice, not a stylistic one.

- `feat`: New user-facing capability. Cuts a minor release.
- `fix`: Corrects wrong behavior, a regression, or a security issue. Cuts a patch release.
- `refactor`: Restructuring with no behavior change.
- `chore`: Maintenance that is not user-facing, including routine dependency bumps.
- `ci`: Workflow, build, or release automation changes.
- `docs`: Documentation only.
- `test`: Test-only additions or maintenance.
- `style`: Formatting only.

Optional scopes: `pages`, `components`, `hooks`, `routes`, `theme`, `tests`, `build`, `deploy`.

Example commit subjects:

- `feat(pages): add resume download link to AboutPage`
- `fix(routes): add /projects to the prerender list`
- `refactor(theme): move card defaults into components overrides`
- `chore(deps): bump react-router to 7.10`

## Non-Goals for Routine Changes

- Adding a route without also adding it to `prerender()` and `sitemap.xml`.
- Reintroducing an SPA fallback in `nginx.conf`. Soft 404s are the bug this design exists to prevent.
- Rebuilding an MUI primitive with raw `sx`, or adding a fourth custom palette token.
- Reading `window` or `localStorage` outside an effect or guard.
- New dependencies when MUI, React, or an existing hook is sufficient.
- Lowering a coverage threshold or disabling a lint rule to get a build green.
- Editing the Helm chart or the Argo CD Application from this repo.
