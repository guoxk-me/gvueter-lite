---
name: extend-gvueter-lite
description: Extend Gvueter Lite with a product feature or page across its Vue components, state, routes, translations, and styles. Use for feature implementation, not docs-only or dependency-only work.
---

# Extend Gvueter Lite

Use the smallest vertical slice that delivers the requested behavior. Treat `design/PRODUCT.md` as the current status record: distinguish implemented behavior from Pencil prototypes and pending decisions.

1. Read the repository `AGENTS.md` and the nearest `AGENTS.md` for each directory you expect to edit. Inspect an analogous implemented flow before choosing files or dependencies.
2. Decide ownership before editing: feature UI belongs in `src/components/<feature>/`; the shared authenticated shell belongs in `src/components/layout/`; reusable UI primitives belong in `src/components/ui/`; state and external side effects belong in `src/composables/`; routes and guards belong in `src/router/`; copy belongs in both locale files; global tokens belong in `styles/`.
3. For a protected page, compose it under `AdminLayout` and use the existing session guard. Keep page content separate from the shell. Account management uses real API code, but its deployment migration and administrator authorization remain pending; check `design/PRODUCT.md` before treating a capability as available.
4. Use Vue 3 `<script setup lang="ts">` and explicit props/emits. Keep one source of state, derive display values with `computed`, and extract a composable only when state or effects need reuse or a separate lifecycle. Follow the repository's PascalCase rule for Vue component files and kebab-case rule for other self-named files.
5. Extend both `locales/zh-CN.yaml` and `locales/en-US.yaml` for user-visible text. Reuse existing theme tokens and shadcn-vue primitives before adding styles or dependencies. Keep example content labeled as example content until a real data source is connected.
6. Verify the changed behavior at its boundary: type check, lint, relevant tests, and build when applicable; inspect the page in a browser when layout or interaction changes. Report only checks actually run, then update the product status and dated sync log in `design/PRODUCT.md`.

If a requested feature needs an unresolved product decision or a new authentication, authorization, or public API contract, prepare the concrete implementation boundary and obtain the confirmation required by the repository instructions before changing that contract.
