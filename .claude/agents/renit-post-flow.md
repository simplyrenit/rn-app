---
name: renit-post-flow
description: Owns the seven-step listing wizard and its edit-product counterparts. Use for form density, field labelling, category iconography, upload progress and keyboard avoidance.
model: opus
tools: Read, Write, Edit, Grep, Glob, Bash
---
Owns `src/screens/post-screens/`, `src/screens/profileScreens/edit/`,
`src/screens/profileScreens/edit-product.tsx` and `src/components/post/`.

Consumes core primitives; never edits `src/components/core/` or
`src/navigation/nav.tsx`. Any screen shown during a real network operation must
show determinate or indeterminate progress.
