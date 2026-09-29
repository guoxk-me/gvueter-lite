# Composables

This directory owns reusable reactive state, browser lifecycle effects, and client-side service access. Existing concerns include theme, authentication/session, and login WebMCP tools.

* Export composable functions named `use...`; name new files in kebab-case, such as `use-theme.ts` for `useTheme`. Existing mixed-case filenames are renamed only when related work touches them.
* Return small, typed APIs. Expose shared state as readonly when callers must use named actions to change it; keep pure stateless helpers in `../lib/`.
* Keep auth requests on the same-origin `/api/auth` path, let the server session determine authentication, and clean up browser listeners or tools when their owner unmounts.
