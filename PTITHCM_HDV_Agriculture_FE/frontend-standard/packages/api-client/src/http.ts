import type { z } from 'zod';
import { apiErrorSchema } from '@agri/contracts';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export type ApiClient = ReturnType<typeof createApiClient>;
type Options<T> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  responseType?: 'blob';
  signal?: AbortSignal;
  auth?: boolean;
  schema?: z.ZodType<T>;
  idempotencyKey?: string;
};
export function createApiClient(config: {
  baseUrl: string;
  getAccessToken: () => string | undefined;
  onUnauthorized?: (sentToken: string | undefined) => void;
  fetchImpl?: typeof fetch;
}) {
  if (config.baseUrl && !/^https?:\/\/[^?#]+$/.test(config.baseUrl)) {
    throw new Error('Gateway phải là HTTP(S) origin, không chứa query hoặc fragment.');
  }
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  return {
    async request<T = void>(path: string, options: Options<T> = {}): Promise<T> {
      if (!/^\/api\/v1\//.test(path) || path.includes('..') || path.includes('\\')) {
        throw new Error('Chỉ gọi API public /api/v1/ qua Gateway.');
      }
      const token = config.getAccessToken();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`;
      if (options.body !== undefined && !options.formData)
        headers['Content-Type'] = 'application/json';
      if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
      let response: Response;
      try {
        response = await (config.fetchImpl ?? fetch)(`${baseUrl}${path}`, {
          method: options.method ?? 'GET',
          headers,
          body:
            options.formData ??
            (options.body === undefined ? undefined : JSON.stringify(options.body)),
          signal: options.signal,
          credentials: 'omit',
        });
      } catch (error) {
        if (options.signal?.aborted) throw error;
        throw new ApiError(
          0,
          'NETWORK_ERROR',
          'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.',
        );
      }
      if (response.status === 401 && options.auth !== false) config.onUnauthorized?.(token);
      if (response.status === 204 && response.ok) return undefined as T;
      if (response.ok && options.responseType === 'blob') return (await response.blob()) as T;
      const raw = await response.text();
      let data: unknown;
      try {
        data = raw ? JSON.parse(raw) : undefined;
      } catch {
        throw new ApiError(
          response.status,
          'INVALID_RESPONSE',
          'Máy chủ trả dữ liệu không đúng JSON.',
        );
      }
      if (!response.ok) {
        const parsed = apiErrorSchema.safeParse(data);
        throw new ApiError(
          response.status,
          parsed.success ? parsed.data.code : 'HTTP_ERROR',
          parsed.success ? parsed.data.message : `Yêu cầu thất bại (${response.status}).`,
          parsed.success ? parsed.data.traceId : undefined,
        );
      }
      if (!options.schema) return data as T;
      const parsed = options.schema.safeParse(data);
      if (!parsed.success)
        throw new ApiError(response.status, 'INVALID_RESPONSE', 'Dữ liệu API chưa khớp Contract.');
      return parsed.data;
    },
  };
}
