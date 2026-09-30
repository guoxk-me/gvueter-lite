# Composables

This directory owns reusable reactive state, browser lifecycle effects, and Query/mutation workflows. Existing shared concerns include theme, session state, assistant flows and generic table interaction.

* Export composable functions named `use...`; name new files in kebab-case, such as `use-theme.ts` for `useTheme`. Existing mixed-case filenames are renamed only when related work touches them.
* Return small, typed APIs. Expose shared state as readonly when callers must use named actions to change it; keep pure stateless helpers in `../lib/`.
* Keep application auth requests on the same-origin `/api/session` endpoints, let the NestJS server session determine authentication, and clean up browser listeners or tools when their owner unmounts. Access and refresh tokens stay in HttpOnly cookies.
* Consume application API fields as camelCase. Keep the shared HTTP client focused on transport, envelopes, and errors; map a backend-specific exception explicitly in its owning API module rather than recursively renaming response keys.

<!-- AI modified: separate reactive behavior from transport and pure contracts. -->
* Page-private reactive workflows belong in `../pages/<page>/`; shared and application-level workflows belong here. Do not import page entries or private files. Current consumer count alone does not determine ownership.
* Endpoint calls belong in `../api/`, HTTP infrastructure in `../http/`, and pure types in `../types/<owner>/`. Keep Query resources distinct from client drafts; consult the specific migration list in `../../docs/architecture.md`.

<!-- AI modified: shared assistant workflows use the same business group as API, components and types. -->
`assistant/` groups conversation and personal configuration workflows with their adjacent tests. Theme, auth and generic table files remain flat while each concern is small. Keep use-*.ts filenames specific even inside a business directory; no index.ts is required.
