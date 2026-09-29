# Components

This directory owns visible application UI. Feature pages live in their named folders, `layout/` owns the authenticated shell, and `ui/` contains reusable shadcn-vue primitives.

* Keep route pages focused on composing their feature. Use typed props and emits to communicate with child components; move reusable state or side effects to `composables/`.
* Use `vue-i18n` keys for user-visible copy and preserve keyboard focus, labels, and feedback states when adding interactions.
* Put a component next to the feature that owns it. Promote it to this shared level only when multiple features actually use it.
