import { useParams } from 'react-router-dom';
import { accountStatusLabels, userRoleLabels } from '@agri/contracts';
import { UserError, UserLayout } from '../components/UserLayout';
import { ProfileEditor } from '../components/ProfileEditor';
import { Avatar } from '../components/Avatar';
import { useMyProfile, usePublicProfile } from '../hooks/useUsers';
export function ProfilePage() {
  const query = useMyProfile();
  const account = query.data;
  return (
    <UserLayout>
      <header className="user-page-heading">
        <div>
          <small>TÀI KHOẢN CỦA BẠN</small>
          <h1>Hồ sơ cá nhân</h1>
          <p>Thông tin để kết nối và đồng hành cùng đối tác.</p>
        </div>
      </header>
      {query.isPending ? (
        <p role="status">Đang tải hồ sơ…</p>
      ) : query.error ? (
        <UserError error={query.error} retry={() => void query.refetch()} />
      ) : (
        account && (
          <div className="user-profile-grid">
            <section className="user-card user-summary">
              <Avatar
                path={account.profile?.avatarUrl ?? null}
                name={account.username}
                editable={account.role !== 'ADMIN'}
              />
              <h2>{account.username}</h2>
              <span className="user-badge">{userRoleLabels[account.role]}</span>
              <dl>
                <dt>Email</dt>
                <dd>{account.email}</dd>
                <dt>Trạng thái</dt>
                <dd>{accountStatusLabels[account.status]}</dd>
                <dt>Tham gia</dt>
                <dd>{new Date(account.createdAt).toLocaleDateString('vi-VN')}</dd>
              </dl>
            </section>
            <section className="user-card">
              <h2>Thông tin liên hệ</h2>
              <p className="user-muted">Email và vai trò tài khoản được bảo vệ.</p>
              <ProfileEditor key={account.accountId} account={account} />
            </section>
          </div>
        )
      )}
    </UserLayout>
  );
}
export function PublicProfilePage() {
  const { accountId = '' } = useParams();
  const query = usePublicProfile(accountId);
  return (
    <UserLayout>
      <header className="user-page-heading">
        <div>
          <small>KẾT NỐI ĐỐI TÁC</small>
          <h1>Hồ sơ công khai</h1>
        </div>
      </header>
      {query.isPending ? (
        <p role="status">Đang tải…</p>
      ) : query.error ? (
        <UserError error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <section className="user-card">
            <Avatar path={query.data.avatarUrl} name={query.data.displayName} />
            <h2>{query.data.displayName}</h2>
            <p>
              {[query.data.district, query.data.province].filter(Boolean).join(', ') ||
                'Chưa cập nhật khu vực'}
            </p>
            <p className="user-muted">
              Tham gia {new Date(query.data.joinedAt).toLocaleDateString('vi-VN')}
            </p>
          </section>
        )
      )}
    </UserLayout>
  );
}
