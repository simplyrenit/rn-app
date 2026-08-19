# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Agentic Development Contract

### Environment and data boundaries

- Use the QA backend for all development, build, and device-QA work. Do not start, configure, or fall back to a local backend unless the user explicitly asks.
- Set `EXPO_PUBLIC_APP_ENV=QA` and use the tracked QA environment template. Do not point QA work at production.
- QA credentials belong only in `config/environments/qa-test-accounts.local.json`. Never print, stage, commit, or upload that file.
- Create, modify, or delete only QA fixtures labelled `AGENT_QA_<run-id>`. Clean up those fixtures when the tested flow permits; never mutate unlabelled QA data.

### Roles and orchestration

The main thread owns user communication, scope decisions, and the final result. It coordinates agents in this order: delivery, quality gate, device QA, release preflight, then (only after a fresh human approval) local TestFlight release operation.

| Role | Model | Responsibility |
| --- | --- | --- |
| Main orchestrator | `gpt-5.6-terra` high | Scope work, dispatch agents, reconcile handoffs, and communicate with the user. |
| Delivery agent | `gpt-5.6-terra` high | Trace ownership, implement the smallest correct change, and verify it. |
| Quality-gate agent | `gpt-5.6-sol` high | Independently review the scoped diff and verification evidence; read-only unless asked to fix. |
| Device-QA agent | `gpt-5.6-luna` high | Run QA-only Android/iPhone validation and collect evidence. |
| Local TestFlight release operator | `gpt-5.6-terra` high | Create a QA-only local Xcode archive and perform explicitly approved App Store Connect/TestFlight actions. |

- Device QA is disabled until `gpt-5.6-luna` is available. Do not silently substitute another model.
- The quality gate must identify findings before proposing a fix and must not expand the delivery scope.
- The release preflight is read-only. It never runs an EAS build, publishes an update, submits a store build, or changes credentials.
- The local TestFlight release operator is the only role that may archive or upload. It never uses EAS for this workflow and requires a passing release preflight plus action-time human approval.

### Skill routing

- Use `renit-dev-bootstrap` before local QA work. It owns QA runtime, native workspace, and iPhone readiness checks.
- Use `renit-quality-gate` after delivery and before device QA. It is independent and read-only.
- Use `renit-push-diagnostics` for a QA push failure. It traces the full entitlement-to-device delivery chain before delivery changes code.
- Use `renit-release-preflight` before every store/TestFlight request. It is read-only.
- Use `renit-local-testflight-release` only after preflight and explicit approval to archive or upload a QA build.

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

- Ask before trusting or importing an Apple developer certificate, completing OAuth, accepting iOS permission prompts, using biometrics or payments, changing signing, accessing credentials, creating an Xcode archive, uploading to App Store Connect, declaring export compliance, assigning a tester group, submitting Beta App Review, creating an EAS build, or releasing to production.
- iPhone v1 supports Xcode/devicectl build, install, launch, and log collection. It does not promise autonomous interaction with system prompts or external sign-in screens.

## Project Overview

**Renit** is a React Native rental marketplace app built with Expo SDK 51. Users can list products for rent, browse nearby listings, message owners, and leave reviews.

## Common Commands

- `expo start` — Start the Expo dev server
- `expo run:android` — Build and run on Android
- `expo run:ios` — Build and run on iOS
- `jest --watchAll` — Run tests (jest-expo preset)
- `eas build` — Build with Expo Application Services

No linter is configured.

## Architecture

### Path Alias

`@/*` maps to `src/*` (configured in tsconfig.json and babel.config.js).

### Source Structure (`src/`)

- **navigation/nav.tsx** — Single file defining all navigation: bottom tab navigator (Home, Saved, Post, Chat, Profile) with nested native stack navigators for sub-flows (auth, product details, post flow, profile screens, chat details, etc.)
- **context/** — Three React Contexts for state management:
  - `global-context.tsx` — Auth tokens, user data, theme (device/dark/light), categories
  - `auth-context.tsx` — Registration data during signup flow
  - `product-context.tsx` — Product data during the create/edit posting flow
- **backend/** — Custom hooks and API functions organized by feature (useHome, useSaved, auth, post, product, chat, reviews, search, profile, owner, messages, notifications). These wrap axios calls and React Query queries.
- **screens/** — Screen components organized by feature area: `auth/`, `tabs/` (5 main tabs), `products/`, `chat/`, `users/`, `post-screens/` (multi-step product posting), `profileScreens/`
- **components/** — Reusable components: `core/` (Button, Card, Text, Accordion, etc.), plus feature-specific folders (home, product, post, profile, search, chat, modals)
- **lib/** — Utilities and configuration:
  - `config.ts` — API endpoints, Firebase config, server URLs, client IDs
  - `types.ts` — TypeScript types including `RootStackParamList`, navigation helpers
  - `networkUtils.ts` — Axios instance with JWT refresh token interceptor and retry logic
  - `auth-fns.ts` — AsyncStorage helpers for auth token persistence
  - `categories.ts`, `content.ts` — Static data
- **services/** — Socket.io client for real-time chat, user query helpers
- **icons/** — Custom SVG icon components
- **functions/** — Firebase Cloud Functions (separate TypeScript project with its own tsconfig)

### Key Patterns

**Navigation**: Use `useTypedNavigation` from `@/lib/types` for type-safe navigation. Access route params with `useRoute<RouteProps<"ScreenName">>()`. All screen names and their params are defined in `RootStackParamList` in `lib/types.ts`.

**Data Fetching**: React Query v3 (`react-query`) with `axiosInstance` from `lib/networkUtils.ts`. The axios instance has interceptors that auto-refresh JWT tokens on 401 responses. Unauthenticated requests use the static `ACCESS_TOKEN` from config.

**Styling**: NativeWind v2 (Tailwind CSS for React Native). Custom brand color: `brand-blue` (#635BE8) defined in `tailwind.config.js`.

**API Server Modes**: `src/lib/config.ts` resolves Dev, QA, and Prod from `EXPO_PUBLIC_*` values and Expo configuration. Agentic workflows use QA only.

### Tech Stack

- React Native 0.74 + Expo SDK 51
- React Navigation v6 (bottom tabs + native stack)
- React Query v3 + Axios
- NativeWind v2 (Tailwind)
- Firebase (auth, firestore, storage, cloud functions)
- Socket.io for real-time chat
- Google Maps, Google/Apple Sign-in
- Expo Notifications (push)
