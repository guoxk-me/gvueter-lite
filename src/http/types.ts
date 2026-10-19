import type { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import type { z } from 'zod';

export type QueryScalar = string | number | boolean | null | undefined;
export type QueryParams = Readonly<Record<string, QueryScalar | readonly QueryScalar[]>>;
export type ArrayFormat = 'repeat' | 'brackets' | 'indices';

export interface RequestOptions extends Pick<
  AxiosRequestConfig<unknown, QueryParams>,
  'headers' | 'timeout' | 'signal' | 'onUploadProgress' | 'onDownloadProgress'
> {
  params?: QueryParams;
  arrayFormat?: ArrayFormat;
}
export interface RequestConfig extends RequestOptions {
  url: string;
  method?: Method;
  data?: unknown;
}
export interface JsonOptions<Output> extends RequestOptions {
  schema: z.ZodType<Output>;
  response?: 'data' | 'body';
}
export interface RawRequestConfig extends RequestConfig {
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}
export type HttpResponse<Body = unknown> = AxiosResponse<Body, unknown, object, QueryParams>;
export interface HttpClientOptions {
  baseURL: string;
  timeout?: number;
  withCredentials?: boolean;
  headers?: RequestOptions['headers'];
  arrayFormat?: ArrayFormat;
}
