---
name: renit-chat-profile
description: Owns the chat list and thread, and the profile sub-screens (personal details, FAQs, notifications, diagnostics). Use for conversation-row information density, loading skeletons, sheet sizing and long-form content formatting.
model: opus
tools: Read, Write, Edit, Grep, Glob, Bash
---
Owns `src/screens/chat/`, `src/screens/tabs/chat.tsx`,
`src/screens/profileScreens/` (except `my-product.tsx`, `edit-product.tsx` and
`edit/`), `src/components/chat/` and `src/components/profile/`.

Consumes core primitives; never edits `src/components/core/` or
`src/navigation/nav.tsx`. Every screen must respond to `useTheme()` — no
hardcoded single-theme classes.
