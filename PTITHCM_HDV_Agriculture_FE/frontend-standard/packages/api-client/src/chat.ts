import { historySchema, roomSchema, roomsSchema, messageSchema } from '@agri/contracts';
import type { ApiClient } from './http';
export const createChatApi = (http: ApiClient) => ({
  rooms: (cursor?: string, signal?: AbortSignal) =>
    http.request(
      '/api/v1/conversations?limit=20' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
      { schema: roomsSchema, signal },
    ),
  room: (id: string, signal?: AbortSignal) =>
    http.request('/api/v1/conversations/' + encodeURIComponent(id), { schema: roomSchema, signal }),
  history: (id: string, cursor?: string, signal?: AbortSignal) =>
    http.request(
      '/api/v1/conversations/' +
        encodeURIComponent(id) +
        '/messages?limit=30' +
        (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
      { schema: historySchema, signal },
    ),
  send: (
    id: string,
    body: { messageType: 'TEXT' | 'IMAGE'; content?: string; attachmentUrl?: string },
  ) =>
    http.request('/api/v1/conversations/' + encodeURIComponent(id) + '/messages', {
      method: 'POST',
      body,
      schema: messageSchema,
    }),
  read: (id: string, messageId: string) =>
    http.request('/api/v1/conversations/' + encodeURIComponent(id) + '/read', {
      method: 'PUT',
      body: { messageId },
    }),
});
