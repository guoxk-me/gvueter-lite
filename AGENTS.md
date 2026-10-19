# AGENTS.md

## 依赖管理

- 所有直接依赖（包括 `dependencies` 和 `devDependencies`）的版本统一在 `pnpm-workspace.yaml` 的默认 `catalog` 中维护。
- `package.json` 中使用 `catalog:` 引用，不直接填写版本号、版本范围或 npm alias；npm alias 也在 catalog 中定义。
- 新增、升级或移除依赖时，同步维护 catalog、`package.json` 和 `pnpm-lock.yaml`，通过包管理器更新锁文件，不手工修改锁文件。
- 保持 `catalogMode: strict`，不得通过关闭严格模式绕过 catalog 管理。
