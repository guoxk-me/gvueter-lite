# Route pages

<!-- AI modified: each page owns an index.vue entry and private supporting files. -->
Each page has its own kebab-case directory with `index.vue` as its only root file. Put page-private UI and adjacent component tests in `components/`, composables and their adjacent tests in `composables/`, and entry tests in `tests/index.spec.ts`. Keep meaningful PascalCase component names and use-*.ts composable names. Create these subdirectories only when files need them; shared business UI belongs in `../components/<business>/`, shared workflows in `../composables/`, and shells in `../layouts/`.

* Keep pages focused on composing their feature and coordinating route state and feedback. Do not add wrappers solely to forward to another page.
* Use Vue 3 Composition API with `<script setup lang="ts">`, typed props and emits, and `vue-i18n` keys. Page-private Query and mutation workflows belong to their page; shared workflows belong in `../composables/`; pure page draft types belong in `../types/<business>/`.
* `login/index.vue` owns login navigation and feedback; `login/components/LoginForm.vue` owns field interaction and validation. Do not persist passwords or tokens in frontend storage.
* Dashboard metrics, trends, and activity remain visibly marked as examples until real data APIs exist. New actions need a real flow or explicit pending feedback.
* Keep sidebar, top bar, and account controls in layouts. Preserve responsive content without horizontal page overflow.
* Keep component/composable tests next to their source, keep entry tests in the page's tests/ directory, and update `../router/index.ts` when a page moves.

<!-- AI modified: retain a concrete migration item rather than describing current page workflows as finished. -->
`users/index.vue` still owns its existing Query/mutation workflow; extract it during architecture step 2 as recorded in `../../docs/architecture.md`.

* Other pages, layouts and shared code must not import page-private files. Extract genuinely shared responsibilities first. Router code may import page entries; tests can import private files within their own page. Keep page component identities meaningful with defineOptions when the filename is index.vue.

<!-- AI modified: page-specific guidance stays here so each page root contains only index.vue. -->
## Login page

`login/index.vue` owns navigation and feedback; `login/components/LoginForm.vue` owns field interaction and validation; `login/composables/use-login-web-mcp.ts` owns tool registration and cleanup. All supporting files remain private. Authentication requests and session state belong to shared useAuth in src/composables. Preserve feedback for invalid credentials, an unestablished session and an unavailable service. Password recovery and administrator contact remain pending until real interfaces exist; update both locales when those flows change.
