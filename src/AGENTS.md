# Application source

This directory contains the Vue application. `main.ts` installs app-wide plugins, `App.vue` hosts the router view and default head metadata, and `i18n.ts` connects the two YAML locale files.

<!-- AI modified: distinguish page-private support from shared UI and workflows. -->
* Keep entry files thin. Put route entries in `pages/<page>/index.vue` as each page's only root file, private UI in the page's components/, private workflows in composables/, and entry tests in tests/; put shared UI in `components/` and shared workflows in `composables/`, shared shells in `layouts/`, endpoint calls in `api/`, transport in `http/`, client cross-page state in `stores/` when needed, pure types in `types/`, navigation in `router/`, and pure utilities in `lib/`.
* Use Vue 3 Composition API with `<script setup lang="ts">` for application components. Keep component/composable tests next to source files; page-entry tests live in their page's tests/ directory.
* Preserve the implementation boundary recorded in `design/PRODUCT.md`: dashboard statistics and activity are examples; account management has real API code, but deployment migration and administrator authorization remain pending.

<!-- AI modified: use one versioned rule source instead of duplicating every layer here. -->
Read `../docs/architecture.md` for the full ownership table and current migration gaps. Do not create empty layers.

<!-- AI modified: page-private support code stays owned by its route entry. -->
Other pages, layouts and shared layers cannot import a page's private files; extract shared responsibilities into the appropriate top-level directory. The router consumes index.vue entries.
