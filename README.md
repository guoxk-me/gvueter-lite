# gvueter-lite

基于 Vite Plus 官方 Vue 3＋TypeScript 模板的 Admin 基础工程。已交付 Phase 1 工程基础，以及 Phase 2 的 SchemaForm、FormDialog、DataTable、Axios／Vue Query 和联系人 MSW 完整流程。生产入口仍为基础验证页，开发示例单独启动。完整布局、登录权限、FormDrawer、其余控件和真实接口留待后续。

## 开发

Node 24.22.0，pnpm 12.11.2。项目版本由 `.node-version`、`package.json` 和 `pnpm-lock.yaml` 共同记录。

```sh
vp install --frozen-lockfile
vp run dev
# 联系人完整流程：启动后访问 /examples/contacts/
vp run dev:examples
```

全局 Vite Plus 不是项目依赖的替代品；项目脚本使用本地 `vite-plus`。初始化前已执行 `vp upgrade`，再通过 `vp create vite:application -- --template vue-ts` 生成模板。因为仓库已有 PRD，在临时空目录生成后合入，未覆盖既有文档与 Git。

## 检查

```sh
vp run verify               # 类型、Oxlint、Oxfmt、依赖边界
vp run test                 # 组件、HTTP、查询、未知写入、类型负向样例与边界
vp run build               # 生产构建
vp exec playwright install chromium # 首次准备浏览器
vp run verify:all           # 快检、测试、构建、产物隔离、开发/生产/示例浏览器流程
```

`vp run lint:fix` 和 `vp run format` 显式写回，其余验证不修复源码。`build` 不代替 `type-check`。`test:e2e` 需要已有 `dist/`，自行启动 4173 开发服务、4174 生产预览和 4175 examples 服务；端口被占用时失败，不复用不明服务。完整验收需要 Chromium，缺失时明确失败。

检查链不使用 ESLint 或其插件、解析器、兼容层。TypeScript 保持 strict；Vue 开启严格 v-model、未知组件与指令检查。合法的属性／原生事件可以透传到 shadcn 的 Reka Primitive，因此不启用要求所有透传属性均在 defineProps/defineEmits 声明的额外检查；已声明 prop 的类型和模板表达式仍由 vue-tsc 验证。vue-tsc 负责 Vue 模板类型，Oxlint 负责脚本规则；当前不启用 Oxlint typeAware/typeCheck，避免将独立 TypeScript 检查冒充 Vue SFC 类型检查。模板语法、交互和样式另由编译与浏览器验证。

## 目录与依赖

- `src/App.vue`：单一最小验证页面，只有本地按钮状态，因此暂不拆分业务组件或 composable。
- `src/components/ui/`：官方 shadcn-vue 生成源码；自有封装位于 `form/`、`table/`、`modal/`。
- `src/http/`、`src/query/`：传输边界、查询默认策略、写入保护与恢复。
- `examples/contacts/`：独立开发入口、资源 API、MSW 与 IndexedDB；不进入生产入口。
- `src/styles/main.css`：Tailwind、组件主题和 shadcn-vue 状态 variants。
- `src/types/`：自动导入声明随源码保存，干净安装无需先启动开发服务。Vite 插件更新声明后，应将变化一同纳入版本管理。
- `scripts/`：验证工程规则的测试；`tests/e2e/`：开发／生产页面冒烟与联系人完整流程。
- `dependency-cruiser.config.mjs`：基于解析后依赖的方向规则，包含类型导入、再导出、字面量动态导入和 Vue 脚本。

自动导入名单只有 Vue 的 `computed`、`shallowRef` 和 UI 的 `Button`。不扫描页面私有组件；业务与类型仍显式导入，渲染函数内的组件也需显式导入。拓展名单时同步检查插件配置与生成声明。

边界规则阻止 API 依赖 UI／页面、公共能力依赖业务、HTTP 依赖导航，以及跨资源页面的私有引用。页面边界以已规划的 `pages/<group>/<resource>/` 为单位，例如 `pages/system/users/`；新增不同层级的页面布局时必须先扩展规则及反例。动态拼接的导入路径不属于静态解析保证范围。自动导入组件由受控名单限定，依赖分析器不独立推断模板中未导入的组件。

全部直接依赖（含开发依赖）的版本范围统一声明在 `pnpm-workspace.yaml` 的默认 `catalog` 中，`package.json` 只使用 `catalog:` 引用；具体安装版本由 `pnpm-lock.yaml` 锁定。启用 `catalogMode: strict`，新增依赖通过 `vp add <包名>`（开发依赖加 `-D`）接入 catalog；升级时更新 catalog 中的版本范围并运行 `vp install`，同时审查锁文件。CI 使用 `vp install --frozen-lockfile`。

保留 Vite Plus 生成器的 Vite 别名覆盖，没有新增 packages 工作区。`vite` 指向与 Vite Plus 配套的 core alias，不另装独立版本。Node 与 pnpm 版本继续由各自的运行环境声明管理。文档与历史归档不参加工程自动格式化。

完整契约见 [PRD](docs/prd.md)，基础工程记录见 [Phase 1](docs/contracts/frontend-foundation.md)，核心组件接入与验收记录见 [Phase 2](docs/contracts/frontend-phase-2.md)。

HTTP 使用原生 Axios 实例与拦截器，提供 `get/post/put/patch/delete`、schema 校验、`requestEmpty`、`requestRaw`、`requestWithResponse` 和文件下载。Axios 原生参数序列化默认将数组编码为重复参数名；JSON 请求错误统一为对象式 `ApiError`。调用示例、拦截器顺序与原生恢复语义见 [HTTP 客户端设计](docs/contracts/http-client-redesign.md)。

本机已有 Chrome 时可运行 `PLAYWRIGHT_CHANNEL=chrome vp run verify:all`，使用隔离测试上下文验收；默认仍使用 Playwright 管理的 Chromium。老版本 pnpm 自管理切换失败时，直接使用 `vp run <脚本>` 与 `vp exec <工具>`，由 Vite Plus 选择项目声明的包管理器。

组件源码来自 shadcn-vue CLI 2.8.2 的 reka-nova 样式，不代表最终设计定稿。全局样式使用系统字体，避免外部字体请求。Phase 2 所需的状态 variants 已从该版本的 CSS 收录到全局样式，未把整个 CLI 加为运行依赖。以后新增组件时按生成结果审查实际 CSS 与包依赖。

## 联系人示例

示例从 53 条固定联系人开始，支持搜索草稿、服务端分页／单列排序、当前页选择、新增／编辑、字段校验和保存刷新。顶部“模拟场景”可验证读取失败、明确拒绝、保存成功后刷新失败、响应丢失及延迟响应；数据和场景在本机 IndexedDB 保存，使用“重置示例”恢复。

未知写入在发送前登记最小 sessionStorage 标记，阻止相关目标重复写入；关闭或同标签刷新后仍可核实。自动核实每个操作至多一次，手动核实不重发写入。存储失效明确提示，当前内存保护继续有效。固定示例身份不代表正式认证和后端幂等已验收。

新资源接入可参考 `examples/contacts/ContactsExample.vue` 的字段、列和容器组合，以及 `api.ts` 的查询工厂、DTO 和核实函数。公开类型从 `src/components/form` 与 `src/components/table` 导出。

Executed（2026-10-16）：`PLAYWRIGHT_CHANNEL=chrome vp run verify:all` 通过，包含 39 项测试、12 项浏览器测试、生产构建和产物隔离；独立目录冻结锁文件安装及类型检查通过。详细证据与未验证范围见 Phase 2 文档。

HTTP 重构初次验收（2026-10-16）：同一完整命令通过，当时为 52 项测试与 14 项浏览器测试；新增真实 HTTP 文件／进度／取消场景，隔离目录冻结锁文件离线安装通过。此前加入的 qs、@types/qs 已按后续决定移除，参数编码使用 Axios 原生能力；认证和真实后端验收继续按契约推进。

提交前复验 Executed（2026-10-19）：移除 qs 后 `PLAYWRIGHT_CHANNEL=chrome vp run verify:all` 全部通过，当前为 53 项测试、14 项浏览器测试，含类型／Lint／格式、依赖边界、生产构建与示例隔离。
