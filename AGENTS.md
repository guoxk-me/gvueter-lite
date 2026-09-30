# AGENTS.md
## META
### First Principles
* Understand the root cause before changing code.
* Fix causes, not symptoms.
* Follow existing architecture and conventions unless they conflict with correctness.
* Prefer the simplest solution that fully solves the problem.
### Execution
* Default to action on low-risk, reversible changes.
* Avoid unnecessary confirmations.
* Stop only for true human-gated decisions.
* Do not expand scope without justification.
### Verification
* Execution is the source of truth.
* Verify through Type Check, Lint, Tests, and Build whenever applicable.
* Never claim verification that was not executed.
* Tag conclusions as: Executed, Inspected, or Assumed.
### Refactoring
* Refactor adjacent code only when it directly supports the current task.
### Push Back
* If a request conflicts with correctness, security, or maintainability, explain the concern and propose a better alternative.
<!-- AI modified: make product ownership and trade-offs explicit for future changes. -->
## Product Purpose and Priorities
* `gvueter-lite` is the primary product: a lightweight admin application template for teams building their own applications. It defines the user experience, workflows, and capability requirements.
* `gnester-lite` is the default companion server. Use it for authentication, authorization, persistence, and background work when those responsibilities are needed. Keep the integration boundary clear enough to support another backend.
* Start with a real `gvueter-lite` use case. Add only the supporting server capabilities needed in `gnester-lite`, and extract reusable components only after their boundaries are validated by real scenarios.
* Treat security and correctness as hard requirements. When priorities compete, favor simple use and minimal configuration, then clear architecture and justified reuse, then complete common management workflows, then delivery speed.
* Make common scenarios work with reliable defaults. Add configuration only for demonstrated differences; judge feature richness by complete, useful workflows rather than the number of options.
* AI is an important product capability. The long-term goal is for users to ask AI to inspect, analyze, and perform any system action they are authorized to perform through capabilities explicitly exposed by each module. Plan those data and action boundaries when adding modules, and connect them to AI as the modules mature.
* AI acts with the current user's permissions and must pass the same server-side authorization checks as the regular interface. Show proposed data changes and obtain explicit user confirmation before executing them. Keep ordinary management workflows usable when AI is unavailable.
## General Rules
Before making changes:
1. Understand the existing implementation.
2. Reuse existing patterns.
3. Prefer modifying existing files over creating new ones.
4. Keep changes minimal and focused.
5. Avoid unnecessary abstractions.
Prefer:
* Simple solutions
* Clear naming
* Focused changes
Avoid:
* Over-engineering
* Premature optimization
* Dead code
## Naming Rules
These rules apply to new and modified code in `gvueter-lite`. Rename existing identifiers and files when related work touches them; do not rename the codebase in bulk. Preserve exact names required by external APIs, libraries, frameworks, and generated code.
### General
* Use clear, specific, business-oriented names.
* Prefer business meaning when applicable; use accurate technical names for infrastructure behavior.
* Avoid generic names such as `data`, `item`, `result`, `temp`, and `value`, except in a very short scope where the meaning is immediately clear.
* Avoid technical placeholder names such as `processedData`, `transformedData`, `parsedResponse`, and `formattedResult`.
* Write abbreviations consistently: `userId` and `apiUrl` in camelCase, `ApiResponse` in PascalCase.
### Variables
* Use camelCase and specific domain names; use plural names for arrays.
* Name booleans as clear true-or-false statements. Prefer `is`, `has`, `can`, or `should`; use `are` when grammatically appropriate. For example, use `isPasswordVisible` instead of `showPassword`.
* Name refs and computed values by meaning, without `Ref` or `Computed` suffixes.
* Use UPPER_SNAKE_CASE for named fixed keys and configuration constants, such as `STORAGE_KEY`. Use camelCase for local constants, module state, and collections such as `routes`.
### Functions and Methods
* Use camelCase and describe the actual action or result. Prefer business meaning when applicable; technical operations may use accurate technical names.
* Do not require `handle` or `on` prefixes for event handlers: `toggleSidebar` and `handleFormSubmit` are both valid when they describe the behavior.
* Do not require an `Async` suffix. Make reads, writes, and other side effects clear in the name; do not use a read-only sounding name for a write.
* Prefer direct object construction for one-time field mapping. Do not introduce a helper solely to copy or reshape fields.
* Avoid vague uses of `parse`, `transform`, `convert`, `format`, `build`, and `map`; use them when the function genuinely performs the named operation, such as `parseJson`.
* Do not use `normalize` in names.
### Types
* Use PascalCase.
* Avoid prefixes such as I* and T*.
### Components
* Use PascalCase.
### Composables
* Exported composable functions must start with `use`, such as `useTheme`.
### Files and Directories
* Use PascalCase for Vue component files and kebab-case for other self-named files and directories. For example, `LoginPage.vue` and `use-theme.ts` exporting `useTheme`.
* Give test files the source file's stem plus `.spec`, such as `use-theme.spec.ts`.
* Preserve conventional or externally defined names, including `index.ts`, `vite.config.ts`, `env.d.ts`, locale codes such as `zh-CN.yaml`, and shadcn-vue component files. Do not rename existing third-party components in bulk.
## AI Modification Comments
* When AI changes logic, behavior, or structure, add a concise comment nearby.
* Explain why the change exists.
* Keep comments short.
* Do not comment every line.
* Do not add meaningless comments.
Example:
```ts
// AI modified: added fallback handling for empty user names.
```
## TypeScript
* Use strict typing.
* Avoid any.
* Prefer explicit types.
## Dependencies & Files
* Check existing dependencies before adding new ones.
* Prefer built-in platform APIs.
* Prefer modifying existing files.
* Create new files only when responsibility separation is clearly justified.
* Basic and Core are pen.dev design sections, not project directories; do not create `basic` or `core` folders for them.
## Project Layers
* Read the nearest nested `AGENTS.md` before changing files in a responsibility area; child instructions add local context to these repository-wide rules.
* For a new page or product capability, use the repository skill at `.agents/skills/extend-gvueter-lite/SKILL.md` to route the change through the existing architecture.
<!-- AI modified: keep product decisions and delivery status current across tasks. -->
## Product Documentation
* Read `design/PRODUCT.md` before starting every task.
* Before finishing every task, sync `design/PRODUCT.md` with any product decisions, user-visible behavior, and prototype or implementation status changes.
* Add a dated entry to its synchronization log for every task. If there is no product impact, record `无产品影响` after checking that the document is still accurate.
* Keep unresolved choices marked as pending; do not present plans or prototypes as implemented features.
## High-Risk Changes
Require confirmation before:
* Database schema changes
* Production data modifications
* Public API changes
* Authentication or authorization changes
* Large cross-module refactors
* Irreversible operations
## Forbidden
Do NOT:
* Rewrite large areas unnecessarily.
* Introduce breaking changes without justification.
* Disable lint rules.
* Ignore TypeScript errors.
* Use any as a shortcut.
* Change unrelated files.
* Create helper functions solely for field mapping.
* Use normalize as a method, variable, file, or type name.
* Add meaningless AI comments.
## Completion Criteria
* Implementation is finished.
* Relevant verification is completed.
* Risks and assumptions are reported.
* Scope remains controlled.
* Changes remain maintainable.

--- project-doc ---

<!--VITE PLUS START-->

## Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `pnpm lint`, `pnpm type-check`, and `vp test` to lint, type check, and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
