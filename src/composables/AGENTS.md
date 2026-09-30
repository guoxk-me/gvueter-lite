# Composables

This directory owns reusable reactive state, browser lifecycle effects, and client-side service access. Existing concerns include theme, authentication/session, and login WebMCP tools.

* Export composable functions named `use...`; name new files in kebab-case, such as `use-theme.ts` for `useTheme`. Existing mixed-case filenames are renamed only when related work touches them.
* Return small, typed APIs. Expose shared state as readonly when callers must use named actions to change it; keep pure stateless helpers in `../lib/`.
* Keep application auth requests on the same-origin `/api/session` endpoints, let the NestJS server session determine authentication, and clean up browser listeners or tools when their owner unmounts. Access and refresh tokens stay in HttpOnly cookies.
* Consume application API fields as camelCase. Keep the shared HTTP client focused on transport, envelopes, and errors; map a backend-specific exception explicitly in its owning API module rather than recursively renaming response keys.
