# Bản bàn giao FE đầy đủ theo sáu service

**Đủ để bắt đầu code hai client ngay, chưa phải ứng dụng hoàn chỉnh.** Giữ web/mobile riêng, feature folder trống như yêu cầu. Không đợi tất cả backend xong: làm UI/router/form và test bằng DTO/fixture đã thống nhất; tích hợp từng lát sau khi owner có endpoint/data. Không báo API thật chạy nếu chỉ có spec.

## Đọc theo thứ tự

1. [Cấu trúc khung hiện tại](11_KHUNG_CODE_MODULE.md), [quy ước code](03_QUY_UOC_CODE.md).
2. [Chuẩn kết nối/auth/phân trang](06_API_AUTH_REALTIME.md).
3. Guide của module trong bảng sau, kèm phần trích request/response và link spec gốc.
4. [Chênh lệch và phần cần owner xác minh](09_CONTRACT_VA_CHO_CAN_CHOT.md).
5. Khi làm Chat: [WebSocket JSON chính xác](13_WEBSOCKET_CHAT_JSON.md).

| FE feature    | Backend        | Màn hình cần nhóm viết                                                | Tài liệu                                            |
| ------------- | -------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| users         | User           | Register, OTP, Login, Profile, refresh/session                        | [User](services/04-users-service.md)                |
| farming       | Farming        | Plot, Season, Journal, Cost, Report/PDF                               | [Farming](services/02-farming-service.md)           |
| trading       | Trading        | MyListings, Feed, Offer/create/accept                                 | [Trading](services/01-trading-service.md)           |
| chat          | Chat           | ConversationList, ChatRoom, read/unread, image, contract card         | [Chat](services/05-chat-service.md)                 |
| payments      | Payment        | Contract/create/accept, Deposit/history/pay/release, Dispute/evidence | [Payment](services/06-payment-service.md)           |
| notifications | Notification   | List/detail/read/count, điều hướng reference                          | [Notification](services/03-notification-service.md) |
| admin         | User + Payment | Account management, Dispute queue/review/decision/reversal            | guide User + Payment                                |

Admin là feature FE, không phải service thứ bảy. Contract thuộc Payment, không phải service riêng. IoT/weather/RFQ mô phỏng không làm điều kiện chặn luồng cốt lõi, không tự thêm API chưa duyệt.

## Luồng liên module

User verified ACTIVE → Farmer tạo Plot/Season, Log/Cost → Listing từ snapshot → Trader gửi Offer PENDING → Farmer accept một hoặc nhiều Offer → backend Kafka tạo room theo offerId → hai bên trao đổi → Trader tạo Contract → Farmer accept → PENDING_DEPOSIT → Trader nạp cọc mô phỏng5% → backend chốt độc quyền → Contract ACTIVE/Deposit LOCKED/Listing LOCKED → Trader hoàn tất trực tiếp ngoài app và confirm → Contract COMPLETED/Listing SOLD → Farmer rút đủ điều kiện.

Mốc deliveryDate+24h mở quyền rút theo backend, không tự complete. Hồ sơ dispute OPEN/UNDER_REVIEW có hold thì chặn rút. Admin kết luận theo evidence, assignment và version; không tự suy vi phạm/điểm từ giao diện. Account khóa không có quyền bypass ACTIVE; hỗ trợ qua Admin workflow theo spec.

## Phần dùng chung đã có và phần còn phải viết

Hiện có config Vite/Expo, provider/query client, HTTP JSON client, session memory, DTO/schema auth + Feed, login/logout và Feed adapter, token/status types, test API. Chưa có UI/router nghiệp vụ, User register/OTP/refresh adapter, Farming/Notification/Chat/Payment API adapter đầy đủ, multipart/binary adapter, WebSocket client hay native APK.

Không tạo thêm màn demo. Khi nhận việc: tạo DTO/schema shared → API adapter shared → hook/page web + hook/screen native → route của app → kiểm quyền/loading/error/empty/pending/conflict. API response khác nhau giữa endpoint thì schema khác, không ép về kiểu chung không có trong backend.

## Bàn giao tối thiểu từ backend owner

- URL Gateway REST/WS truy cập được từ PC/emulator/điện thoại; dev CORS/origin và HTTPS deploy.
- Tài khoản test Farmer/Trader/Admin ACTIVE (cấp riêng, không commit mật khẩu/OTP/token), SMTP/OTP và cách seed data.
- Swagger hoặc request/response example từ đúng version/profile; role/ownership/status/error/pagination đầy đủ.
- Test data: Plot/Season, Listing OPEN, Offer ACCEPTED + room; Contract CREATED/PENDING_DEPOSIT/ACTIVE, dispute/evidence phù hợp state.
- Danh sách phần có spec nhưng chưa triển khai, bug/mismatch và người phụ trách.

## Kiểm trước PR của nhóm

Web và native riêng: đủ điều hướng, back/keyboard/safe-area, role/owner; loading/empty/error; token expire/refresh/logout không lộ cache; upload/read private; 409/503 không success giả; cursor không trùng/mất dữ liệu; một lần click không gửi cả REST lẫn WS. Payment giữ một winner và settlement một lần, Chat reconnect dedup, Notification badge riêng. Chạy npm run check/format:check/export:android, rồi kiểm thiết bị và backend thật khi có.

Lần biên soạn này chỉ đọc spec và source đã nêu; không chạy E2E backend. Xem [nguồn snapshot](../reference/contracts/README.md) và [source đối chiếu](../reference/observed-backend/README.md).
