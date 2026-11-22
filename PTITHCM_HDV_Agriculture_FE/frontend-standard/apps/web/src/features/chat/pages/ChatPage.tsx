import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useChatRoom, useConversations } from '../hooks/useConversations';
import { chatApi } from '../../../shared/api/modules';
import { useAccount } from '../../../shared/hooks/useAccount';
import { uploadImage } from '../../../shared/api/media';
import { PrivateImage } from '../../../shared/ui/PrivateImage';
import { DemoChat } from './DemoChat';

export function ChatPage() {
  const session = useAccount();
  if (session?.isDemo && session.role !== 'ADMIN')
    return <DemoChat accountId={session.accountId} />;
  return <ConnectedChat />;
}

function formatOfferLabel(offerId: string) {
  return offerId.length > 12 ? `${offerId.slice(0, 6)}…${offerId.slice(-4)}` : offerId;
}

function ConnectedChat() {
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const session = useAccount();
  const rooms = useConversations();
  const offerIdParam = searchParams.get('offerId');
  const [offerRetryCount, setOfferRetryCount] = useState(0);

  const roomItems = rooms.data?.pages.flatMap((p) => p.data) ?? [];
  const matchedRoom = offerIdParam
    ? roomItems.find((item) => item.offerId === offerIdParam)
    : undefined;

  useEffect(() => {
    if (!offerIdParam || conversationId) return;
    if (matchedRoom) {
      navigate('/chat/' + matchedRoom.conversationId, { replace: true });
      return;
    }
    if (!rooms.isPending && !rooms.isFetching && offerRetryCount < 3) {
      const timer = setTimeout(() => {
        setOfferRetryCount((c) => c + 1);
        void rooms.refetch();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [
    offerIdParam,
    conversationId,
    matchedRoom,
    rooms.isPending,
    rooms.isFetching,
    offerRetryCount,
    navigate,
    rooms,
  ]);

  return (
    <>
      <h1>Trao đổi mùa vụ</h1>
      <p className="muted">Phòng trò chuyện được mở sau khi đề nghị được chấp nhận.</p>
      {session?.role === 'ADMIN' ? (
        <p>Chỉ người tham gia mới được xem cuộc trò chuyện.</p>
      ) : (
        <div className={conversationId ? 'messenger has-room' : 'messenger'}>
          <aside className="panel messenger-list">
            <div
              className="actions"
              style={{ justifyContent: 'space-between', marginBottom: '12px' }}
            >
              <h2 style={{ margin: 0 }}>Cuộc trò chuyện</h2>
              <button
                type="button"
                className="secondary"
                disabled={rooms.isFetching}
                onClick={() => void rooms.refetch()}
              >
                {rooms.isFetching ? 'Đang tải…' : 'Làm mới'}
              </button>
            </div>
            {offerIdParam && !conversationId && !matchedRoom && (
              <p className="muted" role="status">
                Đang tìm phòng trò chuyện cho báo giá #{formatOfferLabel(offerIdParam)}…
              </p>
            )}
            {rooms.isPending && <p>Đang tải…</p>}
            {rooms.error && (
              <p className="error">
                {rooms.error.message}
                <button onClick={() => void rooms.refetch()}>Thử lại</button>
              </p>
            )}
            {roomItems.map((room) => (
              <NavLink
                className="room-link"
                key={room.conversationId}
                to={'/chat/' + room.conversationId}
              >
                Trao đổi #{formatOfferLabel(room.offerId)}{' '}
                <small>
                  {' '}
                  · {room.contractId ? 'Đã có hợp đồng' : `${room.unreadCount ?? 0} chưa đọc`}
                </small>
              </NavLink>
            ))}
            {rooms.data?.pages[0]?.data.length === 0 && (
              <p>Chưa có cuộc trò chuyện. Hãy chấp nhận đề nghị để mở phòng.</p>
            )}
            {rooms.hasNextPage && (
              <button
                disabled={rooms.isFetchingNextPage}
                onClick={() => void rooms.fetchNextPage()}
              >
                Xem thêm
              </button>
            )}
          </aside>
          {conversationId ? (
            <Room key={session?.accountId + conversationId} id={conversationId} />
          ) : (
            <section className="panel messenger-empty">
              <h2>Cùng thống nhất vụ mùa tiếp theo</h2>
              <p>Chọn cuộc trò chuyện để xem tin nhắn và hợp đồng.</p>
            </section>
          )}
        </div>
      )}
    </>
  );
}
function Room({ id }: { id: string }) {
  const { history, room, connection } = useChatRoom(id);
  const session = useAccount();
  const cache = useQueryClient();
  const [text, setText] = useState('');
  const send = useMutation({
    mutationFn: () => chatApi.send(id, { messageType: 'TEXT', content: text }),
    onSuccess: () => {
      setText('');
      void cache.invalidateQueries({ queryKey: ['chat', session?.accountId] });
    },
  });
  const image = useMutation({
    mutationFn: async (file: File) => {
      const data = await uploadImage('/api/v1/conversations/' + id + '/media', file);
      if (!('attachmentUrl' in data) || typeof data.attachmentUrl !== 'string')
        throw Error('Thiếu đường dẫn ảnh');
      await chatApi.send(id, { messageType: 'IMAGE', attachmentUrl: data.attachmentUrl });
    },
    onSuccess: () => void cache.invalidateQueries({ queryKey: ['chat', session?.accountId] }),
  });
  const read = useMutation({
    mutationFn: (messageId: string) => chatApi.read(id, messageId),
    onSuccess: () => void cache.invalidateQueries({ queryKey: ['chat', session?.accountId] }),
  });
  const unique = new Map(history.data?.pages.flatMap((p) => p.data).map((m) => [m.messageId, m]));
  const messages = [...unique.values()].sort(
    (a, b) =>
      Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.messageId.localeCompare(b.messageId),
  );
  return (
    <>
      <section className="panel messenger-thread">
        <Link className="messenger-back" to="/chat">
          ← Cuộc trò chuyện
        </Link>
        <h2>Cuộc trò chuyện</h2>
        <p className="muted" role="status">
          {connection}
        </p>
        {[history.error, room.error, send.error, image.error, read.error]
          .filter(Boolean)
          .map((e, i) => (
            <p className="error" role="alert" key={i}>
              {e?.message}
            </p>
          ))}
        {history.error && <button onClick={() => void history.refetch()}>Tải lại tin nhắn</button>}
        {history.hasNextPage && (
          <button
            disabled={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            Tin nhắn cũ hơn
          </button>
        )}
        <div className="messages">
          {history.isPending ? (
            <p>Đang tải…</p>
          ) : messages.length === 0 ? (
            <p>Chưa có tin nhắn. Bắt đầu trao đổi tại đây.</p>
          ) : (
            messages.map((m) => (
              <article
                key={m.messageId}
                className={'bubble ' + (m.senderId === session?.accountId ? 'mine' : '')}
              >
                {m.messageType === 'CONTRACT' ? (
                  <Link to={'/payments/contracts/' + m.contractId}>Xem hợp đồng</Link>
                ) : m.messageType === 'IMAGE' && m.attachmentUrl ? (
                  <PrivateImage path={m.attachmentUrl} />
                ) : (
                  m.content
                )}
                <small>
                  <time>{new Date(m.createdAt).toLocaleString('vi-VN')}</time>{' '}
                  {m.isRead ? '· Đã đọc' : ''}
                </small>
                {m.senderId !== session?.accountId && !m.isRead && (
                  <button disabled={read.isPending} onClick={() => read.mutate(m.messageId)}>
                    Đánh dấu đã đọc
                  </button>
                )}
              </article>
            ))
          )}
        </div>
        {room.data?.status === 'ACTIVE' && (
          <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) send.mutate();
              }}
            >
              <label>
                Tin nhắn
                <textarea
                  rows={2}
                  maxLength={2000}
                  placeholder="Nhập tin nhắn trao đổi (Enter để gửi, Shift+Enter xuống dòng)…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (text.trim() && !send.isPending && !image.isPending) send.mutate();
                    }
                  }}
                  required
                />
              </label>
              <button disabled={send.isPending || image.isPending || !text.trim()}>
                {send.isPending ? 'Đang gửi…' : 'Gửi tin nhắn'}
              </button>
            </form>
            <label>
              {image.isPending ? 'Đang tải ảnh lên…' : 'Gửi ảnh nông sản / chứng từ'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={image.isPending || send.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) image.mutate(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        )}
      </section>
      <aside className="panel messenger-details">
        <h2>Thông tin trao đổi</h2>
        {room.data && (
          <dl style={{ gridTemplateColumns: '1fr', gap: '6px', marginBottom: '14px' }}>
            <dt>Mã báo giá</dt>
            <dd>{room.data.offerId}</dd>
            <dt>Trạng thái phòng</dt>
            <dd>{room.data.status === 'ACTIVE' ? 'Đang hoạt động' : room.data.status}</dd>
          </dl>
        )}
        <div className="actions">
          {room.data?.contractId ? (
            <Link to={'/payments/contracts/' + room.data.contractId}>Xem hợp đồng &amp; cọc →</Link>
          ) : (
            session?.role === 'TRADER' &&
            room.data && (
              <Link
                to={
                  '/payments/new?conversationId=' +
                  id +
                  '&offerId=' +
                  room.data.offerId +
                  '&farmerId=' +
                  (room.data.participantIds.find((p) => p !== session.accountId) ?? '')
                }
              >
                Soạn hợp đồng →
              </Link>
            )
          )}
          <Link to="/payments">Danh sách hợp đồng &amp; cọc</Link>
        </div>
      </aside>
    </>
  );
}
