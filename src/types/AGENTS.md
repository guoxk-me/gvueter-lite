# Pure types

<!-- AI modified: central location preserves each business or capability's ownership. -->
Use owner groups and direct type-only imports/exports. Keep only interface/type declarations; runtime schemas, enums, classes, constants and functions stay with their implementation owner. Do not depend on implementation files. Never create a global types barrel. Third-party and framework declarations keep their conventional locations; tests may keep local helper types. Read `../../docs/architecture.md` for API/UI boundaries and generated-type status.

<!-- AI modified: keep concept ownership independent of implementation file names. -->
类型文件按稳定的业务／能力概念命名，不与 service、composable 或组件文件一一对应。同职责的小类型可合并；接口契约、UI 草稿、内部持久化记录和外部协议分别归属。按需分组，不预建空目录，不建立全局类型 barrel。
