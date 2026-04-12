# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**API Server Modes**: `DEV_MODE` in `lib/config.ts` toggles between production (`api.simplyrenit.com`) and local dev (`192.168.1.12:8000`) servers.

### Tech Stack

- React Native 0.74 + Expo SDK 51
- React Navigation v6 (bottom tabs + native stack)
- React Query v3 + Axios
- NativeWind v2 (Tailwind)
- Firebase (auth, firestore, storage, cloud functions)
- Socket.io for real-time chat
- Google Maps, Google/Apple Sign-in
- Expo Notifications (push)
