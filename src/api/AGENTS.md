# API functions

<!-- AI modified: explicit endpoint calls are independent of UI state. -->
Keep functions stateless; use `../http/http-client` and pure business contracts from `../types/`. Preserve cancellation, Cookie and local-feedback options. Do not import Vue, Query, Pinia, router, components or Toast. Fixed OpenAPI generation is a pending step-1 item in `../../docs/architecture.md`.

<!-- AI modified: group related assistant endpoints without creating folders for isolated API files. -->
Assistant requests and configuration live in `assistant/`, matching the business name in components, composables and types. A small independent API file can remain flat. Use direct imports; do not add a barrel solely for directory grouping. Relative paths are resolved from the implementation file, not this guidance file.
