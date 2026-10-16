# 前端 Phase 1：基础工程实施方案

状态：Q228 已确认 A，Phase 1 已于 2026-10-15 实施并完成本地验收。Q226 已确定总体顺序，Q227 已修订为不使用 ESLint 工具链；本阶段结果见第 7 节，不改变已确认产品范围。返回 [PRD](../prd.md)。

后续进展：2026-10-16，[Phase 2](frontend-phase-2.md) 的联系人 Mock 完整流程已完成本地验收；本文件保留 Phase 1 当时的范围与证据。

## 1. 本阶段交付

形成可重复安装、开发启动、生产构建与检查的 Vue 工程，用一个明确标记为基础验证用途的最小页面，验证 Vue SFC、样式、shadcn-vue 基础组件及工程检查的接入。

页面只用于验证工程：基础文本、一个真实可点击组件和最小交互，不伪装成已完成管理后台。FormDialog／DataTable 与 Vue Query 的 Mock 完整流程按 Q226 在下一阶段实现；布局、导航、标签、认证／权限等仍按对应规范另行落地。

## 2. 文件范围

| 范围 | 本阶段内容 |
| --- | --- |
| 根工程文件 | package.json、pnpm-lock.yaml、TypeScript 配置、vite.config.ts、index.html、Node／包管理版本声明、必要的组件生成配置 |
| src/main.ts、src/App.vue | 最小 Vue 启动与验证页面，采用 Composition API 和 script setup TypeScript |
| src/styles/ | Tailwind 与所需主题样式接入，不提前实现完整偏好系统 |
| src/components/ui/ | 按 shadcn-vue 生成实际使用的最小组件；维护生成来源与必要依赖，不批量加入全部组件 |
| 检查配置与 scripts/ | Q227 的 lint／格式／类型分工、关键依赖边界、快速／完整入口 |
| 就近测试与 tests/ | 实际启动组件的关键交互与检查覆盖样例；不为占位文件编造测试 |
| README、.gitignore | 安装、启动、检查、构建、依赖版本、前置条件与当前未实现范围；仅按实际产物补充忽略 |

只创建有实际内容的目录，不预建空 api／auth／permissions／pages 模块。不改参考后端，不创建正式业务表或认证 API，不包含提交／推送／部署。

## 3. 依赖与版本原则

初始化顺序已由用户明确：先更新 Vite Plus，再使用 Vite Plus 的创建命令生成 Vue 3＋TypeScript 模板，以生成结果为工程起点。

1. 创建前按实际安装来源更新全局 CLI；当前安装方式使用 `vp upgrade`，更新后核对并记录版本。执行时获取最新稳定发布，不将下方历史候选版本当作升级上限。
2. 使用 `vp create`，选择 Vue 3＋TypeScript 模板；具体交互与参数以更新后 CLI 的帮助及官方模板为准，不手工拼装一套起始工程。模板生成后检查项目本地 Vite Plus 的依赖与命令接入。
3. 当前仓库已有文档与 Git 历史，禁止通过清空目标目录来运行生成器。若生成器要求空目录，先在独立临时空目录生成，再将工程文件有选择地合入当前仓库；保留现有文档、Git 与用户配置。
4. 模板选项与后续配置遵循 Q227：不接入 ESLint 运行时、插件、解析器或配置；若模板默认生成相关内容，在接入工程检查前移除该集成，按已确认工具职责配置。

官方依据：[升级全局 CLI](https://viteplus.dev/guide/upgrade)、[创建项目](https://viteplus.dev/guide/create)。此顺序已确认；Q228 整体实施范围已确认，升级与创建按本方案执行。

沿用 Vue／Vite Plus／shadcn-vue，采用 Tailwind 作为样式接入方向。前端包管理使用 pnpm；全部直接依赖（含开发依赖）的版本范围集中到 `pnpm-workspace.yaml` 的默认 `catalog`，`package.json` 使用 `catalog:` 引用，并启用 `catalogMode: strict`。新增依赖通过 catalog 接入，升级统一修改 catalog 并更新单份 `pnpm-lock.yaml`，CI 按冻结锁文件安装。Node 与包管理器版本由各自的运行环境声明管理。最终组合必须通过 peer／engine 与运行验证。

Vite Plus 内部工具使用其配套版本，不另装一套独立 Vite／Vitest／Oxlint／Oxfmt 形成双版本链。Vite 的 Vue 插件、vue-tsc、TypeScript、Tailwind 插件及 shadcn-vue 实际组件依赖按兼容组合接入，完整直接依赖表随实施记录公布。

自动导入沿用已确认规则：Vue 常用函数及明确名单 UI 组件自动导入，业务与类型显式导入，渲染函数的组件值显式导入。先接入本阶段确实使用的名单，不自动扫描页面私有组件；生成声明必须在干净安装的检查路径中可用。

精确版本候选见 [Q228 的核查记录](../decisions/228-frontend-foundation-scope.md)；只读元数据符合并不等于安装／类型／构建兼容已通过。若遇到改变技术方向的兼容障碍，说明证据与调整方案，不静默替换已选工具。

## 4. 检查与命令职责

详细工具分工以 [工程架构契约](architecture.md) 为准。拟提供以下项目命令作为统一入口，内部子命令按锁定版本适配，不要求业务开发者手工记住多工具组合。

| 入口 | 责任 |
| --- | --- |
| dev | 开发启动 |
| build／preview | 生产构建与本地预览；构建成功不代替类型检查 |
| type-check | Vue SFC 与工具配置实际范围的类型检查 |
| lint／lint:fix | 由 Oxlint 承担只读代码规则检查／显式修复，不接入 ESLint 工具链 |
| format:check／format | 只读格式检查／显式格式化 |
| test | 本阶段实际存在的测试，完整验收使用非交互模式 |
| check:boundaries | 自动检查已定义的依赖方向，使用违规反例验证 |
| verify | 类型、代码规则、格式和边界的日常快速入口 |
| verify:all | 快检、测试、构建及本阶段已配置的关键浏览器冒烟验证 |

命令名为本实施方案拟定入口；具体 package.json 展开内容在实施时报告。完整检查失败应返回非零，不隐藏 lint 规则或跳过类型错误。CI 可调用同一非交互入口，具体托管平台工作流按仓库环境接入，不增加部署流程。

## 5. 必须执行的验收

1. 在干净依赖环境按锁文件安装，记录 Node／pnpm／直接依赖版本，确认无未声明的运行依赖或只在全局环境存在的必需工具。
2. 开发启动与生产预览均实际打开最小页面，验证样式加载、基础组件交互及无阻断性控制台错误；截图或浏览器结果作为证据，不以 Build 成功代替页面验证。
3. TypeScript／Vue 模板的类型错误样例应被类型检查拒绝，模板语法错误应被对应编译检查拒绝；修复后通过。负向样例与正式源码隔离，避免永久破坏主工程。
4. 验证 Oxlint 已启用的普通脚本规则实际生效；不声称覆盖完整 Vue 模板 lint，关键交互通过必要测试和浏览器验证。Oxfmt 能处理项目 .vue 与配置文件，修复后再次检查无变动。
5. 边界检查能拒绝 API 反向依赖 UI／页面、通用能力依赖业务、跨页引用私有实现等违规样例；不能仅因当前业务目录为空就宣称边界有效。路径别名／类型导入等按实现范围明确验证，不以宽泛正则冒充完整依赖解析。
6. 执行 verify 与 verify:all，确认输出和退出码真实反映结果；记录本阶段测试范围，不把未实现的认证、完整布局或组件业务流程计入通过项。

## 6. 交付与后续

交付报告区分 Executed、Inspected 和未验证项，列出实际改动文件、锁定版本、执行命令、浏览器验证与风险。验收通过后，进入 [Phase 2 实施方案](frontend-phase-2.md) 的最小 Mock 完整流程；九类表单控件等仍按首版契约逐步补齐，不因本阶段最小页面而删减。

## 7. Phase 1 实施与验收记录（2026-10-15）

Executed：先执行 `vp upgrade`，将全局 CLI 从 1.0.0-rc.1 更新至 1.2.0，再在独立空目录执行下列官方生成命令并合入当前仓库；现有文档、Git 与忽略规则保留。

```sh
vp create vite:application --directory gvueter-lite --package-manager pnpm --no-interactive --no-git --no-agent --no-editor --no-hooks -- --template vue-ts
```

Inspected：项目由官方 Vue＋TypeScript 模板生成，保留 Vite Plus 的 core alias 配置，并按用户要求将全部直接依赖统一纳入默认 catalog。未引入独立 Vite／Vitest／Oxlint／Oxfmt。直接依赖清单、版本范围与解析版本分别由 package.json、pnpm-workspace.yaml 与 pnpm-lock.yaml 保存。

| 工具或能力 | 实际版本 |
| --- | --- |
| Node／pnpm | 24.22.0／12.11.2 |
| 全局／本地 Vite Plus | 均为 1.2.0 |
| 配套 Vite／Vitest | 8.3.4／5.0.4 |
| 配套 Oxlint／Oxfmt | 1.88.0／0.73.0 |
| Vue／Vue 插件 | 3.5.44／6.0.10 |
| TypeScript／vue-tsc／Vue tsconfig | 6.0.3／3.3.13／0.9.1 |
| Tailwind／Vite 插件 | 均为 4.3.3 |
| shadcn-vue 生成 CLI／Reka UI | 2.8.2／2.11.0 |
| cn／class-variance-authority | 0.4.0／0.7.1 |
| Lucide／tw-animate-css | 1.57.0／1.4.0 |
| Vue Test Utils／happy-dom | 2.5.1／21.0.1 |
| dependency-cruiser／Playwright | 18.6.0／1.64.0 |
| unplugin-auto-import／unplugin-vue-components | 21.1.0／32.1.0 |
| Node 类型 | 24.19.2 |

生成 CLI 仅用于生成源码，没有成为项目运行依赖；项目依赖和检查链无 ESLint、其插件或解析器。shadcn-vue Button 使用官方 reka-nova 源码；这是基础验证样式，不代表最终后台设计定稿。公共样式采用系统字体，避免外部字体请求；Tailwind 仅扫描应用源码，排除就近测试，不扫描文档／示例。Button 当前不需要 CLI 包附带的额外 CSS 工具类，后续新增组件必须按实际生成结果审查依赖。

TypeScript strict 与 noUncheckedIndexedAccess 均开启。Vue 开启严格 v-model、未知组件和指令检查；允许合法原生属性／事件透传到 Reka Primitive，不要求全部透传属性在 defineProps／defineEmits 重复声明。已声明 prop 的错误类型、脚本类型错误和模板表达式错误均经负向样例验证。Oxlint typeAware／typeCheck 当前未启用，SFC 类型检查由 vue-tsc 承担。

自动导入限定 `computed`、`shallowRef` 与 `Button`，组件只解析到公开入口，不扫描页面私有目录。声明随源码保存，干净安装先运行 type-check 可通过，无需先启动开发服务。测试分别覆盖组件真实交互、类型／lint／模板编译负向样例和解析后的依赖方向。

Executed：以下验收实际通过。

- `vp run verify`：类型、Oxlint、Oxfmt、依赖边界通过；边界扫描 17 个模块／17 条依赖。
- `PLAYWRIGHT_CHANNEL=chrome vp run verify:all`：完整入口退出 0；3 个测试文件的 7 项测试、生产构建，以及开发／生产预览各 1 项浏览器测试通过。覆盖点击、键盘 Enter、375px 视口、样式和无控制台错误。
- 独立目录以空 node_modules 执行 `vp install --frozen-lockfile --offline`，237 个包从缓存安装成功；随后 type-check 与 build 通过。最终 3 个生产文件与当前仓库产物逐字节一致。
- Oxfmt 写回后只读检查通过，未修改历史文档。另用 ego-browser 实际点击并观察到“已响应 1 次”；截图调用超时，因此不将截图列为验收证据。

环境与范围限制：本机旧 pnpm／Corepack 的 pnpm 12 下载路径存在冲突，本次用 Vite Plus 管理的工具完成安装；日常统一使用 `vp run`／`vp exec`。额外 Chromium 下载未完成，实际浏览器验收使用已安装 Chrome 的隔离上下文；默认浏览器运行仍须先准备 Chromium，或指定 Chrome。页面私有边界当前按规划的 `pages/<group>/<resource>/` 判断，动态拼接导入不能由静态依赖解析保证；新增目录形态须同步规则和反例。完整 Vue 模板 lint、业务 Mock 流程、真实接口、CI 托管工作流和部署不计入本次通过项。未提交或推送 Git。
