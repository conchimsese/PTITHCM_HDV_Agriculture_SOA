# notifications / mobile

## Giao diện Notification / Expo SDK 58

- `/thong-bao`: FlatList, lọc tất cả/chưa đọc/đã đọc, 10 loại sự kiện, phân trang 20 bản ghi, kéo làm mới.
- `/thong-bao/[notificationId]`: chi tiết, nút đánh dấu đã đọc và quay lại; ACCOUNT có nút xem hồ sơ cá nhân.
- Màn hồ sơ có nút thông báo kèm số chưa đọc. Count refetch mỗi 60 giây khi app hoạt động; focusManager đồng bộ AppState để dừng polling nền.
- Loading/empty/error + retry, trạng thái gửi, disable khi pending, dữ liệu thật qua REST; không mock fallback hoặc read-all.

Schema/API dùng chung web, query key theo accountId/filter/page, AbortSignal, invalidate list/detail/count sau PATCH. Logout từ User xóa cache và token. ADMIN cũng chỉ xem thông báo của mình; không nhận recipientId. Backend áp dụng retention 90 ngày.

Không dùng expo-notifications/OS push vì MVP backend chỉ có REST. Không deep link đến module nghiệp vụ chưa triển khai route. Nhánh Notification kế thừa nhánh User; merge `feat/user-service` trước. Chưa chạy thiết bị/Gateway/Kafka thật; kiểm tra tự động qua typecheck, lint, test, web build và Android export.
