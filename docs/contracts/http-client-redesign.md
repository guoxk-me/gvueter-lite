# HTTP 客户端设计与接入

日期：2026-10-16。用户已认可 Axios 原生实例＋原生拦截器＋业务响应处理的设计。本次实施替代先前草案中的自建拦截链、总调用超时及限制 Promise 恢复语义。运行结果与边界见末节；正式认证协议仍依 [身份契约](identity.md)，Query 行为依 [请求与数据契约](http-query.md)。

## 1. 参考与职责

参考 [Axios 实例](https://axios-http.com/docs/instance)、[拦截器](https://axios-http.com/docs/interceptors)、[取消](https://axios-http.com/docs/cancellation) 的原生能力，以及以下模板的组织方式：

| 来源 | 借鉴 |
| --- | --- |
| [Vben RequestClient](https://github.com/vbenjs/vue-vben-admin/blob/main/packages/effects/request/src/request-client/request-client.ts) | 常用 HTTP 方法、独立实例、拦截器及参数序列化 |
| [Vben 应用配置](https://github.com/vbenjs/vue-vben-admin/blob/main/apps/web-antd/src/api/request.ts) | 基础请求和应用策略分开装配 |
| [Pure HTTP](https://github.com/pure-admin/vue-pure-admin/blob/main/src/utils/http/index.ts) | 直观调用入口和 qs；不复制其 token／Store 绑定 |
| [Soybean Axios](https://github.com/soybeanjs/soybean-admin/blob/main/packages/axios/src/index.ts) | 工厂配置；本项目统一抛异常，不引入 flat 双轨或 axios-retry |

源码在 2026-10-16 阅读，链接指向可变上游分支。这里记录结构参考，不表示上游运行验收。

```text
资源 API → 客户端方法 → send → Axios 请求拦截器 → 网络
                         ↑         响应拦截器 ← 响应
                      统一异常
客户端 JSON 方法 → data／body → Zod 校验 → 业务输出
```

`http/` 管传输、响应、错误；`query/` 管缓存、共享请求、读取重试、通知及资源写入保护；表单管字段反馈。HTTP 不 import Vue、Store、路由或具体业务。

## 2. 文件与公共入口

| 文件 | 职责 |
| --- | --- |
| `src/http/client.ts` | 工厂、方法、传输出口、JSON／空正文／文件处理 |
| `src/http/types.ts` | 请求配置、schema 推断、未知原始响应与类型契约 |
| `src/http/params.ts` | 标量参数检查；URL 序列化由 Axios 原生实现 |
| `src/http/api-error.ts` | ApiError 对象参数、传输异常与错误正文读取 |
| `src/http/index.ts` | 公共导出 |
| `src/query/error-policy.ts` | 读取重试与当前示例明确拒绝规则 |

客户端为工厂闭包，不公开可变 Axios defaults。拦截器直接使用原生 manager；不再建设自有注册／注销平台。参数序列化使用 Axios 原生 paramsSerializer.indexes，已移除 qs 与 @types/qs，依赖仍统一由默认 pnpm catalog 管理。

## 3. 创建与 JSON 请求

```ts
import { createHttpClient } from '@/http';

const http = createHttpClient({
  baseURL: '/api',
  timeout: 30_000,
  withCredentials: true,
  arrayFormat: 'repeat',
});

const contacts = await http.get('/contacts', {
  params: { roles: ['admin', 'editor'], page: 1 },
  signal,
  schema: contactPageSchema,
});

const saved = await http.post('/contacts', values, {
  schema: contactSchema,
  headers: { 'X-Example-Operation-Id': operationId },
});

const health = await http.get('/health', {
  response: 'body', schema: healthSchema,
});
```

- `get/delete(url, options)`；`post/put/patch(url, body, options)`。
- `request(config, { schema, response? })` 处理动态方法，config 的请求体字段沿用 Axios 的 data。HEAD／OPTIONS 可通过通用原始／空正文请求使用。
- 默认 response 为 data，要求响应拥有 data 属性，再校验其值。body 模式校验完整 JSON。false、0、空字符串和 null 不用于判断属性是否存在。
- 返回类型从 schema 输出推断，不提供未经验证的 JSON 泛型捷径；同步 Zod schema 可以有明确转换，不能据此改变表单草稿。
- 正文编码沿用 Axios：对象自动编码为 JSON，JSON 标量（如字符串）显式配置 Content-Type: application/json；FormData 不设置该头。联系人 scenario 接口包含字符串 JSON 的实际用例。
- 非法 JSON、包裹错误和 schema 失败均为 contract；保留已知状态与 cause。空正文需要显式入口，不能用空对象假装正确 JSON。
- 请求类型仅公开 headers、timeout、signal、进度、params、arrayFormat；单次业务配置不公开 validateStatus、adapter、transformResponse 或 baseURL。原生应用拦截器仍是受信任扩展，可以改变 Axios 配置，其正确性需应用测试保证。

## 4. 特殊响应与文件

```ts
await http.requestEmpty({ url: '/contacts/123', method: 'DELETE' });

const response = await http.requestRaw({
  url: '/external/status', responseType: 'json',
});
// response.data: unknown；保留 AxiosResponse 的状态、响应头与配置。

const checked = await http.requestWithResponse({ url: '/contacts' }, {
  schema: contactPageSchema,
});
// checked.data 已校验，checked.headers／status 同时可读。

const file = await http.download('/contacts/export', {
  onDownloadProgress: ({ loaded, total }) => { /* total 可缺省 */ },
});
// file.data: Blob，响应头仍可读取；不自动保存文件。

const form = new FormData();
form.append('file', selectedFile);
await http.post('/attachments', form, { schema: attachmentSchema });
```

requestRaw 的 responseType 支持 json／text／blob／arraybuffer，data 保持 unknown，不伪造已校验类型。raw 仍执行原生拦截器、状态处理与统一异常转换。requestEmpty 按 text 读取，拒绝非空正文，包括 JSON null。

POST 导出用 requestRaw 配合 method: POST、data 和 responseType: blob。上传使用常规方法与 FormData，不手工设置 multipart boundary；进度透传 Axios。文件保存、文件名处理及 object URL 释放归调用方；跨域响应头由服务端决定是否暴露。

文件接口的非 2xx JSON 错误正文在 64 KiB 限制内读取，支持 Blob、ArrayBuffer 及 typed-array 视图；异常解码不丢 HTTP 状态。200 文件内容是否符合业务预期由资源协议判断。Blob 下载会缓冲文件，不承诺流式或超大文件能力。

## 5. 原生拦截器与超时

```ts
const requestId = http.interceptors.request.use(config => {
  config.headers.set('Accept-Language', getCurrentLocale());
  return config;
});

const responseId = http.interceptors.response.use(
  response => response,
  (error: unknown) => Promise.reject(error),
);

http.interceptors.request.eject(requestId);
http.interceptors.response.eject(responseId);
```

采用原生顺序：请求 LIFO，响应 FIFO。保留 use 的同步／异步和 runWhen 选项，以及 eject／clear。应用应集中注册，在热更新／卸载时注销；每次请求的在途链遵循 Axios 原生实现。没有自定义 name 去重、dispose 或跨客户端 cancelAll。

响应成功拦截器保持 AxiosResponse 结构，JSON data 适配在最终解包／校验前完成。原生 rejected 可以通过返回完整响应恢复成功链；本项目不改变此语义。应用不得在写入失败拦截器中隐式重放请求，恢复策略必须有真实服务端依据。

send 的 catch 包住整个 Axios 调用，原生失败链执行完后才转换 ApiError。后续 JSON 校验不在 Axios Promise 内，故不会回到原生响应 rejected；其错误仍由 Query／表单接住。不要假定响应 rejected 会收到所有 schema 错误。

timeout 保持 Axios 原生传输超时，默认 30 秒，可按请求覆盖；不把异步拦截器或后续 schema 校验纳入该计时。signal 采用 AbortSignal，不引入 CancelToken。调用期间取消与晚到结果按现有 Query／资源机制处理，取消不证明服务端回滚。拦截器内长期异步任务必须自行处理截止与信号；当前客户端不声称强制终止任意应用回调。

## 6. 参数、错误与 Query

数组格式默认 repeat，单次可覆盖 brackets／indices；分别对应 Axios 的 indexes: null／false／true。查询值限定 string、有限 number、boolean、null、undefined 及标量数组；保留 false、0、空字符串；省略 null、undefined、空数组。默认拒绝嵌套对象；日期由资源 API 明确转字符串。参数保持标准 URL 编码。数组格式配置放实例默认值，单次请求可覆盖；参数检查在 send 内执行，URL 编码交给 Axios，不再自定义 serialize。

ApiError 使用 `{ message, kind, status?, code?, fieldErrors?, requestId?, cause? }`，kind 包括 cancelled／network／timeout／http／contract／config／interceptor，保留资源协调所需 not-executed／unknown。cause 非枚举，仅供受控诊断，禁止把原始 AxiosError 序列化到日志或提示，因为其中可能带凭据或正文。

错误体逐项读取 code、message、fieldErrors、requestId。fieldErrors 某个值损坏，不抹掉合法错误码及其他字段。有效 requestId 正文优先，否则读取 X-Request-Id；正式后端头名仍须联调。字段错误冻结为只读；服务端 message 仅按文本显示。非 Axios 异常保留为 interceptor，不伪装断网；Axios 配置、JSON 语法异常分开分类。

HTTP 不弹通知、不重试、不跳转、不离线排队。canRetryRead 和 isDefiniteRejection 已迁入 query。读取失败仍由 QueryCache 最终提示一次；字段错误交表单；命令式文件请求由调用方反馈。429 不自动重试；既定网络／超时／500／502／503／504 最多重试一次。

当前没有宣称错误可以证明发送前失败：原生扩展与自定义保存函数可能包含多步行为。资源写入继续保守地将非明确拒绝视为结果未知，不因新 kind 轻易释放保护；没有新增不可靠的发送阶段字段或重放机制。

## 7. 迁移与后续边界

联系人 API 已迁移新方法与公共入口；ApiError 调用点同步迁移对象构造；旧 request(config, schema) 与字符串工厂签名已移除。新增 schema／查询配置的正负向类型样例，GET 不能配置请求体或改变方法，raw 无未经验证的业务泛型。

| 本次实现 | 后续单独接入 |
| --- | --- |
| 原生客户端与拦截器、JSON／空正文／原始响应／文件入口 | 正式身份快照、CSRF、401／403／authContext 协议 |
| Axios 原生参数序列化、对象式错误、部分损坏错误体与诊断 cause | 服务端错误码证明、OpenAPI 与 schema 同步 |
| Query 及表单回归、现有未知写入保护 | 可信发送前证据、安全释放保护、多步写入协议 |
| 常见上传下载与进度 | 文件保存模块、分片续传、流、SSE／WebSocket |

身份适配后仍需保证异步等待期间切号不能把旧请求换成新身份发出；迟到失效不得退出新账号。现有固定示例身份和 Query 代次隔离不能替代这项真实认证验收。

## 8. 验证记录

Executed（2026-10-16，HTTP 重构初次验收）：

- `PLAYWRIGHT_CHANNEL=chrome vp run verify:all` 最终通过，8/8 任务成功：vue-tsc、Oxlint、Oxfmt、依赖边界、测试、构建、生产产物隔离和浏览器验收。
- 13 个测试文件共 52 项测试通过；类型负例由 vue-tsc 实际编译。覆盖原生顺序／注销／异步处理／失败恢复、响应适配后校验、错误详情部分损坏、参数格式、FormData、真实传输超时及取消。
- 14 项浏览器测试通过，包含既有联系人流程、开发／生产冒烟，以及新增真实临时 HTTP 服务的文件内容／上传下载进度／multipart boundary／二进制 JSON 错误和在途取消。未通过提高重试次数或修改既有断言回避失败。
- 依赖边界检查通过：145 modules、477 dependencies；生产构建与示例隔离通过。
- 独立临时目录 `vp install --frozen-lockfile --offline` 通过，332 packages；清单及锁文件 SHA-256 与工作区一致，安装未修改版本记录，临时目录已清理。直接依赖仍全部使用 catalog。

Inspected：Axios 与模板原始实现、既有 Query／表单／未知写入机制；错误转换不发送 UI 通知、不添加自动重试。正式认证、后端幂等及大文件扩展未执行验收。

提交前复验 Executed（2026-10-19）：移除 qs／@types/qs 后，`PLAYWRIGHT_CHANNEL=chrome vp run verify:all` 8/8 任务通过，包含 13 个文件共 53 项测试、14 项浏览器测试、类型／Lint／格式、生产构建和示例隔离；依赖边界为 144 modules、475 dependencies。三种数组格式、特殊字符、数组空值和发送前参数拒绝均有覆盖。此前初次验收的 52 项与 332 packages 是历史记录，不代表移除 qs 后的数量。
