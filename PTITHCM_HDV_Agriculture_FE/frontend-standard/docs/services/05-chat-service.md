# Chat — REST và WebSocket JSON

Chỉ Farmer/Trader ACTIVE participant. Mỗi Offer ACCEPTED mở một conversation theo offerId, không theo cặp account đơn thuần. POST Offer chưa có Chat, UI đợi/refetch conversations để tìm offerId. Admin không có quyền đọc Chat mặc định.

| Method/path                                                | Request                                                               | Response quan sát source                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| GET /api/v1/conversations                                  | cursor?,limit20/max100                                                | {data,nextCursor}                                       |
| GET /api/v1/conversations/{conversationId}                 | UUID                                                                  | conversationId,participantIds,offerId,contractId,status |
| GET /api/v1/conversations/{conversationId}/messages        | cursor?,limit                                                         | {data,nextCursor}, mới nhất trước                       |
| POST /api/v1/conversations/{conversationId}/messages       | {messageType:"TEXT",content} hoặc {messageType:"IMAGE",attachmentUrl} | 201 SentMessageResponse                                 |
| PUT /api/v1/conversations/{conversationId}/read            | {messageId}                                                           | messageId,isRead,readAt,unreadCount                     |
| POST /api/v1/conversations/{conversationId}/media          | multipart file                                                        | mediaId,attachmentUrl,contentType,sizeBytes             |
| GET /api/v1/conversations/{conversationId}/media/{mediaId} | Bearer                                                                | bytes                                                   |

TEXT tối đa 2.000 ký tự, không rỗng. IMAGE không content; TEXT không attachmentUrl. Client không gửi senderId/readerId/viewerId, SYSTEM/CONTRACT do backend sinh. Conversation CLOSED từ chối tin mới. Read chỉ tin bên kia gửi, đúng room; đọc lặp không giảm badge hai lần.

WebSocket /ws/chat là native WebSocket gửi text JSON. **Không dùng STOMP client, SUBSCRIBE/SEND frame hoặc SockJS.** Hướng dẫn đầy đủ ở [13_WEBSOCKET_CHAT_JSON.md](../13_WEBSOCKET_CHAT_JSON.md).

Source quan sát ở profile `secure & database-learning`, không dùng `/learning/**` cho frontend thật. Đã đọc source, chưa chứng minh backend/Gateway đang chạy. Danh sách DTO dùng data, không items và không hasMore. POST ảnh dùng cùng /messages, không có /messages/image trong controller secure hiện tại.

## Nguồn và chi tiết request/response

[Spec đầy đủ](../../reference/contracts/05-chat-service.md). Phần bên dưới trích mục 6–7 từ spec, không phải tuyên bố API đã chạy. Nếu khác source Chat/Payment, dùng ghi chú đối chiếu bên trên và docs/09, không tự bỏ yêu cầu nghiệp vụ.

<details>
<summary>Xem contract và ví dụ gốc</summary>

```text
6. API Contract
Owner của mọi API dưới đây: Chat Service. Consumer: Web/Mobile qua Gateway, trừ các endpoint nội bộ. Response thành công dùng JSON camelCase như User Service: object cho chi tiết, {data,nextCursor} cho danh sách; lỗi thống nhất {timestamp,status,code,message,path}.

Method
Endpoint
Quyền / mục đích
GET
/api/v1/conversations
Farmer/Trader • danh sách phòng của mình
GET
/api/v1/conversations/{conversationId}
Participant • chi tiết phòng
GET
/api/v1/conversations/{conversationId}/messages
Participant • lịch sử phân trang
POST
/api/v1/conversations/{conversationId}/messages
Participant • gửi TEXT/IMAGE
PUT
/api/v1/conversations/{conversationId}/read
Participant • đánh dấu đã đọc
WS
/ws/chat
Participant • tin nhắn realtime
GET /api/v1/conversations — chỉ FARMER/TRADER đang ACTIVE. Query cursor, limit; 200: {data:[{conversationId,offerId,participantIds,contractId,status,lastMessage,unreadCount}],nextCursor}. Chỉ trả phòng có account hiện tại trong participant_ids. unreadCount đếm tin participant còn lại gửi và is_read=false; không đếm tin mình gửi. Đây là danh sách phòng Chat, không phải danh sách Trader Offer của Trading.
GET /api/v1/conversations/{conversationId} — UUID String, JWT participant và account ACTIVE. 200: conversationId, participantIds, offerId, contractId, status. Không trả listingId. 403 nếu ngoài conversation; 404 nếu không tồn tại.
GET /api/v1/conversations/{conversationId}/messages — JWT participant. Query cursor, limit. 200: messages theo createdAt/message_id, nextCursor. 403/404 tương ứng.
POST /api/v1/conversations/{conversationId}/messages — JWT participant. Body {messageType:"TEXT",content:"..."} hoặc {messageType:"IMAGE",attachmentUrl:"..."}; senderId lấy từ JWT. 201: messageId, conversationId, senderId, messageType, content/attachmentUrl, createdAt. 400 nếu dữ liệu sai; 403 nếu không phải participant; 409 nếu conversation CLOSED. Client không gửi SYSTEM/CONTRACT.
PUT /api/v1/conversations/{conversationId}/read
Quyền: participant đang ACTIVE; body {"messageId":"UUID"}.
Chỉ cập nhật message thuộc conversation và do participant còn lại gửi; không đánh dấu tin mình gửi hoặc tin ở phòng khác. 200: {messageId,isRead,readAt,unreadCount}. Gửi lại cùng message không đổi readAt hoặc giảm badge thêm lần nữa. Message sai phòng/không tồn tại: 404; sai quyền: 403.
WebSocket /ws/chat
Client: joinConversation, sendMessage, readMessage. Server: messageSent, messageRead, unreadCountChanged, error.
Chat lưu DB trước broadcast; client nhận lại cùng messageId thì cập nhật tin đã có, không tạo bản sao. unreadCountChanged trả số hiện tại, reconnect lấy GET conversations và lịch sử. Sau lưu message thành công, Chat phát MESSAGE_CREATED qua Kafka cho Notification; Notification dựng thông báo riêng, không quản lý badge hoặc trạng thái đọc message.
Trading quản lý màn hình danh sách Trader Offer trong bài đăng. Farmer accept nhiều Offer được phép trước lúc chốt; mỗi OFFER_ACCEPTED tạo một phòng cho Farmer và Trader của Offer đó. POST Offer không trả conversationId. Client lấy GET /api/v1/conversations và đối chiếu offerId sau khi Chat xử lý Kafka. Cùng hai account nhưng offerId khác thì là phòng khác. Accept Offer/Contract chưa khóa Listing; chỉ nạp cọc thành công mới chốt.

6.1. Media API và storage v2.1
POST /api/v1/conversations/{conversationId}/media: participant ACTIVE, multipart file; 201 {mediaId,attachmentUrl,contentType,sizeBytes}. GET cùng path/{mediaId}: 200 bytes, participant của phòng; file tạm chỉ uploader, file đã attach chỉ participant; người ngoài/ADMIN không có quyền mặc định→404. Ảnh decode/re-encode,≤5 MiB/20 megapixel; metadata media_assets thuộc chat_db,volume ngoài webroot riêng. Send Message IMAGE attach media cùng transaction Mongo replica-set và outbox; uploaded file chưa phải message. Cleanup file chưa attach sau24h, không xóa ảnh đã gửi cùng retention Notification. Gateway /api/v1/conversations/** giữ nguyên prefix; auth/state trước upload/read.
7. API Examples
POST /api/v1/conversations/{conversationId}/messages
Request: {"messageType":"TEXT","content":"Mình thống nhất ngày giao theo hợp đồng nhé."}
201 Created: {"messageId":"550e8400-e29b-41d4-a716-446655440001","conversationId":"550e8400-e29b-41d4-a716-446655440002","senderId":"550e8400-e29b-41d4-a716-446655440003","messageType":"TEXT","content":"Mình thống nhất ngày giao nhé.","isRead":false,"createdAt":"2026-09-27T00:00:00Z"}
Realtime gửi người nhận: unreadCountChanged {conversationId,unreadCount:3}. Khi đọc message nhận: {messageId,isRead:true,readAt:"ISO-8601 UTC",unreadCount:2}; đọc lại giữ nguyên kết quả. Badge lấy số chưa đọc của Chat, không lấy notification.unreadCount.
IMAGE: {"messageType":"IMAGE","attachmentUrl":"URL-do-Chat-upload-tra-ve"}. Upload qua POST /api/v1/conversations/{conversationId}/media; send kiểm ảnh đúng conversation/uploader và chưa attach, không URL ngoài. SYSTEM/CONTRACT do backend sinh. File/badge/message không dùng DB hoặc media volume của service khác.
```

</details>
