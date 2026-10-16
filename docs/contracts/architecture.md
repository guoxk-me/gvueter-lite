# 工程目录、依赖与运行契约

返回 [PRD](../prd.md)。依据：前端 Q36–43、Q187–195；后端 Q1–54、整体复查 Q56。前端目录为已确认方案，Phase 1 已创建最小源码并完成本地验收，详见 [基础工程记录](frontend-foundation.md)；后端基础工程有历史交付记录，业务目录仍为设计。本文不将目录树视为实际文件清单。

## 1. 前端目录

沿用 Q195 原目录示意，省略部分页面与工程文件；仅在有实际实现时创建目录，不建立空壳。

```text
src/
  main.ts                    # 创建应用并调用初始化
  bootstrap.ts               # 组合配置、状态、路由等初始化步骤
  App.vue
  pages/                     # 业务页面，私有组件和逻辑就近
    system/users/
    system/roles/
  components/
    ui/                      # 引入的 shadcn-vue 基础 UI 源码
    form/                    # 配置表单与公开入口
    table/                   # 请求表格、展示表格与公开入口
    modal/                   # 通用弹窗、确认行为
    drawer/                  # 通用抽屉
  layouts/                   # 后台布局、侧栏、标签栏
  router/                    # 源码路由定义、注册和守卫
  api/                       # 手写业务 API，按资源分组
    users/                   # 用户请求与用户查询键
    roles/
  http/                      # Axios、响应及传输错误处理
  query/                     # QueryClient、通用查询默认规则
  auth/                      # 身份恢复、登录退出及会话协调
  permissions/               # CASL 能力与权限判断
  stores/                    # 标签、显示偏好等跨页客户端状态
  composables/               # 确有复用需求的通用组合逻辑
  config/                    # 品牌、默认值、部署输入校验
  locales/                   # 简中／英文资源和 i18n 初始化
  types/                     # 共享纯类型及生成的 API 类型
  styles/                    # 全局样式和主题
  assets/                    # 图片、字体等静态资源
examples/                    # 开发示例页面和独立模拟场景
tests/e2e/                   # 跨页面浏览器流程
tests/fixtures/              # 共享测试夹具
openapi/                     # 显式同步并提交的接口规范快照
scripts/                     # 契约同步、边界检查等实际脚本
docs/                        # PRD、架构说明及接入文档
```

- pages 组合能力并调用 api，私有组件／逻辑就近；其他页面不能直接引用私有文件，稳定共享职责再提取。
- components/ui 保存引入的 shadcn-vue 源码，自有 form／table／modal／drawer 按能力组织。通用能力不引用 users／roles 等具体 API。
- api 按资源组织手写请求与查询键，只依赖 http 和契约类型；query 管通用运行规则，不重复管理资源 key。服务器资源不复制到 Pinia。
- auth 协调身份恢复、登录与退出；permissions 管 CASL 能力，router 消费两者。http 不反向引用 router／pages，不增加全局事件总线作为默认桥接。
- stores 只管跨页客户端状态；局部状态留组件／页面，能力私有 composable 留能力目录。types 放按归属共享的纯类型，运行时校验、错误类留实现侧。
- config 管开发默认与部署输入校验；可变偏好由 stores 及持久化负责；locales 管前端文案。Vue 组件 PascalCase，其他文件 kebab-case，严格 TypeScript，避免 any。
- 自有公共能力显式维护小型公开入口，内部直接相对导入；不设全项目总入口、万能 utils、空分层、packages 工作区或插件平台。

## 2. 自动导入、示例与验证

Vue 常用函数与明确名单内的 shadcn-vue 基础 UI、自有公共组件可自动导入；自有组件解析到其公开入口。业务 API／逻辑／类型显式导入，页面私有组件不扫描。TS／渲染函数中的组件值显式从公开入口导入；Phase 1 的实际名单为 computed、shallowRef 和 Button，使用 unplugin-auto-import／unplugin-vue-components；声明位于 src/types 并随源码保存。后续扩展须同步名单与声明。

局部组件／函数测试就近，跨页面浏览器测试及共享夹具集中。少量可运行开发示例使用固定可复现模拟数据，必须从生产入口、路由和构建依赖中排除，不默认成为第二套应用；可选真实接入按契约切换，不将模拟结果当真实验收。

提供快速／完整验收两个入口。快速支撑日常开发；完整交付覆盖类型、Lint／格式、边界、必要测试、Build 和关键浏览器流程，实际入口为 vp run verify／verify:all，职责见基础工程记录。违规导入的反例必须证明边界检查有效：API 不反依赖 UI／页面、通用能力不依赖业务、页面私有代码不能跨页引用。

[Q227 修订决定](../decisions/227-frontend-check-tooling.md) 已确认不使用 ESLint 工具链，按以下分工执行；Phase 1 的精确版本和配置已通过本地兼容验证，后续能力依赖仍需逐项验证。

| 责任 | 承担者 |
| --- | --- |
| 开发／构建／单元测试 | Vite Plus 的 dev／build／test |
| 通用 JS／TS 代码规则 | Vite Plus 内置 Oxlint |
| 格式化 | Vite Plus 内置 Oxfmt，不另设独立 Prettier 格式任务 |
| Vue 应用类型检查 | vue-tsc；工具配置等独立 TS 项目按实际范围补充 |
| 依赖边界 | 经违规反例验证的规则／检查脚本，具体实现随兼容验证确定 |

不接入 ESLint、其插件／解析器／配置或规则兼容层，也不为补齐规则自行实现通用模板 linter。Oxlint 自带规则仍按实际能力启用，不因规则来源名称而一并关闭。Oxlint typeAware 须验证 Vue 导入与 tsconfig 兼容；类型感知 lint 和类型检查分别管理，不默认重复跑两套完整类型检查。Vue 模板的类型问题由 vue-tsc 检查，语法／编译和关键行为通过构建、必要测试及浏览器验证覆盖；这些检查不等价于完整模板 lint 规则集。完整验收仍需组合类型、边界、测试及构建，不能只以 vp check 通过作为交付证据。

新增依赖先检查现有能力，但不能以“库已有机制”否定模板承担完整协调职责。

## 3. 参考后端目录与模块

采用官方 Nest typescript-starter、NestJS 12＋原生 ESM＋Express＋PostgreSQL＋TypeORM，pnpm 管理。v2 目录替代旧 app／infra 方案，保留基础阶段 Starter 根示例，不因树中省略就获准删除。

```text
config/
  default.yaml                    # 单份可提交的非敏感运行配置
.env.example                      # env 字段说明与示例
.env                              # 可选本地覆盖，不提交
src/
  main.ts                         # HTTP 启动／关闭
  app.module.ts                   # 根模块及全局能力装配
  config/
    configuration.ts              # YAML＋env 读取、组合、校验与类型
    configuration.spec.ts
  database/
    database.config.ts            # 本应用 TypeORM 选项及显式实体登记
    database.module.ts            # Nest 连接生命周期装配
    data-source.ts                # 独立迁移 CLI 入口
    migrations/                   # 项目级迁移统一序列
  logging/                        # 结构化日志与请求关联
  health/                         # 免登录最小状态存活／就绪探针
  modules/
    identity/                     # 身份入口与跨模块协调
    users/                        # 账号、凭据、状态与角色关联
    sessions/                     # 会话生命周期
    access/                       # 角色、权限与授权能力
  common/
    http/                         # 中立 HTTP 契约、通用响应／错误处理
    types/                        # 真正跨职责且不属于某业务的类型
  commands/                       # 初始化／恢复等业务 CLI，出现时创建
test/
  integration/                    # 跨模块、真实数据库、事务／迁移
  e2e/                            # HTTP 链路，区分轻量示例与真实业务
  fixtures/                       # 隔离数据库／应用／迁移测试夹具
scripts/                          # 边界检查等开发工具，有实现时创建
```

| 归属 | 责任与边界 |
| --- | --- |
| identity | HTTP 身份入口与跨模块账号／角色／会话流程；调用公开 Service，不拥有另一套业务实体 |
| users | 账号、凭据、状态、角色关联；实体与 Repository 私有 |
| sessions | 会话生命周期、期限、活动与撤销 |
| access | 角色、权限、授权能力 |
| config | YAML／env 读取、组合、校验与类型，不依赖实体／数据库连接／业务 |
| database | 本应用持久化接入、Nest／CLI 共用选项、显式实体登记与迁移 |
| logging／health | 技术运行能力，由根模块装配，不反向读业务私有数据 |
| common | 语义中立且确有跨职责用途的 HTTP 契约／类型；不收业务身份和规则 |
| commands | CLI 生命周期与参数，调用公开业务能力；不复制规则 |
| scripts | 开发检查脚本，不承载业务规则 |

默认 Controller → Service → TypeORM；普通 Module／Service／DTO／实体就近，复杂职责出现才分组。不提前增加自定义 Repository、Facade、逐操作 UseCase 或模块生成器。

## 4. 后端依赖、事务与持久化

identity 单向调用 users／sessions／access 的公开能力；这三个叶模块不反依赖 identity，也不相互调用公开 Service 或引用彼此私有实体／仓库，跨模块身份流程由 identity 协调；不能借 EntityManager 绕过数据归属。config／common 不导入具体业务模块或数据库装配入口；共享纯类型也不能成为绕过依赖方向的通道。直接导入允许公开的 Module／Service／类型文件，不设统一 public.ts；源码白名单与 Nest imports／exports 分别检查。

后端 HTTP 默认认证，公开入口显式声明，由根应用装配 identity 的全局认证 Guard；叶模块不为 Guard 反向依赖 identity。请求身份经可信 Guard 校验后显式传入业务 Service，只含必要字段，不包含口令、散列或原始 Cookie；CLI 不伪造 HTTP 会话。跨模块事务由协调流程发起，所有参与者显式复用同一 EntityManager，不能混用全局仓库或另开独立事务。账号／授权的当前业务约束仍须在写事务内重查，不能只依赖请求起始快照。Service 不依赖 Request／Response／Cookie，不使用 ALS 隐式读取身份或传播事务；日志专用上下文不改变这项边界。公开方法返回明确数据类型，不泄漏 Entity／Repository／QueryBuilder。事务提交成功后再处理 Cookie、HTTP 响应及外部副作用。

跨模块使用标量 ID 关联，必要引用通过数据库 FK 保证；模型、删除动作、锁点待业务方案确定。普通组合查询由拥有模块在数据库完成过滤／分页，协调层批量补齐本页关联；不逐行查询，不全量读入内存再分页／过滤，也不承诺固定 SQL 条数或天然同一快照。跨模块字段排序／筛选必须在分页前正确处理，有具体需要再审查专用查询，不能只排序拿到的一页。

关键不变量使用常规事务、共同锁协议／相关行锁、约束、锁后重查与统一锁顺序，覆盖全部入口；精确实现须真实并发测试。

database/database.config.ts 是显式允许读取业务实体元数据的精确装配入口，不豁免整个 database。Nest 与独立 CLI 共享完整实体清单和选项；业务通过 DI 获取连接，不导入 CLI DataSource／最终 options。实体不反向依赖数据库装配，避免登记循环。

项目级 migrations 采用统一序列，生成后人工审查；synchronize 与自动运行迁移保持关闭。迁移从编译后的 DataSource 独立执行，不依赖 Nest DI。FK 元数据与实际迁移约束一致，防止后续生成器错误删除手工约束；具体表达待模型设计。正式模型／迁移另行确认，验证使用隔离一次性数据库。

## 5. 后端运行配置

单份根 config/default.yaml 提供可提交的非敏感默认值，显式 env 字段映射覆盖：进程环境 ＞ 开发本地 .env ＞ YAML。已设置但为空／非法值报错，不回退；不使用 YAML 环境占位符、任意环境变量自动组树或多环境 YAML 叠加。

运行模式在判断是否读取 .env 之前确定。开发可自动读取可选 .env，生产注入环境且不自动读取本地文件，测试显式隔离。秘密不进入 YAML，.env 不提交，.env.example 说明字段。Compose 独立消费部署 env，不假定读取应用 YAML。

每个进程的启动入口只读取、组合、校验一次，创建冻结快照后向 Nest／独立迁移 CLI 分发；ConfigService 不隐式回退环境变量，不修改 process.env，消费者不重读第二套来源。普通模块导入不触发读文件或建连接。共用 schema，但按 HTTP／迁移等入口要求配置组；入口必填不同不代表忽略 YAML 错误、未知字段或已提供非法值；重复键、tag／alias 和非法结构同样拒绝。TypeORM 选项由 database 装配，不任意透传 YAML 开启同步或自动迁移。

配置默认定位不依赖碰巧的 cwd，发行物携带所需 YAML；文件缺失／损坏、关键值非法时明确失败退出。错误给出字段定位，不输出合并配置或凭据。仅启动时读取，不承诺热更新。业务不自行再读取第二套 env／YAML。

## 6. 日志、健康与关闭

后端 Q53 采用 Pino＋nestjs-pino＋pino-http，开发 pino-pretty；业务直接注入 PinoLogger，结构对象优先。框架、HTTP、业务、启动和关闭共享日志配置；不重复注册 HTTP 中间件或保留吞消息的并行日志链。

开发默认 debug＋易读文本，生产 info＋JSON，YAML／env 校验覆盖，生产不依赖开发格式化工具。stdout／stderr 交给平台收集，不默认在应用内新增日志文件平台。

服务端生成可信 requestId 并返回响应头，日志专用上下文关联并发请求，不代替业务身份／事务显式传参。普通请求一条完成／中断摘要；成功健康探针静音，失败及中断保留。摘要与异常详情分开，未预期异常完整诊断只记录一次，常规 4xx 不自动堆栈；无异常的 readiness 503 不伪造异常。

生产保留受控诊断摘要与堆栈，但敏感结构和自由文本分别清洗、有界 cause／体积；不默认输出原始 URL／query、headers、正文、SQL 参数或配置，不展开驱动异常。解析器前错误、无匹配路由、启动早期失败也要可定位且不泄露秘密。调用方不得依赖脱敏器识别任意未标记的秘密文本。

/health/live 与 /health/ready 公开最小状态；存活不依赖数据库，就绪检查关键依赖并考虑启动／关闭，不暴露内部细节。免认证例外仅覆盖明确探针。

整体复查 Q56 A：关闭使用默认 30 秒、可配置总期限，单步失败仍尽力继续清理；正常完整关闭退出 0，致命异常／清理失败／超时退出 1，平台终止期限留余量。SIGTERM／SIGINT 与致命异常共用关闭协调，从进入协调开始计算一个总预算，各步骤不得分别再获得 30 秒；永久挂起也必须受期限约束。重复信号不重复清理或重置预算，失败／超时不得记录为正常 shutdown_completed。须验证挂起、重复信号与前步失败后继续清理。新增要求在迁移时仍待源码与故障验收；不把原 Q53 成功退出记录当作此项已完成。SIGKILL／断电不保证刷新。

## 7. 维护与交付

新增能力先确定职责、公开方法与依赖，更新精确白名单和 Nest 装配；实体登记例外不扩散成任意私有访问许可，测试目录也无通用豁免。类型、动态导入、再导出及路径变体应受边界检查，违规反例证明有效。

后端局部测试就近，跨模块／真实数据库／HTTP 流程集中；共享夹具隔离数据库和进程。快速／完整验收为已确认门槛，完整包括 Type Check、Lint／格式、必要单元／HTTP、Build、真实隔离 PostgreSQL／迁移生成运行回退、ESM 启停和依赖边界；不能跳过依赖环境后宣称完整通过。

README 维护职责、依赖和新增步骤；首个获准实施且验收的真实业务模块作为示例，不复制失效样板或创建虚假业务。无源码实现的目录只代表规划。历史 Q12／Q35／Q53 的版本和执行证据见 [归档](../decisions/interview-archive-2026-10-15.md#legacy-9-73)，以上后端历史证据本轮仅迁移记录，未重跑后端验收。
