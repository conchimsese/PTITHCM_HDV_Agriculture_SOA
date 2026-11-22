import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { chatApi } from '../../../shared/api/modules';
import { useAccount } from '../../../shared/hooks/useAccount';
import { env } from '../../../shared/config/env';
export function useConversations() {
  const session = useAccount();
  return useInfiniteQuery({
    queryKey: ['chat', session?.accountId, 'rooms'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => chatApi.rooms(pageParam, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: !!session?.tokens && session.role !== 'ADMIN',
  });
}
export function useChatRoom(id: string | undefined) {
  const session = useAccount();
  const cache = useQueryClient();
  const [connection, setConnection] = useState('Đang kết nối…');
  const history = useInfiniteQuery({
    queryKey: ['chat', session?.accountId, id, 'history'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => chatApi.history(id!, pageParam, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: !!id && !!session?.tokens,
  });
  const room = useQuery({
    queryKey: ['chat', session?.accountId, id, 'detail'],
    queryFn: ({ signal }) => chatApi.room(id!, signal),
    enabled: !!id && !!session?.tokens,
  });
  useEffect(() => {
    const token = session?.tokens?.accessToken;
    if (!id || !token) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | undefined;
    let attempt = 0;
    const versions = new Map<string, number>();
    function connect() {
      if (stopped) return;
      socket = new WebSocket(env.gatewayUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/chat');
      socket.onopen = () =>
        socket?.send(JSON.stringify({ type: 'CONNECT', authorization: 'Bearer ' + token }));
      socket.onmessage = (frame) => {
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(String(frame.data));
        } catch {
          return;
        }
        if (event.type === 'connected')
          socket?.send(JSON.stringify({ type: 'joinConversation', conversationId: id }));
        if (event.type === 'joinedConversation') {
          attempt = 0;
          setConnection('Đã kết nối');
          void cache.invalidateQueries({ queryKey: ['chat', session?.accountId, id] });
        }
        if (event.type === 'contractUpdated') {
          const key = String(event.contractId),
            version = Number(event.stateVersion);
          if (!Number.isSafeInteger(version) || version <= (versions.get(key) ?? 0)) return;
          versions.set(key, version);
          void cache.invalidateQueries({ queryKey: ['payments', session?.accountId] });
        }
        if (
          ['messageSent', 'messageRead', 'unreadCountChanged', 'contractUpdated'].includes(
            String(event.type),
          )
        )
          void cache.invalidateQueries({ queryKey: ['chat', session?.accountId] });
        if (event.type === 'error') setConnection(String(event.message));
      };
      socket.onclose = (e) => {
        if (stopped) return;
        if (e.code === 1008) {
          setConnection('Phiên hết hạn hoặc tài khoản không có quyền. Vui lòng đăng nhập lại.');
          return;
        }
        setConnection('Mất kết nối · đang thử lại');
        timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempt++));
      };
      socket.onerror = () => socket?.close();
    }
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
    };
  }, [id, session?.accountId, session?.tokens?.accessToken, cache]);
  return { history, room, connection };
}
