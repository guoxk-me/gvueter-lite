import axios from 'axios';
import { z } from 'zod';
import { ApiError, toApiError } from './api-error.ts';
import { assertQueryParams } from './params.ts';
import type {
  HttpClientOptions,
  HttpResponse,
  JsonOptions,
  RawRequestConfig,
  RequestConfig,
  RequestOptions,
} from './types.ts';

const envelopeSchema = z.object({ data: z.unknown() });
// AI modified: Axios supports all three public array formats without an extra serializer.
const arrayIndexes = { repeat: null, brackets: false, indices: true } as const;

export function createHttpClient(options: HttpClientOptions) {
  const instance = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 30_000,
    withCredentials: options.withCredentials ?? false,
    headers: options.headers,
    paramsSerializer: {
      indexes: arrayIndexes[options.arrayFormat ?? 'repeat'],
    },
    // AI modified: JSON APIs must reject invalid JSON instead of leaking a string.
    transitional: { silentJSONParsing: false },
  });

  async function send(config: RawRequestConfig): Promise<HttpResponse> {
    const { arrayFormat, ...requestConfig } = config;
    try {
      if (requestConfig.params !== undefined) assertQueryParams(requestConfig.params);
      return await instance.request<unknown, HttpResponse, unknown>({
        ...requestConfig,
        ...(arrayFormat
          ? {
              paramsSerializer: {
                indexes: arrayIndexes[arrayFormat],
              },
            }
          : {}),
      });
    } catch (error) {
      throw await toApiError(error);
    }
  }

  async function request<Output>(
    config: RequestConfig,
    options: Pick<JsonOptions<Output>, 'schema' | 'response'>,
  ): Promise<Output> {
    const response = await send({ ...config, responseType: 'json' });
    return readJson(response, options);
  }

  function readJson<Output>(
    response: HttpResponse,
    options: Pick<JsonOptions<Output>, 'schema' | 'response'>,
  ): Output {
    try {
      let payload: unknown = response.data;
      if (options.response !== 'body') {
        const envelope = envelopeSchema.safeParse(payload);
        if (!envelope.success || !Object.hasOwn(envelope.data, 'data'))
          throw new ApiError({
            message: '服务器响应缺少 data 字段',
            kind: 'contract',
            status: response.status,
          });
        payload = envelope.data.data;
      }
      return options.schema.parse(payload);
    } catch (cause) {
      if (cause instanceof ApiError) throw cause;
      throw new ApiError({
        message: '服务器响应不符合接口契约',
        kind: 'contract',
        status: response.status,
        cause,
      });
    }
  }

  async function requestWithResponse<Output>(
    config: RequestConfig,
    options: Pick<JsonOptions<Output>, 'schema' | 'response'>,
  ): Promise<HttpResponse<Output>> {
    const response = await send({ ...config, responseType: 'json' });
    return { ...response, data: readJson(response, options) };
  }

  function get<Output>(url: string, options: JsonOptions<Output>) {
    const { schema, response, ...config } = options;
    return request({ ...config, method: 'GET', url }, { schema, response });
  }
  function post<Output>(url: string, body: unknown, options: JsonOptions<Output>) {
    const { schema, response, ...config } = options;
    return request({ ...config, method: 'POST', url, data: body }, { schema, response });
  }
  function put<Output>(url: string, body: unknown, options: JsonOptions<Output>) {
    const { schema, response, ...config } = options;
    return request({ ...config, method: 'PUT', url, data: body }, { schema, response });
  }
  function patch<Output>(url: string, body: unknown, options: JsonOptions<Output>) {
    const { schema, response, ...config } = options;
    return request({ ...config, method: 'PATCH', url, data: body }, { schema, response });
  }
  function remove<Output>(url: string, options: JsonOptions<Output>) {
    const { schema, response, ...config } = options;
    return request({ ...config, method: 'DELETE', url }, { schema, response });
  }

  async function requestEmpty(config: RequestConfig): Promise<void> {
    const response = await send({ ...config, responseType: 'text' });
    if (response.data !== '' && response.data !== undefined)
      throw new ApiError({
        message: '接口应返回空正文',
        kind: 'contract',
        status: response.status,
      });
  }

  async function download(url: string, options: RequestOptions = {}): Promise<HttpResponse<Blob>> {
    const response = await send({ ...options, url, method: 'GET', responseType: 'blob' });
    if (!(response.data instanceof Blob))
      throw new ApiError({
        message: '服务器未返回文件',
        kind: 'contract',
        status: response.status,
      });
    return { ...response, data: response.data };
  }

  return {
    get,
    post,
    put,
    patch,
    delete: remove,
    request,
    requestWithResponse,
    requestEmpty,
    requestRaw: send,
    download,
    // AI modified: retain Axios order, recovery, registration and ejection semantics.
    interceptors: instance.interceptors,
  };
}
export type HttpClient = ReturnType<typeof createHttpClient>;
