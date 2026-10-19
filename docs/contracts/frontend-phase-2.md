# Phase 2：核心组件与 Mock 完整流程

日期：2026-10-16。状态：本方案规定的 Phase 2 已实施并完成本地验收；实际记录见第 8 节。后续首版能力及真实联调不计为完成。返回 [PRD](../prd.md)。承接 [Q226](../decisions/226-frontend-delivery-order.md) 与 [Phase 1](frontend-foundation.md)。

后续 HTTP 封装已按用户认可的 [客户端设计](http-client-redesign.md) 迁移到原生 Axios 拦截器与方法入口；该设计记录新增能力和 HTTP 重构／移除 qs 后的验收。本文件第 8 节保留 Phase 2 最初验收证据。

## 1. 目标与边界

固定联系人示例通过 MSW HTTP Mock 跑通搜索、分页、新增／编辑、校验、保存刷新、明确失败和未知写入；公共组件不依赖联系人 API。

本阶段交付 SchemaForm 的 input／switch、FormDialog、DataTable 搜索／分页／单列排序／当前页选择／渲染扩展、Axios／Vue Query 与未知写入跨弹窗及同标签刷新保护。FormDrawer、其余七类控件、完整布局／异步选项／联动、列布局持久化、URL 同步、认证／权限／路由／真实后端留待后续，不导出占位能力。

## 2. 依赖与工程

新增依赖精确版本统一进入默认 pnpm catalog：@tanstack/vue-form 1.33.5、@tanstack/vue-query 5.104.3、@tanstack/vue-table 9.3.1、Zod 4.6.7、Axios 1.20.0、vue-sonner 2.0.9；MSW 3.0.3 为开发依赖。保留既有版本范围与 Vite Plus core alias，不安装 ESLint 或额外框架可选 peer。

表单使用 Standard Schema，无旧 Zod adapter；Table 使用 v9 useTable／tableFeatures。shadcn-vue 基础源码与自有封装分开。公共代码按 form／table／modal／http／query 归属，业务示例在 examples/contacts。

新增 dev:examples，examples mode 独立 HTML 入口、QueryClient、通知和固定示例身份；MSW 的 msw/vite 插件提供 virtual:msw，等待启用后挂载，失败不请求真实服务。生产入口不能引用示例；独立 CSS 扫描示例，生产构建不包含示例数据、地址或 worker。示例纳入类型、Lint、格式、边界和测试，不新增 Router／Pinia。

## 3. 示例与接口

Contact={id:string,name:string,email:string,enabled:boolean}；编辑模型无 id。默认空姓名／邮箱、enabled=true。姓名非空且最长 50，邮箱有效且最长 254；不隐式 trim 或改大小写。Mock 邮箱不区分大小写判重。搜索={keyword:string,enabledOnly:boolean}。固定 53 条种子记录，显式重置，无随机失败。

接口均为示例专属：GET /_examples/api/contacts、GET /_examples/api/contacts/:id、POST /_examples/api/contacts、PATCH /_examples/api/contacts/:id、GET /_examples/api/operations/:operationId。列表参数 keyword／enabledOnly／page／pageSize／sortBy／sortOrder，页码从 1 开始；姓名／邮箱可排序，ID 保证稳定次序。成功 {data}，分页 data={records,total}；错误 {code,message,fieldErrors?,requestId} 与正确 HTTP 状态。

Mock 用独立 IndexedDB 保存联系人及操作记录，与客户端 sessionStorage 未决标记分离。写成功后丢失响应必须真实保存，刷新不重置服务器状态。本契约不作为正式后端 OpenAPI。

## 4. 公共行为

### HTTP／Query

Axios 超时 30 秒、消费 AbortSignal、统一解包与错误；不通知／导航／重试。Query staleTime=30000、gcTime=300000，网络／超时及 500／502／503／504 最多重试一次，间隔一秒；取消／明确业务错误不重试。最终读取失败由 QueryCache 唯一通知，旧身份及没有有效观察者的请求不通知当前页面。

写入 retry=false，不离线排队。发送前已知离线返回未执行，发送后断网视为未知。字段错误归表单，未知路径一次表单级反馈。资源持有含身份、条件、页码和排序的查询键；tableId 不是查询键。成功更新详情并失效列表；列表刷新失败不改写保存成功结果。

### SchemaForm／FormDialog

SchemaForm 是唯一字段状态源，FormDialog 负责 context 快照、load、submit、saved 和受保护 v-model:open。load 返回完整值；新鲜完整详情可复用，编辑快照不被后台缓存覆盖。submit 只写入，saved 不承担可等待的关闭决定。

字段路径、string／boolean、input／switch 和校验强关联。隐藏／业务禁用默认不校验且省略，submitWhenHidden／submitWhenDisabled 可覆盖；只读保留且不作输入校验；临时提交锁不剔除字段。只将可能省略路径变为可选，覆盖嵌套类型。Zod 不隐式转换提交值，控件 props 不覆盖值／事件／交互锁／错误关联。

首次失焦／提交展示错误，已有错误修改时更新；提交失败才聚焦。field-<path> 插槽优于 render，公开受控更新、失焦、有效状态、关联 ID、焦点和临时输入登记，不公开可变引擎。

公开 validate／submit／reset／focusField；容器另有 requestClose，状态只读，命令有明确联合结果。初始化前不提交，提交中锁输入／重置／关闭／重复写。失败保留输入；成功收尾关闭；动画完成再清理，旧代次不能污染重开实例。dirty 比较业务快照和未完成输入，关闭／重置可确认取消；搜索草稿不触发业务丢弃保护。

### DataTable

直接 props：tableId、query、columns、searchFields、searchDefaults、selectable、queryContext、queryEnabled，补充 getRowId／isRowSelectable／pageSize／pageSizeOptions。默认 id 行键、20 条，可选 10／20／50／100。query 接收独立 context／search／page／pageSize／sort 返回 Vue Query 配置和 records／total；服务器结果不再次本地分页／排序。

列有稳定 ID、标题、类型化读取／render、允许的服务端排序；cell-<id> 空插槽仍优先。toolbar 提供只读状态与命令。公开 refresh／submitSearch／resetSearch／clearSelection 及只读选择／请求状态，不导出未实现 resetLayout。

草稿只在搜索／Enter 校验成功时应用；翻页／刷新保留草稿。搜索、页大小、排序重置页码并清选择；context 语义变化原子切换、保留草稿／搜索／排序，等价对象不重置。当前查询无缓存显示加载，同查询后台刷新保留结果；刷新成功取可选 ID 交集，失败保留选择。queryEnabled=false 显示等待且清选择／隐藏旧行，重新启用不提交草稿。重复／缺失 ID 报契约错误。

### 未知写入

useResourceMutation 组合 Vue Query mutation 与公共操作登记；资源提供身份、资源／动作／目标、写入、核实和缓存更新。发送前生成 operationId 并登记，示例请求头传递；新增共用新增冲突范围，编辑按 ID。关闭重开／新鲜缓存不能绕过保护。

发送后超时／断网／不能证明未执行的 5xx／非法响应进入未知，允许关闭但不能重复写。可读取时自动核实一次并记录尝试，重开／刷新不形成轮询；显式手动核实可重复。只有成功／明确拒绝解除，处理中／找不到／无法确认持续保护。无自动重发。

sessionStorage 白名单仅含版本、账号、操作／资源／动作／目标、状态和尝试信息，无凭据／表单内容。身份就绪再恢复，损坏不驱动请求，存储失败告知刷新恢复不可用但保留内存保护。切号清标记并使旧任务失效；迟到响应不能更新新身份或新实例。固定示例身份仅验证协调，不能算真实认证验收。

## 5. 实施与验收顺序

1. 文档及范围落地；安装依赖，先完成强类型正负样例。
2. 示例入口、HTTP、Query 和固定 Mock 数据。
3. SchemaForm、确认和 FormDialog，验证加载、失败、锁定和重开。
4. DataTable 与联系人组合，验证搜索、分页、选择、插槽和刷新。
5. 未知写入登记、核实、刷新恢复、存储失败和身份隔离。
6. 全面验收并回写记录。

类型样例必须拒绝错路径／控件／值／context／Query 返回值／行类型；条件省略和嵌套字段不能破坏确定字段。测试覆盖 false／空串、隐藏／禁用／只读／提交锁、服务端错误、dirty／焦点、旧任务、重复提交。

列表覆盖草稿隔离、原子切换、一次重试／通知、缓存隔离、刷新失败保留、空插槽、禁用状态和行键。未知写入覆盖成功丢响应、关闭重开、在途及未知后刷新、至多一次自动核实、身份变更、迟到结果、标记损坏及存储故障；标记无表单／凭据。

Playwright 独立上下文与固定可重置数据，验证新增／编辑、搜索分页、关闭确认、错误与未知恢复；键盘、错误聚焦、标题、焦点返回以及 1280×800／1440×900。保留基础工程开发／生产测试，示例流程仅开发验收，生产验收排除示例。

vp run verify 包含示例类型／边界；verify:all 包含测试、构建、产物隔离和浏览器；另执行干净冻结锁文件安装。只有全部通过才标记完成，报告区分 Executed／Inspected／Assumed，不自动提交／推送或宣称生产部署完成。

## 6. 开发入口与实际接入

```sh
vp install --frozen-lockfile
vp run dev:examples
# 打开 http://localhost:5173/examples/contacts/，端口以启动输出为准
```

示例通过顶部“模拟场景”显式选择正常、读取失败、保存明确失败、保存成功但刷新失败、响应丢失、响应丢失且暂不能核实、写入成功但延迟响应。场景与数据一起保存在示例 IndexedDB；“重置示例”显式恢复 53 条种子和正常场景。在编辑或写入进行中禁止重置。独立控制接口 GET／POST /_examples/api/scenario 与 POST /_examples/api/reset 不对正式业务开放。

入口文件是 [examples/contacts/main.ts](../../examples/contacts/main.ts)，完整调用样例是 [ContactsExample.vue](../../examples/contacts/ContactsExample.vue)。生产入口仍为 Phase 1 的最小页面。

### 公共代码分工

| 文件／目录 | 实际职责 |
| --- | --- |
| [form/types.ts](../../src/components/form/types.ts) | 路径／值／控件关联、条件省略、字段插槽与命令联合类型 |
| [SchemaForm.vue](../../src/components/form/SchemaForm.vue) | TanStack Form 唯一值树，按 Standard Schema 协议执行字段校验、提交快照、错误与输入扩展 |
| [FormDialog.vue](../../src/components/form/FormDialog.vue) | context 快照、读取代次、实例锁定、关闭与卸载；仅允许 create 或带 id 的 edit 上下文 |
| [DiscardDialog.vue](../../src/components/modal/DiscardDialog.vue) | 可等待的确认；确认、取消、卸载均结束本次等待 |
| [DataTable.vue](../../src/components/table/DataTable.vue)／[types.ts](../../src/components/table/types.ts) | 查询协调、服务器分页与排序、当前页选择、列与插槽、明确命令结果 |
| [http/client.ts](../../src/http/client.ts)／[api-error.ts](../../src/http/api-error.ts) | Axios 与响应边界校验，传输错误证据及读取重试分类 |
| [query/runtime.ts](../../src/query/runtime.ts) | QueryClient、身份代次、统一通知、身份就绪后的恢复 |
| [use-resource-mutation.ts](../../src/query/use-resource-mutation.ts)／[operation-registry.ts](../../src/query/operation-registry.ts) | 写入冲突登记、核实、白名单持久化、旧任务隔离 |
| [examples/contacts/api.ts](../../examples/contacts/api.ts) | 联系人资源请求、查询键、编辑 DTO、只读核实 |
| [handlers.ts](../../examples/contacts/handlers.ts)／[mock-store.ts](../../examples/contacts/mock-store.ts) | MSW HTTP 接口与独立持久化的模拟服务状态 |

### FormDialog 调用约束

```vue
<FormDialog
  v-model:open="isEditorOpen"
  :context="editingContext"
  :fields="contactFields"
  :load="loadForm"
  :submit="saveForm"
  :blocked="blocked"
  @saved="toast.success('保存成功')"
/>
```

- 字段数组建议 `as const satisfies readonly FormField<ContactFormValues>[]`，保留字段路径和条件省略的精确类型；`load` 显式返回完整编辑模型。回调 `submit` 接收根据字段省略规则计算的提交类型。
- `load(context)` 不持有表单；资源层可用 QueryClient 复用详情；`submit(values, context)` 明确构造业务 DTO，不能依赖控件隐式转换。
- `saved` 的载荷为 `{ context, saved }`；FormDialog 先完成成功关闭，再发通知，不等待事件处理器完成。
- `field-<path>` 插槽与字段 render 的 value／update 按该路径推断。`actions` 插槽提供 submit、reset 和只读 isSubmitting／isDirty；这些命令与默认按钮和 ref 完全相同。
- `submit()` 返回 success（附 saved）、validation-failed、failed、unknown 或 not-executed；`reset()`／`requestClose()` 返回 completed、cancelled 或 blocked。`validate()` 返回是否通过，`focusField(path)` 返回是否找到可编辑目标。
- 本阶段的编辑值和上下文为 JSON 可序列化快照；字段支持 string／boolean 及对象嵌套路径。Date、File、数组编辑器等随后续控件协议补齐。
- 未知结果一旦出现，本次编辑实例不再重复提交；即使稍后核实成功，也须关闭后重新打开。资源冲突标记另行管理，核实成功／明确拒绝后才解除，其他记录不受影响。

### DataTable 调用约束

```vue
<DataTable
  table-id="example-contacts"
  :query="listQuery"
  :columns="columns"
  :search-fields="searchFields"
  :search-defaults="searchDefaults"
  selectable
>
  <template #toolbar><Button @click="openEditor({ mode: 'create' })">新增联系人</Button></template>
  <template #cell-enabled="{ row }">{{ row.enabled ? '已启用' : '已停用' }}</template>
</DataTable>
```

- query 工厂返回 `TableQuery<Row>`，目前允许 queryKey、queryFn、enabled、staleTime、gcTime；查询结果必须为 `{ records, total }`。不开放任意 placeholderData／select 等配置绕过表格契约。
- `DataTableColumn<Row>` 的 field／sortField 受行类型约束；read／render 接收原始行。cell 插槽中的 row 保留该类型，value 是 unknown，需按本列业务含义收窄。
- toolbar 提供 `DataTableHandle<Row>` 中的选择、请求状态与 refresh／submitSearch／resetSearch／clearSelection。默认组件无额外分页 v-model 或未确认 emits。
- 请求命令结果为 success、failed、validation-failed、not-executed 或 superseded；新条件请求由 observer 触发，命令等待同一次请求，不重复发送。

### 写入接入与恢复边界

资源调用 `useResourceMutation({ resource, scope, write, verify, onConfirmed, onUncertain })`。scope 给出资源、动作和冲突目标；write 接收 operationId；verify 只读取证据。onConfirmed 更新完整详情并失效列表；onUncertain 使可能受影响的缓存失效，不能根据仍新鲜的详情解除保护。示例的失效回调不等待列表刷新，最终读取错误由 QueryCache 单独处理。

同一资源建议在页面或更长生命周期建立一个协调实例，组件卸载调用 dispose；未决标记属于 runtime，不能由弹窗销毁清理。identity 为 null 时不能发送或恢复；context 应在身份变化时变化。正式身份适配、跨标签页协调、服务端幂等和核实证据仍须真实接口阶段验收。

格式损坏的持久化标记不触发请求，并明确提示无法恢复；存储不可用时只承诺当前内存保护。没有把找不到操作、网络失败或非法响应当作允许重试的证据。没有实现离线写入重放或轮询。

## 7. 工程差异与维护说明

- 计划中的七个版本按原值安装。shadcn-vue 2.8.2 生成组件额外需要 `@vueuse/core`，实际安装 15.0.0，使用既有 catalog 机制管理。
- vue-demi 0.14.10 的 postinstall 已检查为选择当前 Vue 适配文件，仅批准该精确版本；没有广泛放开依赖安装脚本。pnpm 对指定 Vue Query 5.104.3／query-core 5.104.3 保留精确 minimumReleaseAgeExclude，不修改全局发布年龄策略。
- NativeSelect 生成源码的 update:modelValue 参数修复为 Vue emits 元组。Input／Switch／Field／Dialog／AlertDialog／Table／Checkbox 等仍以生成源码为基础，自有行为集中于 form／table／modal。
- `src/styles/main.css` 收录 shadcn-vue 2.8.2 `dist/tailwind.css` 的状态 variants，供 checked／unchecked／open／closed 等生成类使用；不将整个 CLI 加为运行依赖。生成器附加的外部字体导入已移除，继续使用系统字体。后续重新生成组件时同步检查状态 CSS 和依赖。
- Vite 按模式隔离预构建缓存；Playwright 进一步使用单独的 E2E 缓存，避免并行开发／示例服务互相覆盖依赖文件。普通开发扫描 index.html，examples 模式扫描独立入口。
- `virtual:msw` 是唯一静态解析例外，仅允许 examples/contacts/main.ts 引用；其他未解析导入仍报错。生产构建额外检查模块所有权，产物脚本检查示例路径、固定数据与 worker。

## 8. 实际交付与验收记录

Executed，2026-10-16：本方案的本地完整流程已实现。实际安装版本如下，既有基础工程版本未附带升级。

| 依赖 | 安装版本 |
| --- | --- |
| @tanstack/vue-form | 1.33.5 |
| @tanstack/vue-query／query-core | 5.104.3 |
| @tanstack/vue-table | 9.3.1 |
| zod | 4.6.7 |
| axios | 1.20.0 |
| vue-sonner | 2.0.9 |
| msw（dev） | 3.0.3 |
| @vueuse/core（生成控件所需） | 15.0.0 |

### 已执行的工程检查

- `PLAYWRIGHT_CHANNEL=chrome vp run verify:all` 完整入口退出 0：类型、Oxlint、Oxfmt、依赖边界、测试、生产构建、产物隔离与浏览器均通过。
- 11 个测试文件共 **39 项测试**通过；包括实际 Vue 模板正负向泛型编译、条件省略类型、字段扩展／焦点／未完成输入、弹窗旧读取隔离、草稿与请求协调、HTTP 错误、共享查询通知、未知操作和存储故障。
- Playwright 共 **12 项测试**通过：10 项联系人示例验收及 Phase 1 开发／生产各 1 项。使用独立 Chrome 测试上下文，覆盖正常流程、明确失败、写成功刷新失败、未知结果关闭／刷新恢复、在途刷新、单次自动核实、字段错误、键盘聚焦、焦点返回、1280×800／1440×900，以及生成控件实际状态样式。
- 依赖边界扫描 **138 个模块、457 条依赖**通过；负向用例证实生产引用示例、误用 virtual:msw 和其他未解析导入均被拒绝。
- 生产构建通过；构建模块检查及 `check:production` 排除了示例模块、Mock API、种子标识与 worker。独立 Tailwind 入口仅在示例中扫描 examples。
- 在没有 node_modules 的独立临时目录执行 `vp install --frozen-lockfile`，从本机内容缓存安装 **324 个包**成功，随后 `vp run type-check` 通过。冻结安装未改锁文件。catalog 检查验证所有直接依赖仍使用默认 catalog 引用。
- ego-browser 实际新增联系人并检查页面，截图复核后补齐 shadcn 状态 variants；对应开关、复选框与弹窗动画的浏览器断言已通过。

Inspected：成功缓存更新和失败通知分开；联系人 DTO 显式构造；HTTP 无自动重试和 UI 副作用；客户端标记白名单不含凭据或编辑值。字段配置可为响应式对象，Zod 校验读取原始 schema，避免代理破坏 Zod 内部不可配置属性。确认动作在捕获阶段记录决定，避免底层关闭事件先将确认当作取消。

Assumed／未验证边界：固定示例身份只能证明前端代次隔离，不能证明正式认证、权限、Cookie／CSRF、跨标签协调、真实后端事务／幂等／核实、部署或上线完成。浏览器验收使用本机 Chrome，未运行 Firefox／Safari；干净安装复用了本机包缓存，未模拟空下载缓存。FormDrawer、其余七类控件、跨字段与远程联动、列布局持久化、URL／路由／标签及正式业务仍按 PRD 后续阶段补齐。没有提交、推送或部署。
