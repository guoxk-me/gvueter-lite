# Pure utilities

<!-- AI modified: guidance covers both existing shared utilities. -->
This directory contains class-name merging for UI primitives and code highlighting shared by assistant output and the rich-text editor.

* Keep helpers deterministic and independent of Vue component lifecycle, browser storage, routing, and feature state.
* Put business behavior with its feature or composable. Add a shared utility only after an actual reuse case exists.
