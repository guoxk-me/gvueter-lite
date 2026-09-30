# Components

<!-- AI modified: components own UI parts while route pages and layouts have their own directories. -->
This directory owns shared business UI parts in their named folders and reusable shadcn-vue primitives in `ui/`. Route pages live in `../pages/`, and public and authenticated shells live in `../layouts/`.

* Use typed props and emits to communicate with parent pages and child components; move reusable state or side effects to `composables/`.
* Use `vue-i18n` keys for user-visible copy and preserve keyboard focus, labels, and feedback states when adding interactions.
* Page-private UI belongs next to its page entry in `../pages/<page>/`. Keep business UI shared across pages or containers here; general UI can live here with a demonstrated generic responsibility even if it currently has one page consumer. Do not import page entries or private files.

<!-- AI modified: business components may consume their composable without coupling general UI to business. -->
* Business UI may use its own composable. General `ui/`, `form/`, `data-table/`, and `overlay/` parts depend on props/emits or adapters, never users/assistant APIs or types. Components do not call HttpClient directly; pure props/emits types belong in `../types/<owner>/`.

<!-- AI modified: name local runtime support by the behavior it owns. -->
Non-Vue support files use kebab-case and name their actual capability, such as form/active-field-values.ts. Keep shadcn-vue's lib/utils.ts alias and third-party component filenames in their established convention.
