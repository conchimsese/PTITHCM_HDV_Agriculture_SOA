import { UiIcon } from '../../../shared/ui/UiIcon';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';

const rooms = [
  {
    id: 'demo-st25',
    crop: 'ST25',
    reply: 'Mình dự kiến thu hoạch vào thứ Sáu.',
    followUp: 'Vậy mình ghé xem ruộng sáng thứ Năm nhé?',
    offer: 'BG-01',
    opening: 'Mình trao đổi về lịch thu hoạch ST25 nhé.',
  },
  {
    id: 'demo-om18',
    crop: 'OM18',
    reply: 'Khoảng hai tuần nữa bạn nhé.',
    followUp: 'Bạn báo giúp mình khi có lịch gặt nhé.',
    offer: 'BG-02',
    opening: 'Ruộng OM18 dự kiến thu hoạch khi nào?',
  },
];

export function DemoChat({ accountId }: { accountId: string }) {
  const { conversationId } = useParams();
  const [roomSearch, setRoomSearch] = useState('');
  const searchNeedle = roomSearch.trim().toLowerCase();
  const filteredRooms = searchNeedle
    ? rooms.filter(
        (item) =>
          item.crop.toLowerCase().includes(searchNeedle) ||
          item.offer.toLowerCase().includes(searchNeedle),
      )
    : rooms;
  const room = rooms.find((item) => item.id === conversationId);
  return (
    <>
      <h1 className="visually-hidden">Tin nhắn</h1>
      <div className={room ? 'messenger has-room' : 'messenger'}>
        <aside className="panel messenger-list">
          <div className="messenger-list-header">
            <h2>
              <UiIcon name="chat" size={18} /> Tin nhắn
              <span className="messenger-count-pill tabular-nums">{rooms.length}</span>
            </h2>
          </div>
          <div className="messenger-list-search">
            <UiIcon name="search" size={15} />
            <label>
              <span className="visually-hidden">Tìm cuộc trò chuyện theo giống lúa hoặc mã</span>
              <input
                type="search"
                placeholder="Tìm giống lúa hoặc mã…"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="messenger-list-items">
            {filteredRooms.map((item) => (
              <NavLink className="room-link" key={item.id} to={'/chat/' + item.id}>
                <span className="avatar-circle" aria-hidden="true">
                  {item.crop.slice(0, 2).toUpperCase()}
                </span>
                <span style={{ minWidth: 0 }}>
                  <strong>Lúa {item.crop}</strong>
                  <small>Báo giá {item.offer} · Mẫu trình duyệt</small>
                </span>
              </NavLink>
            ))}
            {filteredRooms.length === 0 && <p className="muted">Không tìm thấy phòng phù hợp.</p>}
          </div>
        </aside>
        {room ? (
          <>
            <DemoThread
              key={accountId + room.id}
              storageKey={'agri-demo-chat:' + accountId + ':' + room.id}
              room={room}
            />
            <aside className="panel messenger-details">
              <h2>
                <UiIcon name="document" size={18} /> Thông tin trao đổi
              </h2>
              <div className="details-peer-card">
                <span className="avatar-circle lg" aria-hidden="true">
                  {room.crop.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong style={{ display: 'block', color: '#164735' }}>Lúa {room.crop}</strong>
                  <small className="muted">Báo giá {room.offer}</small>
                </div>
              </div>
              <div className="details-kv">
                <div className="details-kv-row">
                  <span>Giống lúa</span>
                  <strong>{room.crop}</strong>
                </div>
                <div className="details-kv-row">
                  <span>Trạng thái</span>
                  <strong>Đã chấp nhận</strong>
                </div>
              </div>
            </aside>
          </>
        ) : (
          <section className="panel messenger-empty">
            <UiIcon name="chat" />
            <h2>{conversationId ? 'Không tìm thấy phòng mẫu' : 'Chọn cuộc trò chuyện'}</h2>
          </section>
        )}
      </div>
    </>
  );
}

function DemoThread({ storageKey, room }: { storageKey: string; room: (typeof rooms)[number] }) {
  const [messages, setMessages] = useState<string[]>(() => {
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
      return Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string')
        : [];
    } catch {
      return [];
    }
  });
  const [draft, setDraft] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [room.id, messages.length]);
  return (
    <section className="panel messenger-thread">
      <Link className="messenger-back" to="/chat">
        <UiIcon name="back" size={16} /> Cuộc trò chuyện
      </Link>
      <div className="messenger-thread-header">
        <div className="messenger-thread-peer">
          <span className="avatar-circle" aria-hidden="true">
            {room.crop.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h2>Trao đổi về lúa {room.crop}</h2>
            <small className="muted">Báo giá {room.offer}</small>
          </div>
        </div>
        <span className="connection-pill is-live">
          <span className="status-dot connected" aria-hidden="true" />
          Minh họa cục bộ
        </span>
      </div>
      <div className="messages" role="log" ref={messagesRef}>
        <article className="bubble">{room.opening}</article>
        <article className="bubble mine">{room.reply}</article>
        <article className="bubble">{room.followUp}</article>
        {messages.map((message, i) => (
          <article key={i} className="bubble mine">
            {message}
          </article>
        ))}
      </div>
      <form
        className="composer-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          const next = [...messages, draft.trim()];
          sessionStorage.setItem(storageKey, JSON.stringify(next));
          setMessages(next);
          setDraft('');
        }}
      >
        <label className="composer-input-label">
          <span className="visually-hidden">Tin nhắn</span>
          <textarea
            maxLength={2000}
            rows={1}
            placeholder="Nhập tin nhắn minh họa…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button className="composer-send-btn" disabled={!draft.trim()}>
          <UiIcon name="send" size={16} /> Gửi
        </button>
      </form>
    </section>
  );
}
