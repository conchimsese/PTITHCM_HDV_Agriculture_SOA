import { Link } from 'react-router-dom';
import { CreateListingForm } from '../components/CreateListingForm';
import './trading.css';

export function CreateListingPage() {
  return (
    <div className="trading-page create-listing-page">
      <div className="page-header">
        <div>
          <nav className="breadcrumb-nav" aria-label="Đường dẫn">
            <Link to="/bai-dang">Bài đăng của tôi</Link>
            <span aria-hidden="true">/</span>
            <span>Tạo bài đăng mới</span>
          </nav>
          <h1>Đăng bài bán lúa</h1>
          <p className="page-subtitle">
            Kết nối thửa ruộng và mùa vụ thu hoạch từ hệ thống canh tác để chào bán trên thị trường
          </p>
        </div>
      </div>

      <CreateListingForm />
    </div>
  );
}
