# notifications / web

## Giao diện Notification

- `/thong-bao`: danh sách của current account, tất cả/chưa đọc/đã đọc, lọc 10 loại sự kiện, phân trang 20 bản ghi. Bộ lọc và page nằm trên URL, liên kết chia sẻ được.
- `/thong-bao/:notificationId`: chi tiết trong bố cục danh sách/chi tiết; mobile web chuyển sang một cột, có nút quay lại.
- Đánh dấu từng thông báo đã đọc bằng PATCH không body. Chỉ cập nhật UI sau khi server xác nhận, invalidate list/detail/count; giữ readAt từ server.
- Badge số chưa đọc trên sidebar; count refetch mỗi 60 giây khi tab hoạt động, có nút làm mới. Có loading, empty, lỗi + retry; 403/404 dùng thông báo server. Không fallback mock.

Query key có accountId, filter/page; truyền AbortSignal. Chỉ dùng 4 REST endpoint hiện có theo source notification-service trong workspace. Không read-all, không xóa, không nhận recipientId, không WebSocket/SSE/push. Tài khoản ADMIN cũng chỉ xem thông báo của mình. Retention 90 ngày do backend áp dụng.

Thông báo ACCOUNT có liên kết hồ sơ của tôi. Deep link sang Offer/Chat/Contract/Deposit chưa thêm vì route các module đó chưa có trên nhánh nền; nội dung thông báo vẫn xem đầy đủ, không tạo link hỏng. Không dựng nội dung thông báo từ Kafka ở FE.

Nhánh `feat/notification-service` kế thừa `feat/user-service` để sử dụng xác thực, session, layout và UI chung; merge User trước khi review/merge phần Notification. API/schema mới nằm trong packages/contracts và packages/api-client. Chưa kiểm thử end-to-end với Gateway/Kafka/backend thật.
