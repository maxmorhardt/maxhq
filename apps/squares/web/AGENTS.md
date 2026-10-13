# AGENTS

## Project Context

- Project: Squares UI (`github.com/maxmorhardt/squares`)
- Language: TypeScript, React 19
- Purpose: Frontend for a real-time football squares pool. Vite SPA styled with MUI v9, state in Redux Toolkit, authenticated via OIDC, kept in sync over WebSockets.
- Target environments: Static bundle served by NGINX in a container on Kubernetes.
- Related repos: `squares-api` (the backend), `charts` (the `squares` Helm chart), `k8s` (the Argo CD Application), `workflows` (shared CI).

## Repository Layout

- `src/main.tsx` - entrypoint. Configures `AuthProvider` (oidc-client-ts), `createBrowserRouter` routes, MUI `ThemeProvider`, and the Redux `Provider`.
- `src/App.tsx` - app shell. Mounts `Header`, `Footer`, `<Outlet />`, the toast provider, and the silent OIDC sign-in effect.
- `src/pages/` - route-level views grouped by feature (`contests/`, `contests/contest/`, `contests/create/`, `auth/`, `landing/`, `learn/`, `join/`, `contact/`, `privacy/`, `terms/`, `error/`).
- `src/components/` - reusable components grouped by area (`common/`, `contest/`, `header/`, `footer/`, `join/`, `landing/`, `learn/`, `contact/`, `toast/`).
- `src/features/` - Redux Toolkit slices, thunks, and selectors, one folder per domain (`contests/`, `stats/`, `toast/`, `ws/`).
- `src/app/store.ts` - `configureStore` composition root. Exports `RootState`, `AppDispatch`, `AppStore`.
- `src/service/` - HTTP and WS clients wrapping axios and `react-use-websocket`, plus `handleError.ts`.
- `src/axios/api.ts` - the shared axios instance every service uses.
- `src/hooks/` - `reduxHooks`, `useAxiosAuth`, `useContestWebSocket`, `useToast`, `useScrollAnimation`.
- `src/types/` - shared types and design tokens (`contest.ts`, `stats.ts`, `ws.ts`, `error.ts`, `gradients.ts`).
- `src/utils/` - pure helpers (`contestStatus`, `oidcHelpers`, `sanitize`).
- `Dockerfile`, `nginx.conf` - production container serving the built SPA with SPA fallback.

## Core Principles

1. One-directional data flow
   - Page or component to hook to service to backend, with Redux as the cache.
   - Thunks call functions in `src/service/`, never axios directly.
   - Selectors are the only way components read slice state.
2. Typed everything
   - Never type with `any`. Use `unknown` when the type is genuinely unknown.
   - Always use the typed `useAppDispatch` and `useAppSelector` from `src/hooks/reduxHooks.ts`, never the raw `react-redux` hooks.
3. Theme over ad-hoc CSS
   - Prefer the `sx` prop and theme tokens to hand-rolled styles. Gradients live in `src/types/gradients.ts`.
   - Use MUI v9 primitives rather than rebuilding them.
4. Safety at the DOM boundary
   - Sanitize any user-controlled string that reaches the DOM via `src/utils/sanitize.ts`.
5. Centralized user feedback
   - Errors surface through `handleError` and the toast system, not ad-hoc snackbars or `alert`.
6. Predictable auth
   - `useAxiosAuth` is mounted exactly once, in `App.tsx`. Do not mount a second copy or set tokens on axios elsewhere.

## Agent Instructions

- Make the smallest safe change that solves the requested problem, and keep it inside existing feature boundaries.
- Function components in `.tsx`. Page files `export default`; shared components use named exports.
- Props go in a local `interface Props { ... }` with `({ ... }: Props)` destructuring. Do not export `Props` unless it is reused.
- Hooks live in `src/hooks/` and are named `useXxx`.
- Register new slice reducers in `src/app/store.ts`.
- When the backend adds a NATS event subject, add the matching discriminated-union variant in `src/types/ws.ts` and handle it in `wsSlice.ts`. Components react through selectors and never read the socket directly.
- Use `showToast(message, severity)` via `useToast` rather than rendering snackbars directly.
- Keep the SPA fallback (`try_files ... /index.html`) in `nginx.conf` intact. Removing it breaks client-side routing.
- Avoid comments unless the code is genuinely non-obvious. When you do comment: **one line, lowercase, explaining the flow** (`// ensure not null and validate fields`, `// normalize to uppercase`, `// get the contest from the cache`). In JSX use section markers the same way (`{/* hero section */}`). No multi-line comment blocks, and no header comment above a function/type that just restates its name.
- **Always brace control statements.** Never a one-line `if (x) return;` — write it as `if (x) {`, newline, body, newline, `}`. Enforced by the `curly` ESLint rule.
- Do not change the Helm chart from this repo. Coordinate through the `charts` workspace.

## New Page Checklist

1. Add `XxxPage.tsx` under `src/pages/<area>/`.
2. Add the child route in `src/main.tsx` under the `App` layout.
3. Add a slice, thunks, and selectors under `src/features/<domain>/` if the page owns new state, and register the reducer in `src/app/store.ts`.
4. Add a service function in `src/service/` if it calls the backend. Never call axios from a component.
5. Add colocated tests.
6. Run `pnpm lint`, `pnpm type-check`, and `pnpm test:coverage`.

## Testing Guidance

- Tests are colocated as `Foo.test.ts` / `Foo.test.tsx` and run under Vitest in jsdom with globals enabled.
- Use `@testing-library/react` and `@testing-library/jest-dom` matchers, set up in `src/setupTests.ts`.
- Redux-dependent component tests wrap in a real store via `Provider`, or a per-test `configureStore` with the relevant reducer. Exercise the reducer rather than mocking the slice.
- Service tests mock the axios instance from `src/axios/api.ts`, not `axios` itself.
- Hook tests use `renderHook`. For OIDC-dependent hooks, mock `useAuth` from `react-oidc-context`.
- When stubbing browser APIs (`IntersectionObserver`, `WebSocket`, `matchMedia`), restore the original in `afterEach`.
- Favor deterministic tests over timing-sensitive behavior.
- Coverage is gated at **80%** for lines, branches, functions, and statements in `vitest.config.ts`. Do not lower a threshold to get a build green.
- Always run `pnpm lint`, `pnpm type-check`, and `pnpm test` before committing.

## Dependency Checklist

Before adding a new dependency, verify:

- Can this be done with React, MUI, or an existing helper in `src/utils/`?
- Does it duplicate something already in the tree (another icon set, another date library, another HTTP client)?
- What is the bundle size impact on the shipped SPA?
- Is it compatible with pnpm's strict resolution? Only direct dependencies may be imported.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`, so a version published in the last 24 hours will be refused. That is deliberate.
- Is the trade-off recorded in the commit rationale?

## Tooling

- Package manager is **pnpm**, pinned by the `packageManager` field. `npm` and `yarn` are blocked by an `only-allow pnpm` preinstall hook. Enable with `corepack enable`.
- `pnpm dev`, `pnpm build` (runs `tsc -b` then `vite build`), `pnpm preview`.
- `pnpm lint` (ESLint flat config with typescript-eslint and React hooks plugins), `pnpm type-check` (`tsc --noEmit`), `pnpm format` (Prettier).
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

Optional scopes: `pages`, `components`, `features`, `hooks`, `service`, `store`, `auth`, `ws`, `toast`, `tests`, `build`, `deploy`.

Example commit subjects:

- `feat(pages): add search input to ContestsPage`
- `fix(ws): handle square_claimed events after reconnect`
- `refactor(features): move contest selectors out of the slice file`
- `chore(deps): bump vite to 7.2`

## Non-Goals for Routine Changes

- Large refactors without a clear user-facing benefit.
- Calling axios from a component or reading the WebSocket outside the `ws` slice.
- New dependencies when MUI, React, or an existing helper is sufficient.
- Rebuilding an MUI primitive with raw `sx`.
- Lowering a coverage threshold or disabling a lint rule to get a build green.
- Editing the Helm chart or the Argo CD Application from this repo.
