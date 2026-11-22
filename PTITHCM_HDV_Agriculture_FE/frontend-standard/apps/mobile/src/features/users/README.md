# users / mobile

Đã có các route Expo Router:

- `/`: đăng nhập username/số điện thoại/email, đăng ký FARMER/TRADER, OTP email và gửi lại mã (cooldown 60 giây).
- `/tai-khoan`: xem/sửa hồ sơ theo role, đổi avatar, đăng xuất. Admin không có profile để sửa.
- `/nguoi-dung/[accountId]`: chỉ xem whitelist hồ sơ công khai.
- `/quan-ly-tai-khoan`, `/chi-tiet-tai-khoan?accountId=...`, `/tao-tai-khoan`: Admin quản lý danh sách/phân trang/bộ lọc, tạo tài khoản, sửa profile, đổi trạng thái có lý do, ngừng tài khoản có xác nhận. Danh sách dùng FlatList, có kéo làm mới.

Query key scope accountId, có AbortSignal, invalidate mutation, không fallback mock; logout xóa cache/token. Form có KeyboardAvoidingView, safe area, accessibility label và nút tối thiểu 48 point. Avatar dùng expo-image-picker đúng SDK 58, thư viện ảnh hệ thống; không yêu cầu camera/microphone. JPEG/PNG/WebP tối đa 5 MiB, upload multipart và hiển thị ảnh với Bearer. Bản native cài sẵn trước khi thêm module cần build lại.

Chạy `npm run dev:mobile` tại frontend-standard. Đặt `EXPO_PUBLIC_GATEWAY_URL` theo IP máy chạy Gateway khi dùng máy thật; mặc định 10.0.2.2:8080 cho Android emulator. Token chỉ ở RAM.

Backend hiện tìm login theo username: tài khoản mới dùng phone làm username; email cần backend hỗ trợ lookup bổ sung. Google chưa có API backend và chưa nối native OAuth, không giả lập đăng nhập thành công. Xem README users/web về cấu hình Google hiện có trên web. Không có đổi email/password/role vì backend chưa có API.

Schema và payload đối chiếu source user-service trong workspace. Chưa chạy trên thiết bị hoặc Gateway/SMTP thật; kiểm tra tự động bằng typecheck/lint/test/build và Expo Android export.
