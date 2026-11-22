import { Link } from 'react-router-dom';
import { useSession } from '../../../shared/hooks/useAuth';
import './dashboard.css';
export function DashboardPage() {
  const session = useSession();
  if (!session) return null;
  const farmer = session.role === 'FARMER',
    trader = session.role === 'TRADER';
  return (
    <div className="dashboard">
      <div className="dash-heading">
        <div>
          <p className="dash-kicker">RUỘNG LÚA VIỆT · TỔNG QUAN</p>
          <h1>Chào {farmer ? 'nhà nông' : trader ? 'thương lái' : 'quản trị viên'}!</h1>
          <p>Theo dõi công việc và kết nối trong từng mùa vụ.</p>
        </div>
        <span className="dash-badge">{session.isDemo ? 'DỮ LIỆU MẪU' : 'TÀI KHOẢN CỦA BẠN'}</span>
      </div>
      {session.isDemo && (
        <p className="dash-notice">
          Bạn đang xem dữ liệu minh họa. Chat, hợp đồng và tài khoản cần backend để sử dụng.
        </p>
      )}
      <div className="dash-grid">
        <section className="dash-card dash-feature">
          <span className="dash-kicker">BẮT ĐẦU TỪ ĐÂY</span>
          <h2>
            {farmer
              ? 'Quản lý bài đăng của bạn'
              : trader
                ? 'Khám phá thị trường lúa'
                : 'Quản lý hệ thống'}
          </h2>
          <p>
            {farmer
              ? 'Xem bài bán lúa và các đề nghị từ thương lái.'
              : trader
                ? 'Tìm nguồn lúa và theo dõi báo giá của bạn.'
                : 'Theo dõi tài khoản và các hoạt động cần xử lý.'}
          </p>
          {session.isDemo && !farmer && !trader ? (
            <span>Chức năng quản trị cần backend</span>
          ) : (
            <Link
              className="dash-action"
              to={farmer ? '/bai-dang' : trader ? '/thi-truong' : '/quan-ly-tai-khoan'}
            >
              {farmer ? 'Xem bài đăng' : trader ? 'Xem thị trường' : 'Quản lý tài khoản'} →
            </Link>
          )}
        </section>
        <section className="dash-card">
          <span className="dash-kicker">KẾT NỐI</span>
          <h2>Trao đổi & hợp đồng</h2>
          <p>Giữ nội dung trao đổi và điều khoản giao dịch ở cùng một nơi.</p>
          {session.isDemo ? (
            <small>Cần backend để sử dụng</small>
          ) : (
            <>
              <Link to="/chat">Tin nhắn →</Link> <Link to="/payments">Hợp đồng & cọc →</Link>
            </>
          )}
        </section>
        <section className="dash-card">
          <span className="dash-kicker">THEO DÕI</span>
          <h2>Thông báo</h2>
          <p>Cập nhật khi có hoạt động mới liên quan đến tài khoản của bạn.</p>
          {session.isDemo ? (
            <small>Chưa có dữ liệu mẫu</small>
          ) : (
            <Link to="/thong-bao">Xem thông báo →</Link>
          )}
        </section>
      </div>
      <p className="dash-footer">Cùng nhau xây dựng một mùa vụ bền vững.</p>
    </div>
  );
}
