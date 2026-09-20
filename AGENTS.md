# AGENTS.md

Guidance for AI coding agents working in this repository. This is the single
source of truth: `CLAUDE.md` imports it, so Claude Code and other agents follow
the same contract. Edit this file, not `CLAUDE.md`.

## Agentic Development Contract

### Environment and data boundaries

- Use the QA backend for all development, build, and device-QA work. Do not
  start, configure, or fall back to a local backend unless the user explicitly
  asks.
- Set `EXPO_PUBLIC_APP_ENV=QA` and use the tracked QA environment template
  (`config/environments/qa.env.example`). Do not point QA work at production.
- QA credentials belong only in `config/environments/qa-test-accounts.local.json`
  (git-ignored). Never print, stage, commit, or upload that file, and never
  copy real API keys out of `config/environments/qa.env` into tracked files.
- Create, modify, or delete only QA fixtures labelled `AGENT_QA_<run-id>`.
  Clean up those fixtures when the tested flow permits; never mutate
  unlabelled QA data.

### Roles and orchestration

The main thread owns user communication, scope decisions, and the final
result. It coordinates work in this order: delivery, quality gate, device QA,
release preflight, then (only after a fresh human approval) local TestFlight
release operation.

| Role | Runs as | Responsibility |
| --- | --- | --- |
| Main orchestrator | main thread | Scope work, dispatch skills/agents, reconcile handoffs, and communicate with the user. |
| Delivery | `renit-feature-delivery` skill | Trace ownership, implement the smallest correct change, and verify it. |
| Quality gate | `renit-quality-gate` skill | Independently review the scoped diff and verification evidence; read-only unless asked to fix. |
| Device QA | `renit-device-qa` skill / `android-tester` subagent (Android) / main thread (iPhone) | Run QA-only device validation and collect evidence. |
| Local TestFlight release operator | `renit-local-testflight-release` skill | Create a QA-only local Xcode archive and perform explicitly approved App Store Connect/TestFlight actions. |

- Run the quality gate in a separate subagent so the review is independent of
  the thread that wrote the change.
- The quality gate must identify findings before proposing a fix and must not
  expand the delivery scope.
- The release preflight (`renit-release-preflight`) is read-only. It never
  runs an EAS build, publishes an update, submits a store build, or changes
  credentials.
- The local TestFlight release operator is the only role that may archive or
  upload. It never uses EAS for this workflow and requires a passing release
  preflight plus action-time human approval.

### Skill routing

Skills live in `plugins/renit-agentic-dev/skills/` (and are mirrored under
`.claude/skills/`); feature-area subagents live in `.claude/agents/`.

- `renit-dev-bootstrap` — before local QA work. Owns QA runtime, native
  workspace, and device readiness checks.
- `renit-quality-gate` — after delivery and before device QA. Independent and
  read-only.
- `renit-push-diagnostics` — for a QA push failure. Traces the full
  entitlement-to-device delivery chain before delivery changes code.
- `renit-release-preflight` — before every store/TestFlight request.
  Read-only.
- `renit-local-testflight-release` — only after preflight and explicit
  approval to archive or upload a QA build.

### Required handoff

Every delegated role returns:

```text
Scope:
Files changed or reviewed:
QA environment and device:
Commands run and result:
Evidence:
Known limitations:
Decision needed from main thread:
```

### Human approval gates

Ask before trusting or importing an Apple developer certificate, completing
OAuth, accepting iOS permission prompts, using biometrics or payments,
changing signing, accessing credentials, creating an Xcode archive, uploading
to App Store Connect, declaring export compliance, assigning a tester group,
submitting Beta App Review, creating an EAS build, or releasing to production.

Standing exception: `.github/workflows/testflight-qa.yml` archives and uploads
a QA build to TestFlight on every merge to `main` with no per-run approval. The
user authorised this durably; merging to `main` is the approval. It covers only
that workflow, only QA (`qa-api.toratora.site`), and only the archive/upload
step. Agents still ask before any *local* archive or upload, and before
changing the workflow's signing, secrets, or QA pinning. Export compliance and
tester-group assignment stay human even for CI builds.

iPhone v1 supports Xcode/devicectl build, install, launch, and log collection.
It does not promise autonomous interaction with system prompts or external
sign-in screens.

## Project Overview

**Renit** is a React Native rental-marketplace app built with Expo SDK 51.
Users list products for rent, browse nearby listings, message owners in real
time, and leave reviews. This repository contains the mobile app plus its
Firebase Cloud Functions; the REST/WebSocket backend is a separate project
(the app talks to it over HTTPS and a WebSocket chat endpoint).

## Tech Stack

- React Native 0.74.5 + Expo SDK 51 (`~51.0.39`), React 18.2, TypeScript
  ~5.3.3 (`strict: true`, extends `expo/tsconfig.base`)
- React Navigation v6 (bottom tabs + native stack)
- React Query v3 (the `react-query` package) + Axios
- NativeWind v2 (Tailwind CSS for React Native), tailwindcss 3.3.2
- Firebase via `@react-native-firebase/*` v21.14 (app, app-check, auth,
  firestore, storage) — native modules, so **Expo Go does not work**; use
  development builds
- Real-time chat runs on Firestore (`src/backend/chat.tsx`); the backend's
  WebSocket endpoint (`wsBaseUrl` in `src/lib/config.ts`) and the
  `socket.io-client` dependency are no longer used by the app
- Google Maps (`react-native-maps`), Google/Apple Sign-in, Expo Notifications
- Firebase Cloud Functions in `functions/` (Node 22, TypeScript 4.9, separate
  npm project; a Firestore `onNewMessage` CloudEvent trigger that fans out
  chat notifications)

## Build and Run Commands

```bash
npm start                 # Expo/Metro dev server
npm run start:qa          # Metro with QA env files loaded (standard agentic workflow)
npm run android           # Native Android dev build (expo run:android)
npm run ios               # Native iOS dev build (macOS only)
npm test                  # Jest in watch mode (jest-expo preset)
npm run build:qa          # EAS Android QA APK (eas build --profile qa)
```

- `npm install` runs `patch-package` via `postinstall`; patches live in
  `patches/` (expo-dev-menu, expo-device, react-native-country-picker-modal).
- iOS: always open `ios/Renit.xcworkspace` (not `.xcodeproj`); run
  `cd ios && pod install` after dependency changes.
- Restart Metro after changing any `EXPO_PUBLIC_*` value or any file in
  `config/environments/`.
- No linter is configured. TypeScript strict mode is the static check;
  `npx tsc --noEmit` type-checks the app.
- Firebase Functions are built/deployed separately: `cd functions &&
  npm install && npm run build` (or `npm run deploy`). The default Firebase
  project is `renit-production` (see `.firebaserc`) — do not deploy functions
  without explicit approval.

### Native smoke test

`scripts/smoke-native-build.sh [Debug|Release] [seconds]` launches a built
iOS simulator binary and fails on missing-native-module/fatal-render log
signatures. Run it before handing an iOS build to QA — compiling is not
evidence the app runs.

## Environments and Configuration

Three runtime environments are resolved in `src/lib/config.ts` from
`EXPO_PUBLIC_*` variables and Expo config:

| Environment | API host | Intended use |
| --- | --- | --- |
| DEV | local backend (`EXPO_PUBLIC_LOCAL_API_HOST`, default `10.0.2.2:8000` on Android emulator) | Deliberate local-backend work only |
| QA | `qa-api.toratora.site` | All development, build, and device-QA work |
| PROD | `api.simplyrenit.com` | Customer release builds |

- `config/environments/` holds the env files (`qa.env`, `dev.env.example`,
  `qa.env.example`, `qa-test-accounts.*.json`). `qa.env` and
  `*.local.json` are git-ignored and may contain secrets.
- `EXPO_PUBLIC_*` values are embedded in the app bundle — never put secrets
  in them (the QA Google Maps key is the deliberate exception; keep it in the
  git-ignored `qa.env`).
- `app.config.js` wraps `app.json`: with `EXPO_PUBLIC_APP_ENV=QA` it renames
  the app to "Renit QA", switches the Android package to `com.renit.app.qa`,
  uses `android/app/src/qa/google-services.json`, and points at the QA EAS
  project. `src/lib/config.ts` also detects the QA Android package at runtime.
- Debug builds default to QA; local API use is opt-in via
  `EXPO_PUBLIC_APP_ENV=DEV` + `EXPO_PUBLIC_USE_LOCAL_API=true`.
- EAS build profiles (`eas.json`): `development`, `qa` (Android APK,
  `:app:assembleQa`), `testflight-qa`, `release`. Keep the QA host in
  `eas.json` in sync with `config/environments/qa.env.example`.

## Code Organization

Path alias: `@/*` maps to `src/*` (configured in both `tsconfig.json` and
`babel.config.js` — keep them in step).

- `App.tsx` — root providers: React Query client (created once at module
  scope), gesture handler, bottom-sheet, fonts, Google Sign-in config,
  contexts, toast.
- `src/navigation/nav.tsx` — single file defining all navigation: bottom tab
  navigator (Home, Saved, Post, Chat, Profile) with nested native-stack
  navigators for sub-flows (auth, product details, post flow, profile
  screens, chat details).
- `src/lib/types.ts` — `RootStackParamList` (every screen name and its
  params), `useTypedNavigation()`, `RouteProps<T>`. Use these for type-safe
  navigation and route params; never navigate with raw strings.
- `src/context/` — three React Contexts: `global-context` (auth tokens, user
  data, theme, categories), `auth-context` (registration data during signup),
  `product-context` (data during the create/edit posting flow).
- `src/backend/` — custom hooks and API functions by feature (useHome,
  useSaved, auth, post, product, chat, reviews, search, profile, owner,
  messages, notifications). These wrap Axios calls and React Query queries.
- `src/lib/` — utilities and configuration:
  - `config.ts` — environment resolution, API endpoints, client IDs.
  - `networkUtils.ts` — Axios instance with JWT refresh-token interceptor and
    retry logic.
  - `auth-fns.ts` — AsyncStorage helpers for auth-token persistence.
  - `theme.ts` / `design-tokens.ts` — theme hook and design tokens.
  - `categories.ts`, `content.ts` — static data.
- `src/services/` — user query helpers.
- `src/screens/` — screens by feature area: `auth/`, `tabs/` (5 main tabs),
  `products/`, `chat/`, `users/`, `post-screens/` (multi-step posting),
  `profileScreens/`.
- `src/components/` — reusable components: `core/` (Button, Card, Text,
  Accordion, toast, etc.) plus feature folders (home, product, post, profile,
  search, chat, modals, auth).
- `src/icons/` — custom SVG icon components.
- `functions/` — Firebase Cloud Functions (own `package.json`/`tsconfig`).
- `android/`, `ios/` — generated native projects, checked in (bare-workflow
  style). QA-specific Android resources live under `android/app/src/qa/`.

## Code Style and Conventions

- TypeScript strict mode; functional components and hooks throughout.
- Styling is NativeWind v2: it resolves classes by scanning **literal
  strings**, so never build a class name by interpolation. Theme-dependent
  colors exist twice (`bg-surface-light` / `bg-surface-dark`) and are chosen
  with a ternary over two literals; where a style object is already in reach,
  prefer `useTheme()` from `src/lib/theme.ts`.
- `tailwind.config.js` mirrors `src/lib/design-tokens.ts` — change both
  together. Brand color `brand` / `brand-blue` is `#635BE8`; the app font is
  Plus Jakarta Sans (weights exposed as `font-light` … `font-bold`).
- Comments in this codebase tend to explain *why* (including past failure
  modes), not *what* — match that. When you change behavior, update comments
  that describe the old behavior.
- Data fetching: React Query v3 API (`useQuery`, `useMutation`, `queryClient`
  from `react-query`), always through `axiosInstance` from
  `src/lib/networkUtils.ts`, which handles JWT refresh on 401s. Unauthenticated
  requests use the static `ACCESS_TOKEN` from `src/lib/config.ts`.
- Make the smallest correct change; do not opportunistically refactor,
  reformat, or rename unrelated code.

## Testing

- Jest is configured with the `jest-expo` preset (`npm test` runs
  `--watchAll`); there is currently no committed test suite, so verification
  relies on type-checking, the native smoke script, and device QA.
- QA method is documented in `docs/qa-e2e-strategy.md`; device QA runs
  against the QA backend only, with fixtures labelled `AGENT_QA_<run-id>`.
- After any JS dependency bump that ships a native module, do a full native
  rebuild and run `scripts/smoke-native-build.sh` — this exact failure mode
  (ExpoBlur declared but never compiled) shipped once and red-screened on
  launch.

## Security Considerations

- Never commit or print `config/environments/qa-test-accounts.local.json`,
  `config/environments/qa.env`, or any credential. Templates (`*.example`)
  are the only tracked variants.
- `android/app/google-services.json`, `ios/Renit/GoogleService-Info.plist`,
  and the Google OAuth client IDs in `src/lib/config.ts` are tracked
  Firebase/Google client configuration, not secrets — but treat them as
  read-only unless the task is specifically about Firebase config.
- `firestore.rules` restricts conversations/messages to participants; run
  changes to it through the quality gate and deploy only with approval.
- Auth tokens are stored in AsyncStorage via `src/lib/auth-fns.ts`; the Axios
  interceptor refreshes JWTs automatically — do not hand-roll token handling
  in feature code.

## Documentation

- `README.md` — quick start.
- `docs/local-development.md` — environment matrix, running the app,
  connected-iPhone QA loop, local-backend table, builds, troubleshooting.
- `docs/qa-e2e-strategy.md` — QA method: test modes, preconditions, severity
  scale, exit criteria.
- `docs/qa-production-revalidation.md` — release-readiness baseline, blockers
  and the P0/P1 ledger (July 2026; needs re-baselining).
- `docs/beta-launch-guide.md` — app-side beta distribution steps.
- `docs/known-issues.md` — diagnosed recurring failures and testing gotchas.
  Check it before guessing at a failure.
