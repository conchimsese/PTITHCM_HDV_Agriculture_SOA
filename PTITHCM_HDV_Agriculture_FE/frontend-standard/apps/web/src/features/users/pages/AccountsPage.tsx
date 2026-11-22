import { useState } from 'react';
import {
  accountStatusLabels,
  accountStatusSchema,
  userRoleLabels,
  roleSchema,
  registrationRequest,
  emptyRegistration,
  type AccountFilters,
  type AccountStatus,
} from '@agri/contracts';
import { UserError, UserLayout } from '../components/UserLayout';
import { ProfileEditor } from '../components/ProfileEditor';
import { useAccount, useAccounts, useManageAccount, useSession } from '../hooks/useUsers';

export function AccountsPage() {
  const session = useSession();
  const [filters, setFilters] = useState<AccountFilters>({ page: 0 });
  const [selected, setSelected] = useState('');
  const [create, setCreate] = useState(false);
  const list = useAccounts(filters);
  return (
    <UserLayout admin>
      <header className="user-page-heading">
        <div>
          <small>QUẢN TRỊ HỆ THỐNG</small>
          <h1>Quản lý tài khoản</h1>
          <p>Theo dõi hồ sơ và trạng thái hoạt động.</p>
        </div>
        <button
          className="user-primary"
          onClick={() => {
            setCreate(true);
            setSelected('');
          }}
        >
          + Tạo tài khoản
        </button>
      </header>
      <div className="user-toolbar">
        <label>
          Vai trò
          <select
            value={filters.role ?? ''}
            onChange={(e) =>
              setFilters({ ...filters, page: 0, role: roleSchema.safeParse(e.target.value).data })
            }
          >
            <option value="">Tất cả vai trò</option>
            {roleSchema.options.map((role) => (
              <option key={role} value={role}>
                {userRoleLabels[role]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trạng thái
          <select
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                page: 0,
                status: accountStatusSchema.safeParse(e.target.value).data,
              })
            }
          >
            <option value="">Tất cả trạng thái</option>
            {accountStatusSchema.options.map((status) => (
              <option key={status} value={status}>
                {accountStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => void list.refetch()} disabled={list.isFetching}>
          Làm mới
        </button>
      </div>
      {list.isPending ? (
        <p role="status">Đang tải tài khoản…</p>
      ) : list.error ? (
        <UserError error={list.error} retry={() => void list.refetch()} />
      ) : (
        <section className="user-card">
          <div className="user-table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {list.data?.items.map((account) => (
                  <tr key={account.accountId}>
                    <td data-label="Tài khoản">
                      <div className="user-account-cell">
                        <span className="user-row-avatar" aria-hidden="true">
                          {account.username.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <strong>{account.username}</strong>
                          <small>{account.email}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Vai trò">{userRoleLabels[account.role]}</td>
                    <td data-label="Trạng thái">
                      <span className="user-badge">{accountStatusLabels[account.status]}</span>
                    </td>
                    <td data-label="Thao tác">
                      <button
                        onClick={() => {
                          setSelected(account.accountId);
                          setCreate(false);
                        }}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.data?.items.length === 0 && (
            <p className="user-empty">Không có tài khoản khớp bộ lọc.</p>
          )}
          <div className="user-pagination">
            <button
              disabled={filters.page === 0 || list.isFetching}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              ← Trước
            </button>
            <span>
              Trang {filters.page + 1} / {Math.max(1, list.data?.totalPages ?? 0)} ·{' '}
              {list.data?.totalElements ?? 0} tài khoản
            </span>
            <button
              disabled={filters.page + 1 >= (list.data?.totalPages ?? 0) || list.isFetching}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              Sau →
            </button>
          </div>
        </section>
      )}
      {create && (
        <section className="user-card user-detail">
          <div className="user-page-heading">
            <h2>Tạo tài khoản</h2>
            <button onClick={() => setCreate(false)}>Đóng</button>
          </div>
          <CreateAccountForm />
        </section>
      )}
      {selected && session?.role === 'ADMIN' && (
        <AccountDetail key={selected} id={selected} close={() => setSelected('')} />
      )}
    </UserLayout>
  );
}

function AccountDetail({ id, close }: { id: string; close: () => void }) {
  const query = useAccount(id);
  const session = useSession();
  const mutation = useManageAccount();
  const [status, setStatus] = useState<Exclude<AccountStatus, 'UNVERIFIED'>>('ACTIVE');
  const [reason, setReason] = useState('');
  return (
    <section className="user-card user-detail">
      <div className="user-page-heading">
        <h2>Chi tiết tài khoản</h2>
        <button onClick={close}>Đóng</button>
      </div>
      {query.isPending ? (
        <p>Đang tải…</p>
      ) : query.error ? (
        <UserError error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <>
            <h3>{query.data.username}</h3>
            <p>
              {query.data.email} · {userRoleLabels[query.data.role]}
            </p>
            <p>{accountStatusLabels[query.data.status]}</p>
            <ProfileEditor key={query.data.accountId} account={query.data} targetId={id} />
            <hr />
            <h3>Trạng thái hoạt động</h3>
            <p className="user-muted">
              Tài khoản chưa xác minh cần hoàn tất OTP trước khi kích hoạt. Không thể khóa hoặc
              ngừng tài khoản của chính bạn.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate({ id, status, reason });
              }}
            >
              <div className="user-form-grid">
                <label>
                  Trạng thái mới
                  <select
                    value={status}
                    onChange={(e) => {
                      if (
                        e.target.value === 'ACTIVE' ||
                        e.target.value === 'LOCKED' ||
                        e.target.value === 'INACTIVE'
                      )
                        setStatus(e.target.value);
                    }}
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="LOCKED">Đã khóa</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                  </select>
                </label>
                <label>
                  Lý do
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                    required
                  />
                </label>
              </div>
              <button
                className="user-primary"
                disabled={mutation.isPending || (id === session?.accountId && status !== 'ACTIVE')}
              >
                Cập nhật trạng thái
              </button>
            </form>
            <button
              className="user-danger"
              disabled={
                mutation.isPending || id === session?.accountId || query.data.status === 'INACTIVE'
              }
              onClick={() => {
                if (window.confirm(`Ngừng hoạt động tài khoản ${query.data?.username}?`))
                  mutation.mutate({ id, remove: true });
              }}
            >
              Ngừng hoạt động tài khoản
            </button>
            {mutation.error && (
              <p className="user-alert" role="alert">
                {mutation.error.message}
              </p>
            )}
            {mutation.isSuccess && (
              <p className="user-success" role="status">
                Đã cập nhật tài khoản.
              </p>
            )}
          </>
        )
      )}
    </section>
  );
}

function CreateAccountForm() {
  const [form, setForm] = useState({ ...emptyRegistration });
  const [error, setError] = useState('');
  const mutation = useManageAccount();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError('');
        try {
          mutation.mutate(
            { create: registrationRequest(form) },
            { onSuccess: () => setForm({ ...emptyRegistration }) },
          );
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Dữ liệu không hợp lệ.');
        }
      }}
    >
      <fieldset disabled={mutation.isPending} className="user-form-grid">
        <label>
          Vai trò
          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value === 'TRADER' ? 'TRADER' : 'FARMER' })
            }
          >
            <option value="FARMER">Nhà nông</option>
            <option value="TRADER">Thương lái</option>
          </select>
        </label>
        {(['name', 'phone', 'email', 'password', 'confirmPassword'] as const).map((key) => (
          <label key={key}>
            {
              {
                name: 'Họ tên / Doanh nghiệp',
                phone: 'Số điện thoại',
                email: 'Email',
                password: 'Mật khẩu',
                confirmPassword: 'Nhập lại mật khẩu',
              }[key]
            }
            <input
              required
              type={key.includes('assword') ? 'password' : key === 'email' ? 'email' : 'text'}
              value={form[key]}
              onChange={(e) => {
                mutation.reset();
                setForm({ ...form, [key]: e.target.value });
              }}
              maxLength={key === 'name' ? 150 : key === 'phone' ? 20 : key === 'email' ? 254 : 72}
            />
          </label>
        ))}
      </fieldset>
      <button className="user-primary" disabled={mutation.isPending}>
        Tạo và gửi email xác minh
      </button>
      {(error || mutation.error) && (
        <p className="user-alert" role="alert">
          {error || mutation.error?.message}
        </p>
      )}
      {mutation.isSuccess && (
        <p className="user-success" role="status">
          {mutation.data &&
          'verificationEmailStatus' in mutation.data &&
          mutation.data.verificationEmailStatus === 'FAILED'
            ? 'Đã tạo tài khoản nhưng gửi email thất bại. Người dùng có thể gửi lại OTP tại trang đăng nhập.'
            : 'Đã tạo tài khoản. Người dùng cần xác minh email để hoạt động.'}
        </p>
      )}
    </form>
  );
}
