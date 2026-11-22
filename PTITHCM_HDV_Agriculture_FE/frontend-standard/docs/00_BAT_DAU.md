# Thành viên mới bắt đầu từ đây

1. Clone main, vào frontend-standard, chạy npm ci.
2. Đọc README và [bàn giao sáu service](12_BAN_GIAO_FE.md). Web/mobile hiện là entry point trống, không có màn demo.
3. Chọn module từ docs/04, ghi người làm web/mobile/shared và backend owner vào task.
4. Đọc guide docs/services tương ứng và docs/09 để biết endpoint/DTO nào đủ, chỗ nào cần owner xác nhận.
5. Tạo DTO/schema và API adapter trong packages, rồi page/screen/component/hook trong feature của app. Không chờ toàn bộ backend, có thể làm từng lát với fixture cùng schema.
6. Nối route, kiểm quyền và state, chạy checks rồi mở PR. Khi endpoint thật sẵn sàng, kiểm với Gateway và thiết bị.

Task đầu tiên nên nhỏ: danh sách ruộng Farmer theo GET /api/v1/plots, hoặc auth Login/OTP. Không nhận cả một vai trò mà chưa chia scope. Giao diện lấy V5 làm tham khảo; API lấy spec/source đã đối chiếu, không copy data.js prototype vào payload production.
