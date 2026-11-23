import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useChatRoom, useConversations } from '../hooks/useConversations';
import { chatApi } from '../../../shared/api/modules';
import { useAccount } from '../../../shared/hooks/useAccount';
import { uploadImage } from '../../../shared/api/media';
import { PrivateImage } from '../../../shared/ui/PrivateImage';
import { UiIcon } from '../../../shared/ui/UiIcon';
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
  const [roomSearch, setRoomSearch] = useState('');

  const roomItems = rooms.data?.pages.flatMap((p) => p.data) ?? [];
  const searchNeedle = roomSearch.trim().toLowerCase();
  const filteredRooms = searchNeedle
    ? roomItems.filter(
        (room) =>
          room.offerId.toLowerCase().includes(searchNeedle) ||
          room.conversationId.toLowerCase().includes(searchNeedle) ||
          formatOfferLabel(room.offerId).toLowerCase().includes(searchNeedle),
      )
    : roomItems;
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
      <h1 className="visually-hidden">Trao đổi mùa vụ</h1>
      {session?.role === 'ADMIN' ? (
        <p>Chỉ người tham gia mới được xem cuộc trò chuyện.</p>
      ) : (
        <div className={conversationId ? 'messenger has-room' : 'messenger'}>
          <aside className="panel messenger-list">
            <div className="messenger-list-header">
              <h2>
                <UiIcon name="chat" size={18} /> Tin nhắn
                <span className="messenger-count-pill tabular-nums">{roomItems.length}</span>
              </h2>
              <button
                type="button"
                className="secondary messenger-refresh-btn"
                aria-label="Làm mới danh sách"
                title="Làm mới danh sách"
                disabled={rooms.isFetching}
                onClick={() => void rooms.refetch()}
              >
                <UiIcon name="refresh" size={16} />
              </button>
            </div>
            <div className="messenger-list-search">
              <UiIcon name="search" size={15} />
              <label>
                <span className="visually-hidden">Tìm cuộc trò chuyện theo mã Offer</span>
                <input
                  type="search"
                  placeholder="Tìm theo mã Offer…"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                />
              </label>
            </div>
            {offerIdParam && !conversationId && !matchedRoom && (
              <p className="muted" role="status">
                Đang tìm phòng trò chuyện cho báo giá #{formatOfferLabel(offerIdParam)}…
              </p>
            )}
            <div className="messenger-list-items">
              {rooms.isPending && <p>Đang tải…</p>}
              {rooms.error && (
                <p className="error">
                  {rooms.error.message}
                  <button onClick={() => void rooms.refetch()}>Thử lại</button>
                </p>
              )}
              {filteredRooms.map((room) => (
                <NavLink
                  className="room-link"
                  key={room.conversationId}
                  to={'/chat/' + room.conversationId}
                >
                  <span className="avatar-circle" aria-hidden="true">
                    {room.offerId.slice(-2).toUpperCase()}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <strong>#{formatOfferLabel(room.offerId)}</strong>
                    <small className="tabular-nums">
                      {room.contractId ? 'Đã có hợp đồng' : `${room.unreadCount ?? 0} chưa đọc`}
                    </small>
                  </span>
                </NavLink>
              ))}
              {roomItems.length > 0 && filteredRooms.length === 0 && (
                <p className="muted">Không tìm thấy phòng phù hợp.</p>
              )}
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
            </div>
          </aside>
          {conversationId ? (
            <Room key={session?.accountId + conversationId} id={conversationId} />
          ) : (
            <section className="panel messenger-empty">
              <UiIcon name="chat" />
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
  const [copied, setCopied] = useState(false);
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
  const messagesRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.at(-1)?.messageId;
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [id, lastMessageId]);
  const isLive = connection === 'Đã kết nối';
  const isRetrying = connection.includes('Đang') || connection.includes('thử lại');
  const roomOfferLabel = room.data ? formatOfferLabel(room.data.offerId) : formatOfferLabel(id);

  return (
    <>
      <section className="panel messenger-thread">
        <Link className="messenger-back" to="/chat">
          <UiIcon name="back" size={16} /> Cuộc trò chuyện
        </Link>
        <div className="messenger-thread-header">
          <div className="messenger-thread-peer">
            <span className="avatar-circle" aria-hidden="true">
              {(room.data?.offerId ?? id).slice(-2).toUpperCase()}
            </span>
            <div>
              <h2>Trao đổi #{roomOfferLabel}</h2>
              <small className="muted tabular-nums">Phòng #{formatOfferLabel(id)}</small>
            </div>
          </div>
          <span className={`connection-pill ${isLive ? 'is-live' : ''}`} role="status">
            <span
              className={`status-dot ${isLive ? 'connected' : isRetrying ? 'retrying' : ''}`}
              aria-hidden="true"
            />
            {connection}
          </span>
        </div>
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
        <div className="messages" ref={messagesRef}>
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
                <footer className="bubble-meta">
                  <small>
                    <time className="tabular-nums">
                      {new Date(m.createdAt).toLocaleString('vi-VN')}
                    </time>
                    {m.isRead ? ' · Đã đọc' : ''}
                  </small>
                  {m.senderId !== session?.accountId && !m.isRead && (
                    <button
                      type="button"
                      className="bubble-read-action"
                      disabled={read.isPending}
                      onClick={() => read.mutate(m.messageId)}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </footer>
              </article>
            ))
          )}
        </div>
        {room.data?.status === 'ACTIVE' && (
          <form
            className="composer-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) send.mutate();
            }}
          >
            <label
              className="composer-attach-btn"
              title="Gửi ảnh nông sản hoặc chứng từ (PNG/JPG/WebP)"
            >
              <UiIcon name="camera" size={18} />
              <span>{image.isPending ? 'Đang tải…' : 'Ảnh'}</span>
              <input
                className="visually-hidden"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Gửi ảnh nông sản hoặc chứng từ"
                disabled={image.isPending || send.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) image.mutate(file);
                  e.target.value = '';
                }}
              />
            </label>
            <label className="composer-input-label">
              <span className="visually-hidden">Tin nhắn</span>
              <textarea
                rows={1}
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
            <button
              type="submit"
              className="composer-send-btn"
              disabled={send.isPending || image.isPending || !text.trim()}
            >
              <UiIcon name="send" size={16} />
              {send.isPending ? 'Đang gửi…' : 'Gửi'}
            </button>
          </form>
        )}
      </section>
      <aside className="panel messenger-details">
        <h2>
          <UiIcon name="document" size={18} /> Thông tin trao đổi
        </h2>
        {room.data && (
          <>
            <div className="details-peer-card">
              <span className="avatar-circle lg" aria-hidden="true">
                {room.data.offerId.slice(-2).toUpperCase()}
              </span>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', color: '#164735' }}>
                  Báo giá #{formatOfferLabel(room.data.offerId)}
                </strong>
                <button
                  type="button"
                  className="secondary copy-id-btn"
                  style={{ marginTop: '4px' }}
                  title={room.data.offerId}
                  onClick={() => {
                    void navigator.clipboard?.writeText(room.data!.offerId).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    });
                  }}
                >
                  <UiIcon name={copied ? 'check' : 'copy'} size={13} />
                  {copied ? 'Đã chép' : 'Sao chép mã'}
                </button>
              </div>
            </div>
            <div className="details-kv">
              <div className="details-kv-row">
                <span>Trạng thái phòng</span>
                <strong>
                  {room.data.status === 'ACTIVE' ? 'Đang hoạt động' : room.data.status}
                </strong>
              </div>
              <div className="details-kv-row">
                <span>Mã phòng</span>
                <code>#{formatOfferLabel(id)}</code>
              </div>
              <div className="details-kv-row">
                <span>Hợp đồng</span>
                <strong>{room.data.contractId ? 'Đã khởi tạo' : 'Chưa tạo'}</strong>
              </div>
            </div>
          </>
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
