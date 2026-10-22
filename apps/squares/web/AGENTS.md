# AGENTS

## Project Context

- Project: Squares UI (`apps/squares/web` in `github.com/maxmorhardt/maxhq`)
- Language: TypeScript, React 19
- Purpose: Frontend for a real-time football squares pool. React Router (framework mode, SPA with a few prerendered pages), MUI v9, Redux Toolkit with RTK Query, OIDC sign-in, and server-sent events from the realtime service.
- Target environments: Static bundle served by NGINX in a container on Kubernetes.
- Related: `../contests`, `../games`, `../accounts`, `../realtime` (the backend services), the chart `charts/squares`, `gitops` (the Argo CD Applications), `workflows` (shared CI).

## Repository Layout

- `src/root.tsx`, `src/routes.ts` - the document shell and the route table. Every route module lives in `src/pages/`.
- `src/app/` - app wiring: `AppLayout` (header, footer, outlet, toasts, session upkeep), `providers.tsx`, `store.ts` (`makeStore`, `RootState`, `AppDispatch`), `hooks.ts` (typed `useAppDispatch`/`useAppSelector`), `theme.ts`, `global.css`.
- `src/api/` - talking to the backend:
  - `baseApi.ts` - the one RTK Query `createApi`; features add endpoints with `injectEndpoints`.
  - `baseQuery.ts` - bearer token, an `Idempotency-Key` on every write, retries for network errors and 502/503/504 (and 409 with `Retry-After`) under the same key, one session refresh on a 401.
  - `errors.ts` - every failure becomes an `ApiError { status, message }`; use `errorMessage`/`errorStatus` to read one.
  - `eventStream.ts` - the generic server-sent event client (fetch + `eventsource-parser`): fresh token per connection, `Last-Event-ID` resume, backoff, a heartbeat watchdog, and an immediate retry when the tab becomes visible or the network returns.
- `src/auth/` - `userManager.ts` (the single oidc-client-ts `UserManager`), `token.ts` (`getIdToken` refreshes a token that is expiring or stale; concurrent callers share one refresh), `useAuthSession.ts`, `RequireAuth.tsx`, `oidc.ts`, `SignInDialog.tsx`.
- `src/features/<domain>/` - one folder per domain (`contests`, `profile`, `leaderboard`, `landing`, `learn`, `join`, `contact`, `toast`). Each holds its `api.ts` (endpoints and generated hooks) and `components/`.
- `src/features/contests/live/` - the live contest: `events.ts` (the event union and parser), `liveContestSlice.ts` (snapshot plus one handler per event type, and write responses applied ahead of their events), `activity.ts` (the activity feed), `useContestStream.ts`, `selectors.ts`, `viewer.ts`.
- `src/components/` - shared, domain-free UI: `layout/` (header, footer), `feedback/` (`ErrorState`, `LoadingScreen`, `ConfirmDialog`, `ErrorBoundary`), `errors/` (401/403/404 views), `PageTitle` (the condensed headline each top-level page opens with), `Reveal` (fade up on first scroll into view), `inputs.ts`, `animations.ts`.
- `src/hooks/` - generic hooks (`useDebouncedValue`, `useInfiniteScroll`, `useScrollAnimation`).
- `src/types/` - the API contract types. `src/utils/` - pure helpers.
- `src/test/` - `renderWithProviders`, `mockAuth`, `mockMutation`, `stubFetch`, and fixtures.

## Look and Feel

- `src/app/theme.ts` owns the game-night palette as `game` (midnight field, the squares blue as `brand`, `gold` for winners only, `go` green for success) and the type pair in `fonts`: Barlow for body, Barlow Condensed for headlines, team names, and every scoreboard digit (`fontVariantNumeric: 'tabular-nums'`). Fonts are self-hosted from `@fontsource` and imported in `root.tsx`.
- Read colors from the theme or `game`, not new hex values. On the board: open squares are outlined, others' squares are raised, yours are `brand`, winners are `gold`.
- Every animation has a `prefers-reduced-motion` escape.

## Where Things Go

- **Pages are thin.** A page reads route params, sets the `<Helmet>` title, gates on auth, and renders one feature container. No data fetching or business rules in `src/pages/`.
- **Feature containers own data.** A container (`LiveContest`, `ContestsBrowser`, `Profile`, `Standings`, `JoinInvite`) calls RTK Query hooks or live selectors and handles its loading, error, and empty states.
- **Everything below a container takes props.** Pass the domain objects (`contest`, `participants`, `viewer`) down. Presentational components never read the store; a component only calls a mutation hook for the action it owns (a button that starts the game calls `useStartContestMutation`).
- **Read the store with selectors, never by drilling through more than one container.** Server data comes from RTK Query hooks; the only hand-written slices are `liveContest` (stream-fed state) and `toast` (UI state). Do not add a slice for data an endpoint can cache.
- **Derived data is computed, not stored.** `getContestViewer` works out who the user is in a contest once; pass the result down rather than recomputing it in children.
- **Logic-heavy flows go in a hook next to the feature** (`useAccountDeletion`), keeping the component a view.

## Render Order

Every page resolves its states in the same order, so the conditional rendering never gets tangled:

1. Auth, through `RequireAuth`: redirecting, then restoring the session (the page passes its skeleton as `fallback`), then signed out (`UnauthorizedError`, or a custom `unauthenticated` view), then the page.
2. Data, inside the container: terminal errors (403/404), then loading (skeleton), then errors with a retry, then empty, then content.

## Live Contest Stream

- The realtime service sends a `contest.snapshot` on connect (or only the missed events on resume), then one typed event per change. Every event is `{ type, contestId, updatedBy, timestamp, data }`.
- To add an event type: add it to the backend in `libs/go/squares/events`, then add it to the `ContestEvent` union and `KNOWN_TYPES` in `live/events.ts`, and add its handler in `eventHandlers` in `liveContestSlice.ts`. The types make a missing handler a compile error. Add a feed line in `activity.ts` if it should show in the activity feed.
- Handlers must be idempotent: the same change can arrive as a write's response and again as its event, and a resume can replay events. Squares and contests carry a `version`; never apply an older one.
- Side effects (toasts, navigation, the winner dialog) go in the `onEvent` callback a container passes to `useContestStream`, never in a reducer.
- Unknown event types are skipped so the server can ship a new event first. A garbled event resyncs from a fresh snapshot. A 409 on a claim calls `resync`.

## Agent Instructions

- Make the smallest safe change that solves the requested problem, and keep it inside existing feature boundaries.
- Function components in `.tsx`. Route modules and components `export default`; hooks and helpers use named exports.
- Props go in a local `interface Props { ... }`. Do not export `Props` unless it is reused.
- Never type with `any`; use `unknown` when the type is genuinely unknown.
- Every server call is an RTK Query endpoint. Never call `fetch` from a component; the event stream is the only other network path.
- Handle a mutation's failure where it was triggered: `await mutate(args).unwrap()` in a `try`, then `showToast(errorMessage(err, 'fallback'), 'error')` or render `error` inline in a dialog.
- Sanitize user-entered text that reaches the DOM or the API with `src/utils/sanitize.ts`.
- Avoid comments unless the code is genuinely non-obvious. When you do comment: **one line, lowercase, explaining why**. In JSX use section markers the same way (`{/* hero section */}`). No multi-line blocks, and no header comment that restates a name.
- **Always brace control statements.** Enforced by the `curly` ESLint rule. The React hooks rules run in full; do not disable them.
- Keep the SPA fallback (`try_files ... /index.html`) in `nginx.conf` intact.
- The Helm chart is `charts/squares` in this repo. A change that needs a chart change makes it in the same PR; the chart releases as `squares-chart`.

## New Page Checklist

1. Add the route module `src/pages/XxxPage.tsx` and register it in `src/routes.ts`.
2. Put the UI in `src/features/<domain>/components/`, with a container that owns the data.
3. Add endpoints to `src/features/<domain>/api.ts` with `baseApi.injectEndpoints`, and add a tag to `baseApi.ts` if the data needs invalidating.
4. Wrap signed-in pages in `RequireAuth` with a skeleton `fallback`.
5. Add colocated tests, then run `pnpm lint`, `pnpm type-check`, and `pnpm test:coverage`.

## Testing Guidance

- Tests are colocated as `Foo.test.ts(x)`, one per source file, and run under Vitest in jsdom.
- Render with `renderWithProviders` from `src/test/render.tsx`; it gives a fresh real store, router, theme, and helmet, and returns the `store` so a test can assert on toasts.
- Mock `react-oidc-context` with `vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }))` and set the user with `mockAuth({ email })`.
- Mock a feature's hooks while keeping its real exports: `vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }))`, with `mockMutation(result)` for mutation tuples.
- Endpoint and base query tests use `stubFetch` and dispatch `endpoint.initiate(...)` on `makeStore()`.
- Coverage is gated at **80%** for lines, branches, functions, and statements. Do not lower a threshold to get a build green.

## Dependency Checklist

- Can React, MUI, Redux Toolkit, or an existing helper do it?
- Does it duplicate something already in the tree?
- What does it add to the shipped bundle?
- Only direct dependencies may be imported (pnpm strict resolution). `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`, so a version published in the last 24 hours is refused.

## Tooling

- Package manager is **pnpm**, pinned by `packageManager`. `npm` and `yarn` are blocked. Enable with `corepack enable`.
- `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm test:coverage`, `pnpm format`.
- Prettier and ESLint run on commit through lint-staged, from the repo's `.githooks/pre-commit`.

## Commit Tags

Conventional commits, enforced on PR titles and consumed by release-please. Scope is `squares`.

- `feat`: new user-facing capability (minor release). `fix`: wrong behavior or a regression (patch release).
- `refactor`, `chore`, `ci`, `docs`, `test`, `style`: no release on their own.

## Non-Goals for Routine Changes

- Large refactors without a clear user-facing benefit.
- A hand-written slice or thunk for server data.
- Reading the event stream outside `useContestStream`.
- Lowering a coverage threshold or disabling a lint rule to get a build green.
- Editing the Argo CD Application from this repo.
