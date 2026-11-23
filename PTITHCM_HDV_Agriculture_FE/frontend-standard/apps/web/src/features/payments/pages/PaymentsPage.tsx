import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { DisputeDecisionBody } from '@agri/api-client';
import { paymentsApi } from '../../../shared/api/modules';
import { useAccount } from '../../../shared/hooks/useAccount';
import { PrivateImage } from '../../../shared/ui/PrivateImage';
import { UiIcon } from '../../../shared/ui/UiIcon';
import { formatVND, humanizeSystemText } from '../../../shared/utils/formatters';

function calcSimulatedDeposit5Percent(totalAmount: string): string {
  const clean = totalAmount.trim();
  const match = clean.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return formatVND(0);
  const whole = BigInt(match[1]);
  const frac = BigInt((match[2] ?? '00').padEnd(2, '0'));
  const totalCents = whole * 100n + frac;
  const depositCents = (totalCents * 5n) / 100n;
  const depositWhole = depositCents / 100n;
  return `${depositWhole.toLocaleString('vi-VN')} ₫`;
}

function depositStatusTone(status: string): string {
  if (['LOCKED', 'RELEASABLE', 'RELEASED', 'ACTIVE', 'COMPLETED', 'RESOLVED'].includes(status)) {
    return 'is-success';
  }
  if (['FORFEITED', 'CANCELLED'].includes(status)) {
    return 'is-danger';
  }
  return 'is-warning';
}

const contractStepLabels = [
  { id: 1, label: 'Tạo hợp đồng' },
  { id: 2, label: 'Nông dân duyệt' },
  { id: 3, label: 'Cọc mô phỏng 5%' },
  { id: 4, label: 'Hoàn tất' },
];

function getContractStepProgress(status: string): { current: number; cancelled: boolean } {
  if (status === 'CANCELLED') return { current: 1, cancelled: true };
  if (status === 'CREATED') return { current: 2, cancelled: false };
  if (status === 'PENDING_DEPOSIT') return { current: 3, cancelled: false };
  if (status === 'ACTIVE') return { current: 4, cancelled: false };
  if (status === 'COMPLETED') return { current: 5, cancelled: false };
  return { current: 1, cancelled: false };
}

const contractStatusLabels: Record<string, string> = {
  CREATED: 'Mới tạo · chờ nông dân duyệt',
  PENDING_DEPOSIT: 'Chờ thương lái nạp cọc mô phỏng 5%',
  ACTIVE: 'Đang hiệu lực (đã giữ cọc mô phỏng)',
  COMPLETED: 'Đã hoàn tất giao dịch',
  CANCELLED: 'Đã hủy',
};

const depositStatusLabels: Record<string, string> = {
  PENDING: 'Chờ nạp cọc mô phỏng',
  LOCKED: 'Đang giữ cọc mô phỏng',
  RELEASABLE: 'Sẵn sàng hoàn cọc',
  RELEASED: 'Đã giải ngân / hoàn cọc',
  FORFEITED: 'Bị khấu trừ cọc do vi phạm',
  REFUNDED: 'Đã hoàn trả cho thương lái',
};

const disputeStatusLabels: Record<string, string> = {
  OPEN: 'Mới mở · chờ Admin tiếp nhận',
  UNDER_REVIEW: 'Đang xem xét',
  RESOLVED: 'Đã giải quyết',
};

const farmerViolations: { code: string; points: string; label: string }[] = [
  { code: 'F01', points: '1', label: 'F01 (1 điểm) · Giao trễ nhẹ' },
  { code: 'F02', points: '2', label: 'F02 (2 điểm) · Giao thiếu số lượng' },
  { code: 'F03', points: '2', label: 'F03 (2 điểm) · Sai lệch chất lượng vừa' },
  {
    code: 'F04',
    points: '3',
    label: 'F04 (3 điểm / 2 điểm nếu tiếp tục) · Vi phạm điều khoản giao nhận',
  },
  { code: 'F05', points: '2', label: 'F05 (2 điểm) · Chậm phối hợp đối soát' },
  { code: 'F06', points: '3', label: 'F06 (3 điểm) · Sai lệch chất lượng nghiêm trọng' },
  { code: 'F07', points: '3', label: 'F07 (3 điểm) · Không giao hàng đúng cam kết' },
  { code: 'F08', points: '5', label: 'F08 (5 điểm) · Hủy giao dịch đơn phương / gian lận' },
];

const traderViolations: { code: string; points: string; label: string }[] = [
  { code: 'T01', points: '1', label: 'T01 (1 điểm) · Chậm tiếp nhận nhẹ' },
  { code: 'T02', points: '2', label: 'T02 (2 điểm) · Trì hoãn xác nhận' },
  { code: 'T03', points: '2', label: 'T03 (2 điểm) · Thay đổi điều kiện thu mua sai hẹn' },
  { code: 'T04', points: '3', label: 'T04 (3 điểm) · Không nhận hàng đúng thỏa thuận' },
  { code: 'T05', points: '3', label: 'T05 (3 điểm) · Chậm nghĩa vụ đối soát thanh toán' },
  { code: 'T06', points: '3', label: 'T06 (3 điểm) · Vi phạm nghiêm trọng quy trình nhận hàng' },
  {
    code: 'T07',
    points: '5',
    label: 'T07 (5 điểm) · Đơn phương bỏ cọc / không thực hiện hợp đồng',
  },
  { code: 'T08', points: '2', label: 'T08 (2 điểm) · Khiếu nại sai sự thật' },
];

export function PaymentsPage() {
  const session = useAccount();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') ?? 'contracts';
  const [lookup, setLookup] = useState('');
  const [lookupKind, setLookupKind] = useState<'contract' | 'dispute'>(
    view === 'disputes' ? 'dispute' : 'contract',
  );
  const [adminStatus, setAdminStatus] = useState<string>('');
  const nav = useNavigate();
  const [invalidLookup, setInvalidLookup] = useState(false);
  const isAdmin = session?.role === 'ADMIN';

  const deposits = useInfiniteQuery({
    queryKey: ['payments', session?.accountId, 'deposits'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => paymentsApi.deposits(pageParam, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: !!session?.tokens && !isAdmin,
  });

  const adminDisputes = useInfiniteQuery({
    queryKey: ['payments', session?.accountId, 'admin-disputes', adminStatus],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      paymentsApi.adminDisputes(adminStatus || undefined, pageParam, 20, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: !!session?.tokens && isAdmin,
  });

  const pageTitle = isAdmin
    ? 'Quản lý tranh chấp & quyết định'
    : view === 'deposits'
      ? 'Tiền cọc mô phỏng 5%'
      : view === 'disputes'
        ? 'Tranh chấp hợp đồng'
        : 'Hợp đồng & tiền cọc mô phỏng';

  return (
    <>
      <h1>{pageTitle}</h1>
      <div className="sim-notice" role="note">
        <UiIcon name="info" size={18} />
        <div>
          <strong>Cọc mô phỏng (môi trường thử):</strong>{' '}
          {isAdmin
            ? 'Tài khoản quản trị xem xét hồ sơ tranh chấp độc lập và đưa ra quyết định xử lý tiền cọc mô phỏng 5% cùng điểm uy tín.'
            : view === 'disputes'
              ? 'Mở hoặc theo dõi hồ sơ tranh chấp từ chi tiết hợp đồng bên dưới. Tiền cọc 5% trên ứng dụng chỉ phục vụ môi trường thử nghiệm.'
              : 'Khoản cọc 5% trong ứng dụng chỉ mang tính mô phỏng phục vụ môi trường thử nghiệm. Tiền mua lúa thanh toán trực tiếp ngoài ứng dụng.'}
        </div>
      </div>

      {isAdmin ? (
        <section className="panel">
          <div
            className="actions"
            style={{ justifyContent: 'space-between', marginBottom: '14px' }}
          >
            <h2 style={{ margin: 0 }}>Danh sách hồ sơ tranh chấp</h2>
            <button
              type="button"
              className="secondary"
              disabled={adminDisputes.isFetching}
              onClick={() => void adminDisputes.refetch()}
            >
              Làm mới
            </button>
          </div>
          <div
            className="actions"
            style={{ marginBottom: '14px' }}
            role="tablist"
            aria-label="Lọc trạng thái tranh chấp"
          >
            {[
              { value: '', label: 'Tất cả' },
              { value: 'OPEN', label: 'Chờ tiếp nhận (OPEN)' },
              { value: 'UNDER_REVIEW', label: 'Đang xem xét (UNDER_REVIEW)' },
              { value: 'RESOLVED', label: 'Đã giải quyết (RESOLVED)' },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={adminStatus === tab.value}
                className={adminStatus === tab.value ? '' : 'secondary'}
                onClick={() => setAdminStatus(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {adminDisputes.isPending && <p role="status">Đang tải danh sách tranh chấp…</p>}
          {adminDisputes.error && (
            <div className="error" role="alert">
              <p style={{ margin: '0 0 8px' }}>{adminDisputes.error.message}</p>
              <button type="button" onClick={() => void adminDisputes.refetch()}>
                Thử lại
              </button>
            </div>
          )}
          {adminDisputes.data?.pages[0]?.items.length === 0 && (
            <p className="muted">Không có hồ sơ tranh chấp nào phù hợp bộ lọc hiện tại.</p>
          )}
          {adminDisputes.data?.pages
            .flatMap((p) => p.items)
            .map((item) => (
              <article className="room-link" key={item.disputeId} style={{ display: 'block' }}>
                <div className="actions" style={{ justifyContent: 'space-between' }}>
                  <Link to={'/payments/disputes/' + item.disputeId}>
                    Hồ sơ #{item.disputeId.slice(0, 8)} · {item.reasonCode}
                  </Link>
                  <span className={`status-pill ${depositStatusTone(item.status)}`}>
                    {disputeStatusLabels[item.status] ?? item.status}
                  </span>
                </div>
                <p style={{ margin: '6px 0' }}>{item.description}</p>
                <small className="muted tabular-nums">
                  Hợp đồng #{item.contractId.slice(0, 8)} ·{' '}
                  {item.depositHold ? 'Đang giữ cọc mô phỏng' : 'Không giữ cọc'}
                  {item.outcome ? ` · Kết quả: ${item.outcome}` : ''}
                </small>
              </article>
            ))}
          {adminDisputes.hasNextPage && (
            <button
              style={{ marginTop: '12px' }}
              disabled={adminDisputes.isFetchingNextPage}
              onClick={() => void adminDisputes.fetchNextPage()}
            >
              Xem thêm hồ sơ
            </button>
          )}
        </section>
      ) : (
        <section className="panel">
          <div
            className="actions"
            style={{ justifyContent: 'space-between', marginBottom: '12px' }}
          >
            <h2 style={{ margin: 0 }}>
              {view === 'disputes'
                ? 'Chọn hợp đồng để xem hoặc mở tranh chấp'
                : 'Lịch sử hợp đồng & cọc mô phỏng (môi trường thử)'}
            </h2>
            <button
              type="button"
              className="secondary"
              disabled={deposits.isFetching}
              onClick={() => void deposits.refetch()}
            >
              Làm mới
            </button>
          </div>
          {deposits.isPending && <p role="status">Đang tải danh sách hợp đồng &amp; cọc…</p>}
          {deposits.error && (
            <div className="error" role="alert">
              <p style={{ margin: '0 0 8px' }}>{deposits.error.message}</p>
              <button type="button" onClick={() => void deposits.refetch()}>
                Thử lại
              </button>
            </div>
          )}
          {deposits.data?.pages[0]?.data.length === 0 && (
            <p className="muted">
              Chưa có hợp đồng hoặc tiền cọc mô phỏng nào. Bạn có thể soạn hợp đồng trực tiếp từ một
              cuộc trò chuyện đã chấp nhận báo giá.
            </p>
          )}
          {deposits.data?.pages
            .flatMap((p) => p.data)
            .map((d) => (
              <article className="room-link" key={d.paymentTrackingId} style={{ display: 'block' }}>
                <div className="actions" style={{ justifyContent: 'space-between' }}>
                  <Link to={'/payments/contracts/' + d.contractId}>
                    Hợp đồng #{d.contractId.slice(0, 8)} →
                  </Link>
                  <strong className="tabular-nums">
                    {formatVND(d.depositAmount)} (cọc mô phỏng)
                  </strong>
                </div>
                <div
                  className="actions"
                  style={{ justifyContent: 'space-between', marginTop: '8px' }}
                >
                  <span className={`status-pill ${depositStatusTone(d.status)}`}>
                    {depositStatusLabels[d.status] ?? d.status}
                  </span>
                </div>
              </article>
            ))}
          {deposits.hasNextPage && (
            <button
              style={{ marginTop: '12px' }}
              disabled={deposits.isFetchingNextPage}
              onClick={() => void deposits.fetchNextPage()}
            >
              Xem thêm
            </button>
          )}
        </section>
      )}

      <details className="lookup-details" open={invalidLookup || undefined}>
        <summary className="lookup-summary">
          <span className="lookup-summary-left">
            <UiIcon name="search" size={16} />
            {isAdmin
              ? 'Mở nhanh theo mã hồ sơ tranh chấp (UUID)'
              : 'Tra cứu nhanh theo mã hợp đồng hoặc tranh chấp (UUID)'}
          </span>
          <UiIcon name="chevron" size={16} />
        </summary>
        <form
          className="lookup-inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const id = lookup.trim();
            if (!z.uuid().safeParse(id).success) {
              setInvalidLookup(true);
              return;
            }
            const target =
              isAdmin || lookupKind === 'dispute' ? '/payments/disputes/' : '/payments/contracts/';
            void nav(target + id);
          }}
        >
          {!isAdmin && view === 'disputes' && (
            <label style={{ flex: '0 0 180px' }}>
              Loại hồ sơ
              <select
                value={lookupKind}
                onChange={(e) => setLookupKind(e.target.value as 'contract' | 'dispute')}
              >
                <option value="dispute">Tranh chấp</option>
                <option value="contract">Hợp đồng</option>
              </select>
            </label>
          )}
          <label>
            {isAdmin || (!isAdmin && lookupKind === 'dispute')
              ? 'Mã tranh chấp (UUID)'
              : 'Mã hợp đồng (UUID)'}
            <input
              value={lookup}
              placeholder="Ví dụ: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              onChange={(e) => {
                setLookup(e.target.value);
                setInvalidLookup(false);
              }}
              required
              aria-invalid={invalidLookup}
              aria-describedby={invalidLookup ? 'payment-lookup-error' : undefined}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button type="submit">Mở hồ sơ</button>
        </form>
        {invalidLookup && (
          <p id="payment-lookup-error" className="error" role="alert" style={{ marginTop: '10px' }}>
            Mã chưa đúng định dạng UUID. Kiểm tra mã rồi thử lại.
          </p>
        )}
      </details>
    </>
  );
}

export function ContractPage() {
  const { contractId = '' } = useParams();
  const session = useAccount();
  const cache = useQueryClient();
  const nav = useNavigate();
  const contract = useQuery({
    queryKey: ['payments', session?.accountId, contractId],
    queryFn: ({ signal }) => paymentsApi.contract(contractId, signal),
  });
  const [editing, setEditing] = useState(false);
  const action = useMutation({
    mutationFn: (kind: 'accept' | 'pay' | 'complete' | 'release') => paymentsApi[kind](contractId),
    onSettled: () => {
      void cache.invalidateQueries({ queryKey: ['payments', session?.accountId] });
      void cache.invalidateQueries({ queryKey: ['listings'] });
      void cache.invalidateQueries({ queryKey: ['listing'] });
      void cache.invalidateQueries({ queryKey: ['offers'] });
    },
  });
  const open = useMutation({
    mutationFn: ({ reason, description }: { reason: string; description: string }) =>
      paymentsApi.open(contractId, reason, description, []),
    onSuccess: (data) => {
      void cache.invalidateQueries({ queryKey: ['payments', session?.accountId] });
      void nav('/payments/disputes/' + data.disputeId);
    },
  });

  if (contract.isPending) return <p role="status">Đang tải hợp đồng…</p>;
  if (contract.error) {
    return (
      <div className="panel">
        <p className="error" role="alert">
          {contract.error.message}
        </p>
        <div className="actions">
          <button type="button" onClick={() => void contract.refetch()}>
            Thử lại
          </button>
          <Link to="/payments">← Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  const c = contract.data;
  const farmer = session?.role === 'FARMER' && session.accountId === c.farmerId;
  const trader = session?.role === 'TRADER' && session.accountId === c.traderId;
  const stepProgress = getContractStepProgress(c.status);

  return (
    <>
      <div className="actions" style={{ marginBottom: '14px' }}>
        <Link to="/payments">← Danh sách hợp đồng &amp; cọc</Link>
      </div>
      <section className="panel">
        <div
          className="actions"
          style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}
        >
          <div>
            <h1 style={{ marginBottom: '4px' }}>Hợp đồng mùa vụ</h1>
            <p className="muted tabular-nums" style={{ margin: 0 }}>
              Mã hợp đồng: #{c.contractId.slice(0, 8)}…{c.contractId.slice(-4)}
            </p>
          </div>
          <span className={`status-pill ${depositStatusTone(c.status)}`}>
            {contractStatusLabels[c.status] ?? c.status}
          </span>
        </div>

        <ol className="contract-stepper" aria-label="Tiến độ hợp đồng">
          {contractStepLabels.map((step) => {
            const done = !stepProgress.cancelled && step.id < stepProgress.current;
            const current = !stepProgress.cancelled && step.id === stepProgress.current;
            return (
              <li
                key={step.id}
                className={`contract-step ${
                  stepProgress.cancelled
                    ? 'is-cancelled'
                    : done
                      ? 'is-done'
                      : current
                        ? 'is-current'
                        : ''
                }`}
              >
                <span className="step-badge" aria-hidden="true">
                  {done ? <UiIcon name="check" size={13} /> : step.id}
                </span>
                <span>{step.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="contract-kpi-grid">
          <div className="contract-kpi-card">
            <small>Tổng giá trị hợp đồng</small>
            <strong>{formatVND(c.totalAmount)}</strong>
          </div>
          <div className="contract-kpi-card">
            <small>Cọc mô phỏng 5% (môi trường thử)</small>
            <strong>{calcSimulatedDeposit5Percent(c.totalAmount)}</strong>
          </div>
          <div className="contract-kpi-card">
            <small>Ngày giao dự kiến</small>
            <strong>{new Date(c.deliveryDate).toLocaleDateString('vi-VN')}</strong>
          </div>
        </div>

        <div className="sim-notice" role="note">
          <UiIcon name="info" size={18} />
          <div>
            <strong>Cọc mô phỏng (môi trường thử):</strong> Tiền cọc 5% trên tổng giá trị hợp đồng
            được hệ thống tính mô phỏng; giao dịch thanh toán tiền mua lúa thực tế diễn ra ngoài ứng
            dụng.
          </div>
        </div>
        <dl>
          <dt>Trạng thái</dt>
          <dd>{contractStatusLabels[c.status] ?? c.status}</dd>
          <dt>Tổng giá trị</dt>
          <dd className="tabular-nums">{formatVND(c.totalAmount)}</dd>
          <dt>Ngày giao dự kiến</dt>
          <dd className="tabular-nums">{new Date(c.deliveryDate).toLocaleString('vi-VN')}</dd>
          <dt>Điều khoản</dt>
          <dd style={{ whiteSpace: 'pre-wrap' }}>{c.terms}</dd>
        </dl>
        <div className="actions" style={{ marginTop: '16px' }}>
          <Link to={'/chat/' + c.conversationId}>Trao đổi trong phòng chat →</Link>
        </div>
        {action.error && (
          <p className="error" role="alert" style={{ marginTop: '12px' }}>
            {action.error.message} · Đã tải lại trạng thái, kiểm tra trước khi thử lại.
          </p>
        )}
        <div className="actions" style={{ marginTop: '16px' }}>
          {farmer && c.status === 'CREATED' && (
            <button disabled={action.isPending} onClick={() => action.mutate('accept')}>
              Chấp nhận điều khoản
            </button>
          )}
          {trader && c.status === 'CREATED' && (
            <button type="button" className="secondary" onClick={() => setEditing(!editing)}>
              {editing ? 'Đóng chỉnh sửa' : 'Sửa dự thảo'}
            </button>
          )}
          {trader && c.status === 'PENDING_DEPOSIT' && (
            <button disabled={action.isPending} onClick={() => action.mutate('pay')}>
              Nạp cọc mô phỏng 5% (môi trường thử)
            </button>
          )}
          {trader && c.status === 'ACTIVE' && !c.disputeSummary && (
            <button disabled={action.isPending} onClick={() => action.mutate('complete')}>
              Xác nhận đã hoàn tất giao dịch
            </button>
          )}
          {farmer &&
            ['ACTIVE', 'COMPLETED'].includes(c.status) &&
            !c.disputeSummary?.depositHold && (
              <button disabled={action.isPending} onClick={() => action.mutate('release')}>
                Yêu cầu rút cọc mô phỏng
              </button>
            )}
        </div>
        <p className="muted" style={{ marginTop: '10px' }}>
          Máy chủ kiểm tra điều kiện rút và tranh chấp mô phỏng trước khi cập nhật trạng thái.
        </p>
        {editing && (
          <div style={{ marginTop: '18px' }}>
            <ContractForm
              initial={c}
              onSave={async (values) => {
                await paymentsApi.edit(contractId, values);
                setEditing(false);
                await contract.refetch();
              }}
            />
          </div>
        )}
      </section>
      {c.disputeSummary ? (
        <section className="panel">
          <h2>Hồ sơ tranh chấp đang liên kết</h2>
          <p className="muted">
            Trạng thái: {disputeStatusLabels[c.disputeSummary.status] ?? c.disputeSummary.status}
          </p>
          <div className="actions">
            <Link to={'/payments/disputes/' + c.disputeSummary.disputeId}>
              Mở hồ sơ tranh chấp →
            </Link>
          </div>
        </section>
      ) : (
        ['ACTIVE', 'COMPLETED'].includes(c.status) &&
        (farmer || trader) && (
          <section className="panel">
            <h2>Mở hồ sơ tranh chấp</h2>
            <p className="muted">
              Sau khi mở hồ sơ tranh chấp, bạn có thể tải ảnh bằng chứng và gửi phản hồi chi tiết.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const values = new FormData(e.currentTarget);
                open.mutate({
                  reason: String(values.get('reason')),
                  description: String(values.get('description')),
                });
              }}
            >
              <label>
                Lý do tranh chấp
                <select name="reason" required defaultValue="DELIVERY_ISSUE">
                  <option value="DELIVERY_ISSUE">Chậm lịch thu hoạch / giao nhận lúa</option>
                  <option value="QUALITY_MISMATCH">
                    Chất lượng / độ ẩm lúa không đúng thỏa thuận
                  </option>
                  <option value="QUANTITY_SHORTAGE">Sản lượng cân thực tế lệch thỏa thuận</option>
                  <option value="PAYMENT_ISSUE">Vấn đề tiền cọc / thanh toán</option>
                  <option value="OTHER">Lý do khác</option>
                </select>
              </label>
              <label>
                Mô tả vấn đề phát sinh
                <textarea
                  name="description"
                  required
                  rows={3}
                  maxLength={5000}
                  placeholder="Mô tả rõ thời gian, sự việc và yêu cầu xử lý…"
                />
              </label>
              {open.error && (
                <p className="error" role="alert">
                  {open.error.message}
                </p>
              )}
              <button disabled={open.isPending}>
                {open.isPending ? 'Đang tạo hồ sơ…' : 'Tạo hồ sơ tranh chấp'}
              </button>
            </form>
          </section>
        )
      )}
    </>
  );
}

export function CreateContractPage() {
  const [params] = useSearchParams();
  const session = useAccount();
  const nav = useNavigate();
  if (session?.role !== 'TRADER') return <p>Chỉ thương lái được soạn hợp đồng.</p>;
  return (
    <section className="panel">
      <h1>Soạn hợp đồng mùa vụ</h1>
      <p className="muted">Đọc và thống nhất điều khoản với nông dân trước khi gửi dự thảo.</p>
      <div className="sim-notice" role="note">
        <UiIcon name="info" size={18} />
        <div>
          <strong>Cọc mô phỏng (môi trường thử):</strong> Sau khi nông dân chấp nhận hợp đồng,
          thương lái thực hiện bước nạp cọc mô phỏng 5% để kích hoạt hợp đồng thử nghiệm.
        </div>
      </div>
      <ContractForm
        onSave={async (values) => {
          const fields = {
            offerId: params.get('offerId') ?? '',
            conversationId: params.get('conversationId') ?? '',
            farmerId: params.get('farmerId') ?? '',
          };
          for (const value of Object.values(fields))
            if (!z.uuid().safeParse(value).success)
              throw Error('Hãy mở soạn hợp đồng từ một cuộc trò chuyện hợp lệ.');
          const c = await paymentsApi.create({ ...fields, ...values });
          void nav('/payments/contracts/' + c.contractId);
        }}
      />
    </section>
  );
}

function ContractForm({
  initial,
  onSave,
}: {
  initial?: { totalAmount: string; deliveryDate: string; terms: string };
  onSave: (values: { totalAmount: string; deliveryDate: string; terms: string }) => Promise<void>;
}) {
  const [formError, setFormError] = useState('');
  const mutation = useMutation({ mutationFn: onSave });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setFormError('');
        const data = new FormData(e.currentTarget);
        const rawAmount = String(data.get('amount') ?? '').trim();
        const normalizedAmount = /^\d{1,13}$/.test(rawAmount) ? `${rawAmount}.00` : rawAmount;
        const date = new Date(String(data.get('date') ?? ''));
        const terms = String(data.get('terms') ?? '').trim();

        if (!/^\d{1,13}\.\d{2}$/.test(normalizedAmount) || /^0+\.00$/.test(normalizedAmount)) {
          setFormError(
            'Tổng giá trị phải lớn hơn 0 và đúng định dạng tiền tệ (ví dụ: 92000000 hoặc 92000000.00).',
          );
          return;
        }
        if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
          setFormError('Ngày giao hàng dự kiến phải là thời điểm ở tương lai.');
          return;
        }
        if (!terms) {
          setFormError('Vui lòng nhập nội dung điều khoản hợp đồng.');
          return;
        }
        mutation.mutate({ totalAmount: normalizedAmount, deliveryDate: date.toISOString(), terms });
      }}
    >
      <label>
        Tổng giá trị (VND, ví dụ 92000000.00)
        <input
          name="amount"
          required
          defaultValue={initial?.totalAmount}
          placeholder="92000000.00"
        />
      </label>
      <label>
        Ngày giao dự kiến
        <input
          name="date"
          type="datetime-local"
          required
          defaultValue={
            initial
              ? new Date(
                  new Date(initial.deliveryDate).getTime() - new Date().getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 16)
              : undefined
          }
        />
      </label>
      <label>
        Điều khoản giao nhận
        <textarea name="terms" required rows={4} defaultValue={initial?.terms} />
      </label>
      <p className="muted">
        Mức cọc mô phỏng mặc định 5% do máy chủ tính; chế tài xử lý cọc do máy chủ áp dụng theo
        quyết định tranh chấp.
      </p>
      {formError && (
        <p className="error" role="alert">
          {formError}
        </p>
      )}
      {mutation.error && (
        <p className="error" role="alert">
          {mutation.error.message}
        </p>
      )}
      <button disabled={mutation.isPending}>
        {mutation.isPending ? 'Đang lưu hợp đồng…' : 'Lưu hợp đồng'}
      </button>
    </form>
  );
}

export function DisputePage() {
  const { disputeId = '' } = useParams();
  const session = useAccount();
  const cache = useQueryClient();
  const isAdmin = session?.role === 'ADMIN';

  const [reviewNote, setReviewNote] = useState('Tiếp nhận xem xét hồ sơ tranh chấp');
  const [outcome, setOutcome] = useState<DisputeDecisionBody['outcome']>('NO_VIOLATION');
  const [violationCode, setViolationCode] = useState('F01');
  const [depositDisposition, setDepositDisposition] =
    useState<DisputeDecisionBody['depositDisposition']>('NONE');
  const [liableAccountId, setLiableAccountId] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [decisionFormError, setDecisionFormError] = useState('');

  const query = useQuery({
    queryKey: ['payments', session?.accountId, 'dispute', disputeId],
    queryFn: ({ signal }) => paymentsApi.dispute(disputeId, signal),
  });

  const canViewEvidence = Boolean(
    query.data && (!isAdmin || query.data.assignedAdminId === session?.accountId),
  );

  const evidence = useInfiniteQuery({
    queryKey: ['payments', session?.accountId, 'evidence', disputeId],
    initialPageParam: undefined as string | undefined,
    enabled: canViewEvidence,
    queryFn: ({ pageParam, signal }) => paymentsApi.evidenceList(disputeId, pageParam, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });

  const upload = useMutation({
    mutationFn: (file: File) => paymentsApi.uploadEvidence(disputeId, file),
    onSuccess: () =>
      void cache.invalidateQueries({
        queryKey: ['payments', session?.accountId, 'evidence', disputeId],
      }),
  });

  const response = useMutation({
    mutationFn: (statement: string) => paymentsApi.respond(disputeId, statement, []),
    onSuccess: () =>
      void cache.invalidateQueries({
        queryKey: ['payments', session?.accountId, 'dispute', disputeId],
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: (expectedVersion: number | null) =>
      paymentsApi.reviewDispute(disputeId, reviewNote.trim(), expectedVersion),
    onSuccess: () => void cache.invalidateQueries({ queryKey: ['payments', session?.accountId] }),
  });

  const decideMutation = useMutation({
    mutationFn: (body: DisputeDecisionBody) => paymentsApi.decideDispute(disputeId, body),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['payments', session?.accountId] });
      void cache.invalidateQueries({ queryKey: ['listings'] });
      void cache.invalidateQueries({ queryKey: ['listing'] });
      void cache.invalidateQueries({ queryKey: ['offers'] });
    },
  });

  if (query.isPending) return <p role="status">Đang tải hồ sơ tranh chấp…</p>;
  if (query.error) {
    return (
      <section className="panel">
        <p className="error" role="alert">
          {query.error.message}
        </p>
        <div className="actions">
          <button type="button" onClick={() => void query.refetch()}>
            Thử lại
          </button>
          <Link to="/payments">← Quay lại danh sách</Link>
        </div>
      </section>
    );
  }

  const d = query.data;
  const evidenceItems = evidence.data?.pages.flatMap((p) => p.items) ?? [];
  const canDecide =
    isAdmin && d.status === 'UNDER_REVIEW' && d.assignedAdminId === session?.accountId;
  const activeViolations =
    outcome === 'FARMER_VIOLATION'
      ? farmerViolations
      : outcome === 'TRADER_VIOLATION'
        ? traderViolations
        : [];
  const autoLiableId =
    outcome === 'FARMER_VIOLATION'
      ? (d.farmerId ?? '')
      : outcome === 'TRADER_VIOLATION'
        ? (d.traderId ?? '')
        : '';
  const resolvedLiableId = (liableAccountId || autoLiableId).trim();

  const toggleEvidenceRef = (id: string) => {
    setSelectedEvidenceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <>
      <div className="actions" style={{ marginBottom: '14px' }}>
        {isAdmin ? (
          <Link to="/payments">← Danh sách tranh chấp</Link>
        ) : (
          <Link to={'/payments/contracts/' + d.contractId}>← Quay lại hợp đồng</Link>
        )}
      </div>

      <section className="panel">
        <div
          className="actions"
          style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}
        >
          <h1 style={{ margin: 0 }}>Hồ sơ tranh chấp</h1>
          <span className={`status-pill ${depositStatusTone(d.status)}`}>
            {disputeStatusLabels[d.status] ?? d.status}
          </span>
        </div>
        <dl>
          <dt>Mã tranh chấp</dt>
          <dd className="tabular-nums">{d.disputeId}</dd>
          <dt>Mã hợp đồng</dt>
          <dd className="tabular-nums">{d.contractId}</dd>
          <dt>Trạng thái</dt>
          <dd>{disputeStatusLabels[d.status] ?? d.status}</dd>
          <dt>Lý do</dt>
          <dd>{d.reasonCode}</dd>
          <dt>Cọc mô phỏng 5%</dt>
          <dd>{d.depositHold ? 'Tiền cọc mô phỏng đang được giữ chờ xử lý' : 'Không giữ cọc'}</dd>
          {d.outcome && (
            <>
              <dt>Kết quả xử lý</dt>
              <dd>{humanizeSystemText(d.outcome)}</dd>
            </>
          )}
        </dl>
        <p style={{ whiteSpace: 'pre-wrap', marginTop: '14px' }}>{d.description}</p>
        {d.decision && (
          <div className="success-banner" style={{ marginTop: '12px' }}>
            <strong>Quyết định chính thức ({humanizeSystemText(d.decision.outcome)}):</strong>{' '}
            {d.decision.reason} · Xử lý cọc: {humanizeSystemText(d.decision.depositDisposition)}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Bằng chứng đã nộp ({canViewEvidence ? evidenceItems.length : 'Chờ tiếp nhận'})</h2>
        {[evidence.error, upload.error, response.error, reviewMutation.error, decideMutation.error]
          .filter(Boolean)
          .map((e, i) => (
            <p key={i} className="error" role="alert">
              {e?.message}
            </p>
          ))}
        {!canViewEvidence ? (
          <p className="muted">
            Bằng chứng chỉ khả dụng sau khi quản trị viên tiếp nhận xem xét hồ sơ tranh chấp này.
          </p>
        ) : (
          <>
            {evidence.isPending && <p role="status">Đang tải danh sách bằng chứng…</p>}
            {!evidence.isPending && evidenceItems.length === 0 && (
              <p className="muted">Chưa có bằng chứng nào được tải lên cho hồ sơ này.</p>
            )}
          </>
        )}
        {evidenceItems.map((item) => (
          <article key={item.evidenceId} style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 6px' }}>
              {item.description || 'Tệp bằng chứng'} ·{' '}
              <small className="muted">Người tải: {item.uploaderId.slice(0, 8)}</small>
            </p>
            <PrivateImage path={item.downloadUrl} />
          </article>
        ))}
        {evidence.hasNextPage && (
          <button
            type="button"
            disabled={evidence.isFetchingNextPage}
            onClick={() => void evidence.fetchNextPage()}
          >
            Xem thêm bằng chứng
          </button>
        )}

        {d.status !== 'RESOLVED' && !isAdmin && (
          <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
            <label className="file-upload-btn">
              <UiIcon name="camera" size={18} />
              <span>
                {upload.isPending
                  ? 'Đang tải ảnh bằng chứng…'
                  : 'Nộp ảnh bằng chứng (PNG/JPG/WebP)'}
              </span>
              <input
                className="visually-hidden"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={upload.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload.mutate(file);
                  e.target.value = '';
                }}
              />
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                response.mutate(String(new FormData(e.currentTarget).get('statement')));
                e.currentTarget.reset();
              }}
            >
              <label>
                Ý kiến phản hồi gửi Admin
                <textarea name="statement" required rows={3} maxLength={5000} />
              </label>
              <button disabled={response.isPending}>
                {response.isPending ? 'Đang gửi…' : 'Gửi phản hồi'}
              </button>
              {response.isSuccess && (
                <p className="success-banner" role="status" style={{ marginTop: '10px' }}>
                  Đã ghi nhận phản hồi của bạn.
                </p>
              )}
            </form>
          </div>
        )}
      </section>

      {isAdmin && d.status === 'OPEN' && (
        <section className="panel">
          <h2>Tiếp nhận xem xét tranh chấp</h2>
          <p className="muted">
            Chuyển hồ sơ sang trạng thái Đang xem xét để khóa phân công cho bạn.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              reviewMutation.mutate(d.stateVersion);
            }}
          >
            <label>
              Ghi chú tiếp nhận
              <textarea
                rows={2}
                required
                maxLength={2000}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </label>
            <button disabled={reviewMutation.isPending || !reviewNote.trim()}>
              {reviewMutation.isPending ? 'Đang tiếp nhận…' : 'Nhận xem xét hồ sơ này'}
            </button>
          </form>
        </section>
      )}

      {canDecide && (
        <section className="panel">
          <h2>Ra quyết định xử lý tranh chấp &amp; cọc mô phỏng</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDecisionFormError('');
              const reason = decisionReason.trim();
              if (!reason) {
                setDecisionFormError('Vui lòng nhập lý do quyết định.');
                return;
              }
              const isViolation = outcome === 'FARMER_VIOLATION' || outcome === 'TRADER_VIOLATION';
              if (isViolation && selectedEvidenceIds.length === 0) {
                setDecisionFormError(
                  'Quyết định xử phạt yêu cầu chọn ít nhất 1 bằng chứng thuộc hồ sơ.',
                );
                return;
              }
              if (outcome === 'MUTUAL_CANCEL' && selectedEvidenceIds.length < 2) {
                setDecisionFormError(
                  'Hủy thỏa thuận đôi bên (MUTUAL_CANCEL) yêu cầu chọn tối thiểu 2 bằng chứng.',
                );
                return;
              }
              if (isViolation && !z.uuid().safeParse(resolvedLiableId).success) {
                setDecisionFormError('Cần nhập hoặc chọn đúng UUID tài khoản bên vi phạm.');
                return;
              }
              const selectedRule = activeViolations.find((v) => v.code === violationCode);
              decideMutation.mutate({
                decisionId: crypto.randomUUID(),
                expectedVersion: d.stateVersion,
                outcome,
                liableAccountId: isViolation ? resolvedLiableId : null,
                violationCode: isViolation ? violationCode : null,
                penaltyPoints: isViolation ? (selectedRule?.points ?? '1') : null,
                depositDisposition:
                  outcome === 'NO_VIOLATION' || outcome === 'INSUFFICIENT_EVIDENCE'
                    ? 'NONE'
                    : depositDisposition,
                reason,
                evidenceRefs: selectedEvidenceIds,
              });
            }}
          >
            <label>
              Kết luận xử lý
              <select
                value={outcome}
                onChange={(e) => {
                  const next = e.target.value as DisputeDecisionBody['outcome'];
                  setOutcome(next);
                  setLiableAccountId('');
                  if (next === 'FARMER_VIOLATION') {
                    setViolationCode('F01');
                    setDepositDisposition('REFUND_TO_TRADER');
                  } else if (next === 'TRADER_VIOLATION') {
                    setViolationCode('T01');
                    setDepositDisposition('FORFEIT_TO_FARMER');
                  } else {
                    setDepositDisposition('NONE');
                  }
                }}
              >
                <option value="NO_VIOLATION">Không vi phạm (NO_VIOLATION)</option>
                <option value="INSUFFICIENT_EVIDENCE">
                  Chưa đủ bằng chứng (INSUFFICIENT_EVIDENCE)
                </option>
                <option value="FARMER_VIOLATION">Nông dân vi phạm (FARMER_VIOLATION)</option>
                <option value="TRADER_VIOLATION">Thương lái vi phạm (TRADER_VIOLATION)</option>
                <option value="MUTUAL_CANCEL">Đôi bên đồng thuận hủy (MUTUAL_CANCEL)</option>
              </select>
            </label>

            {(outcome === 'FARMER_VIOLATION' || outcome === 'TRADER_VIOLATION') && (
              <>
                <label>
                  Mã vi phạm &amp; điểm uy tín trừ
                  <select value={violationCode} onChange={(e) => setViolationCode(e.target.value)}>
                    {activeViolations.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Tài khoản chịu trách nhiệm (
                  {outcome === 'FARMER_VIOLATION' ? 'Nông dân' : 'Thương lái'})
                  <input
                    value={resolvedLiableId}
                    onChange={(e) => setLiableAccountId(e.target.value)}
                    required
                    placeholder="UUID tài khoản vi phạm"
                  />
                </label>
              </>
            )}

            {outcome !== 'NO_VIOLATION' && outcome !== 'INSUFFICIENT_EVIDENCE' && (
              <label>
                Xử lý cọc mô phỏng 5%
                <select
                  value={depositDisposition}
                  onChange={(e) =>
                    setDepositDisposition(
                      e.target.value as DisputeDecisionBody['depositDisposition'],
                    )
                  }
                >
                  <option value="REFUND_TO_TRADER">Hoàn cọc mô phỏng cho thương lái</option>
                  <option value="FORFEIT_TO_FARMER">Chuyển cọc mô phỏng cho nông dân</option>
                  <option value="NONE">Không thay đổi cọc (NONE)</option>
                </select>
              </label>
            )}

            {evidenceItems.length > 0 && (
              <fieldset
                style={{
                  border: '1px solid #dce6dd',
                  borderRadius: '12px',
                  padding: '12px',
                  margin: '10px 0',
                }}
              >
                <legend style={{ fontWeight: 600, padding: '0 6px' }}>
                  Chọn bằng chứng căn cứ ({selectedEvidenceIds.length} đã chọn)
                </legend>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {evidenceItems.map((item) => (
                    <label
                      key={item.evidenceId}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}
                    >
                      <input
                        type="checkbox"
                        style={{ width: '20px', minHeight: '20px' }}
                        checked={selectedEvidenceIds.includes(item.evidenceId)}
                        onChange={() => toggleEvidenceRef(item.evidenceId)}
                      />
                      <span>
                        {item.evidenceId.slice(0, 8)} · {item.description || 'Ảnh bằng chứng'}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <label>
              Lý do quyết định
              <textarea
                rows={3}
                required
                maxLength={5000}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Nêu rõ căn cứ, đối chiếu bằng chứng và kết luận…"
              />
            </label>

            {decisionFormError && (
              <p className="error" role="alert">
                {decisionFormError}
              </p>
            )}
            <button disabled={decideMutation.isPending}>
              {decideMutation.isPending ? 'Đang lưu quyết định…' : 'Ban hành quyết định giải quyết'}
            </button>
          </form>
        </section>
      )}
    </>
  );
}
