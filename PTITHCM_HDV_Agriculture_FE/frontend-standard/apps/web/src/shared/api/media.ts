import { getSession } from '@agri/api-client';
import { env } from '../config/env';
import { queryClient } from './runtime';
import { setSession } from '@agri/api-client';
export async function privateRequest(path: string, body?: FormData, signal?: AbortSignal) {
  if (!/^\/api\/v1\//.test(path) || path.includes('..') || path.includes('\\'))
    throw Error('Đường dẫn ảnh không hợp lệ');
  const token = getSession()?.tokens?.accessToken;
  if (!token) throw Error('Vui lòng đăng nhập');
  const result = await fetch(env.gatewayUrl.replace(/\/$/, '') + path, {
    method: body ? 'POST' : 'GET',
    body,
    signal,
    credentials: 'omit',
    headers: { Authorization: 'Bearer ' + token },
  });
  if (result.status === 401 && getSession()?.tokens?.accessToken === token) {
    queryClient.clear();
    setSession(null);
  }
  if (!result.ok) {
    const value: unknown = await result.json().catch(() => null);
    throw Error(
      value && typeof value === 'object' && 'message' in value
        ? String(value.message)
        : 'Không tải được ảnh (' + result.status + ')',
    );
  }
  return result;
}
export async function uploadImage(path: string, file: File, description?: string) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MiB');
  const body = new FormData();
  body.append('file', file);
  if (description) body.append('description', description);
  const data: unknown = await (await privateRequest(path, body)).json();
  if (!data || typeof data !== 'object') throw Error('Phản hồi ảnh không hợp lệ');
  return data;
}
