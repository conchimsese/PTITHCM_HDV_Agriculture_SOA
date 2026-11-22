# Notification Service

Notification Service Specification MVP
Nguồn cập nhật: Conflict đã chốt, Contract chung v2.1 và xulycontract(1).txt; người dùng đã giao quyền lựa chọn phương án và cập nhật trực tiếp. D01–D07 và gói kỹ thuật có hiệu lực theo v2.1. Ưu tiên quyết định mới nhất → Conflict đã chốt → Contract → rule → spec; không dùng đề xuất cũ để mở lại các mục đã đóng.
1. Project Overview
Notification nhận business event Kafka, tạo/lưu thông báo theo từng account và cung cấp REST để xem, đánh dấu đọc, đếm chưa đọc. Không thay đổi nghiệp vụ producer, không đọc database service khác. User và Notification triển khai Java/Spring Boot theo yêu cầu người phụ trách.
2. Architecture Overview
Sáu service MVP: User,Farming,Trading,Chat,Payment,Notification; Kafka là broker. Contract/Deposit/Dispute là module trong Payment/payment_db, không deployment riêng. Sơ đồ dưới tập trung luồng Notification; toàn bộ topology theo Contract v2.1.
 
Sơ đồ kiến trúc Notification Service
Gateway /api/v1/notifications/**→Notification giữ prefix. Notification MVP REST, không push WebSocket/SSE riêng; Chat WebSocket độc lập. Internal access-state không public; discovery tùy chọn.
3. Service Responsibility
· Consume7 event giao thương và3 event User bổ sung theo xulycontract; validate envelope/recipients, không tự tính reputation.
· Tạo notification cho từng recipient, dedup (eventId,recipientId).
· Lưu UNREAD/READ và thời điểm đọc; template cố định tiếng Việt.
· List/detail/mark-read/unread-count của current account, kể cả ADMIN.
· Retry hữu hạn, DLT và quy trình replay có kiểm soát.
· Không xác minh OTP, gửi email OTP, tạo Offer/Conversation/Contract/Payment hoặc suy recipient từ DB producer.
· Không read-all, admin xem người khác, admin sửa template trong MVP.
4. Database Ownership
Notification sở hữu notification_db; notifications và notification_receipts đều được duyệt. AccountId UUID logical reference, không FK sang user_db. Receipt giữ dedup sau xóa notification90 ngày; MVP không tự xóa receipt.
5. ERD và fields
Bảng
PK
Ràng buộc
notifications
notification_​id UUID
UNIQUE(event_​id,recipient_​id), CHECK status
notification_receipts — đã duyệt
(event_​id,recipient_​id)
Không FK đến notification/​user; giữ khóa sau retention
 
5.1 notifications
Field
PostgreSQL
Ràng buộc/​ý nghĩa
notification_​id
UUID
PK, service tạo
event_​id
UUID
NOT NULL, bổ sung theo quyết định nhóm
recipient_​id
UUID
NOT NULL, accountId người nhận
type
VARCHAR(50)
NOT NULL;7 event giao thương + REPUTATION_CHANGED/ACCOUNT_LOCKED/ACCOUNT_UNLOCKED
title
VARCHAR(200)
NOT NULL, template
content
TEXT
NOT NULL, không chứa secret/​nội dung chat riêng tư
source_​service
VARCHAR(50)
NOT NULL, producer logic
source_​event
VARCHAR(50)
NOT NULL, eventType
reference_​type
VARCHAR(30)
NOT NULL, OFFER/​CONVERSATION/​CONTRACT/​DEPOSIT
reference_​id
UUID
NOT NULL, owner object tạo
status
VARCHAR(10)
NOT NULL, UNREAD hoặc READ
occurred_​at
TIMESTAMPTZ
NOT NULL, lưu thời điểm event gốc
created_​at
TIMESTAMPTZ
NOT NULL, thời điểm Notification persist
read_​at
TIMESTAMPTZ
NULL khi UNREAD, có giá trị khi READ
 
Indexes: (recipient_id,created_at DESC,notification_id DESC); partial index unread (recipient_id,created_at) WHERE status='UNREAD'; unique (event_id,recipient_id); index created_at cho cleanup. CHECK trạng thái đọc: UNREAD/read_at NULL hoặc READ/read_at NOT NULL. Không tạo FK cross-service.
reference_type/occurred_at/eventVersion và envelope đã duyệt theo Contract v1; accountId/referenceId UUID. Index kỹ thuật chỉ phục vụ query/dedup/cleanup, không mở rộng nghiệp vụ.
5.2 notification_receipts — đã duyệt, giữ khóa dedup không tự xóa trong MVP
Field
PostgreSQL
Ý nghĩa
event_​id
UUID
Thành phần PK
recipient_​id
UUID
Thành phần PK
processed_​at
TIMESTAMPTZ
NOT NULL, xử lý thành công
payload_​hash
CHAR(64)
NOT NULL, hash canonical business envelope
 
Receipt và notification cùng transaction, không FK đến notification/user_db. PK(event_id, recipient_id), processed_at TIMESTAMPTZ, payload_hash CHAR(64). Receipt không tự xóa trong MVP; nội dung notifications retention90 ngày.
6. Integration Contract
Caller/​producer
Interface
Mục đích
Gateway
REST /​api/​v1/​notifications/​**
Current-account API
Notification→User
GET /​internal/​v1/​accounts/​{accountId}/​access-state
ACTIVE/​role hiện tại; service auth
Trading
Kafka OFFER_​CREATED/​OFFER_​ACCEPTED
Offer
Chat
Kafka MESSAGE_​CREATED
Tin nhắn
Logical Contract owner
Kafka CONTRACT_​CREATED/​CONTRACT_​STATUS_​CHANGED
Hợp đồng
Payment
Kafka DEPOSIT_​PAID/​DEPOSIT_​STATUS_​CHANGED
Tiền cọc
 
Security đã chốt 07/10/2026: User ký RS256, access token 15 phút; iss=urn:soa:user-service, aud=soa-api; sub=accountId UUID, role=FARMER/TRADER/ADMIN, iat/exp/jti. Chỉ User giữ private key; Gateway/backend verify bằng public key, forward Bearer và kiểm ownership. GET /internal/v1/accounts/{accountId}/access-state đọc DB primary, không cache ACTIVE, timeout tổng 1 giây; không kiểm tra được →503 ACCESS_STATE_UNAVAILABLE; account không ACTIVE →403 ACCOUNT_NOT_ACTIVE. Internal dùng X-Service-Key riêng từng caller, private network/HTTPS khi triển khai, không route public. WebSocket Chat kiểm state trước SEND/SUBSCRIBE và push riêng tư.
7. API Contract Matrix
Tất cả endpoint yêu cầu Bearer hợp lệ, account ACTIVE. ADMIN không ngoại lệ về ownership.
Method
Endpoint
Request
Response
GET
/​api/​v1/​notifications
page=0,size=20,isRead?,type?
200 trang NotificationDto
GET
/​api/​v1/​notifications/​{notificationId}
UUID
200 NotificationDto
PATCH
/​api/​v1/​notifications/​{notificationId}/​read
Không body
200 {notificationId,status,readAt}
GET
/​api/​v1/​notifications/​unread-count
—
200 {count}
 
/read-all không thuộc MVP. Filter isRead=true→READ, false→UNREAD; type gồm7 loại giao thương và3 loại User đã duyệt, consumer User dùng topic/payload/template v2.1 §9/§14 đã có hiệu lực. page>=0, size1..100 mặc định20; sort createdAt DESC, notificationId DESC; response {items, page, size, totalElements, totalPages}. Own account và cutoff90 ngày cho list/detail/count/read; mark-read lặp giữ readAt.
8. Lifecycle và Event Contract
Validate schema/version/source → loại trùng recipients → transaction dedup+persist mọi recipient → DB commit → offset commit. Notification mới UNREAD; người sở hữu mark read→READ. Không có trạng thái DELIVERED bắt buộc, realtime failure không xóa notification.
Event
Producer logic
Subscription MVP
OFFER_​CREATED
trading-service
Có
OFFER_​ACCEPTED
trading-service
Có
MESSAGE_​CREATED
chat-service
Có
CONTRACT_​CREATED
payment-service (module Contract)
Có; Contract v1 đã duyệt
CONTRACT_​STATUS_​CHANGED
payment-service (module Contract)
Có; Contract v1 đã duyệt
DEPOSIT_​PAID
payment-service
Có; Contract v1 đã duyệt
DEPOSIT_​STATUS_​CHANGED
payment-service
Có; Contract v1 đã duyệt
 
RFQ_CREATED/RFQ_ACCEPTED/RFQ_REJECTED không subscribe MVP. OFFER_REJECTED chỉ thêm sau producer chốt. Topic/key/payload chi tiết theo mục9 của contract chung, không tự dùng event lowercase của baseline.
9. Event Envelope
{   "eventId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",   "eventType": "OFFER_CREATED",   "eventVersion": 1,   "sourceService": "trading-service",   "occurredAt": "2026-10-02T06:00:00Z",   "actorId": "22222222-2222-4222-8222-222222222222",   "recipientIds": [     "11111111-1111-4111-8111-111111111111"   ],   "referenceType": "OFFER",   "referenceId": "33333333-3333-4333-8333-333333333333",   "data": { 	"offerId": "33333333-3333-4333-8333-333333333333", 	"listingId": "44444444-4444-4444-8444-444444444444", 	"farmerId": "11111111-1111-4111-8111-111111111111", 	"traderId": "22222222-2222-4222-8222-222222222222"   } }
Envelope đã duyệt: {eventId UUID, eventType, eventVersion:1, sourceService, occurredAt UTC, actorId UUID|null, recipientIds:[account UUID], referenceType, referenceId UUID, correlationId?, data}. Producer giữ eventId/payload qua retry; consumer ghi DB trước ACK. 7 event giao thương ban đầu giữ tên; xulycontract bổ sung REPUTATION_CHANGED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED từ User. USER_PROFILE_UPDATED chỉ đồng bộ Trading, không thuộc subscription Notification. Notification không tự tính điểm từ trạng thái cọc.
10. Event-to-Notification Mapping
Type/​event
Title template
Người nhận
Điều hướng
OFFER_​CREATED
Có offer mới
Farmer theo recipientIds
OFFER/​offerId
OFFER_​ACCEPTED
Offer đã được chấp nhận
Trader theo recipientIds
OFFER/​offerId
MESSAGE_​CREATED
Bạn có tin nhắn mới
Recipient, không sender
CONVERSATION/​conversationId
CONTRACT_​CREATED
Hợp đồng mới được tạo
Farmer và Trader theo recipientIds
CONTRACT/​contractId
CONTRACT_​STATUS_​CHANGED
Trạng thái hợp đồng thay đổi
Farmer và Trader theo recipientIds
CONTRACT/​contractId
DEPOSIT_​PAID
Tiền cọc đã được xác nhận
Farmer và Trader theo recipientIds
DEPOSIT/​depositId
DEPOSIT_​STATUS_​CHANGED
Trạng thái tiền cọc thay đổi
Farmer và Trader theo recipientIds
DEPOSIT/​depositId
 
10 template đã chốt: 7 template giao thương giữ nguyên; REPUTATION_CHANGED title “Điểm uy tín đã thay đổi”, content “Điểm uy tín của bạn thay đổi từ {beforeScore} thành {afterScore}. Lý do: {reasonCode}.”; ACCOUNT_LOCKED title “Tài khoản đã bị khóa”, content “Tài khoản của bạn đã bị khóa. Vui lòng kiểm tra email để biết cách liên hệ hỗ trợ.”; ACCOUNT_UNLOCKED title “Tài khoản đã được mở khóa”, content “Tài khoản của bạn đã được mở khóa. Bạn có thể đăng nhập lại.” 3 event User reference ACCOUNT/accountId, recipientIds=[accountId]. Không đưa email/contacts/bằng chứng/preview Chat vào thông báo. DEPOSIT_STATUS_CHANGED sang LOCKED không tạo Notification, chỉ DEPOSIT_PAID tạo thông báo cọc.
Mapping User bổ sung — baseline v2.1
User source user-service phát REPUTATION_CHANGED trên soa.user.reputation.v1/key accountId và ACCOUNT_LOCKED/ACCOUNT_UNLOCKED trên soa.user.account.v1/key accountId; payload/envelope theo Contract v2.1 §9. Consumer notification-service-v1 xử lý cả account LOCKED; đọc REST vẫn ACTIVE. User gửi email khóa/mở trực tiếp bằng SMTP, không nhờ Notification gửi OTP. Flow: Payment decision → User transaction điểm/history/lock/outbox → Kafka → Notification receipt + content; retry giữ eventId và dedup theo recipient.
11. Idempotency & Duplicate Event
Dedup unique(event_id, recipient_id); receipt và notification trong cùng transaction. Producer giữ eventId/payload qua retry; duplicate không tạo Notification mới kể cả nội dung đã xóa sau90 ngày. So payload_hash phát hiện eventId dùng lại sai nội dung.
Dùng PostgreSQL insert-on-conflict và so hash cho replay, không dùng catch unique exception trong transaction JPA đã lỗi. Duplicate hợp lệ coi success để commit offset. Dùng transaction advisory lock theo eventId và so hash với receipt bất kỳ đã tồn tại của eventId trước insert, kể cả recipient list khác. Same eventId nhưng khác business payload→DLT EVENT_ID_REUSED. Hash canonical business envelope đã sort/dedup recipients và loại transport retry headers. Mọi recipient mới của một event ghi cùng transaction; DB lỗi ở recipient thứ2 rollback toàn bộ thay đổi của event.
12. Retry & Failure Handling
Kafka at-least-once + DB idempotency, không tuyên bố exactly-once DB/Kafka. Auto offset commit tắt. Commit offset khi persist đã commit hoặc đã forward retry/DLT thành công. Không tự ack trong transaction trước commit; transaction ở service persistence, listener hoàn tất sau commit.
Attempt
Khi lỗi transient
1 lần đầu
Forward retry1, chờ5s
2
Forward retry2, chờ30s
3
Forward retry3, chờ120s
4
Forward DLT
 
Schema/UUID/version/source sai → DLT trực tiếp. Với mỗi topic T: T.notification-retry-1/2/3 và T.notification-dlt đã duyệt. Main group notification-service-v1, độc lập Chat; publish forward thành công mới commit offset.
Non-blocking retry, DB transaction persistence; không kết hợp container Kafka transaction. Lịch5/30/120s, retention retry/DLT7 ngày. Forward Kafka lỗi không drop record hoặc commit như đã recover. DLT giữ original payload và metadata; replay có kiểm soát, giữ eventId, không retry vô hạn.
Retry đổi thứ tự event. Notification không điều chỉnh trạng thái business entity; lịch sử cũ persist muộn không được diễn giải là state hiện tại. createdAt dùng cho list/retention, occurredAt mô tả thời điểm nghiệp vụ.
13. Authentication & Authorization
Action
FARMER
TRADER
ADMIN
List/​detail/​count own
Có
Có
Có
Mark own read
Có
Có
Có
Xem/​sửa người khác
Không
Không
Không
Read-all/​sửa template
Không thuộc MVP
Không thuộc MVP
Không thuộc MVP
 
Service verify JWT và quyền sở hữu bằng recipient_id=sub. Không nhận recipientId query/body để chuyển tài khoản. GET/PATCH ID người khác404. Gateway kiểm state mỗi request; Notification dùng User internal access-state trước protected action theo baseline v2.1, không cache ACTIVE. LOCKED/INACTIVE/UNVERIFIED→403; User state unavailable→503. Consumer Kafka là máy với máy, không cần JWT người dùng; không bỏ event chỉ vì account hiện bị khóa, vì account có thể mở lại. API user khóa vẫn bị chặn.
14. Error Contract
Schema lỗi chung {timestamp,status,code,message,path,traceId?}. 400 validation; 401 token thiếu/sai; 403 quyền/account state; 404 resource không thấy/không thuộc mình/expired; 503 state unavailable; 500 lỗi nội bộ. Không trả event payload/stack trace/secret. Retry/DLT là xử lý Kafka, không dùng HTTP code để tự suy phân loại mọi lỗi consumer.
15. Data Contract
NotificationDto:
{   "notificationId": "55555555-5555-4555-8555-555555555555",   "type": "OFFER_CREATED",   "title": "Có offer mới",   "content": "Bạn nhận được một offer mới cho bài đăng của mình.",   "sourceService": "trading-service",   "referenceType": "OFFER",   "referenceId": "33333333-3333-4333-8333-333333333333",   "status": "UNREAD",   "createdAt": "2026-10-02T06:00:01Z",   "readAt": null }
List {items:[NotificationDto],page:0,size:20,totalElements:1,totalPages:1}. Mark-read {notificationId,status:"READ",readAt:<UTC>}; count {count:5}. Không expose eventId/recipientId/private business payload cho frontend baseline. Ghi read_at một lần với update có điều kiện, tránh readAt thay đổi khi request đồng thời.
16. Business Rules và retention
ID
Rule
NOTI-BR-001
Một notification thuộc một recipient UUID
NOTI-BR-002
Reference account chỉ logical, không cross-service FK
NOTI-BR-003
Producer cung cấp recipients; Notification không query DB khác
NOTI-BR-004
Validate event và dedup pair trước persist
NOTI-BR-005
Mới UNREAD, READ có readAt và mark lặp không đổi
NOTI-BR-006
Lưu toàn bộ recipients trong transaction
NOTI-BR-007
Không sửa business data của source
NOTI-BR-008
Offset chỉ commit sau persist/​forward thành công
NOTI-BR-009
API chỉ own account; ADMIN không vượt ownership
NOTI-BR-010
Nội dung retention90 ngày, receipt giữ khóa dedup không tự xóa
 
Cutoff90 ngày áp dụng list/detail/count/read trước cleanup. Job xóa batch notifications quá90 ngày; không xóa receipts trong MVP. Cleanup cần coordination; theo dõi receipt growth và Kafka retention. Retry/DLT retention7 ngày; replay giữ eventId/payload gốc.
17. Inter-Service Communication
Sync: REST client→Gateway→Notification, access-state Notification/Gateway→User. Async: producer→Kafka→Notification. Không consume Kafka để xác định current request authorization. Service-to-service auth theo contract chung; internal key riêng từng caller đã chốt, không tạo account role thứ tư.
18. Repository Structure
Package/​resources
Vai trò
controller, dto
REST và request/​response
service
Business use cases và DB transaction
entity, repository
Persistence/​index/​unique
consumer, event
Kafka listener và contract DTO
template
Mapping event→title/​content
security, config
JWT, access-state client, Kafka retry
exception
HTTP errors, consumer error classification
resources/​db/​migration
Flyway schema versions
test
API/​security/​DB/​Kafka integration
 
Tách ứng dụng Notification khỏi User; không import repository/entity User. Controller→service→repository. Không cần CQRS/event sourcing/hexagonal framework để làm MVP; tổ chức package đủ tách trách nhiệm, nếu nhóm có architecture bắt buộc phải thống nhất ở repo.
19. Coding Convention
Java21 và Boot3.x giữ hướng spec User hiện tại; version patch chọn qua BOM, không tự nâng framework major ở tài liệu này. DTO camelCase, DB snake_case; transaction tại service; schema thay đổi bằng migration; không expose entity; UTC; validate enum/UUID; không log token/service key/event raw payload.
20. Git Convention
Giữ main/develop nếu repo nhóm đang dùng. Branch feature/notification-api, feature/notification-kafka, feature/notification-retry. PR mô tả behavior, migration, contract changes và validation. Không commit secret. Không tự đổi branch workflow của repo hiện có.
21. Environment Configuration
SERVER_PORT, DB_URL, DB_USERNAME, DB_PASSWORD, KAFKA_BOOTSTRAP_SERVERS, KAFKA_CONSUMER_GROUP, JWT_PUBLIC_KEY_LOCATION, JWT_ISSUER, JWT_AUDIENCE, USER_SERVICE_BASE_URL, INTERNAL_SERVICE_KEY, NOTIFICATION_RETENTION_DAYS, SPRING_PROFILES_ACTIVE. Retry/topic/retention config theo contract đã duyệt; không JWT private key trong Notification. Cấu hình max poll/retry listener tránh sleep120 giây trên main consumer.
22. Docker / Local Development
Port local đã chốt: User8081, Notification8086, Gateway8080; không đổi port theo spec cũ. PostgreSQL có2 database/users riêng; Kafka shared, có thể một broker local cho dev, không cam kết HA. Java app chạy IDE trước, infra bằng Compose. Khi container hóa, Kafka bootstrap host phải truy cập được từ container; không dùng localhost giữa containers. Health endpoint không expose config/secrets.
23. Testing Strategy
Kiểm thử meaningful: replay/concurrent consumer/2 recipients/partial rollback; crash window DB→offset; retry4 total attempts và poison DLT; forward-DLT failure không mất record; mark-read concurrent giữ readAt; JWT/state/ownership ADMIN; retention cutoff và replay sau xóa content. Integration dùng PostgreSQL và Kafka thật/Testcontainers, không thay bằng H2 để xác minh PostgreSQL ON CONFLICT. Golden fixture cho mỗi event duyệt; chỉ thêm Contract/Payment fixtures hoàn chỉnh sau enum/recipient chốt.
24. End-to-End Business Flow
Trading tạo Offer→commit/publish OFFER_CREATED→Notification tạo UNREAD Farmer. Farmer accept→Trading commit/publish OFFER_ACCEPTED→Notification Trader và Chat mở conversation độc lập. Tin nhắn persist→MESSAGE_CREATED→Notification recipient. Contract/Payment phát events theo owner transitions đã duyệt; không tự suy flow cọc từ Notification. Người dùng mở list/read qua Gateway, account ACTIVE và recipient ownership.
25. Definition of Done
· Migration notifications/event_id/unique/index; receipt hoặc alternative horizon được duyệt trước cleanup.
· 4 API DTO/filter/page/sort/error đúng contract, own account kể cả ADMIN.
· Đủ10 event/type/template Notification theo Contract v2.1: 7 giao thương và3 User; migration, subscription và fixtures phải đồng bộ trước tích hợp.
· Dedup multi-recipient/concurrency/transaction, offset, retry/DLT/replay đã kiểm chứng.
· Retention90 ngày không làm tái tạo thông báo cũ; realtime failure không làm mất dữ liệu.
· JWT + immediate lock + internal authentication + Gateway route đồng bộ.
· README chạy local và tài liệu template cập nhật; không secret trong Git.
26. AI Agent Development Rules / baseline đã chốt
Áp dụng 10 loại Notification tại Contract v2.1 §8–9/§14: 7 giao thương +3 User; migration type/referenceType và consumer đồng bộ. Không thêm RFQ, read-all, admin-other, TERMS_UPDATED hoặc event dispute riêng. Trạng thái dispute hiển thị qua REST Payment. Receipt/retry5/30/120s/DLT7 ngày/content90 ngày đã chốt. Không query DB producer hoặc tự tính điểm.
 
 
Luồng tích hợp đã đồng bộ
Producer commit nghiệp vụ → Kafka event UUID + recipientIds account UUID → Notification validate/loại trùng → một DB transaction lưu mọi recipient, unique(event_id,recipient_id) → DB commit → commit offset. Event lặp là thành công; không nhân đôi notification.
Client → Gateway /api/v1/notifications/** → JWT + ACTIVE → Notification lấy sub, kiểm ownership → list/detail/read/count. ADMIN chỉ thao tác thông báo của chính mình; ID người khác/không có trả404. Read lặp giữ readAt.
Subscription và template đã đồng bộ 07/10/2026
Nguồn cập nhật: Conflict đã chốt, Contract chung v2.1 và xulycontract(1).txt; người dùng đã giao quyền lựa chọn phương án và cập nhật trực tiếp. D01–D07 và gói kỹ thuật có hiệu lực theo v2.1. Ưu tiên quyết định mới nhất → Conflict đã chốt → Contract → rule → spec; không dùng đề xuất cũ để mở lại các mục đã đóng.
Topic/key đã chốt theo Contract v1: soa.trading.offer.v1/offerId; soa.chat.message.v1/conversationId; soa.contract.lifecycle.v1/contractId (producer payment-service); soa.payment.deposit.v1/depositId. Group Notification notification-service-v1; Chat OFFER_ACCEPTED dùng chat-offer-accepted-v1, độc lập Notification. CONTRACT_CREATED và CONTRACT_STATUS_CHANGED gửi [farmerId, traderId]; DEPOSIT_PAID và DEPOSIT_STATUS_CHANGED gửi cả hai; MESSAGE_CREATED chỉ người nhận. Reference MESSAGE=CONVERSATION/conversationId. DEPOSIT_STATUS_CHANGED chuyển LOCKED không tạo Notification, chỉ DEPOSIT_PAID thông báo lần nạp đó.
Envelope đã duyệt: {eventId UUID, eventType, eventVersion:1, sourceService, occurredAt UTC, actorId UUID|null, recipientIds:[account UUID], referenceType, referenceId UUID, correlationId?, data}. Producer giữ eventId/payload qua retry; consumer ghi DB trước ACK. 7 event giao thương ban đầu giữ tên; xulycontract bổ sung REPUTATION_CHANGED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED từ User. USER_PROFILE_UPDATED chỉ đồng bộ Trading, không thuộc subscription Notification. Notification không tự tính điểm từ trạng thái cọc.
User bổ sung REPUTATION_CHANGED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED; recipient là account được thay đổi. Không tự đọc payment_db/user_db, không tự tính điểm. Khóa account không bỏ guard ACTIVE để đọc thông báo; kênh ngoài REST và payload/template User chờ duyệt.
Retry non-blocking: topic T.notification-retry-1(5s), T.notification-retry-2(30s), T.notification-retry-3(120s), T.notification-dlt; retention7 ngày. 4 total attempts. Publish retry/DLT thành công mới commit offset; lỗi forward không drop record. DLT replay có kiểm soát, giữ eventId/payload gốc; receipts giữ lâu hơn nội dung90 ngày.
Security đã chốt 07/10/2026: User ký RS256, access token 15 phút; iss=urn:soa:user-service, aud=soa-api; sub=accountId UUID, role=FARMER/TRADER/ADMIN, iat/exp/jti. Chỉ User giữ private key; Gateway/backend verify bằng public key, forward Bearer và kiểm ownership. GET /internal/v1/accounts/{accountId}/access-state đọc DB primary, không cache ACTIVE, timeout tổng 1 giây; không kiểm tra được →503 ACCESS_STATE_UNAVAILABLE; account không ACTIVE →403 ACCOUNT_NOT_ACTIVE. Internal dùng X-Service-Key riêng từng caller, private network/HTTPS khi triển khai, không route public. WebSocket Chat kiểm state trước SEND/SUBSCRIBE và push riêng tư.
Chuẩn đối chiếu chung — CONTRACT CHUNG MVP v2.1
Tab rule chứa toàn văn Contract v2.1, là đầu mối đối chiếu API/event/schema/flow cho nhóm. Service này theo §4,§8–10,§14–16; 7event giao thương và3event User, receipt/retry/retention/REST đồng bộ. D01–D07 và gói kỹ thuật v2.1 đã có hiệu lực theo chỉ đạo chọn phương án và thực hiện. Áp dụng thêm §17–19 cho token/CORS/media/Admin; mọi endpoint/event mới phải được triển khai đúng contract, không còn chờ duyệt nghiệp vụ.
Change Log
§2–3, §6–10, §13–17: giữ 6 service luồng chính, Kafka, 10 event Notification (7 giao thương +3 User), envelope/recipient từ producer, UUID reference và REST Gateway. Nguồn: Conflict 01–07, 12–13, 15; Contract 2–4, 7–9, 12.
§5, §11–12, §16, §23–24: unique(event_id,recipient_id), transaction mọi recipient, commit sau thành công, retry/DLQ và tách realtime; schema receipts/topic/replay đã chốt trong v2.1. Nguồn: Conflict 14; Contract 10.
§7, §13, §15–16: 4 endpoint current account, page0/size20/max100, isRead/type, sort cố định, DTO page, mark-read idempotent, retention90 ngày/template baseline; không read-all/admin xem người khác. Nguồn: Conflict 15; Contract 7, 11.
Cập nhật baseline v2.1: đóng D01–D07, chuẩn hóa API/event/schema/flow và các mục token/CORS/media/Admin theo phạm vi service. Nguồn: Conflict + Contract v2.1 theo chỉ đạo người dùng chọn phương án và thực hiện; nội dung tài liệu không chứng minh code đã triển khai.
Open Issues
Không còn quyết định nghiệp vụ/gói kỹ thuật chờ duyệt trong baseline v2.1. Cấu hình thật (domain, SMTP, seed email, SUPPORT_EMAIL, secrets), backfill dữ liệu và kiểm thử mã nguồn là việc triển khai theo Contract §19; không ghi chúng là đã hoàn tất. Mở vấn đề mới chỉ khi có thay đổi phạm vi hoặc mâu thuẫn mới được phát hiện.



