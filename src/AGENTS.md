# Application source

This directory contains the Vue application. `main.ts` installs app-wide plugins, `App.vue` hosts the router view and default head metadata, and `i18n.ts` connects the two YAML locale files.

* Keep entry files thin. Put page content in `components/`, shared state and effects in `composables/`, navigation in `router/`, and pure utilities in `lib/`.
* Use Vue 3 Composition API with `<script setup lang="ts">` for application components. Keep related tests next to source files.
* Preserve the implementation boundary recorded in `design/PRODUCT.md`: dashboard statistics and activity are examples; account management has real API code, but deployment migration and administrator authorization remain pending.
