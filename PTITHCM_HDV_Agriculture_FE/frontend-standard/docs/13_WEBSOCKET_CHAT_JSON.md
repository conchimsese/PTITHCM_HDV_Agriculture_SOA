# Chat realtime — WebSocket JSON theo source hiện tại

Đối chiếu SecureChatWebSocketHandler.java và SecureChatWebSocketConfig.java trong `code/chat-service/src/main/java/vn/ptit/soa/chat/security`. Handler snapshot ở [reference](../reference/observed-backend/chat-service/src/main/java/vn/ptit/soa/chat/security/SecureChatWebSocketHandler.java). Không phải STOMP/SockJS, không có destination `/topic` hay `/user/queue`. Kafka chỉ giữa backend, không gửi Kafka envelope trực tiếp từ FE.

## Kết nối và xác thực

URL qua Gateway: `ws://<gateway-host>/ws/chat` (deploy `wss://...`). Không dùng host service nội bộ từ điện thoại. Gateway cần forward WebSocket Upgrade; URL thực tế vẫn phải người triển khai cung cấp. Không đưa token trong query string.

Ngay khi socket mở, trong vòng **5 giây**, gửi text JSON:

```json
{ "type": "CONNECT", "authorization": "Bearer <access-token>" }
```

Chờ `{type:"connected",accountId:"<uuid>"}` rồi mới join/send/read. Handler chỉ nhận CONNECT lần đầu, không gửi CONNECT lần hai để thay token trên socket cũ. Token hết hạn: refresh theo User policy, đóng kết nối cũ, mở socket mới và CONNECT bằng token mới. Server có thể đóng 1008 khi auth/state không hợp lệ, 1013 khi User access-state unavailable. Backoff khi reconnect, dừng nếu logout/LOCKED; đừng retry credentials sai liên tục.

## Client gửi

Các `<uuid>`/URL bên dưới là placeholder, thay bằng UUID và attachmentUrl thực lấy từ API.

```json
{ "type": "joinConversation", "conversationId": "<uuid>" }
```

Chờ `{type:"joinedConversation",conversationId:"<uuid>"}`. Một socket hiện giữ **một conversation đang join**; join room khác thay room trước, không có lệnh leaveConversation trong handler. Sidebar vẫn có thể nhận unreadCountChanged của account sau CONNECT. Lấy danh sách room bằng REST, không join room ngoài quyền.

```json
{
  "type": "sendMessage",
  "conversationId": "<uuid>",
  "messageType": "TEXT",
  "content": "Nội dung trao đổi"
}
```

```json
{
  "type": "sendMessage",
  "conversationId": "<uuid>",
  "messageType": "IMAGE",
  "attachmentUrl": "<URL-do-upload-Chat-tra-ve>"
}
```

```json
{ "type": "readMessage", "conversationId": "<uuid>", "messageId": "<uuid>" }
```

Phải join đúng room trước send/read. Client không gửi senderId/readerId/viewerId/token; authorization chỉ có ở CONNECT. TEXT không attachmentUrl, IMAGE không content; không gửi SYSTEM/CONTRACT. Frame tối đa 8.192 byte theo handler, text message nghiệp vụ tối đa 2.000 ký tự; ảnh upload REST, không nhét base64/binary ảnh vào JSON socket.

## Server gửi — tên type phân biệt hoa thường

| type               | Payload                                                  |
| ------------------ | -------------------------------------------------------- |
| connected          | accountId                                                |
| joinedConversation | conversationId                                           |
| messageSent        | message: object ChatMessage đã lưu                       |
| messageRead        | messageId,isRead,readAt,unreadCount                      |
| unreadCountChanged | conversationId,unreadCount                               |
| contractUpdated    | conversationId,contractId,status,stateVersion,occurredAt |
| error              | message; không giả định là HTTP ErrorDto                 |

Tên là `messageSent`, không `MESSAGE_SENT`; `contractUpdated`, không Kafka CONTRACT_STATUS_CHANGED. Handler messageRead hiện không kèm conversationId; xử lý theo room đang join và messageId của tin, đối soát REST nếu không khớp cache. contractUpdated là tín hiệu cập nhật card/refetch Payment, không có toàn bộ Contract trong event.

## Đồng bộ client

Load room/history REST, join, hợp nhất realtime theo messageId; nếu cần optimistic UI thì chỉ là trạng thái pending, chưa có clientMessageId/dedup-key trong contract nên không tự retry gửi khi mất ACK. Có thể tải lại history sau join/reconnect để lấp khoảng mất tin. Reconcile messageSent với dữ liệu REST, không append bản sao. API lịch sử mới nhất trước, đảo đúng thứ tự render theo createdAt/ID. unreadCountChanged là số tuyệt đối, không cộng dồn mỗi lần nhận.

Đánh dấu đã đọc đúng tin bên kia và đúng room, không giảm Notification badge. On logout/đổi account đóng socket và xóa cache; không auto mở lại bằng token cũ. Admin không mặc nhiên được đọc Chat. Chỉ chọn REST hoặc socket cho một lần gửi; không POST rồi sendMessage lần nữa cho cùng click.

## Kiểm tích hợp trước bàn giao

CONNECT thiếu/sai/hết hạn; không join đã send; room người khác; CLOSED; TEXT/IMAGE sai field; read lặp; token expired/LOCKED giữa phiên; User unavailable; reconnect không trùng message; đổi room; hai account không lộ dữ liệu. Lần cập nhật tài liệu này **chưa chạy** các kịch bản với server thật.
