import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { paymentsApi } from '../../../shared/api/modules';
import { useAccount } from '../../../shared/hooks/useAccount';
import { privateRequest, uploadImage } from '../../../shared/api/media';
import { PrivateImage } from '../../../shared/ui/PrivateImage';
export function PaymentsPage() {
  const session = useAccount();
  const [lookup, setLookup] = useState('');
  const nav = useNavigate();
  const deposits = useInfiniteQuery({
    queryKey: ['payments', session?.accountId, 'deposits'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => paymentsApi.deposits(pageParam, signal),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: !!session?.tokens && session.role !== 'ADMIN',
  });
  return (
    <>
      <h1>Hợp đồng & tiền cọc</h1>
      <p className="muted">Cọc 5% được mô phỏng. Tiền mua lúa thanh toán ngoài ứng dụng.</p>
      <section className="panel">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (z.uuid().safeParse(lookup).success) void nav('/payments/contracts/' + lookup);
          }}
        >
          <label>
            Mã hợp đồng
            <input
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              required
              pattern="[0-9a-fA-F-]{36}"
            />
          </label>
          <button>Mở hợp đồng</button>
        </form>
      </section>
      <section className="panel">
        <h2>Lịch sử cọc</h2>
        {deposits.isPending && session?.role !== 'ADMIN' && <p>Đang tải…</p>}
        {deposits.error && (
          <p className="error">
            {deposits.error.message}
            <button onClick={() => void deposits.refetch()}>Thử lại</button>
          </p>
        )}
        {deposits.data?.pages[0]?.data.length === 0 && (
          <p>Chưa có tiền cọc. Hợp đồng được tạo từ cuộc trò chuyện.</p>
        )}
        {deposits.data?.pages
          .flatMap((p) => p.data)
          .map((d) => (
            <article className="room-link" key={d.paymentTrackingId}>
              <Link to={'/payments/contracts/' + d.contractId}>
                Hợp đồng {d.contractId.slice(0, 8)}
              </Link>
              <p>
                {d.depositAmount} VND · {d.status}
              </p>
            </article>
          ))}
        {deposits.hasNextPage && (
          <button
            disabled={deposits.isFetchingNextPage}
            onClick={() => void deposits.fetchNextPage()}
          >
            Xem thêm
          </button>
        )}
      </section>
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
    },
  });
  const open = useMutation({
    mutationFn: ({ reason, description }: { reason: string; description: string }) =>
      paymentsApi.open(contractId, reason, description),
    onSuccess: (data) => {
      void cache.invalidateQueries({ queryKey: ['payments', session?.accountId] });
      void nav('/payments/disputes/' + data.disputeId);
    },
  });
  if (contract.isPending) return <p>Đang tải hợp đồng…</p>;
  if (contract.error)
    return (
      <p className="error">
        {contract.error.message}
        <button onClick={() => void contract.refetch()}>Thử lại</button>
      </p>
    );
  const c = contract.data;
  const farmer = session?.role === 'FARMER' && session.accountId === c.farmerId;
  const trader = session?.role === 'TRADER' && session.accountId === c.traderId;
  return (
    <>
      <Link to="/payments">← Danh sách cọc</Link>
      <section className="panel">
        <h1>Hợp đồng mùa vụ</h1>
        <p>{c.contractId}</p>
        <dl>
          <dt>Trạng thái</dt>
          <dd>{c.status}</dd>
          <dt>Tổng giá trị</dt>
          <dd>{c.totalAmount} VND</dd>
          <dt>Ngày giao</dt>
          <dd>{new Date(c.deliveryDate).toLocaleString('vi-VN')}</dd>
          <dt>Điều khoản</dt>
          <dd style={{ whiteSpace: 'pre-wrap' }}>{c.terms}</dd>
        </dl>
        <Link to={'/chat/' + c.conversationId}>Trao đổi trong phòng chat</Link>
        {action.error && (
          <p className="error" role="alert">
            {action.error.message} · Đã tải lại trạng thái, kiểm tra trước khi thử lại.
          </p>
        )}
        <div className="actions">
          {farmer && c.status === 'CREATED' && (
            <button disabled={action.isPending} onClick={() => action.mutate('accept')}>
              Chấp nhận điều khoản
            </button>
          )}
          {trader && c.status === 'CREATED' && (
            <button onClick={() => setEditing(!editing)}>Sửa dự thảo</button>
          )}
          {trader && c.status === 'PENDING_DEPOSIT' && (
            <button disabled={action.isPending} onClick={() => action.mutate('pay')}>
              Nạp cọc mô phỏng 5%
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
        <p className="muted">
          Máy chủ kiểm tra điều kiện rút và tranh chấp. Không tự rút khi đến hạn.
        </p>
        {editing && (
          <ContractForm
            initial={c}
            onSave={async (values) => {
              await paymentsApi.edit(contractId, values);
              setEditing(false);
              await contract.refetch();
            }}
          />
        )}
      </section>
      {c.disputeSummary ? (
        <section className="panel">
          <h2>Hồ sơ đang xử lý</h2>
          <Link to={'/payments/disputes/' + c.disputeSummary.disputeId}>
            Xem hồ sơ · {c.disputeSummary.status}
          </Link>
        </section>
      ) : (
        ['ACTIVE', 'COMPLETED'].includes(c.status) &&
        (farmer || trader) && (
          <section className="panel">
            <h2>Mở tranh chấp</h2>
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
                Lý do
                <input name="reason" required maxLength={80} />
              </label>
              <label>
                Mô tả
                <textarea name="description" required maxLength={5000} />
              </label>
              {open.error && <p className="error">{open.error.message}</p>}
              <button disabled={open.isPending}>Tạo hồ sơ</button>
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
      <h1>Soạn hợp đồng</h1>
      <p>Đọc và thống nhất điều khoản với nông dân trước khi gửi.</p>
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
  const mutation = useMutation({ mutationFn: onSave });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const totalAmount = String(data.get('amount')),
          date = new Date(String(data.get('date'))),
          terms = String(data.get('terms')).trim();
        if (
          !/^\d{1,13}\.\d{2}$/.test(totalAmount) ||
          /^0+\.00$/.test(totalAmount) ||
          !Number.isFinite(date.getTime()) ||
          date.getTime() <= Date.now() ||
          !terms
        )
          return;
        mutation.mutate({ totalAmount, deliveryDate: date.toISOString(), terms });
      }}
    >
      <label>
        Tổng giá trị (VND, ví dụ 92000000.00)
        <input
          name="amount"
          pattern="[0-9]{1,13}\.[0-9]{2}"
          required
          defaultValue={initial?.totalAmount}
        />
      </label>
      <label>
        Ngày giao
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
        Điều khoản
        <textarea name="terms" required defaultValue={initial?.terms} />
      </label>
      <p>
        Phạt theo điều khoản hợp đồng mới: 20% tiền cọc khi có quyết định phù hợp. Cọc do máy chủ
        tính.
      </p>
      {mutation.error && <p className="error">{mutation.error.message}</p>}
      <button disabled={mutation.isPending}>Lưu hợp đồng</button>
    </form>
  );
}
const evidenceSchema = z.object({
  items: z.array(
    z.object({ evidenceId: z.uuid(), description: z.string().nullable(), downloadUrl: z.string() }),
  ),
  nextCursor: z.string().nullable(),
});
export function DisputePage() {
  const { disputeId = '' } = useParams();
  const session = useAccount();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['payments', session?.accountId, 'dispute', disputeId],
    queryFn: ({ signal }) => paymentsApi.dispute(disputeId, signal),
  });
  const base = '/api/v1/payments/disputes/' + disputeId + '/evidence';
  const evidence = useInfiniteQuery({
    queryKey: ['payments', session?.accountId, 'evidence', disputeId],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) =>
      evidenceSchema.parse(
        await (
          await privateRequest(
            base + (pageParam ? '?cursor=' + encodeURIComponent(pageParam) : ''),
            undefined,
            signal,
          )
        ).json(),
      ),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const upload = useMutation({
    mutationFn: (file: File) => uploadImage(base, file),
    onSuccess: () =>
      void cache.invalidateQueries({
        queryKey: ['payments', session?.accountId, 'evidence', disputeId],
      }),
  });
  const response = useMutation({
    mutationFn: (statement: string) => paymentsApi.respond(disputeId, statement),
  });
  if (query.isPending) return <p>Đang tải hồ sơ…</p>;
  if (query.error)
    return (
      <p className="error">
        {query.error.message}
        <button onClick={() => void query.refetch()}>Thử lại</button>
      </p>
    );
  const d = query.data;
  return (
    <section className="panel">
      <Link to={'/payments/contracts/' + d.contractId}>← Hợp đồng</Link>
      <h1>Hồ sơ tranh chấp</h1>
      <p>
        {d.status} · {d.reasonCode}
      </p>
      <p>{d.description}</p>
      <p>{d.depositHold ? 'Tiền cọc đang được giữ để xử lý' : 'Không giữ cọc'}</p>
      {d.outcome && <p>Kết quả: {d.outcome}</p>}
      {[evidence.error, upload.error, response.error].filter(Boolean).map((e, i) => (
        <p key={i} className="error">
          {e?.message}
        </p>
      ))}
      <h2>Bằng chứng đã nộp</h2>
      {evidence.data?.pages
        .flatMap((p) => p.items)
        .map((item) => (
          <article key={item.evidenceId}>
            <p>{item.description}</p>
            <PrivateImage path={item.downloadUrl} />
          </article>
        ))}
      {evidence.hasNextPage && (
        <button
          disabled={evidence.isFetchingNextPage}
          onClick={() => void evidence.fetchNextPage()}
        >
          Xem thêm bằng chứng
        </button>
      )}
      {d.status !== 'RESOLVED' && session?.role !== 'ADMIN' && (
        <>
          <label>
            Nộp ảnh bằng chứng
            <input
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
            }}
          >
            <label>
              Ý kiến phản hồi
              <textarea name="statement" required maxLength={5000} />
            </label>
            <button disabled={response.isPending}>Gửi phản hồi</button>
            {response.isSuccess && <p>Đã ghi nhận phản hồi.</p>}
          </form>
        </>
      )}
    </section>
  );
}
