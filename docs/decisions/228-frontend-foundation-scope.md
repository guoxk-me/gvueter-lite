# 前端 Q228：基础工程实施范围

日期：2026-10-15。状态：用户已确认 A，Phase 1 本地验收已完成。前置决定：Q226 A 的交付顺序、Q227 最新修订的无 ESLint 工具分工。

## 已确认选择

A（已确认并实施）：按 [前端 Phase 1 实施方案](../contracts/frontend-foundation.md) 进入基础工程实施，交付可启动／构建／检查的 Vue 工程和验证样式、shadcn-vue 基础组件的最小页面。范围内允许安装依赖、形成锁文件、编写配置／脚本／最小源码、修复兼容问题并执行约定验收；最终报告实际版本、检查及浏览器结果。完整后台外壳、认证及 FormDialog／DataTable 业务流程保持后续阶段，不提交／推送／部署。

B（未采用）：先调整方案中的具体范围，再确认实施。已确认的产品能力、工具职责和交付顺序不因此重新选择。

本题明确从文档设计转入源码工作的边界；确认 A 后，范围内低风险、可逆的配置与兼容修复直接推进，不逐项再次询问。

## 发布元数据核查（实施前快照）

用户已明确初始化方式：创建前先更新 Vite Plus，再使用 `vp create` 生成 Vue 3＋TypeScript 模板；更新是初始化的必要步骤。具体顺序与现有文件保护规则见 [Phase 1 方案](../contracts/frontend-foundation.md)。该要求已确认，整体实施范围已确认 A，按方案开始初始化。

按 Q227 最新修订，ESLint 及其插件／解析器已从实施候选中移除；Q228 的实施范围已确认。

Executed（实施前，2026-10-15）：当时仅只读请求 npm 官方 Registry，尚未安装或验证；后续实际实施结果见下方链接。下表记录发布元数据及拟验证候选，不等于整套依赖可用性已经验收，也不把所有 latest 无条件组合。

| 包 | 当前 latest | 本阶段处理 |
| --- | --- | --- |
| vite-plus | 1.2.0 | 拟验证的项目版本；与本机全局 vp 1.0.0-rc.1 区分 |
| vue | 3.5.44 | 拟验证稳定版本；不因存在 3.6 rc 自动改用预发布版 |
| @vitejs/plugin-vue | 6.0.10 | Vue／Vite 插件组合待实际验证 |
| typescript | 7.0.2 | 仅记录最新发布；尚未选为项目版本，须确认 vue-tsc 与 TypeScript 编译器组合兼容后确定 |
| vue-tsc | 3.3.13 | 拟验证版本；宽泛 TypeScript peer 不证明内部 API 兼容 |
| tailwindcss | 4.3.3 | 与 Vite 插件配套验证 |
| @tailwindcss/vite | 4.3.3 | 插件声明支持 Vite 5–8，但 Vite Plus 集成仍须运行验证 |

本机 Node 24.22.0 满足已查包声明的 Node 范围，pnpm 10.28.0 可作为现有候选环境；仍须检查实际锁定传递依赖。包未声明 engines 不代表所有运行时均受支持。

Vite Plus 1.2.0 的发布依赖中，vite 使用 @voidzero-dev/vite-plus-core 1.2.0 别名，并配套 Vitest 5.0.4、Oxlint 1.88.0、Oxfmt 0.73.0、tsgolint 7.0.2004。不能只凭插件声明支持 vite ^8 就报告已通过该别名组合。按用户最新要求，初始化前先更新全局 CLI，再分别记录全局版本与模板生成的项目本地工具版本；此处版本表保留为核查快照，实际版本以实施时更新与验证结果为准。

确定 TypeScript、vue-tsc、自动导入、shadcn-vue 组件及浏览器测试的实际依赖后，写入项目直接依赖和锁文件，运行负向类型／lint 样例及页面验证。若版本调整不改变已选工具职责，作为实施内兼容修复记录证据；若必须改变工具路线，则提出具体调整供讨论，不静默更换。

## 元数据来源

- [vite-plus 1.2.0](https://registry.npmjs.org/vite-plus/1.2.0)
- [Vue 3.5.44](https://registry.npmjs.org/vue/3.5.44)
- [Vue 插件 6.0.10](https://registry.npmjs.org/@vitejs%2Fplugin-vue/6.0.10)
- [TypeScript 7.0.2](https://registry.npmjs.org/typescript/7.0.2)
- [vue-tsc 3.3.13](https://registry.npmjs.org/vue-tsc/3.3.13)
- [Tailwind CSS 4.3.3](https://registry.npmjs.org/tailwindcss/4.3.3)
- [Tailwind Vite 插件 4.3.3](https://registry.npmjs.org/@tailwindcss%2Fvite/4.3.3)

## 实施结果

Executed（2026-10-15）：已完成先更新 Vite Plus、官方 Vue 3 模板生成、基础页面、检查入口与本地验收。实际锁定版本、7 项测试、2 项浏览器流程、干净安装与限制见 [Phase 1 验收记录](../contracts/frontend-foundation.md)。下一阶段仍为 Q226 的 Mock 最小完整流程；本次不包含其实现。
