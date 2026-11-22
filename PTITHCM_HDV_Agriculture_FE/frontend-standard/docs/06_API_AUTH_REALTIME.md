# Chuẩn nối API cho web và mobile

## Entry point và định tuyến

Client chỉ gọi Gateway. Dev web localhost:5173, Gateway localhost:8080; Android Emulator Gateway 10.0.2.2:8080, máy thật dùng LAN IP/HTTPS có thể truy cập. Native không trỏ localhost vào backend trên PC. Deployment web cùng HTTPS origin; mobile cấu hình HTTPS Gateway public.

| Prefix Gateway                                                                    | Service / port nội bộ                      |
| --------------------------------------------------------------------------------- | ------------------------------------------ |
| /api/v1/auth/**, users/**, farmers/**, traders/**, admin/accounts/** dưới /api/v1 | User 8081                                  |
| /api/v1/plots/**, crop-seasons/**, logs/**, costs/** dưới /api/v1                 | Farming 8082                               |
| /api/v1/listings/**, /api/v1/offers/**                                            | Trading 8083                               |
| /api/v1/conversations/**, WebSocket /ws/chat                                      | Chat 8084                                  |
| /api/v1/payments/**                                                               | Payment 8085, gồm Contract/Deposit/Dispute |
| /api/v1/notifications/**                                                          | Notification 8086                          |

Các cổng service trên chỉ giúp hiểu kiến trúc, FE không gọi trực tiếp. /internal/** và GET plots/{id}/summary không public; không đặt X-Service-Key trong FE. Route Gateway cần kiểm deployment, bảng là baseline spec, không phải xác nhận Gateway live.

## Auth và phiên

Authorization: Bearer, credentials:omit; không cookie/token trong localStorage/sessionStorage/AsyncStorage. Giữ cả access và refresh trong RAM theo baseline; reload/đóng app cần login. RS256 15 phút, refresh rotate 7 ngày; frontend không giữ private key và không tự verify JWT để thay backend.

TokenPair {accessToken,refreshToken,tokenType:"Bearer",expiresIn,accountId,role}. Implement refresh single-flight, bỏ response của phiên đã logout/đổi account, reconnect socket với token mới. 401 xử lý refresh hoặc login lại; không tự retry mutation cọc/hợp đồng nếu chưa biết kết quả. Scaffold hiện có login/logout adapter, session memory và callback 401 clear cache, **chưa có UI đăng nhập/refresh tự động**. Không có role switch demo.

Account phải ACTIVE; 403 ACCOUNT_NOT_ACTIVE cần thông báo/trở login theo luồng, không đổi role để vượt. 503 ACCESS_STATE_UNAVAILABLE là không xác định được quyền, không fallback mock. Logout cần gọi API thu hồi refresh và dọn phiên/cache/socket; logout server thất bại không đồng nghĩa token đã revoke.

## JSON, phân trang và tiền

UUID string; camelCase; UTC ISO8601 cho timestamp, giữ date-only YYYY-MM-DD của workDate/startDate/incurredDate, không tự chuyển chúng thành UTC timestamp. Tiền decimal string VND; không parseFloat để tính cọc/phạt. Thành công DTO trực tiếp, 204 không JSON. Lỗi HTTP {timestamp,status,code,message,path,traceId?}; error WS khác HTTP.

| Nguồn                                           | Pagination/shape                                                |
| ----------------------------------------------- | --------------------------------------------------------------- |
| User/Farming/Trading/Notification page baseline | {items,page,size,totalElements,totalPages}; page0,size20,max100 |
| Chat rooms/history theo source                  | {data,nextCursor}; cursor opaque,limit20/max100                 |
| Payment deposits theo source                    | {data,nextCursor}                                               |
| Payment admin disputes/evidence theo source     | {items,nextCursor}                                              |

Không dùng cùng một CursorPage shape cho tất cả. Source code và Swagger mỗi endpoint phải quyết định schema; các type generic chỉ hỗ trợ, không chứng minh response đúng. Query key chứa accountId/filter/resource/page/cursor. Logout/đổi account phải xóa cache.

400 validation; 401 credential; 403 quyền/state; 404 resource ẩn/không có; 409 state/version/idempotency conflict cần refetch; 413/415 ảnh; 429 tôn trọng Retry-After; 503 dependency chưa xác định. Không có UI báo thành công khi chỉ nhận timeout hoặc phát Kafka.

## Upload/download

User avatar, Chat media, Payment evidence có owner endpoint riêng, xem từng service guide. Multipart FormData để runtime set boundary; client JSON request hiện chưa hỗ trợ FormData/binary nên phải bổ sung adapter riêng. JPEG/PNG/WebP <=5 MiB/20MP; backend kiểm định dạng và quyền. PDF chỉ download report Farming, không upload evidence PDF.

Ảnh private cần Bearer; web fetch blob→createObjectURL và revoke; native dùng loader/temp file hỗ trợ auth. Không token trong URL và không dùng URL ngoài tùy ý làm attachment. Upload Chat chưa tạo message: upload→POST /messages hoặc sendMessage IMAGE; chọn một đường gửi.

## Realtime

Chat dùng **WebSocket text JSON tại /ws/chat**, CONNECT JSON rồi joinConversation/sendMessage/readMessage. Không dùng STOMP/SockJS. Xem [protocol đầy đủ](13_WEBSOCKET_CHAT_JSON.md). Notification hiện là REST, không tự thêm socket/device push. Kafka là giao tiếp nội bộ backend.

## Tài liệu theo service

[User](services/04-users-service.md), [Farming](services/02-farming-service.md), [Trading](services/01-trading-service.md), [Chat](services/05-chat-service.md), [Payment](services/06-payment-service.md), [Notification](services/03-notification-service.md). Xem [chênh lệch/điểm còn thiếu](09_CONTRACT_VA_CHO_CAN_CHOT.md) trước khi dựng schema/API.
