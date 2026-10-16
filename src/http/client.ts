import axios, { type AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { ApiError } from './api-error';

const errorBody = z.object({
  code: z.string(),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
  requestId: z.string().optional(),
});
const envelope = z.object({ data: z.unknown() }).refine((body) => Object.hasOwn(body, 'data'));

export function createHttpClient(baseURL = '/api') {
  const transport = axios.create({ baseURL, timeout: 30_000, withCredentials: true });
  return {
    // AI modified: validate the response boundary so malformed writes remain uncertain.
    async request<T>(config: AxiosRequestConfig, schema: z.ZodType<T>): Promise<T> {
      try {
        const response = await transport.request<unknown>(config);
        const wrapped = envelope.safeParse(response.data);
        const payload = wrapped.success ? schema.safeParse(wrapped.data.data) : undefined;
        if (!payload?.success) throw new ApiError('服务器响应格式不符合契约', 'contract');
        return payload.data;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (axios.isCancel(error)) throw new ApiError('请求已取消', 'cancelled');
        if (axios.isAxiosError(error)) {
          if (error.response) {
            const body = errorBody.safeParse(error.response.data);
            throw new ApiError(
              body.success ? body.data.message : '请求失败，请稍后重试',
              'http',
              error.response.status,
              body.success ? body.data.code : undefined,
              body.success ? body.data.fieldErrors : undefined,
              body.success ? body.data.requestId : undefined,
            );
          }
          if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new ApiError('请求超时，请检查网络', 'timeout');
          }
          throw new ApiError('网络连接失败，请稍后重试', 'network');
        }
        throw new ApiError('请求无法完成', 'contract');
      }
    },
  };
}
