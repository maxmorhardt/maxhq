# Squares UI Contribution Guide

This guide provides context for coding agents working in this repository. Squares UI is the frontend for a real-time football squares pool: a React 19 + TypeScript SPA built with Vite, styled with MUI (Material UI v7), state managed with Redux Toolkit, authenticated via OIDC, and kept in sync over WebSockets. It ships as a Docker image and is served by NGINX, deployed via the sibling `charts/squares` Helm chart. The backend it talks to is the sibling `squares-api` workspace.

## Directory overview

- `src/` – application source.
  - `main.tsx` – entrypoint. Configures `AuthProvider` (oidc-client-ts), `react-router-dom` routes, MUI `ThemeProvider`, and the Redux `Provider`.
  - `App.tsx` – app shell. Mounts `Header`, `Footer`, `<Outlet />`, the toast provider, and runs the silent OIDC sign-in effect.
  - `pages/` – route-level views grouped by feature (`contests/`, `contests/contest/`, `contests/create/`, `auth/`, `landing/`, `learn/`, `join/`, `contact/`, `privacy/`, `terms/`, `error/`).
  - `components/` – reusable presentational + container components grouped by area (`common/`, `contest/`, `header/`, `footer/`, `join/`, `landing/`, `learn/`, `contact/`, `toast/`).
  - `features/` – Redux Toolkit slices, thunks, and selectors, one folder per domain (`contests/`, `stats/`, `toast/`, `ws/`).
  - `app/store.ts` – `configureStore` composition root; exports `RootState`, `AppDispatch`, `AppStore` types.
  - `service/` – HTTP/WS clients that wrap `axios` / `react-use-websocket` and call the backend (`contestService.ts`, `statsService.ts`, `wsService.ts`, plus `handleError.ts`).
  - `axios/api.ts` – the shared `axios` instance used by every service.
  - `hooks/` – custom React hooks (`reduxHooks` for typed `useDispatch`/`useSelector`, `useAxiosAuth`, `useContestWebSocket`, `useToast`, `useScrollAnimation`).
  - `types/` – shared TypeScript types and design tokens (`contest.ts`, `stats.ts`, `ws.ts`, `error.ts`, `gradients.ts`).
  - `utils/` – pure helpers (`contestStatus`, `oidcHelpers`, `sanitize`).
  - `setupTests.ts` – Vitest + jest-dom global setup.
- `public/` – static assets served as-is (`site.webmanifest`, icons).
- `Dockerfile`, `nginx.conf` – production container that serves the built SPA via NGINX with SPA fallback.
- `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `tsconfig*.json`, `.prettierrc` – tooling config.

## Tooling

- Package manager: **npm**.
- Build/dev: **Vite** (`npm run dev`, `npm run build`, `npm run preview`). The build runs `tsc -b` before `vite build`.
- Lint: **ESLint** flat config with `typescript-eslint` and React hooks plugins (`npm run lint`).
- Format: **Prettier** (`npm run format`); enforced on commit via **Husky + lint-staged**.
- Type check: `npm run type-check` (uses `tsc --noEmit`).
- Tests: **Vitest** + **@testing-library/react** + **jest-dom** + **jsdom** (`npm run test`, `npm run test:watch`, `npm run test:coverage`).

Coverage thresholds are enforced at **45%** for lines / branches / functions / statements in [vitest.config.ts](vitest.config.ts). Keep them passing.

## Code style

- React components are function components in `.tsx` files, exported as `default` from page files and as named exports from shared components.
- Props: declare with a local `interface Props { ... }` and `({ ... }: Props)` destructuring. Don't export `Props` unless reused.
- Use **MUI v7** (`@mui/material`, `@mui/icons-material`) for UI primitives and styling. Prefer the `sx` prop and theme tokens over ad-hoc CSS; gradients live in [src/types/gradients.ts](src/types/gradients.ts).
- Hooks live in `src/hooks/` and are named `useXxx`. Always use the typed `useAppDispatch` / `useAppSelector` from [src/hooks/reduxHooks.ts](src/hooks/reduxHooks.ts) — never the raw `react-redux` hooks.
- Avoid comments unless the code is genuinely non-obvious.
- Never type with `any`; use `unknown` if the type is truly unknown.
- Sanitize any user-controlled string that ends up in the DOM via [src/utils/sanitize.ts](src/utils/sanitize.ts).

## Routing & pages

- Routes are registered in [src/main.tsx](src/main.tsx) with `createBrowserRouter`. All routes render under the `App` layout and share the `ErrorFallback` boundary.
- New top-level views: add a `XxxPage.tsx` under `src/pages/<area>/` and a child route in `main.tsx`. Use `<Link>` / `<NavLink>` from `react-router-dom` for in-app navigation, and `useNavigate()` from event handlers.
- The 404 fallback is `NotFoundPage` matched on `path: '*'`.

## State, services & data flow

The app follows a strict **page/component → hook → service → backend** flow with Redux Toolkit as the cache:

- **Slices** live in `src/features/<domain>/<domain>Slice.ts` and own normalized state, reducers, and `extraReducers` for thunks.
- **Thunks** live alongside as `<domain>Thunks.ts`. Thunks call functions in `src/service/`, never `axios` directly.
- **Selectors** live as `<domain>Selectors.ts` and are the only way components read slice state.
- **Services** (`src/service/*.ts`) wrap the shared `axios` instance from [src/axios/api.ts](src/axios/api.ts) and translate raw HTTP into typed responses. They throw `Error` instances; thunks call `handleError` from [src/service/handleError.ts](src/service/handleError.ts) to convert to a user-facing message.
- The store is configured in [src/app/store.ts](src/app/store.ts); register new slice reducers there.

## Authentication

- OIDC is configured in [src/main.tsx](src/main.tsx) (`oidcConfig` → `AuthProvider`) and uses `oidc-client-ts` with `WebStorageStateStore` on `localStorage`.
- [src/hooks/useAxiosAuth.ts](src/hooks/useAxiosAuth.ts) wires the current OIDC access token into the shared `axios` instance and refreshes it on token change. It is mounted exactly once in `App.tsx`.
- `App.tsx` runs a silent sign-in on load when a refresh token is present, and surfaces interactive sign-in failures via the toast system.
- Components read auth state with `useAuth()` from `react-oidc-context`. Helpers in [src/utils/oidcHelpers.ts](src/utils/oidcHelpers.ts) extract claims (display name, etc.) from the OIDC user.

## Real-time / WebSockets

- The contest detail page subscribes to live updates via [src/hooks/useContestWebSocket.ts](src/hooks/useContestWebSocket.ts), built on `react-use-websocket`.
- Connection state and inbound messages are reduced into the `ws` slice ([src/features/ws/wsSlice.ts](src/features/ws/wsSlice.ts)). Components react via selectors; do not read from the socket directly.
- WS message types are defined in [src/types/ws.ts](src/types/ws.ts). When the backend adds a new event subject, add the matching discriminated-union variant here and handle it in `wsSlice.ts`.

## Toasts & UX

- The toast system is a Redux slice ([src/features/toast/toastSlice.ts](src/features/toast/toastSlice.ts)) consumed by `ToastProvider` and triggered via the `useToast` hook. Always use `showToast(message, severity)` rather than rendering snackbars ad hoc.
- Scroll/visibility animations use [src/hooks/useScrollAnimation.ts](src/hooks/useScrollAnimation.ts) (IntersectionObserver-based, with a graceful fallback when the API is missing).

## Testing

- Tests are colocated next to the source file as `Foo.test.ts` / `Foo.test.tsx` and run with Vitest in jsdom. Globals are enabled (`describe`, `it`, `expect`).
- Use `@testing-library/react` (`render`, `screen`, `fireEvent`, `waitFor`) and `@testing-library/jest-dom` matchers (set up in [src/setupTests.ts](src/setupTests.ts)).
- Component tests that depend on Redux should wrap in a real store via `Provider` (or a per-test `configureStore` with the relevant slice reducer). Don't mock the slice — exercise the reducer.
- Service tests should mock the `axios` instance from `src/axios/api.ts`, not `axios` itself.
- Hook tests use `renderHook` from `@testing-library/react`. For OIDC-dependent hooks, mock `useAuth` from `react-oidc-context`.
- When mocking browser APIs (`IntersectionObserver`, `WebSocket`, `matchMedia`), restore the original on `afterEach`.
- Run `npm run test:coverage` before committing changes that touch `src/`. The build will fail if any coverage metric drops below 45%.

## Deployment

- Production builds emit static assets to `dist/` and are served by NGINX via the provided [Dockerfile](Dockerfile) + [nginx.conf](nginx.conf).
- Keep the SPA fallback (`try_files ... /index.html`) in `nginx.conf` intact — removing it breaks client-side routing.
- The Helm chart lives in the sibling `charts/squares/` workspace folder. Don't change the chart from this repo unless explicitly asked — coordinate via that workspace.

## Commit conventions

Use conventional commits. Common types and scopes for this repo:

- Types: `feat`, `fix`, `refactor`, `chore`, `ci`, `docs`, `test`, `style`.
- Scopes (optional): `pages`, `components`, `features`, `hooks`, `service`, `store`, `auth`, `ws`, `toast`, `tests`, `build`, `deploy`.

Example: `feat(pages): add search input to ContestsPage`.

Always run `npm run lint`, `npm run type-check`, and `npm run test` before committing.
