import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  notificationDate,
  notificationTypeLabels,
  notificationTypeSchema,
  type NotificationFilters,
} from '@agri/contracts';
import { UiIcon } from '../../../shared/ui/UiIcon';
import { humanizeSystemText } from '../../../shared/utils/formatters';
import { UserError, UserLayout } from '../../users/components/UserLayout';

function notificationCategoryIcon(type: string, referenceType?: string | null): string {
  if (referenceType === 'CONVERSATION') return 'chat';
  if (referenceType === 'CONTRACT') return 'contracts';
  if (referenceType === 'DEPOSIT') return 'deposits';
  if (referenceType === 'OFFER') return 'offers';
  if (referenceType === 'ACCOUNT') return 'accounts';
  if (type.includes('DISPUTE')) return 'disputes';
  if (type.includes('MESSAGE') || type.includes('CHAT')) return 'chat';
  if (type.includes('CONTRACT')) return 'contracts';
  if (type.includes('DEPOSIT')) return 'deposits';
  if (type.includes('OFFER')) return 'offers';
  return 'notifications';
}
import {
  useMarkPageRead,
  useMarkRead,
  useNotification,
  useNotifications,
  useUnreadCount,
} from '../hooks/useNotifications';
import './notifications.css';

export function NotificationsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { notificationId = '' } = useParams();
  const pageValue = Number(params.get('page') ?? 0);
  const filters: NotificationFilters = {
    page: Number.isSafeInteger(pageValue) && pageValue >= 0 ? pageValue : 0,
    isRead:
      params.get('isRead') === 'true' ? true : params.get('isRead') === 'false' ? false : undefined,
    type: notificationTypeSchema.safeParse(params.get('type')).data,
  };
  const list = useNotifications(filters);
  const count = useUnreadCount();
  const markPage = useMarkPageRead();
  const unreadIdsOnPage = (list.data?.items ?? [])
    .filter((item) => item.status === 'UNREAD')
    .map((item) => item.notificationId);
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    navigate(`/thong-bao?${next}`);
  }
  return (
    <UserLayout>
      <header className="user-page-heading">
        <div>
          <small>CẬP NHẬT MỖI NGÀY</small>
          <h1>
            Thông báo {count.data && <span className="notification-count">{count.data.count}</span>}
          </h1>
          <p>Không bỏ lỡ những cập nhật quan trọng của bạn.</p>
        </div>
        <div className="notification-header-actions">
          {unreadIdsOnPage.length > 0 && (
            <button
              type="button"
              className="user-primary"
              disabled={markPage.isPending}
              onClick={() => markPage.mutate(unreadIdsOnPage)}
            >
              <UiIcon name="check" size={16} />
              {markPage.isPending
                ? 'Đang cập nhật…'
                : `Đánh dấu đã đọc (${unreadIdsOnPage.length})`}
            </button>
          )}
          <button
            type="button"
            className="notification-refresh-btn"
            disabled={list.isFetching || count.isFetching}
            onClick={() => {
              void list.refetch();
              void count.refetch();
            }}
          >
            <UiIcon name="refresh" size={16} /> Làm mới
          </button>
        </div>
      </header>
      {count.error && <UserError error={count.error} retry={() => void count.refetch()} />}
      <section className="notification-filters">
        <div className="notification-tabs" aria-label="Lọc trạng thái đọc">
          {[
            { label: 'Tất cả', value: '' },
            { label: 'Chưa đọc', value: 'false' },
            { label: 'Đã đọc', value: 'true' },
          ].map((tab) => (
            <button
              key={tab.value}
              aria-pressed={(params.get('isRead') ?? '') === tab.value}
              onClick={() => change('isRead', tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label>
          Loại thông báo
          <select
            value={filters.type ?? ''}
            onChange={(event) => change('type', event.target.value)}
          >
            <option value="">Tất cả loại</option>
            {notificationTypeSchema.options.map((type) => (
              <option key={type} value={type}>
                {notificationTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
      </section>
      <div className={`notification-layout ${notificationId ? 'has-selection' : ''}`}>
        <section className="notification-inbox" aria-label="Danh sách thông báo">
          {list.isPending ? (
            <p className="notification-empty" role="status">
              Đang tải thông báo…
            </p>
          ) : list.error ? (
            <UserError error={list.error} retry={() => void list.refetch()} />
          ) : list.data?.items.length === 0 ? (
            <div className="notification-empty">
              <span aria-hidden="true">
                <UiIcon name="notifications" size={32} />
              </span>
              <h2>Chưa có thông báo</h2>
              <p>Các cập nhật phù hợp với bộ lọc sẽ xuất hiện tại đây.</p>
              <button onClick={() => navigate('/thong-bao')}>Xem tất cả thông báo</button>
            </div>
          ) : (
            <ul className="notification-list">
              {list.data?.items.map((item) => (
                <li key={item.notificationId}>
                  <Link
                    to={`/thong-bao/${item.notificationId}?${params}`}
                    aria-current={notificationId === item.notificationId ? 'page' : undefined}
                    className={item.status === 'UNREAD' ? 'is-unread' : ''}
                  >
                    <span className="notification-icon" aria-hidden="true">
                      <UiIcon
                        name={notificationCategoryIcon(item.type, item.referenceType)}
                        size={18}
                      />
                    </span>
                    <div className="notification-preview">
                      <div className="notification-title">
                        <strong>{humanizeSystemText(item.title)}</strong>
                        {item.status === 'UNREAD' && (
                          <span className="notification-dot" aria-label="Chưa đọc" />
                        )}
                      </div>
                      <p>{humanizeSystemText(item.content)}</p>
                      <small>{notificationDate(item.createdAt)}</small>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="user-pagination">
            <button
              disabled={filters.page === 0 || list.isFetching}
              onClick={() => change('page', String(filters.page - 1))}
            >
              ← Trước
            </button>
            <span>
              Trang {filters.page + 1} / {Math.max(1, list.data?.totalPages ?? 0)}
            </span>
            <button
              disabled={filters.page + 1 >= (list.data?.totalPages ?? 0) || list.isFetching}
              onClick={() => change('page', String(filters.page + 1))}
            >
              Sau →
            </button>
          </div>
        </section>
        <section className="notification-detail" aria-label="Chi tiết thông báo">
          {notificationId ? (
            <NotificationDetail
              key={notificationId}
              id={notificationId}
              back={`/thong-bao?${params}`}
            />
          ) : (
            <div className="notification-empty">
              <span aria-hidden="true">
                <UiIcon name="notifications" size={32} />
              </span>
              <h2>Cập nhật dành cho bạn</h2>
              <p>Chọn một thông báo để xem nội dung chi tiết.</p>
            </div>
          )}
        </section>
      </div>
      <p className="user-muted">Hiển thị thông báo trong 90 ngày gần nhất.</p>
    </UserLayout>
  );
}
function NotificationDetail({ id, back }: { id: string; back: string }) {
  const query = useNotification(id);
  const mark = useMarkRead();
  const item = query.data;
  return (
    <>
      <Link className="notification-back" to={back}>
        ← Về danh sách
      </Link>
      {query.isPending ? (
        <p role="status">Đang tải chi tiết…</p>
      ) : query.error ? (
        <UserError error={query.error} retry={() => void query.refetch()} />
      ) : (
        item && (
          <article>
            <span className="notification-icon large" aria-hidden="true">
              <UiIcon name={notificationCategoryIcon(item.type, item.referenceType)} size={24} />
            </span>
            <p className="user-badge">{notificationTypeLabels[item.type]}</p>
            <h2>{humanizeSystemText(item.title)}</h2>
            <time dateTime={item.createdAt}>{notificationDate(item.createdAt)}</time>
            <p className="notification-content">{humanizeSystemText(item.content)}</p>
            {item.status === 'UNREAD' ? (
              <button
                className="user-primary"
                disabled={mark.isPending}
                onClick={() => mark.mutate(id)}
              >
                {mark.isPending ? (
                  'Đang cập nhật…'
                ) : (
                  <>
                    <UiIcon name="check" size={16} /> Đánh dấu đã đọc
                  </>
                )}
              </button>
            ) : (
              <p className="user-success">
                <UiIcon name="check" size={16} /> Đã đọc{' '}
                {item.readAt && notificationDate(item.readAt)}
              </p>
            )}
            {mark.error && (
              <p className="user-alert" role="alert">
                {mark.error.message}
              </p>
            )}
            {mark.isSuccess && (
              <p className="user-success" role="status">
                Đã đánh dấu thông báo đã đọc.
              </p>
            )}
            {(() => {
              const target =
                item.referenceType === 'ACCOUNT'
                  ? { to: '/tai-khoan', label: 'Xem tài khoản của tôi →' }
                  : item.referenceType === 'CONVERSATION'
                    ? { to: `/chat/${item.referenceId}`, label: 'Mở cuộc trò chuyện →' }
                    : item.referenceType === 'CONTRACT' || item.referenceType === 'DEPOSIT'
                      ? {
                          to: `/payments/contracts/${item.referenceId}`,
                          label: 'Xem hợp đồng & cọc →',
                        }
                      : item.referenceType === 'OFFER'
                        ? { to: '/bao-gia', label: 'Xem báo giá →' }
                        : null;
              return target ? (
                <Link className="notification-account-link" to={target.to}>
                  {target.label}
                </Link>
              ) : null;
            })()}
          </article>
        )
      )}
    </>
  );
}
