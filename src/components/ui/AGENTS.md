# UI primitives

This directory contains shadcn-vue and Reka UI primitives with their existing component names, local `index.ts` exports, and variant conventions.

* Reuse a primitive before creating another control. Keep product copy, routing, authentication, and feature-specific state outside this directory.
* Preserve the generator's public props, slots, accessibility behavior, and naming when changing a primitive. Make focused fixes here only when the shared primitive is the correct owner.
* Build feature-specific compositions in the owning feature folder rather than adding them as new base primitives.
