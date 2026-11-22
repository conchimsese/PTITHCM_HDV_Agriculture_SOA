# Chat Service

1. Service Overview
Chat Service quản lý cuộc trò chuyện giữa Farmer và các Trader có Offer được Farmer accept. Farmer được accept nhiều Trader trên cùng bài đăng để trao đổi; mỗi Offer được accept có một conversation riêng, không gộp theo cặp người dùng. Accept Offer chỉ mở Chat, chưa chốt giao dịch. Chỉ khi một Trader nạp cọc mô phỏng thành công mới chốt duy nhất một Trader cho bài đăng.
Database sở hữu: chat_db (MongoDB). Client Web/Mobile gọi qua API Gateway. Chat không sở hữu Listing, Offer, Contract hay tiền cọc và không truy cập database của service khác.
 
2. Architecture Overview
Web/Mobile → API Gateway → Chat Service → MongoDB chat_db.
6 service MVP; Contract là module trong Payment. OFFER_ACCEPTED qua Kafka mở conversation riêng theo offerId. REST/WebSocket qua Gateway cho tin/lịch sử/badge; MESSAGE_CREATED→Notification sau lưu. Chat đọc Contract API Payment; không sửa Contract hoặc truy cập DB Payment.
 
3. Service Responsibility
3.1. Trách nhiệm
• Mở một conversation cho mỗi Offer được Farmer accept; hỗ trợ nhiều Trader trao đổi trên cùng bài đăng.
• Lưu message TEXT, IMAGE, SYSTEM, CONTRACT; phát tin mới qua WebSocket.
• Trả danh sách conversation đã được accept, lịch sử, trạng thái đọc và unreadCount; hiển thị chấm/số tin chưa đọc như Messenger/TikTok.
• Chỉ cho hai participant xem và nhắn trong conversation; hiển thị card Contract bằng contract_id.
• Lưu tin mới, cập nhật badge Chat qua WebSocket và phát MESSAGE_CREATED qua Kafka cho Notification sau DB commit; badge Chat và unread count Notification là hai dữ liệu riêng.
3.2. Không thuộc phạm vi
• Không tạo/chấp nhận Offer, không giữ giá đàm phán riêng, không tạo counter-offer.
• Không tự tạo/sửa hợp đồng hoặc chuyển Contract sang ACTIVE.
• Không thu, giữ, hoàn hay giải ngân tiền cọc.
• Không cho Trader đăng Listing; không có Rating/Review/Reputation.
 
4. Database Ownership
chat_db là MongoDB, chỉ Chat Service được truy cập. Hai collection đã chốt:
 
Entity
Mục đích
PK
conversations
Phòng Chat của Farmer và Trader
conversation_id UUID
messages
Tin nhắn và card trong phòng
message_id UUID
conversations: conversation_id UUID PK; participant_ids Array<UUID> gồm hai account; offer_id UUID UNIQUE logical reference; contract_id UUID/null; status String; created_at Date; updated_at Date. Không có listing_id, chat_listing_id hoặc list_id trong schema Chat.
messages: message_id UUID PK; conversation_id UUID tham chiếu conversations.conversation_id ; sender_id UUID tham chiếu account; message_type String; content Text/null; attachment_url String/null; contract_id UUID/null; is_read Boolean; created_at Date; read_at Date/null.
Chat tạo UUID conversation/message, MongoDB lưu UUID nhất quán; API/event dùng UUID String. User tạo accountId, Trading tạo offerId, Payment tạo contractId; module Payment đã chốt. offer_id UNIQUE ngăn mở phòng trùng khi OFFER_ACCEPTED bị giao lại. Nhiều Offer của một bài đăng có thể cùng có conversation; không đặt unique theo cặp participant. Chat không lưu listing_id; Trading giữ Offer → Listing và bảo đảm chỉ một Trader được chốt khi nạp cọc thành công.
 
5. ERD của Chat Service
 
CONVERSATIONS · Attribute
Type
Key
Req.
Rule
conversation_id
UUID
PK
Yes
ID cuộc trò chuyện
participant_ids
Array<UUID>
—
Yes
Farmer và Trader
offer_id
UUID
UNIQUE / logical ref
Yes
Offer đã được Farmer accept
contract_id
UUID / null
Logical ref
No
Contract trong chat
status
String
—
Yes
ACTIVE/CLOSED
created_at
Date
—
Yes
Thời điểm tạo
updated_at
Date
—
Yes
Cập nhật gần nhất
Conversation 1:N Message; messages.conversation_id tham chiếu conversations.conversation_id trong chat_db.
Conversation liên kết Trading bằng offer_id và Payment bằng contract_id; participant_ids/sender_id tham chiếu User. Chat không lưu Listing, không hiển thị danh sách Trader Offer thay Trading. Danh sách conversation vẫn thuộc Chat để mở lại các cuộc trao đổi đã được accept. Khi cần tiêu đề bài đăng, lấy thông tin Trading qua offerId.
 
MESSAGES · Attribute
Type
Key
Req.
Rule
message_id
UUID
PK
Yes
ID tin nhắn
conversation_id
UUID
Ref nội bộ
Yes
Conversation 1:N Message
sender_id
UUID
Logical ref
Yes
Người gửi
message_type
String
—
Yes
TEXT/IMAGE/SYSTEM/CONTRACT
content
Text / null
—
No
Nội dung TEXT
attachment_url
String / null
—
No
Ảnh đính kèm
contract_id
UUID / null
Logical ref
No
Card CONTRACT
is_read
Boolean
—
Yes
Đã đọc
created_at
Date
—
Yes
Thời điểm gửi
read_at
Date / null
—
No
Thời điểm đọc
Conversation status: ACTIVE, CLOSED. Message type: TEXT, IMAGE, SYSTEM, CONTRACT. Card CONTRACT mở chi tiết từ module Contract của Payment Service. Việc bài đăng đã chốt một Trader không tự xóa lịch sử hoặc tự đóng mọi phòng còn lại; các phòng còn lại không được tạo giao dịch đã chốt thứ hai.
 
Type
Nội dung
Ai tạo
TEXT
Tin nhắn văn bản
Participant
IMAGE
Ảnh gửi trong chat
Participant
SYSTEM
Thông báo trạng thái
Backend
CONTRACT
Card hợp đồng
Backend
 
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
 
8. Authentication & Authorization
Gateway xác minh JWT ở lớp ngoài. Chat xác thực token/danh tính đáng tin, kiểm tra sub là account UUID, role và quyền participant; không tin x-user-id/x-user-role hay senderId do client tự gửi. Chỉ account ACTIVE được truy cập. Không dùng is_verified/verified badge để quyết định quyền Trader. Account LOCKED/INACTIVE bị từ chối ngay cho request mới dù JWT chưa hết hạn; khi không kiểm tra được trạng thái account thì không tiếp tục thao tác được bảo vệ.
Chat không sở hữu chức năng khóa tài khoản; Chat kiểm tra kết quả từ User theo Security Contract chung. REST và WebSocket handshake/join/gửi/đọc chỉ cho account ACTIVE và đúng participant; tài khoản đã khóa không được tiếp tục thao tác dù JWT còn hạn. Cơ chế lấy trạng thái account dùng chung với Gateway/User, không tự thêm quy trình khóa trong Chat. Admin không mặc nhiên được xem nội dung phòng.
 
9. Error Contract
Theo format chung: {"timestamp":"2026-09-27T00:00:00Z","status":403,"code":"FORBIDDEN","message":"Not a conversation participant","path":"/api/v1/conversations/{conversationId}/messages"}.
400 VALIDATION_ERROR; 401 UNAUTHORIZED; 403 FORBIDDEN; 404 NOT_FOUND; 409 CONFLICT; 500 INTERNAL_SERVER_ERROR; 503 SERVICE_UNAVAILABLE. Không trả thông tin chat của người khác qua error.
 
10. Inter-Service Communication
Trading→Chat OFFER_ACCEPTED; topic soa.trading.offer.v1, key offerId, group chat-offer-accepted-v1. data offerId/listingId/farmerId/traderId UUID; Chat chỉ lưu offerId/participant, không listingId. offer_id UNIQUE bảo đảm idempotent. Nhiều Offer có thể accepted; POST Offer không mở phòng; nạp cọc chốt một giao dịch.
Chat → User: GET /api/v1/users/{accountId} khi cần display profile.
Payment(module Contract)→Chat CONTRACT_CREATED/CONTRACT_STATUS_CHANGED; source payment-service, topic soa.contract.lifecycle.v1, key contractId. Card theo contractId/offerId và conversation của offerId. Đọc GET /api/v1/payments/contracts/{contractId} với Bearer participant ACTIVE. Payment event gửi Notification cả Farmer/Trader; Chat không tự consume Deposit event chưa được duyệt.
Chat lưu message→WebSocket messageSent/unreadCountChanged và MESSAGE_CREATED trên soa.chat.message.v1, key conversationId. recipientIds=[người nhận], không sender; referenceType CONVERSATION, referenceId conversationId; data messageId, conversationId, senderId, recipientId. Không đưa content riêng tư vào Notification.
Chat idempotent OFFER_ACCEPTED bằng offer_id UNIQUE; card tạo một lần theo contractId, cập nhật theo stateVersion tăng. Event muộn không rollback card; khi cần lấy GET /api/v1/payments/contracts/{contractId} với Bearer participant ACTIVE. DB commit rồi ACK; replay không tăng badge hoặc tạo card trùng.
 
11. Validation & State Machine
Mở conversation sau OFFER_ACCEPTED để trao đổi, không xem accept là chốt Trader. Trạng thái Chat ACTIVE/CLOSED chỉ điều khiển quyền nhắn trong phòng, không phải trạng thái Contract hay Listing. CLOSED không nhận tin mới. Chốt một Trader không tự xóa hoặc đóng các phòng khác; quyền tạo giao dịch đã chốt do Payment/Trading kiểm tra.
TEXT không rỗng, tối đa2000 ký tự; IMAGE JPEG/PNG/WebP≤5 MiB qua Chat upload, kiểm byte/decoder/ownership. REST/WebSocket cùng validation; 413 quá dung lượng,415 sai định dạng,400 sai TEXT/ảnh/attachment. Không thêm service media độc lập; endpoint và volume Chat riêng theo Contract v2.1 §18.
 
12. Repository Structure
chat-service/ gồm controller hoặc gateway-handler, service, repository, document/model, dto, websocket, event-consumer, event-publisher, security, exception, config, test, Dockerfile và README. Bố cục theo stack thực tế của repo; không tự áp NestJS/Prisma lên Chat MongoDB. Service layer giữ business logic; repository chỉ thao tác chat_db.
 
13. Coding Rules
Controller/WebSocket handler→service→repository chat_db. Kiểm account ACTIVE, participant, room status; Contract/cọc đọc API Payment, Offer đọc Trading. SYSTEM/CONTRACT backend tạo; client TEXT/IMAGE. Read chỉ áp dụng tin bên còn lại; event không tạo phòng/card trùng. Không query DB service khác.
 
14. Configuration
SERVER_PORT=8084; MONGODB_URI; KAFKA_BOOTSTRAP_SERVERS; USER_SERVICE_URL; PAYMENT_SERVICE_URL; ALLOWED_ORIGINS; JWT_PUBLIC_KEY_LOCATION/ISSUER/AUDIENCE; INTERNAL_SERVICE_KEY; ACCESS_STATE_TIMEOUT_MS=1000. Topic/key/group theo Contract đã duyệt. Chat WebSocket độc lập REST Notification; không log token/private content.
 
15. Testing Strategy
Test membership/UUID/TEXT 2000 ký tự/IMAGE5 MB/unreadCount; chỉ OFFER_ACCEPTED mở phòng idempotent theo offerId; nhiều accepted Offer mở phòng riêng, nạp cọc chốt một Listing. MESSAGE_CREATED sau lưu, không gửi sender. Contract card dùng payment-service/topic/key/stateVersion v1; khóa account chặn REST/WebSocket, fail closed nếu state unavailable.
 
Flow IMAGE v2.1: Client Bearer → Gateway → Chat kiểm participant/state → validate ảnh → volume Chat + media_assets → trả attachmentUrl → client SEND IMAGE → Chat transaction attach media/Message/outbox → WebSocket participant và Kafka MESSAGE_CREATED. Frontend fetch ảnh có Bearer thành blob; không đưa token vào URL. Contract card refetch GET Payment khi mở, không phát TERMS_UPDATED/status giả.
16. Definition of Done
[ ] conversations/messages đúng schema MongoDB đã chốt.
[ ] Chỉ participant ACTIVE được truy cập; nhiều Offer accepted tạo nhiều conversation riêng, không có ADMIN xem phòng mặc nhiên.
[ ] TEXT/IMAGE, lịch sử, read state và WebSocket hoạt động.
[ ] Contract card theo logical owner đã được nhóm xác nhận; các event Contract/Payment tới Notification đúng payload và người nhận đã duyệt.
[ ] Không có counter-offer, thanh toán, Rating trong Chat.
[ ] Auth, error contract, API docs, tests, Docker/local run và README hoàn thành.
 
17. AI Agent Development Rules
UUID conversation/message; offer_id UNIQUE; không listing_id. OFFER_ACCEPTED mới mở Chat; MESSAGE_CREATED→Notification sau lưu. Contract module Payment, cọc5%, accept nhiều Offer nhưng chỉ một giao dịch chốt. History phòng khác giữ nguyên; Chat không thay DB Trading/Payment.
 
18. Quyết định đã chốt và nội dung cần xác nhận
CF-CS-01: Farmer accept nhiều Trader để trao đổi; mỗi Offer được accept có một phòng riêng. Chỉ nạp cọc mô phỏng thành công mới chốt một Trader/bài đăng.
CF-CS-02: Chat tách Negotiation; không có counter-offer/đấu giá phức tạp.
CF-CS-03: MongoDB conversations/messages; conversation/message/account/offer/contract ID đều UUID, truyền UUID String; schema ở mục 4–5. Bỏ tham chiếu Listing, dùng offer_id cho Offer đã accept.
CF-CS-04: Chat sở hữu message/badge; MESSAGE_CREATED→Notification. Contract thuộc module Payment, producer payment-service trên soa.contract.lifecycle.v1; Contract notifications cho cả hai participant.
CF-CS-05: Không dùng FK xuyên service; Chat không quản lý tiền cọc hay thanh toán tiền lúa.
 
19. Quick Reference
SERVICE: Chat Service | MVP: luồng chính | DATABASE: chat_db (MongoDB) | COLLECTIONS: conversations, messages | ID: UUID | BROKER: Kafka | PORT: 8084.
INPUT: OFFER_ACCEPTED từ Trading; event Contract theo logical owner được chốt. OUTPUT: MESSAGE_CREATED → Kafka → Notification. REALTIME: messageSent/messageRead/unreadCountChanged; không dùng unread count Notification thay badge Chat.
FLOW: Trading accept nhiều Offer → Chat mở phòng theo offerId → Contract trong Payment → Farmer accept Contract → Trader nạp cọc mô phỏng thành công → chốt một Trader/bài đăng. Chat không lưu listing_id.
 
 
 
 
Phụ lục A. API Contract Matrix
 
From
To
Method / Event
Purpose
Mode
Trading
Chat
OFFER_ACCEPTED
Mở conversation
Async
Chat
User
Public-profile API của User
Lấy public profile
Sync
Payment (module Contract)
Chat
CONTRACT_CREATED / CONTRACT_STATUS_CHANGED
Card hợp đồng
Async
Chat
Client participant
WS messageSent / unreadCountChanged
Tin mới / badge chưa đọc
Realtime
Phụ lục B. Event Contract
Envelope đã duyệt: {eventId UUID, eventType, eventVersion:1, sourceService, occurredAt UTC, actorId UUID|null, recipientIds:[account UUID], referenceType, referenceId UUID, correlationId?, data}. Producer giữ eventId/payload qua retry; consumer ghi DB trước ACK. 7 event giao thương ban đầu giữ tên; xulycontract bổ sung REPUTATION_CHANGED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED từ User. USER_PROFILE_UPDATED chỉ đồng bộ Trading, không thuộc subscription Notification. Notification không tự tính điểm từ trạng thái cọc. Topic/key đã chốt theo Contract v1: soa.trading.offer.v1/offerId; soa.chat.message.v1/conversationId; soa.contract.lifecycle.v1/contractId (producer payment-service); soa.payment.deposit.v1/depositId. Group Notification notification-service-v1; Chat OFFER_ACCEPTED dùng chat-offer-accepted-v1, độc lập Notification. CONTRACT_CREATED và CONTRACT_STATUS_CHANGED gửi [farmerId, traderId]; DEPOSIT_PAID và DEPOSIT_STATUS_CHANGED gửi cả hai; MESSAGE_CREATED chỉ người nhận. Reference MESSAGE=CONVERSATION/conversationId. DEPOSIT_STATUS_CHANGED chuyển LOCKED không tạo Notification, chỉ DEPOSIT_PAID thông báo lần nạp đó.
OFFER_ACCEPTED:Trading→Chat/Notification; topic soa.trading.offer.v1, key offerId; recipientIds=[traderId], data offerId/listingId/farmerId/traderId. Chat tạo phòng idempotent theoofferId, không lưulistingId; accept nhiều chưa khóaListing.
CONTRACT_CREATED:Payment→Chat/Notification; source payment-service, soa.contract.lifecycle.v1 / key contractId, reference CONTRACT/contractId; data contractId, offerId, farmerId, traderId, status. recipientIds=[farmerId, traderId]; Chat map offerId sang conversation, không yêu cầu producer tự phát conversationId ngoài payload v1.
CONTRACT_STATUS_CHANGED: Payment → Chat/Notification; data contractId,farmerId,traderId,previousStatus,status,stateVersion; recipientIds cả hai. Card chỉ nhận version mới; event muộn không rollback card. Đổi điều khoản không đổi status không được giả thành status change. Contract v2.1 dùng client refresh GET Contract, không tự thêm TERMS_UPDATED event.
MESSAGE_CREATED: Chat → Notification sau lưu; topic soa.chat.message.v1,key conversationId; recipientIds=[recipientId], không có sender. Reference CONVERSATION/conversationId; data messageId,conversationId,senderId,recipientId là UUID String. WebSocket/badge Chat độc lập; Notification không chứa preview tin nhắn riêng tư.
 
Phụ lục C. Data Contract & Business Rules
API/JSON camelCase; DB snake_case; thời gian ISO 8601 UTC. Toàn bộ ID entity nội bộ và tham chiếu là UUID; owner tạo ID, service nhận giữ nguyên giá trị và trao đổi UUID String. Firebase/Auth0 ID nếu dùng phải lưu riêng, không thay accountId. Không FK hoặc query xuyên database. Migration dữ liệu cũ phải ánh xạ ID sang UUID đồng bộ các owner/consumer, không đổi riêng ID rồi làm mất liên kết.
BR-CS-001: Chỉ Farmer/Trader là participant mới xem, gửi, đánh dấu đã đọc.
BR-CS-002: Chat chỉ được mở sau OFFER_ACCEPTED; xử lý event lặp không tạo conversation/card trùng.
BR-CS-003: Client chỉ gửi TEXT/IMAGE; SYSTEM/CONTRACT do backend tạo.
BR-CS-004: Chat không tự thay đổi Offer, Contract hoặc Deposit; nút hành động gọi service sở hữu.
BR-CS-005: Tin lưu thành công trước WebSocket; badge chưa đọc do Chat quản lý, không dùng Notification để tính badge; vẫn phát MESSAGE_CREATED.
 
Phụ lục D. Git Convention & End-to-End Business Flow
Nhánh: feature/chat-conversation, feature/chat-message. Commit: feat(chat): ..., fix(chat): ..., docs(chat): ...; tích hợp qua develop, phát hành từ main theo quy ước nhóm.
Farmer mở bài đăng/danh sách Offer ở Trading → accept nhiều Trader → mỗi OFFER_ACCEPTED mở một conversation theo offer_id → client lấy danh sách phòng Chat → trao đổi text/ảnh → Trader gửi Contract qua Payment → Farmer accept Contract, PENDING_DEPOSIT → một Trader nạp cọc mô phỏng thành công → Payment ACTIVE/LOCKED và Trading chốt một Trader cho bài đăng. Payment thông báo cập nhật Contract cho cả hai bên qua Notification; các phòng khác giữ lịch sử, không được chốt giao dịch thứ hai.
 
Luồng tích hợp đã đồng bộ
Farmer accept Offer tại Trading → OFFER_ACCEPTED → Chat tạo conversation một lần theo offer_id; chỉ hai participant được truy cập. Không lưu listing_id/list_id; POST Offer không mở Chat.
Participant ACTIVE gửi TEXT/IMAGE → Chat lưu message UUID → WebSocket tin/badge + MESSAGE_CREATED qua Kafka → Notification dựng thông báo cho người nhận, không sender; badge Chat độc lập unread count Notification.
Contract Chat đã chốt 07/10/2026
Nguồn cập nhật: Conflict đã chốt, Contract chung v2.1 và xulycontract(1).txt; người dùng đã giao quyền lựa chọn phương án và cập nhật trực tiếp. D01–D07 và gói kỹ thuật có hiệu lực theo v2.1. Ưu tiên quyết định mới nhất → Conflict đã chốt → Contract → rule → spec; không dùng đề xuất cũ để mở lại các mục đã đóng.
Danh sách conversation/messages giữ cursor, limit mặc định20,max100. Phòng sort updatedAt DESC/conversationId DESC; tin sort createdAt DESC/messageId DESC. Cursor chứa cặp sort key, không dùng offset để giả cursor. Giữ query/filter hiện có; client dùng GET conversations đối chiếu offerId, không thêm endpoint lookup riêng.
Topic/key đã chốt theo Contract v1: soa.trading.offer.v1/offerId; soa.chat.message.v1/conversationId; soa.contract.lifecycle.v1/contractId (producer payment-service); soa.payment.deposit.v1/depositId. Group Notification notification-service-v1; Chat OFFER_ACCEPTED dùng chat-offer-accepted-v1, độc lập Notification. CONTRACT_CREATED và CONTRACT_STATUS_CHANGED gửi [farmerId, traderId]; DEPOSIT_PAID và DEPOSIT_STATUS_CHANGED gửi cả hai; MESSAGE_CREATED chỉ người nhận. Reference MESSAGE=CONVERSATION/conversationId. DEPOSIT_STATUS_CHANGED chuyển LOCKED không tạo Notification, chỉ DEPOSIT_PAID thông báo lần nạp đó.
Security đã chốt 07/10/2026: User ký RS256, access token 15 phút; iss=urn:soa:user-service, aud=soa-api; sub=accountId UUID, role=FARMER/TRADER/ADMIN, iat/exp/jti. Chỉ User giữ private key; Gateway/backend verify bằng public key, forward Bearer và kiểm ownership. GET /internal/v1/accounts/{accountId}/access-state đọc DB primary, không cache ACTIVE, timeout tổng 1 giây; không kiểm tra được →503 ACCESS_STATE_UNAVAILABLE; account không ACTIVE →403 ACCOUNT_NOT_ACTIVE. Internal dùng X-Service-Key riêng từng caller, private network/HTTPS khi triển khai, không route public. WebSocket Chat kiểm state trước SEND/SUBSCRIBE và push riêng tư.
Farmer tạo Listing từ snapshot Farming → Trader POST Offer PENDING (depositAmount=0) → OFFER_CREATED gửi Farmer → Farmer có thể accept nhiều Offer → OFFER_ACCEPTED tạo conversation riêng theo offerId và thông báo Trader → Trader tạo Contract trong Payment → Farmer accept Contract PENDING_DEPOSIT, tạo tracking PENDING → Trader nạp cọc mô phỏng 5% → Payment phối hợp Trading chốt độc quyền một giao dịch/Listing → Trading LOCKED, Payment Contract ACTIVE/cọc LOCKED → Kafka thông báo cả hai → hoàn tất Contract thì Trading SOLD. Chỉ rút khi đủ điều kiện và không có tranh chấp hợp lệ đang mở; mốc deliveryDate+24h không tự hoàn tất Contract. Giữ lịch sử các Offer/phòng khác; không tự REJECT hoặc xóa tất cả.
Chuẩn đối chiếu chung — CONTRACT CHUNG MVP v2.1
Tab rule chứa toàn văn Contract v2.1, là đầu mối đối chiếu API/event/schema/flow cho nhóm. Service này theo §3–5,§8–9,§14–16; participant,conversation theo Offer,Contract Payment và badge riêng. D01–D07 và gói kỹ thuật v2.1 đã có hiệu lực theo chỉ đạo chọn phương án và thực hiện. Áp dụng thêm §17–19 cho token/CORS/media/Admin; mọi endpoint/event mới phải được triển khai đúng contract, không còn chờ duyệt nghiệp vụ.
Change Log
§2–3, §6, §10, §14–19, Phụ lục B–D: thay quyết định cũ không thông báo tin nhắn bằng MESSAGE_CREATED → Notification; giữ realtime/read/badge tại Chat. Nguồn: Conflict 13; Contract 8–11.
§1, §4–6, §10–11, §17–19: Chat chỉ mở sau Accept Offer, UUID và offer_id idempotency, bỏ listing reference; không biến Accept Offer thành chốt cọc. Nguồn: Conflict 02–03, 06, 08; Contract 12.
§8–9, §14–16: JWT/account ACTIVE/participant, khóa account chặn REST/WebSocket và state unavailable fail closed; broker Kafka. Nguồn: Conflict 04, 07, 10–12; Contract 4–5.
Các section/card/API Contract và topic cũ: giữ baseline có nhãn cần xác nhận, không tự chốt Payment là owner Contract hoặc mở rộng recipient. Nguồn: Contract 2, 9, 12–13.
Cập nhật baseline v2.1: đóng D01–D07, chuẩn hóa API/event/schema/flow và các mục token/CORS/media/Admin theo phạm vi service. Nguồn: Conflict + Contract v2.1 theo chỉ đạo người dùng chọn phương án và thực hiện; nội dung tài liệu không chứng minh code đã triển khai.
Open Issues
Không còn quyết định nghiệp vụ/gói kỹ thuật chờ duyệt trong baseline v2.1. Cấu hình thật (domain, SMTP, seed email, SUPPORT_EMAIL, secrets), backfill dữ liệu và kiểm thử mã nguồn là việc triển khai theo Contract §19; không ghi chúng là đã hoàn tất. Mở vấn đề mới chỉ khi có thay đổi phạm vi hoặc mâu thuẫn mới được phát hiện.



