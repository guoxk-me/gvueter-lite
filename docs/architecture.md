# 项目架构与文件职责

<!-- AI modified: versioned ownership rules turn the agreed architecture into a team baseline. -->

`gvueter-lite` 是供团队复制后直接开发源码的后台模板，`gnester-lite` 是默认服务端；两库独立交付。默认单组织、模块化单体、一个 API 实例，worker 默认同进程，未来可按需拆出单个 worker。不引入模块插件注册系统。

<!-- AI modified: record the confirmed companion-server boundaries without applying backend placement rules to Vue. -->

默认后端 gnester-lite 使用 `bootstrap/`、`config/`、小型 `common/`、完整非业务运行能力 `infra/` 和 `modules/`。当前账号／会话／邀请／管理合并归 `modules/identity`，助手归 `modules/assistant`，统一通过 `ApplicationModule` 装配；后端 DTO、类型和测试就近归模块，Demo 已移除。前端继续采用本文的类型目录和职责分工；Cookie、CSRF、响应 envelope 与现有业务端点保持兼容。

## 前端目录职责

| 目录／文件                                        | 职责与依赖                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/main.ts`、`App.vue`、`query-client.ts`       | 插件与应用装配、全局容器、共享 Query 配置；显式组合业务生命周期。                        |
| `src/pages/`                                      | 每页根目录仅 index.vue；components 放私有 UI，composables 放私有流程，tests 放入口测试。 |
| `src/layouts/`                                    | 导航、顶栏、账号入口、内容／滚动容器；承载业务 UI。                                      |
| `src/components/ui/`                              | 社区 shadcn-vue 原语；保持第三方约定。                                                   |
| `src/components/form/`、`data-table/`、`overlay/` | 通用 UI 能力，通过 props／emits 或 adapter 接入外部能力，不依赖账号／助手业务。          |
| `src/components/<业务>/`                          | 跨页面／跨容器共享的业务 UI，可调用本业务 composable；不直接调用 HttpClient。            |
| `src/api/`                                        | 显式请求函数，仅依赖 HTTP、API 和类型；不引用 Vue、Query、路由、Toast 或 UI。            |
| `src/http/`                                       | Cookie／CSRF、刷新并发、取消、响应 envelope、运行时请求错误；通过注入的回调反馈错误。    |
| `src/composables/`                                | 共享及应用级 Query／mutation、响应式交互和业务流程；页面私有流程归所属页面。             |
| `src/stores/`（按需）                             | Pinia 跨页面客户端状态、草稿与流程；不保存一份可独立变化的服务端资源副本。               |
| `src/authorization/`（待接入）                    | CASL 的前端展示规则、权限判断；服务端始终负责执行校验。                                  |
| `src/router/`                                     | 路由、会话守卫、导航元信息与进度，不承接业务数据写入。                                   |
| `src/types/`                                      | 集中的纯类型，按业务／能力分组。                                                         |
| `src/types/generated/`（待生成）                  | 固定 OpenAPI 的生成类型；不手改、不重复维护接口字段。                                    |
| `src/lib/`                                        | 已有真实复用需求的独立工具，如类名合并、代码高亮。                                       |
| `src/assets/`、`styles/`                          | 构建资源与全局视觉令牌。                                                                 |
| `locales/`、`public/`                             | 翻译文案；固定 URL 原样发布的资源。                                                      |
| `contracts/`（待交付）                            | 固定 OpenAPI 快照与对应后端版本；普通开发不要求启动后端。                                |
| `docs/`、`scripts/`、根配置、`.github/`           | 入库规范、校验与 CI；`design/` 是被忽略的本地产品／原型记录。                            |

按职责分目录，内部按需用一致的业务名分组，每个页面都建独立目录和 index.vue；其余子目录按需建立，不要求每个业务都有 store、repository 或 index。路由入口使用 index.vue，其他 Vue 文件使用 PascalCase，其他自命名文件／目录使用 kebab-case；既有外部约定保留。组件／composable 测试与所属源码相邻，页面入口测试归 pages/<page>/tests/index.spec.ts。

<!-- AI modified: page roots contain one entry, with support code grouped by responsibility. -->

每个页面根目录只有 `index.vue` 这一个文件，保持有意义的组件 name。私有组件和组件测试归 components/，composable 及相邻测试归 composables/，页面入口测试归 tests/index.spec.ts；指导统一归 src/pages/AGENTS.md。按实际文件建立子目录，简单页面只保留 index.vue。局部组件、composable 及测试使用原有命名。页面私有文件只供本页面消费，其他页面、布局和顶层共享代码不得引用；有真实共享需求时先提取共同职责。router 引用页面入口，测试可以验证自己页面的私有文件。目录不要求匹配 URL 的层级。

当前六个页面为 login、dashboard、users、assistant、assistant-settings、accept-invitation；登录私有文件分别位于 login/components、login/composables 与 login/tests，用户页入口测试位于 users/tests。助手工作区／配置、会话、主题、通用表格保持共享归属。API／HTTP 和纯类型的既有职责不变。

<!-- AI modified: related files share an owner name across responsibility layers. -->

助手的相关文件已按需归入 `api/assistant/`、`composables/assistant/`，与 `components/assistant/`、`types/assistant/` 使用一致业务名；测试与源码相邻，不为分组新增 index.ts。会话、用户 API 及认证、主题、通用表格 composable 仍是少量独立文件，可以平铺。文件保留明确的业务名和 use- 前缀；表单运行时辅助文件 `active-field-values.ts` 表明仅提交可见字段的职责。页面目录不必匹配 URL 层级，assistant-settings 是配置页面入口，assistant 是共享业务名。`lib/utils.ts` 是 shadcn 配置的既有别名，外部约定保留。

测试文件沿用源码文件名并加 `.spec`，例如 `LoginForm.spec.ts`、`use-theme.spec.ts`、`verify-architecture.spec.mjs`；Vue 组件测试保留组件的 PascalCase 文件名。页面入口测试仍为 tests/index.spec.ts。

## 类型归属

自有 interface／type 放入 `src/types/<拥有者>/`，例如 `users`、`assistant`、`form`、`http`；各文件直接引用，不建立导出全部类型的总 index。API 使用业务契约，不引用页面草稿或组件 props 类型。

类型文件只包含 interface／type 及 type-only 导入／导出，只引用其他集中类型或第三方类型；不能通过 `ReturnType`、`typeof import()` 等反向引用实现。函数、class、enum、运行时常量和 Zod schema 留在实际拥有它们的模块。

第三方组件、框架声明和测试专用局部辅助类型保留约定／相邻路径。类型集中不改变业务可见性，也不意味着所有类型都可以任意跨业务引用。

<!-- AI modified: keep concept ownership independent of implementation file names. -->

类型文件按稳定的业务／能力概念命名，不与 service、composable 或组件文件一一对应。同职责的小类型可合并；接口契约、UI 草稿、内部持久化记录和外部协议分别归属。按需分组，不预建空目录，不建立全局类型 barrel。

当前分组示例：`types/users/user.ts` 定义账号契约，`invitation.ts` 定义邀请契约，`drafts.ts` 定义 UI 草稿；`types/assistant/model.ts`、`conversation.ts`、`configuration.ts` 分别归模型、对话和个人配置。通用表格的小型 props 合并到 `types/data-table/component-contracts.ts`；表单字段、上传能力和组件契约分别管理。API 不引用 `drafts`、`component-contracts`、`reading-position` 或 `answer-content` 这类展示概念。

## 状态与授权

Vue Query 持有服务端资源和缓存；Pinia 持有跨页面客户端状态／流程；组件和 composable 持有局部交互。表单编辑草稿可以单独持有。布局承载 UI，业务模块负责流程，由应用显式组合生命周期。

后端 DTO／OpenAPI 是接口来源，固定快照和生成类型入库，API 函数显式编写并使用统一 HttpClient。前后端 CASL 使用代码声明的 action／subject、后台维护的角色授权、服务端生成的当前用户规则。HTTP 与 AI 共用受授权保护的操作服务；AI 写入前显示提议并获得用户确认。

以上是已确认的目标；CASL 目前只安装依赖，固定契约生成、角色权限和 worker 拆分尚未实施。

## 检查与当前迁移清单

执行 `pnpm verify:architecture` 检查 API／HTTP 依赖方向、通用组件的业务依赖、集中类型的运行时代码及反向依赖，并检查页面独立入口、根目录仅有 index.vue、私有组件／composable 分组、私有文件越界引用与私有 UI 直接调用 HTTP。检查覆盖路径别名、相对路径、Vue script、字面量动态导入和 import type 查询；`pnpm test:architecture` 验证禁止的依赖确实失败。完整验证入口为 `pnpm verify`，CI 使用同一入口。

已完成：页面独立目录与 index.vue 入口、登录私有部件就近、共享部件／布局分离；生产纯类型集中；API 与 HTTP 分开；请求选项和现有行为保留。未预建 stores、authorization、generated 等空目录。

以下是明确的剩余迁移项，不是已完成能力，也不是 import 检查的宽泛豁免。它们的状态归属和业务复杂度需要代码评审与行为测试，不能仅靠 import 判断。

| 文件                                                                                           | 当前差距                                              | 迁移步骤                                          |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| `src/api/*` 与 `src/types/users/user.ts`、`src/types/assistant/*`、`src/types/auth/session.ts` | 当前接口字段仍手写；固定契约／生成类型尚未建立。      | 1：契约与 API／HTTP。                             |
| `src/api/assistant/assistant-api.ts` 与 `src/composables/assistant/use-assistant.ts`           | 助手请求仍是通用 path 分发，端点知识留在 composable。 | 1：改为显式端点函数并接入固定契约。               |
| `src/pages/users/index.vue`                                                                    | 现有 Query／mutation 流程仍由页面持有。               | 2：状态与布局职责，抽取查询／操作 composable。    |
| `src/composables/assistant/use-assistant.ts`                                                   | 共享客户端状态和服务端资源副本仍在 module scope。     | 2：服务端资源归 Query，客户端草稿／选择归 Pinia。 |
| `src/composables/assistant/use-assistant-configuration.ts`                                     | 配置响应和显示缓存仍在 composable 中。                | 2：明确 Query 与显示缓存的归属，保留账号隔离。    |
| `src/layouts/DefaultLayout.vue`                                                                | 仍承接助手轮询启停和抽屉恢复。                        | 2：业务模块拥有流程，应用组合生命周期。           |
| `src/composables/use-auth.ts`                                                                  | 会话状态目前由模块持有，保留可信 Cookie 会话校验。    | 2：评估应用级身份状态归属，不改变认证协议。       |

后续依次实施 CASL 授权（3）、按需 repository／adapter（4）、独立 worker 与恢复（5）。新增代码遵守目标分工；不扩大遗留例外，每完成一步删除对应记录。

## 新增业务

以订单为例（不是新增订单功能）：服务端 `modules/orders` 定义 DTO、操作服务和权限，后端内部类型就近归该模块；前端业务契约归 `types/orders`；仅有真实需求时增加 repository／adapter 或稳定公开入口。更新固定 OpenAPI，生成前端 `types/generated`，编写 `api/orders` 请求；页面专属查询／写入流程归 `pages/orders/composables`，UI 归 `pages/orders/components`，入口为 `pages/orders/index.vue`，入口测试归 `pages/orders/tests/index.spec.ts`；真正跨页／跨容器的流程归 `composables/orders`，业务 UI 归 `components/orders`，只有跨页客户端状态才建 store。登记路由。通用表单／表格只接配置和 adapter。完成类型、lint、行为测试、构建及目录检查，更新实现状态。
