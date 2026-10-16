# 前端 Q227：基础工程的检查工具职责

日期：2026-10-15。状态：用户已修订确认“不用 eslint 的东西了”，覆盖此前 A 中接入 ESLint 的部分。本题确定职责分工，尚未安装依赖、生成配置或运行应用验收。

## 前提与事实

Q226 A 已确认基础工程→最小完整流程→补齐首版能力的顺序，Vue／Vite Plus 技术方向保持。Inspected：当前前端仓库除 Git 元数据及 .gitignore 外仅有文档，未存在 package.json、锁文件或应用源码。

Executed：本机版本查询返回 Node v24.22.0、pnpm 10.28.0、全局 vp v1.0.0-rc.1；vp 报告未发现项目级 vite-plus 及其本地工具。以上只是当前环境，不是已锁定项目版本，不代表依赖兼容性已验证。

Inspected：官方当前资料中，Vite Plus 通过 vp dev／build／test 组织开发、构建、测试，vp check 汇总格式、lint 及启用后的类型检查。Oxlint 对 .vue 仅检查 script，不能替代模板 lint；Oxfmt 支持 .vue 格式化。Vue 官方指定 vue-tsc 支持 SFC 类型检查，不能假定 vp check 的 TypeScript Go 路径已经覆盖完整 Vue 模板类型。

## 当前决定：不使用 ESLint 工具链

| 责任 | 已确认承担者 |
| --- | --- |
| 开发／构建／单元测试 | Vite Plus 的 dev／build／test |
| JS／TS 代码规则 | Vite Plus 内置 Oxlint |
| 统一格式化 | Vite Plus 内置 Oxfmt，不额外维护独立 Prettier 格式任务 |
| Vue SFC 类型检查 | vue-tsc；工具配置等独立 TS 项目按实际范围补充 |
| 依赖边界 | 经违规反例验证的规则／检查脚本，具体实现随兼容性验证确定 |

项目不接入 ESLint、eslint-plugin-vue、eslint-plugin-oxlint 或为该链路服务的解析器／配置，也不通过兼容层重新引入，不自建通用模板 linter 替代。Oxlint 自带规则可以使用，不能将其规则来源命名误认为另行接入 ESLint。

模板类型由 vue-tsc 检查，语法／编译和关键行为通过构建、必要测试及浏览器验证。覆盖范围不等价于完整 Vue 模板 lint；没有覆盖的静态规则如实记录，不声称全部替代。Oxlint typeAware 仍须验证 Vue 导入与 tsconfig 兼容，避免默认重复运行两套完整类型检查。

## 决策沿革

此前用户选择 A：Oxlint 为主，ESLint＋Vue 插件补充模板及缺失规则；本次明确要求不用 ESLint，已替代其中的补充工具部分。此前 B（ESLint 统一全部代码规则）同样不采用。两种旧方案仅保留为取舍历史，不再作为实施依据。

## 验收边界

按本次修订决定，快速／完整入口必须明确包含哪些检查；vp check 本身不等于测试、构建、Vue 专项和依赖边界全部完成。用会失败的 TS／Vue 模板类型样例、编译错误及违规依赖样例验证实际覆盖，并验证 .vue 格式化一致、修复命令与只读检查分离、CI 可复现。确切版本、命令、文件范围与示例随后纳入基础工程方案，本题不声称已验证通过。

## 官方依据

- [Vite Plus check](https://viteplus.dev/guide/check)：静态检查组成与选项。
- [Oxlint 支持范围](https://oxc.rs/docs/guide/usage/linter)：框架文件的 script 检查范围。
- [Oxfmt 语言支持](https://oxc.rs/docs/guide/usage/formatter/language-support)：Vue 格式化支持。
- [Vue TypeScript 工具](https://vuejs.org/guide/typescript/overview)：vue-tsc 的 SFC 类型检查职责。
