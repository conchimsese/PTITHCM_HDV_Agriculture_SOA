# rule

1. Project Overview
Mục đích để agent hiểu toàn cảnh trước khi đọc từng service.
1. Project Overview
   1.1. Mục tiêu hệ thống
   1.2. Phạm vi MVP
   1.3. Đối tượng sử dụng
   1.4. Business flow chính
   1.5. Các actor (FARMER//TRADER//ADMIN)
Ví dụ:
System: Agriculture Management Platform
 
Target:
- Farmer
- Trader
- Admin
 
Platform:
- Web
- Mobile
 
Architecture:
- Microservices
 
Main services:
1. User Service
2. Farming Service
3. Trading Service
4. Chat Service
5. Payment Service
6. Notification Service

2. Architecture Overview (P.CƯỜNG LÀM)

```dbdiagram
@startuml
!theme plain
skinparam componentStyle rectangle
skinparam linetype ortho
skinparam nodesep 50
skinparam ranksep 60
skinparam defaultTextAlignment center
 
' Định nghĩa bảng chú giải (Legend)
legend right
  |= Ký hiệu / Màu sắc |= Ý nghĩa / Giao thức |
  |<#E8F5E9>| **MVP** (Bắt buộc Phase 1) |
  |<#FFF3E0>| **Optional** (Phase mở rộng) |
  | <color:blue>---></color> | RESTful API (Đồng bộ) |
  | <color:red><...></color> | Kafka Event (Bất đồng bộ) |
  | <color:purple>===></color> | WebSocket (Real-time) |
endlegend
 
actor "User\n(farmer / trader / admin )" as User
component "Web / Mobile App" as App <<MVP>> #E8F5E9
User <--> App
 
' ================= TẦNG GATEWAY =================
package "API & Discovery Layer" {
    component "API Gateway" as APIGW <<REST / WS>> <<MVP>> #E8F5E9
    component "Service Discovery\n(Eureka/Consul)" as Discovery <<Optional>> #FFF3E0
   
    ' Ép Discovery nằm bên phải Gateway để không vướng đường nối
    APIGW -[hidden]r- Discovery
}
 
App <--> APIGW : HTTPS
APIGW .r.> Discovery : Lookup
 
' ================= TẦNG MESSAGE BROKER =================
queue "Message Broker (Kafka)\n<size:12>Event-Driven</size>" as Kafka <<MVP>> #E8F5E9
 
' ================= TẦNG MICROSERVICES =================
package "Microservices Layer (Implement Hexagonal + Clean Architecture )" as MicroservicesLayer {
   
    ' Khai báo các Services
    component "User Service" as UserService <<MVP>> #E8F5E9
    component "Farming Service\n<size:12>(CQRS)</size>" as FarmingService <<MVP>> #E8F5E9
    component "Trading Service\n<size:12>(CQRS)</size>" as TradingService <<MVP>> #E8F5E9
    ' Contract là module trong PaymentService, không tạo component/deployment riêng
    component "Payment Service" as PaymentService <<MVP>> #E8F5E9
    component "Notification Service" as NotifService <<MVP>> #E8F5E9
    component "Chat Service" as ChatService <<MVP>> #E8F5E9
 
    ' Khai báo các Databases
    database "User DB" as UserDB #E8F5E9
    database "Farming DB" as FarmingDB #E8F5E9
    database "Trading DB" as TradingDB #E8F5E9
    ' Contract/Deposit/Dispute cùng payment_db của Payment
    database "Payment DB" as PaymentDB #E8F5E9
    database "Notification DB" as NotifDB #E8F5E9
    database "Chat DB" as ChatDB #E8F5E9
 
    ' Nối Database trực tiếp xuống dưới đáy của từng Service
    UserService -d-> UserDB
    FarmingService -d-> FarmingDB
    TradingService -d-> TradingDB
    ' Không chốt Contract DB/deployment
    PaymentService -d-> PaymentDB
    NotifService -d-> NotifDB
    ChatService -d-> ChatDB
   
    ' Ép các Service nằm thành 1 hàng ngang (tránh xô lệch)
    UserService -[hidden]r- FarmingService
    FarmingService -[hidden]r- TradingService
TradingService -[hidden]r- ChatService
ChatService -[hidden]r- PaymentService
    PaymentService -[hidden]r- NotifService
    NotifService -[hidden]r- ChatService
}
 
' -----------------------------------------------------------
' CÁC ĐƯỜNG NỐI
' -----------------------------------------------------------
 
' 1. Luồng từ Gateway gọi XUỐNG Services (-d->)
APIGW -[#blue]d-> UserService : REST
APIGW -[#blue]d-> FarmingService : REST
APIGW -[#blue]d-> TradingService : REST
' Route Contract theo owner/deployment cần nhóm xác nhận
APIGW -[#blue]d-> PaymentService : REST
APIGW -[#blue]d-> NotifService : REST /api/v1/notifications/**
APIGW -[#blue]d-> ChatService : REST /api/v1/conversations/**
APIGW ==[#purple]d==> ChatService : WS
 
' 2. Luồng Services đăng ký LÊN Discovery (.u.>)
UserService .u.> Discovery : Reg
FarmingService .u.> Discovery : Reg
TradingService .u.> Discovery : Reg
' Contract là module nội bộ, không đăng ký service discovery riêng
PaymentService .u.> Discovery : Reg
 
' 3. Luồng Kafka Bất đồng bộ (Gom thành 1 đường duy nhất)
' Nối trực tiếp từ toàn bộ Package Microservices lên Kafka
Kafka <..[#red]d..> MicroservicesLayer : pub/sub
@enduml
 
```

3. Service Responsibility
Tạo một bảng cực kỳ rõ:
Service
Responsibility
Database
Owner
User
Authentication, Authorization, Profile
user_db
Member 4
Farming
Plot, Season, Cultivation, Cost
farming_db
Member 1
Trading
Listing, Offer; RFQ chưa thuộc MVP đã chốt
trading_db
Member 2
Chat
Conversation, Message
chat_db
Member 3
Payment
Điều phối cọc, xác nhận Payment; không ghi DB Trading
payment_db
Owner Payment/Contract (chưa ghi tên thành viên)
Notification
Notification & Event Consumer
notification_db
Member 4
Quy tắc quan trọng
Mỗi service phải có:
OWN DATABASE
OWN BUSINESS LOGIC
OWN API (GHI RÕ TỪNG API)
Service khác không được truy cập database trực tiếp.

4. Database Ownership
Đây là phần agent code rất cần.
Với mỗi service ghi:
Service
Database
Entities
PK
FK
Relationships
Data ownership
External references
User Service
user_db
 
accounts
farmer_profiles
trader_profiles
email_verification_otps
refresh_tokens
Notification Service
notification_db
 
notifications (event_id, recipient_id UUID; UNIQUE pair)
Và phải ghi rõ:
recipient_id
	↓
logical reference
	↓
user_db.accounts.account_id
 
NOT a database FK.

5. ERD của từng Service
Nên có ERD riêng cho từng service, không chỉ một ERD toàn hệ thống.
Ví dụ:
5.1 User Service ERD
5.2 Farming Service ERD
5.3 Trading Service ERD
5.4 Chat Service ERD
5.5 Payment Service ERD; Contract/Deposit/Dispute thuộc payment_db theo Contract v2.1
5.6 Notification Service ERD
Mỗi ERD nên kèm:
●      Entity
●      Attribute
●      PK
●      FK
●      Cardinality
Và đặc biệt:
Không có FK xuyên database.

6. API Contract
Đây là trái tim của document.
Đừng chỉ ghi:
GET /users
Mà phải ghi đầy đủ:
Method
Endpoint
Authentication
Request
Response
Status Code
Error Response
Owner
Consumer
Ví dụ:
GET Trader
GET /api/v1/traders/{traderId}
Owner
User Service
Consumer
Trading Service
 
Response
{
  "accountId": "22222222-2222-4222-8222-222222222222",
  "displayName": "ABC Rice",
  "avatarUrl": null,
  "province": "An Giang",
  "district": null,
  "joinedAt": "<ISO-8601 UTC>"
}

7. API Contract Matrix
Ngoài API chi tiết, cần một bảng tổng hợp:
From
To
Method
Endpoint
Purpose
Sync/Async
Trading
User
GET
/api/v1/traders/{traderId}
Get trader
Sync
Trading
Farming
GET
/api/v1/plots/{plotId}/summary — snapshot Farming, caller Trading có service auth/ownership
Get crop info
Sync
Contract
Trading
GET
/api/v1/offers/{offerId} — module Contract/Payment là caller; kiểm scope nội bộ/participant
Get accepted Offer; không tự thêm Negotiation
Sync
Chat
User
GET
/api/v1/users/{accountId}
Validate user
Sync
Agent nhìn bảng này là biết service mình được phép gọi service nào.

8. Event Contract
Kafka đã được chốt cho MVP; mỗi event liên service phải tuân thủ contract chung.
Ví dụ:
OFFER_CREATED
OFFER_ACCEPTED
MESSAGE_CREATED
CONTRACT_CREATED
CONTRACT_STATUS_CHANGED
Mỗi event:
Event Name
Producer
Consumers
Trigger
Payload
Ví dụ:
OFFER_CREATED
{
  "eventId": "uuid",
  "eventType": "OFFER_CREATED",
  "occurredAt": "datetime",
  "data": {
    "offerId": "uuid",
 
    "listingId": "uuid",
    "farmerId": "uuid",
    "traderId": "uuid"
  }
}
Producer:
Trading Service
Consumer:
Notification Service

9. Authentication & Authorization
Phần này đặc biệt quan trọng vì User Service là service của Phong.
Phải quy định:
JWT
Access Token
Role
Authorization
Ví dụ:
POST /auth/login
   	↓
User Service
   	↓
JWT
   	↓
Client
   	↓
Authorization: Bearer <token>
Role:
FARMER
TRADER
ADMIN
Và bảng quyền:
Endpoint
Farmer
Trader
Admin
Create Plot
✓
✗
✗
Create Listing
✓
✗
✗
Send Offer
✗
✓
✗
Manage User
✗
✗
✓

10. Error Contract
Cực kỳ nên thống nhất từ đầu.
Tất cả service trả lỗi cùng format:
{
  "timestamp": "2026-09-23T10:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Invalid request",
  "path": "/api/v1/plots"
}
Các code:
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
INTERNAL_SERVER_ERROR
SERVICE_UNAVAILABLE
Nếu không thống nhất cái này thì mỗi service sẽ trả một kiểu JSON, lúc frontend ghép vào sẽ khá đau đầu.

11. Data Contract
Ngoài API, cần thống nhất (THỐNG NHẤT KIỂU DỮ LIỆU TRONG CÁC DATABASE)
ID
UUID
Time
ISO 8601
UTC
Naming
camelCase
Ví dụ:
{
  "plotId": "...",
  "createdAt": "..."
}
Database
snake_case
Ví dụ:
plot_id
created_at

12. State Machine
Các entity có trạng thái phải ghi rõ.
Đặc biệt:
Contract
CREATED
 ↓
PENDING_DEPOSIT
 ↓
ACTIVE
 ↓
COMPLETED
Không được:
ACTIVE → COMPLETED; CANCELLED chỉ qua kết luận xử lý hợp lệ. Deposit LOCKED không phải Contract status; không tự quay Listing LOCKED về OPEN.
nếu business không cho phép.
Tương tự:
Listing
RFQ
Offer
Negotiation
CropSeason

13. Business Rules
Đây là phần giúp agent không tự bịa nghiệp vụ.
Ví dụ:
BR-FS-001:
Một Account chỉ có một Role.
 
BR-(SERVICE NAME)-002:
Một Farmer có thể quản lý nhiều Plot.
 
BR-003:
Một Plot có nhiều Crop Season.
 
BR-004:
Một Crop Season có thể phát sinh nhiều Cost.
 
BR-005:
Service không được truy cập trực tiếp database của service khác.
Đánh ID cho business rule:
BR-001
BR-002
...
Rất tiện khi review code.

14. Inter-Service Communication
Ghi rõ service nào dùng:
Synchronous
REST API
Asynchronous
Message Broker
Ví dụ:
Trading
   │
   │ GET crop summary
   ▼
Farming
Trong khi:
Trading
   │
   │ OFFER_CREATED
   ▼
Message Broker
   │
   ▼
Notification

15. Repository Structure
Đây là phần agent code cực kỳ cần. (CẤU TRÚC CÁ NHÂN)
Ví dụ:


16. Coding Convention
Code theo môi hình Client - Server (Bỏ Client vì đã có Repo Frontend làm Client chung)
Phần này giúp 4 agent code không thành 4 phong cách khác nhau.
Ví dụ Java/Spring Boot:
controller/
service/
repository/
entity/
dto/
mapper/
exception/
config/
security/
Ví dụ:
PlotController
PlotService
PlotRepository
Plot
CreatePlotRequest
PlotResponse
Quy định:
Controller
	↓
Service
	↓
Repository
	↓
Database
Không:
Controller → Repository

17. Git Convention
main
develop
Branch:
feature/user-auth
feature/user-profile
 
feature/farming-plot
feature/farming-season
 
feature/trading-listing
 
feature/chat-message
 
feature/contract-state
 
feature/notification-consumer
Commit:
feat:
fix:
refactor:
test:
docs:
chore:
Ví dụ:
feat(user): implement login API
feat(farming): add crop season CRUD
feat(notification): consume OFFER_CREATED event

18. Environment Configuration
Ghi rõ các biến môi trường.
Ví dụ User:
SERVER_PORT=8081
 
DB_URL=
DB_USERNAME=
DB_PASSWORD=
 
JWT_ALGORITHM=RS256; JWT_ISSUER=urn:soa:user-service; JWT_AUDIENCE=soa-api; JWT_PUBLIC_KEY_LOCATION=<public key>; ACCESS_STATE_TIMEOUT_MS=1000
JWT_ACCESS_TTL=900s; RS256; iss=urn:soa:user-service; aud=soa-api
Notification:
SERVER_PORT=8086
 
DB_URL=
DB_USERNAME=
DB_PASSWORD=
 
KAFKA_BOOTSTRAP_SERVERS=
Không commit secret vào Git.

19. Docker / Local Development
Agent phải biết chạy project như thế nào.
Ví dụ:
docker compose up -d
Các container:
api-gateway
user-service
farming-service
trading-service
chat-service
payment-service (MVP); Contract là module trong Payment, không service/database riêng
notification-service
database...
message-broker
Và port:
Service
Port
Gateway
8080
User
8081
Farming
8082
Trading
8083
Chat
8084
Payment (module Contract)
8085 — Payment, Contract là module nội bộ
Notification
8086

20. Testing Strategy//

21. End-to-End Business Flow
Phần này để agent hiểu tại sao nó đang code API đó.
Ví dụ:
Farmer
 ↓
Create Plot
 ↓
Create Crop Season
 ↓
Cultivation Log
 ↓
Harvest
 ↓
Create Listing
 ↓
Trader views Listing
 ↓
Offer
 ↓
Notification
 ↓
Farmer accept Offer → OFFER_ACCEPTED → Chat mở conversation theo offerId
 ↓
Hai participant trao đổi trong Chat
 ↓
Payment điều phối Contract/Deposit mô phỏng5%; Listing LOCKED sau chốt cọc, SOLD khi Contract hoàn tất; tranh chấp giữ cọc.
 ↓
Notification
Ghi rõ service nào tham gia ở từng bước.

22. Definition of Done//
 

23. Phần đặc biệt dành cho AI Agent
Tôi rất khuyên thêm một chương riêng:
AI AGENT DEVELOPMENT RULES
Đây là thứ giúp huynh đưa document cho Cursor / Claude Code / Codex / các agent khác.
Ví dụ:
RULE-001
Không tạo entity mới nếu không có trong Business Specification.
 
RULE-002
Không truy cập database của service khác.
 
RULE-003
Không thay đổi API Contract mà chưa cập nhật contracts/.
 
RULE-004
Không thay đổi Event Contract mà chưa thông báo các consumer.
 
RULE-005
Không hard-code credentials.
 
RULE-006
Không bypass authentication.
 
RULE-007
Mọi business logic phải nằm trong Service Layer.
 
RULE-008
Controller không chứa business logic.
 
RULE-009
Không tạo FK xuyên database.
 
RULE-010
Nếu requirement chưa rõ → đánh dấu CẦN XÁC NHẬN, không tự suy đoán.
Đặc biệt thêm:
BEFORE CODING
 
Agent MUST:
1. Read this document.
2. Identify the service it is working on.
3. Read that service's database schema.
4. Read related API contracts.
5. Read related event contracts.
6. Check business rules.
7. Only then implement code.

24. Cấu trúc document cuối cùng
Nếu là tôi tổ chức tài liệu cho nhóm huynh, tôi sẽ chốt thành:
AGRICULTURE MICROSERVICE
SYSTEM DEVELOPMENT SPECIFICATION
│
├── 01. Project Overview
├── 02. Scope & MVP
├── 03. System Architecture
├── 04. Microservice Responsibilities
├── 05. Database Ownership
├── 06. ERD
├── 07. Business Rules
├── 08. API Contract
├── 09. Event Contract
├── 10. Authentication & Authorization
├── 11. State Machines
├── 12. Inter-Service Communication
├── 13. Data & Naming Convention
├── 14. Repository Structure
├── 15. Coding Convention
├── 16. Error Handling
├── 17. Git Workflow
├── 18. Environment Configuration
├── 19. Docker & Local Development
├── 20. Testing Strategy//
├── 21. End-to-End Business Flows
├── 22. Definition of Done//
├── 23. AI Agent Development Rules
└── 24. Change Log
Quan trọng nhất
Huynh nên xem document này là "single source of truth" của cả nhóm.
                BA
              	↓
          Business Rules
              	↓
            Architecture
              	↓
       Database + API Contract
              	↓
          Event Contract
              	↓
              CODE
              	↓
             TESTING
 
Quy định đồng bộ bắt buộc
Nguồn cập nhật: Conflict đã chốt, Contract chung v2.1 và xulycontract(1).txt; người dùng đã giao quyền lựa chọn phương án và cập nhật trực tiếp. D01–D07 và gói kỹ thuật có hiệu lực theo v2.1. Ưu tiên quyết định mới nhất → Conflict đã chốt → Contract → rule → spec; không dùng đề xuất cũ để mở lại các mục đã đóng.
6 service luồng chính:User, Farming, Trading, Chat, Payment, Notification. Contract / Deposit / tranh chấp thuộc Payment/payment_db; User sở hữu reputation/account status. Không query/FK xuyên DB, REST/Kafka theo contract.
User DB: accounts/farmer_profiles/trader_profiles/email_verification_otps/refresh_tokens. Một role FARMER/TRADER/ADMIN; public register chỉ FARMER/TRADER UNVERIFIED, OTP→ACTIVE; ADMIN seed có kiểm soát. LOCKED/INACTIVE thu hồi refresh và chặn protected request mới ngay dù JWT cũ còn hạn; state unavailable fail closed. Gateway verify và backend kiểm danh tính/ownership; không tin header client.
User public profile chỉ ID/displayName/avatar/Tỉnh/Huyện/joinedAt; không contacts chi tiết/OTP/hash/token/rating/badge. Private profile chỉ chính account; Trader ACTIVE không phải chờ Admin duyệt.
Envelope đã duyệt: {eventId UUID, eventType, eventVersion:1, sourceService, occurredAt UTC, actorId UUID|null, recipientIds:[account UUID], referenceType, referenceId UUID, correlationId?, data}. Producer giữ eventId/payload qua retry; consumer ghi DB trước ACK. 7 event giao thương ban đầu giữ tên; xulycontract bổ sung REPUTATION_CHANGED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED từ User. USER_PROFILE_UPDATED chỉ đồng bộ Trading, không thuộc subscription Notification. Notification không tự tính điểm từ trạng thái cọc. Topic/key đã chốt theo Contract v1: soa.trading.offer.v1/offerId; soa.chat.message.v1/conversationId; soa.contract.lifecycle.v1/contractId (producer payment-service); soa.payment.deposit.v1/depositId. Group Notification notification-service-v1; Chat OFFER_ACCEPTED dùng chat-offer-accepted-v1, độc lập Notification. CONTRACT_CREATED và CONTRACT_STATUS_CHANGED gửi [farmerId, traderId]; DEPOSIT_PAID và DEPOSIT_STATUS_CHANGED gửi cả hai; MESSAGE_CREATED chỉ người nhận. Reference MESSAGE=CONVERSATION/conversationId. DEPOSIT_STATUS_CHANGED chuyển LOCKED không tạo Notification, chỉ DEPOSIT_PAID thông báo lần nạp đó.
Notification có4API own account; ADMIN không đọc người khác, trả404. Mark-read idempotent; page0/size20/max100,isRead/type,sort createdAt DESC/notificationId DESC,90ngày. Receipts đã duyệt; mọi recipients cùng transaction;retry5/30/120s,DLT7ngày.3event User theo TXT có contract áp dụng ở v2.1 §9/§14.
Chat mở sau OFFER_ACCEPTED, không listing_id; badge Chat độc lập. Payment Contract/cọc5% mô phỏng, REST chốt1 Listing, không sửa trading_db. Farming cropType/GPS/kg/m², chọn cropSeasonId/backfill theo v2.1 §7; User/reputation và media theo §9–12/§17–19 đều có hiệu lực.
CONTRACT CHUNG MVP v2.1 — baseline triển khai của BA - SOA
Ngày: 07/10/2026. Phạm vi: User, Farming, Trading, Chat, Payment (gồm Contract/Deposit/Dispute), Notification và API Gateway.
1. Hiệu lực và cách sử dụng
BASELINE v2.1: người dùng đã giao quyền chọn phương án phù hợp MVP và thực hiện trực tiếp. Các quyết định D01–D07, gói kỹ thuật v2 và các mục bổ sung 17–19 dưới đây có hiệu lực trong tài liệu; không còn chờ duyệt. Đây là yêu cầu để triển khai, không phải xác nhận mã nguồn đã triển khai hoặc đã kiểm thử.
Ưu tiên: quyết định người dùng mới nhất → Conflict đã chốt → Contract v2.1 → rule → service spec. Giữ các quyết định 1–16 và TXT đã thống nhất; các khoảng trống được đóng bằng baseline này. Khi sửa giao tiếp phải đồng bộ producer, consumer, Gateway, DTO, schema, flow và test. Giữ 7 tab hiện có và công nghệ backend từng service; không đổi Farming Node.js/Express sang Spring.
2. Ownership và phạm vi đã chốt
Owner: User • Sở hữu và quyết định: Account, role/status, OTP/refresh, public/private profile, reputation và lịch sử điểm • Không được làm: Đọc payment_db hoặc tự kết luận vi phạm Contract
Owner: Farming • Sở hữu và quyết định: Plot, Crop Season, Farming Log, Cost; giống/GPS/sản lượng • Không được làm: Đọc user_db/trading_db
Owner: Trading • Sở hữu và quyết định: Listing, Offer, chốt độc quyền một giao dịch/Listing, hai User replica • Không được làm: Ghi DB Payment hoặc tính điểm uy tín
Owner: Chat • Sở hữu và quyết định: Conversation/Message, trạng thái đọc/badge; card tham chiếu Contract • Không được làm: Tự sửa Contract/cọc hoặc dùng badge Notification thay badge Chat
Owner: Payment • Sở hữu và quyết định: Module Contract, Deposit, Dispute; kết luận xử lý qua Admin; cọc mô phỏng • Không được làm: Ghi trading_db/user_db; tự coi tiền mua lúa ngoài app đã thanh toán
Owner: Notification • Sở hữu và quyết định: Notification, receipt dedup, template, REST current account • Không được làm: Tính reputation hoặc suy người nhận khi producer thiếu recipientIds
Owner: Gateway • Sở hữu và quyết định: Route, verify JWT, kiểm access-state ở biên • Không được làm: Public internal endpoint, tin header identity/service-key do client gửi
Contract dùng payment_db, không deployment/database/port riêng. Mỗi owner tự tạo UUID và chỉ ghi database của mình. FK chỉ nội bộ một database. Liên service dùng REST hoặc Kafka theo contract.
3. Quy ước dữ liệu và HTTP
UUID String xuyên API/event; accountId=farmerId hoặc traderId của profile tương ứng. JSON camelCase, DB snake_case; UTC ISO8601; DB TIMESTAMPTZ. Tiền là decimal string, ví dụ "4600000.00", currency VND; không float. Đơn vị Farming: sản lượng kg, diện tích m², GPS decimal degrees.
Quyết định kỹ thuật v2.1: tiền VND làm tròn đến đồng bằng HALF_UP tại lúc tạo nghĩa vụ cọc; API vẫn biểu diễn hai chữ số thập phân .00. Cọc đã accept giữ snapshot, không tính lại từ Contract bị sửa sau đó. Chính sách làm tròn áp dụng thống nhất cho Contract mới; không tính lại snapshot đã accept.
Success trả DTO, 204 không body. Error: {timestamp,status,code,message,path,traceId?}. Không stack trace/SQL/secret.
HTTP: 400 • Code chung: VALIDATION_ERROR • Ý nghĩa: Sai input, enum, UUID, pagination
HTTP: 401 • Code chung: UNAUTHORIZED / INVALID_CREDENTIALS / INVALID_REFRESH_TOKEN • Ý nghĩa: Thiếu/sai/hết hạn credential
HTTP: 403 • Code chung: FORBIDDEN / ACCOUNT_NOT_ACTIVE • Ý nghĩa: Sai quyền hoặc account không ACTIVE
HTTP: 404 • Code chung: NOT_FOUND / ACCOUNT_NOT_FOUND • Ý nghĩa: Không có resource; Notification người khác cũng 404
HTTP: 409 • Code chung: INVALID_STATE_TRANSITION / IDEMPOTENCY_CONFLICT • Ý nghĩa: Sai state hoặc cùng idempotency key nhưng khác request
HTTP: 413 • Code chung: PAYLOAD_TOO_LARGE • Ý nghĩa: Ảnh vượt 5 MiB
HTTP: 429 • Code chung: RATE_LIMITED • Ý nghĩa: Vượt giới hạn, có Retry-After
HTTP: 503 • Code chung: ACCESS_STATE_UNAVAILABLE / DEPENDENCY_UNAVAILABLE • Ý nghĩa: Chưa xác định được dependency; không tiếp tục nghiệp vụ
HTTP: 500 • Code chung: INTERNAL_SERVER_ERROR • Ý nghĩa: Lỗi không mong đợi
Danh sách page-based: page=0, size=20, max100; {items,page,size,totalElements,totalPages}. Giữ filter nghiệp vụ hiện có. Sort mặc định createdAt DESC,id DESC; feed Trading giữ khoảng cách GPS tăng dần rồi listingId làm tie-breaker. Chat/Payment giữ cursor, limit20/max100, mới nhất trước/ID tie-breaker; không biến cursor thành offset. Chat conversation dùng updatedAt/conversationId, messages dùng createdAt/messageId; Payment deposits dùng createdAt/paymentTrackingId. Cursor opaque gồm cặp sort key, không mang quyền truy cập.
4. Security và User API đã chốt
RS256, access token15phút; iss=urn:soa:user-service, aud=soa-api; claims sub UUID,role,iat,exp,jti. Chỉ User giữ private key. Gateway/backend dùng public key, validate signature/exp/iss/aud; giữ Bearer gốc và kiểm ownership. Client header x-user-id/x-user-role không có thẩm quyền.
GET /internal/v1/accounts/{accountId}/access-state: User đọc primary DB, không cache ACTIVE, Cache-Control:no-store. Response200 {accountId,status,role,accessAllowed}. Gateway/backend dùng accountId từ sub đã verify. Timeout tổng1giây hoặc User không truy cập được → protected request503 ACCESS_STATE_UNAVAILABLE. LOCKED/INACTIVE/UNVERIFIED →403. Không lấy Kafka propagation làm cơ chế khóa tức thời.
Internal xác thực X-Service-Key riêng từng caller, allowlist endpoint và private network/HTTPS deployment. Không route /internal/ public, không tạo role SERVICE trong accounts. Chat kiểm trạng thái trước SEND/SUBSCRIBE và push riêng tư; hết hạn token phải xác thực lại.
OTP6 số/10phút/5 lần sai; resend60s, tối đa5 mã/giờ/email. SMTP thuộc User; OTP không qua Kafka Notification. Refresh opaque7ngày, DB hash, rotate trong transaction. Login/refresh trả TokenPair JSON gồm refreshToken; refresh/logout nhận {refreshToken}; logout kiểm token thuộc account đang đăng nhập. Client giữ cả hai token trong bộ nhớ theo §17; không dùng cookie/localStorage/sessionStorage cho token ở MVP.
Admin seed phải OTP email trước ACTIVE; chưa có API tạo thêm ADMIN. Public register chỉ FARMER/TRADER. Profile công khai chỉ Bearer ACTIVE, target FARMER/TRADER ACTIVE; whitelist {accountId,displayName,avatarUrl,province,district,joinedAt}. Không public contacts, reputation, rating hoặc badge khi chưa duyệt mở rộng whitelist. Admin PATCH profile không nhận role/email/password; cấm tự khóa/xóa mình hoặc Admin ACTIVE cuối cùng. Audit quản trị dùng log bảo mật, không tự thêm bảng audit Admin.
5. Luồng giao dịch và state đã chốt
1. Farmer tạo Listing từ snapshot Farming. Trader tạo Offer PENDING; depositAmount=0.
2. OFFER_CREATED thông báo Farmer. Farmer có thể accept nhiều Offer, mỗi OFFER_ACCEPTED tạo một conversation idempotent theo offerId và thông báo Trader.
3. Trader tạo Contract trong Payment; Farmer accept → PENDING_DEPOSIT và tạo một payment_tracking PENDING. Accept không khóa Listing.
4. Trader nạp cọc mô phỏng5% Contract. Payment phối hợp Trading chốt độc quyền một giao dịch/Listing; không dùng Kafka eventual delivery làm cơ chế chống hai Trader cùng thắng.
5. Trading LOCKED; Payment Contract ACTIVE/cọc LOCKED sau khi kết quả chốt và lưu bền vững thành công. Payment phát event đúng contract; Offer.depositAmount cập nhật từ kết quả Payment đã xác nhận.
6. Trader xác nhận hoàn tất → Contract COMPLETED; Trading SOLD. Mốc deliveryDate+24h chỉ mở quyền rút, không tự COMPLETED hoặc cộng điểm.
7. Farmer rút khi đủ điều kiện và không có tranh chấp hợp lệ OPEN/UNDER_REVIEW. Mở tranh chấp/job24h/release phải kiểm soát đồng thời trên cùng tracking.
Contract: CREATED→PENDING_DEPOSIT→ACTIVE→COMPLETED; CANCELLED theo quyết định xử lý hợp lệ. Deposit: PENDING→LOCKED→RELEASABLE→RELEASED; FORFEITED/REFUNDED khi xử lý vi phạm. Listing: OPEN→LOCKED→SOLD; không tự LOCKED→OPEN. Offer/phòng khác giữ lịch sử, không tự REJECT/xóa tất cả; không cho chốt giao dịch thứ hai. Admin chỉ settlement FORFEITED/REFUNDED từ LOCKED hoặc RELEASABLE; tài khoản bị khóa không làm mất quyền lợi. Terminal deposit không bị chi lại.
6. Quyết định kỹ thuật v2.1 — ID và REST chốt độc quyền
ID thống nhất: depositId = paymentId = paymentTrackingId = payment_tracking.payment_tracking_id trong MVP vì chỉ có một tracking/cọc cho mỗi Contract, chưa có entity giao dịch gateway riêng. Đây là các alias DTO của cùng UUID, không tạo ba bản ghi/ID. ContractId là ID khác. API cọc hiện nhận {contractId} vẫn giữ tên/path đó, không đổi nghĩa âm thầm.
Payment chỉ gọi Trading bằng service key riêng; Trading derive listingId từ offerId, kiểm Offer ACCEPTED, đúng participant và Contract. Không nhận listingId do client khai làm nguồn sự thật.
API thống nhất: POST /internal/v1/offers/{offerId}/deposit-commit • Request: {contractId,paymentTrackingId,depositAmount,currency}; Idempotency-Key=paymentTrackingId • Response và idempotency: 200 {offerId,listingId,contractId,paymentTrackingId,listingStatus:"LOCKED"}; cùng key/body trả kết quả đã ghi; key khác đã thắng Listing→409 LISTING_ALREADY_COMMITTED
API thống nhất: GET /internal/v1/offers/{offerId}/deposit-commit • Request: Query contractId,paymentTrackingId • Response và idempotency: 200 kết quả chốt;404 chưa có;403 caller không được phép
Recovery: Payment tạo tracking cùng ý định nạp bền vững trước REST; một attempt dùng cùng trackingId. Trading khóa row Listing và lưu winningContractId/winningPaymentTrackingId trong cùng transaction LOCKED. Nếu response mất hoặc Payment crash sau Trading commit, recovery đọc kết quả và hoàn tất tracking/Contract; retry không tạo attempt mới. Chưa biết kết quả trả503, không trả nạp thành công và không tự thả Listing cho người khác. Nếu Trading trả409 đã có winner khác, tracking vẫn PENDING và không ghi paidAt/DEPOSIT_PAID. Không có API thả claim trong MVP; recovery luôn hoàn tất cùng tracking đã thắng. Khi dependency lỗi, giữ trạng thái đang đối soát và retry cùng key; không cho một giao dịch thứ hai thắng.
Trading consume DEPOSIT_PAID để cập nhật depositAmount nhưng không dùng event này để tranh quyền thắng. Trading consume CONTRACT_STATUS_CHANGED, chỉ COMPLETED của winningContractId mới chuyển SOLD; event muộn/version cũ không rollback state.
7. Quyết định kỹ thuật v2.1 — Farming snapshot
Giữ GET /api/v1/plots/{plotId}/summary, không /api/farming/crops/{id}/profile. Thêm query cropSeasonId để caller chọn rõ mùa vụ; Farming kiểm cropSeason.plotId khớp Plot. Trading dùng service key và identity Farmer đã verify; Farming trả farmerId để Trading kiểm owner trước tạo Listing.
Response200:
{"plotId":"UUID","farmerId":"UUID","area":2500.5,"latitude":10.123,"longitude":106.456,"currentSeason":{"cropSeasonId":"UUID","cropType":"ST25","expectedYield":1500}}
crop_seasons.crop_type VARCHAR(100), required khi tạo mùa vụ mới; Plot latitude[-90,90],longitude[-180,180]. Dùng NUMERIC(9,6) cho GPS; expectedYield kg,area m². Trading map cropType→seedType,expectedYield→estimated_yield,latitude/longitude→plot_lat/plot_lng và giữ snapshot.
Backfill: thêm cột nullable cho dữ liệu cũ, yêu cầu Farmer/owner bổ sung từ dữ liệu thực; không tự gán ST25 hoặc tọa độ0,0. Chặn tạo Listing từ snapshot thiếu cropType/GPS/expectedYield bằng409 SNAPSHOT_INCOMPLETE. Sau khi backfill và kiểm dữ liệu mới, mới siết constraint phù hợp. GET snapshot không tự chọn mùa vụ mới nhất khi caller thiếu cropSeasonId.
Trading tạo Listing: POST /api/v1/listings, FARMER ACTIVE; request {plotId,cropSeasonId,expectedPrice} với UUID và expectedPrice là decimal string VND dương. farmerId lấy từ sub, không nhận snapshot/owner do client tự khai. Trading gọi Farming summary với cropSeasonId, kiểm farmerId và giữ crop_season_id/seed_type/estimated_yield/area/GPS snapshot theo field mapping hiện có. Response201 {listingId,farmerId,plotId,cropSeasonId,seedType,estimatedYield,area,latitude,longitude,expectedPrice,status:"OPEN"}; 400 validation,403 owner/role,409 SNAPSHOT_INCOMPLETE,503 dependency. Listing schema bổ sung crop_season_id logical ref; không FK cross-service.
7.1. PATCH, visibility và phạm vi Farming
PATCH /api/v1/logs/{logId}: body là tập con không rỗng của {workType,workDate,description,quantity,unit}. PATCH /api/v1/costs/{costId}: tập con không rỗng của {category,amount,incurredDate,description}. Field vắng giữ nguyên; description được null để xóa, các field khác gửi null trả 400. Reject field ngoài allowlist, gồm farmerId/plotId/cropSeasonId/ID/status/isVisible. Giữ enum/domain của create DTO, không tự thêm loại hoạt động/chi phí. Response 200 là DTO đầy đủ giống create, thêm isVisible; amount là decimal string. Quyền FARMER ACTIVE và owner; không có 404, không đúng owner 403, validation 400, account-state lỗi 503. Hai endpoint PUT Log/Cost được thay bằng PATCH; PUT Plot/Crop Season giữ nguyên.
plots/farming_logs/costs có is_visible BOOLEAN NOT NULL DEFAULT true; API isVisible. PATCH /visibility {isVisible:boolean} idempotent trả 200 {id tương ứng,isVisible}. Không physical-delete/cascade; danh sách và report thông thường chỉ lấy dữ liệu visible, owner GET detail vẫn đọc được dữ liệu đã ẩn. Ẩn Plot không sửa snapshot Listing/Contract cũ; không tạo snapshot mới từ Plot ẩn. Không thêm filter nghiệp vụ mới. Danh sách có page=0,size=20,max100, createdAt DESC rồi ID DESC; feed Trading riêng theo khoảng cách GPS.
CROP_SEASON_COMPLETED/FARMING_LOG_CREATED/COST_CREATED không phát Kafka trong MVP vì chưa có consumer nghiệp vụ; các bản payload cũ chỉ là lịch sử ngoài phạm vi triển khai. Farming phục vụ Trading bằng REST snapshot; không có API User→Farming mới. Không bắt buộc Farming chạy Kafka producer/outbox khi không phát event.
8. Kafka envelope chung
Envelope đã duyệt: {eventId,eventType,eventVersion:1,sourceService,occurredAt,actorId?,recipientIds,referenceType,referenceId,correlationId?,data}. eventId/referenceId/accountIds là UUID String. occurredAt UTC. actorId null cho system; correlationId phục vụ trace, không authorize/dedup.
Event Notification phải có ít nhất một recipientId; producer xác định người nhận, consumer loại trùng, không query DB producer để đoán. Event nghiệp vụ riêng User/Trading không vào subscription Notification. Payload không chứa password,OTP,token,contact riêng tư hoặc message body.
Event: OFFER_CREATED • Producer / topic / key: trading-service / soa.trading.offer.v1 / offerId • Consumers: Notification • data tối thiểu / reference / recipients: offerId,listingId,farmerId,traderId; OFFER/offerId; Farmer
Event: OFFER_ACCEPTED • Producer / topic / key: trading-service / soa.trading.offer.v1 / offerId • Consumers: Chat,Notification • data tối thiểu / reference / recipients: cùng DTO Offer; OFFER/offerId; Trader
Event: MESSAGE_CREATED • Producer / topic / key: chat-service / soa.chat.message.v1 / conversationId • Consumers: Notification • data tối thiểu / reference / recipients: messageId,conversationId,senderId,recipientId; CONVERSATION/conversationId; không sender
Event: CONTRACT_CREATED • Producer / topic / key: payment-service / soa.contract.lifecycle.v1 / contractId • Consumers: Chat,Notification • data tối thiểu / reference / recipients: contractId,offerId,farmerId,traderId,status; CONTRACT/contractId; cả hai
Event: CONTRACT_STATUS_CHANGED • Producer / topic / key: payment-service / soa.contract.lifecycle.v1 / contractId • Consumers: Chat,Notification; Trading COMPLETED theo baseline v2.1 • data tối thiểu / reference / recipients: contractId,farmerId,traderId,previousStatus,status,stateVersion; CONTRACT/contractId; cả hai
Event: DEPOSIT_PAID • Producer / topic / key: payment-service / soa.payment.deposit.v1 / depositId • Consumers: Trading,Notification • data tối thiểu / reference / recipients: depositId,paymentId,contractId,farmerId,traderId,amount,currency; DEPOSIT/depositId; cả hai
Event: DEPOSIT_STATUS_CHANGED • Producer / topic / key: payment-service / soa.payment.deposit.v1 / depositId • Consumers: Notification • data tối thiểu / reference / recipients: depositId,contractId,farmerId,traderId,previousStatus,status,stateVersion; DEPOSIT/depositId; cả hai
DEPOSIT_PAID chỉ sau cọc mô phỏng/chốt/lưu thành công. Notification không tạo thêm thông báo từ DEPOSIT_STATUS_CHANGED chuyển LOCKED. Contract ACTIVE có thể có thông báo Contract riêng, nhưng nội dung không lặp “đã nạp cọc” lần nữa. Đổi điều khoản không đổi status không được giả thành CONTRACT_STATUS_CHANGED; MVP client refresh Contract qua GET, chưa thêm TERMS_UPDATED event.
9. Quyết định kỹ thuật v2.1 — User replica và reputation events
Giữ hai bảng farmer_replicas/trader_replicas. Public profile event thêm version phục vụ chống out-of-order; đây là metadata kỹ thuật, không mở rộng whitelist dữ liệu cá nhân.
Event: USER_PROFILE_UPDATED (tên đã có trong spec) • Topic / key: soa.user.profile.v1 / accountId • Consumer: Trading • Payload: {accountId,role,profileVersion,publicVisible,profile:{displayName,avatarUrl,province,district,joinedAt}}
Event: CONTRACT_REPUTATION_DECIDED (tên cụ thể hóa luồng TXT) • Topic / key: soa.payment.reputation-decision.v1 / accountId • Consumer: User • Payload: {decisionId,decisionVersion,originalDecisionId?,contractId,accountId,counterpartyId,action,violationCode?,requestedDelta,reasonCode,effectiveAt}
Event: REPUTATION_CHANGED (TXT đã nêu) • Topic / key: soa.user.reputation.v1 / accountId • Consumer: Notification • Payload: {accountId,contractId,decisionId,action,delta,beforeScore,afterScore,reasonCode}
Event: ACCOUNT_LOCKED (TXT đã nêu) • Topic / key: soa.user.account.v1 / accountId • Consumer: Notification • Payload: {accountId,reasonCode,accountVersion}
Event: ACCOUNT_UNLOCKED (TXT đã nêu) • Topic / key: soa.user.account.v1 / accountId • Consumer: Notification • Payload: {accountId,reasonCode,accountVersion}
Profile event khi ACTIVE/public profile đổi; khi profile không còn được hiển thị, phát publicVisible=false,profile=null, không tiết lộ lý do khóa/trạng thái riêng tư. Trading ẩn replica và giữ version; event muộn không phục hồi dữ liệu đã ẩn. Bootstrap bằng job User phát lại snapshot hiện hành, không cho Trading đọc user_db. Token/access-state vẫn quyết định quyền tức thời.
Decision action PENALTY,REVERSAL,COMPLETION_REWARD. Payment xác nhận quyết định; User tự validate mã/mức điểm, kiểm dedup, clamp điểm0–10, lưu actual delta. REVERSAL tham chiếu quyết định gốc; một quyết định đảo chỉ được áp dụng một lần. Không nhận delta từ client hoặc Notification. Thay quyết định phải tạo version và liên kết gốc; không sửa lịch sử đã áp dụng.
REPUTATION_CHANGED dùng referenceType ACCOUNT/referenceId accountId, recipient=[accountId]. ACCOUNT_LOCKED/UNLOCKED tương tự. Group Trading profile: trading-user-profile-v1; User decision:user-reputation-decision-v1; Notification:notification-service-v1; Chat offer:chat-offer-accepted-v1; Chat Contract:chat-contract-v1. Mỗi nghiệp vụ consumer dùng group riêng.
10. Quyết định kỹ thuật v2.1 — schema tối thiểu và reliability
User: accounts.reputation_score NUMERIC(3,1), check0..10 và bước0,5 cho FARMER/TRADER, ADMIN null; account_version/profile_version BIGINT; phân biệt admin_lock và reputation_lock, không để mở khóa một nguyên nhân xóa nguyên nhân khác. reputation_history lưu history_id,account_id,counterparty_id,contract_id,decision_id,decision_version,original_decision_id,action,requested_delta,actual_delta,before_score,after_score,reason_code,created_at. Phạt/reversal unique(decision_id,account_id,action); thưởng unique(contract_id,account_id,COMPLETION_REWARD). Các khóa account/history chỉ nội bộ user_db.
Payment: contracts/payment_tracking giữ schema hiện có; thêm version và trạng thái giữ cọc dispute_hold độc lập deposit status. Bổ sung disputes,dispute_evidence,dispute_decisions để lưu hồ sơ, bằng chứng và quyết định bất biến. Một Contract chỉ có một tranh chấp đang mở tại một thời điểm; bổ sung bằng chứng vào hồ sơ đó. Deposit/Contract không trở thành account status.
Trading: winner contract/tracking trên Listing để bảo vệ độc quyền; replica có profile_version/public_visible. Notification: notification_receipts đã duyệt, PK(event_id,recipient_id),processed_at,payload_hash; không tự xóa.
Outbox: mỗi DB producer cần lưu event cùng transaction business, relay publish rồi đánh dấu; giữ eventId/payload khi retry. Chat dùng transactional outbox với MongoDB replica set (dev một node). PostgreSQL producer lưu outbox cùng transaction nghiệp vụ. Migration/collection này thuộc baseline cần triển khai; không dùng publish-after-save thay thế outbox.
User khóa row account, kiểm business key, ghi history/cập nhật score/lock/thu hồi refresh cùng transaction; commit trước ACK. Consumer không chỉ dedup eventId: business key bảo vệ cả khi producer tạo nhầm eventId mới. REVERSAL lấy dấu ngược actual_delta của bản ghi gốc, clamp 0–10 và lưu actual_delta mới; áp dụng cho cả hủy phạt và thu hồi thưởng sai. Không nhận số điểm đảo do client khai. Unique(original_decision_id,account_id,REVERSAL) ngăn hai decision mới cùng đảo một quyết định gốc. Thiếu bản ghi gốc thì retry/DLT để xử lý thứ tự, không ACK rồi bỏ qua.
Notification retry5/30/120s sau lần đầu; T.notification-retry-1/2/3 và T.notification-dlt, retention7ngày. Forward thành công mới commit offset; lỗi forward không drop record. Nội dung90ngày, receipts không tự xóa. Hash canonical envelope loại retry headers; same eventId khác payload→DLT EVENT_ID_REUSED. DLT replay có kiểm soát, không log-and-discard.
11. Tranh chấp và quyền Admin — nội dung đã chốt từ TXT
Participant gửi lý do/mô tả/bằng chứng; Payment mở OPEN và giữ cọc. Admin chuyển UNDER_REVIEW, xem hồ sơ/Contract/cọc/bằng chứng, lấy phản hồi bên còn lại. Chỉ quyết định có bằng chứng mới làm phát sinh phạt. Không tự phạt bên im lặng hoặc quên bấm complete. Một hành vi một mức phạt chính; giả bằng chứng độc lập có thể xử lý riêng.
OPEN/UNDER_REVIEW chặn mở quyền rút và release kể cả đã qua+24h hoặc trước đó RELEASABLE. Mở hồ sơ/job24h/complete/release cùng khóa row tracking và kiểm hold ngay trước commit. Account bị khóa không tự mất cọc/hủy Contract khác. Admin thực hiện quyết định xử lý qua quyền riêng, không giả danh participant gọi API release.
12. Quyết định nghiệp vụ D01–D07 có hiệu lực
ID: D01 • Quyết định áp dụng: Phản hồi trong 48 giờ từ lúc Payment chuyển UNDER_REVIEW và ghi responseDueAt; xét thưởng sau 72 giờ từ completedAt. Hồ sơ mở trong hạn giữ thưởng đến khi giải quyết; im lặng không tự nhận thua. • Ảnh hưởng: Payment,User
ID: D02 • Quyết định áp dụng: F04 trừ2 khi vi phạm nhưng có thể khắc phục và cuối cùng hoàn tất; trừ3 khi không khắc phục và dẫn đến hủy do Farmer. Không cộng thêm F06 cho cùng hành vi. • Ảnh hưởng: Decision validation,User
ID: D03 • Quyết định áp dụng: Contract mới dùng penaltyRate=20 (% depositAmount), phải hiển thị và được hai bên accept; không tự áp 30%. Contract cũ giữ điều khoản đã accept, thiếu điều khoản thì không áp hồi tố. penaltyAmount=depositAmount×20/100 cho Farmer có lỗi dẫn đến hủy; ví dụ cọc 4.600.000 thì phạt mô phỏng 920.000. Làm tròn như §3 và chỉ ghi nghĩa vụ mô phỏng, không tự thu hoặc cấn thêm ngoài cọc 5%. • Ảnh hưởng: Payment
ID: D04 • Quyết định áp dụng: FORFEITED/REFUNDED biểu thị kết quả xử lý và chi trả mô phỏng hoàn tất trong cùng transaction quyết định; mỗi tracking tối đa một settlement. Không gọi release lần nữa. Settlement do Admin qua API riêng, có audit actor/decisionId, áp dụng cả account bị khóa. • Ảnh hưởng: Payment
ID: D05 • Quyết định áp dụng: Cọc đã RELEASED vẫn nhận hồ sơ khiếu nại muộn để Admin xem bằng chứng/uy tín; không đảo trạng thái cọc hoặc ghi chi trả lần hai. Nghĩa vụ bù lưu mô phỏng trong quyết định, không tự thu tiền. • Ảnh hưởng: Payment,User
ID: D06 • Quyết định áp dụng: User gửi email thông báo LOCKED/UNLOCKED cho email đã xác minh; Notification vẫn lưu lịch sử, REST vẫn chỉ ACTIVE. Email lỗi không rollback việc khóa; retry theo outbox, không gửi OTP qua Notification. • Ảnh hưởng: User,Notification
ID: D07 • Quyết định áp dụng: Admin được xác nhận hoàn tất thay khi Trader không thao tác nhưng có đủ bằng chứng và đã giải quyết tranh chấp; có reason/evidence/actor. Không dùng mốc+24h hoặc RELEASED làm bằng chứng hoàn tất. • Ảnh hưởng: Payment,Trading,User
Các mức khác giữ TXT: Farmer F01−1,F02−2,F03−2,F05−2,F06−3,F07−3,F08−5; Trader T01−1,T02−2,T03−2,T04−3,T05−3,T06−3,T07−5,T08−2. Chỉ áp dụng nghĩa vụ có trong Contract và lỗi đã xác nhận. Không phạt bất khả kháng được chấp nhận, lỗi ứng dụng/timeout, đồng thuận hủy/sửa, chưa có nghĩa vụ ACTIVE hoặc Trader không thắng Listing.
Thưởng+0,5 mỗi account/Contract hoàn tất không vi phạm sau 72 giờ từ completedAt và đã giải quyết hết tranh chấp; tối đa10 và1 điểm/cặp Farmer–Trader/30 ngày theo TXT. Không thưởng vì rút sau+24h, Admin mở khóa hoặc Contract hủy. Quyết định sai bị hủy hoàn đúng actual delta. Điểm0→User LOCKED và thu hồi refresh. Mở khóa chỉ khi score>0 và không còn nguyên nhân khóa khác; không reset điểm1/10.
12.1. Quy trình đóng hồ sơ, thưởng và khiếu nại muộn
Dispute: OPEN → UNDER_REVIEW → RESOLVED. Payment lưu createdAt,responseDueAt,resolvedAt,outcome,decisionVersion; decision/evidence không sửa xóa lịch sử. Quá 48 giờ không tự kết luận có lỗi; Admin quyết định bằng bằng chứng, hoặc NO_VIOLATION/INSUFFICIENT_EVIDENCE để đóng hồ sơ và bỏ hold. Không dùng INSUFFICIENT_EVIDENCE để phạt hoặc chi cọc ngay; việc rút sau đó vẫn phải đủ điều kiện thông thường. Chỉ đặt hold khi tracking còn LOCKED/RELEASABLE; sau RELEASED/FORFEITED/REFUNDED, nhận hồ sơ nhưng depositHold=false.
Decision depositDisposition được kiểm dưới khóa tracking: NO_VIOLATION/INSUFFICIENT_EVIDENCE → NONE, bỏ hold, không phạt; FARMER_VIOLATION dẫn đến CANCELLED → REFUND_TO_TRADER; TRADER_VIOLATION dẫn đến CANCELLED → FORFEIT_TO_FARMER; vi phạm đã khắc phục, Contract tiếp tục → NONE, chỉ phạt điểm theo mã. MUTUAL_CANCEL chỉ khi có bằng chứng cả hai đồng ý → REFUND_TO_TRADER nếu còn cọc, không phạt. Với hồ sơ sau khi tiền đã chi, disposition bắt buộc NONE dù xác nhận vi phạm; không đổi COMPLETED về CANCELLED và không đảo terminal deposit. NONE không thay đổi trạng thái tiền đã chi. KEEP_HELD chỉ là thao tác review, không phải kết quả RESOLVED. RELEASE_TO_FARMER chỉ trong thao tác hoàn tất/settlement đủ điều kiện, không tự gán vào kết luận thiếu bằng chứng.
Payment job xét thưởng từ completedAt+72h, mỗi Contract/account chỉ phát một COMPLETION_REWARD; chỉ Contract không có vi phạm đã xác nhận và không còn hồ sơ mở. User dùng counterpartyId để kiểm tổng thưởng dương của account với cùng đối tác trong 30 ngày trượt ≤1 điểm, khóa row account trước tính và ghi; một Contract nhận tối đa +0,5, điểm không quá 10. Nếu không được thưởng vì cap thì ghi quyết định đã xử lý với actualDelta=0, không cộng lại về sau. Khi khiếu nại muộn xác nhận Contract có vi phạm, Payment phát REVERSAL cho các thưởng đã cấp của Contract, rồi PENALTY cho bên có lỗi; không thu hồi hai lần. Thu hồi thưởng sai không phải hình phạt thứ hai cho cùng hành vi.
Contract COMPLETED chỉ khi đã xác nhận hoàn tất; +24h/RELEASED không thay thế completedAt. Mốc 72h để xét thưởng không gia hạn giữ cọc nếu điều kiện rút đã đủ. Khiếu nại muộn được tiếp nhận trong MVP, không tự đảo cọc đã chi. Payment API trả responseDueAt/status/decision để hai bên theo dõi; chưa thêm Kafka event Notification riêng cho từng bước dispute. Frontend tải lại hồ sơ khi mở trang và mỗi 30 giây khi trang đang hiển thị.
13. Quyết định kỹ thuật v2.1 — API tranh chấp/Admin
Các API sau là contract bắt buộc triển khai của Payment theo D01–D07. Không coi tài liệu là bằng chứng endpoint đã được code.
Method / endpoint: POST /api/v1/payments/contracts/{contractId}/disputes • Caller: Participant ACTIVE • DTO và kết quả: {reasonCode,description,evidenceRefs[]}→201 {disputeId,contractId,status:"OPEN",depositHold:true}; depositHold=false nếu cọc đã chi; mở trùng đang hoạt động→409
Method / endpoint: GET /api/v1/payments/disputes/{disputeId} • Caller: Participant ACTIVE hoặc ADMIN ACTIVE • DTO và kết quả: 200 hồ sơ theo quyền; không người ngoài
Method / endpoint: POST /api/v1/payments/disputes/{disputeId}/responses • Caller: Participant ACTIVE • DTO và kết quả: {statement,evidenceRefs[]}→201 response; evidence là tham chiếu tới cơ chế lưu được duyệt, không tự thêm media service
Method / endpoint: GET /api/v1/payments/admin/disputes • Caller: ADMIN ACTIVE • DTO và kết quả: cursor/limit/status filter, limit20/max100, createdAt DESC/disputeId DESC→200 {items,nextCursor}
Method / endpoint: POST /api/v1/payments/admin/disputes/{disputeId}/review • Caller: ADMIN ACTIVE • DTO và kết quả: {note}→200 UNDER_REVIEW; lặp idempotent
Method / endpoint: POST /api/v1/payments/admin/disputes/{disputeId}/decisions • Caller: ADMIN ACTIVE • DTO và kết quả: {decisionId,expectedVersion,outcome,liableAccountId?,violationCode?,penaltyPoints?,depositDisposition,reason,evidenceRefs[]}→200 quyết định; Idempotency-Key=decisionId
Method / endpoint: POST /api/v1/payments/admin/decisions/{decisionId}/reversal • Caller: ADMIN ACTIVE • DTO và kết quả: {reversalDecisionId,reason,evidenceRefs[]}→200 liên kết gốc; không sửa lịch sử, không tự đảo cọc đã chi
Method / endpoint: POST /api/v1/payments/admin/contracts/{contractId}/complete • Caller: ADMIN ACTIVE, theo D07 • DTO và kết quả: {reason,evidenceRefs[],expectedVersion}→200 Contract COMPLETED nếu đủ điều kiện; audit actor
Outcome NO_VIOLATION,FARMER_VIOLATION,TRADER_VIOLATION,MUTUAL_CANCEL,INSUFFICIENT_EVIDENCE. depositDisposition KEEP_HELD,RELEASE_TO_FARMER,FORFEIT_TO_FARMER,REFUND_TO_TRADER,NONE. Không phải mọi tổ hợp outcome/disposition đều hợp lệ: chỉ theo quyết định có bằng chứng và state của tracking; thiếu bằng chứng thì không penalty/settlement. Việc hủy đồng thuận và hoàn cọc cần điều khoản/decision rõ ràng, không suy ngầm.
Admin không liên quan vẫn không có quyền đọc mọi tin Chat. API dispute chỉ cho đọc bằng chứng đã nộp trong hồ sơ. Admin không xử lý hồ sơ của chính mình hoặc có xung đột lợi ích; xử lý/xem xét lại bởi Admin độc lập theo §19. Evidence có kiểm quyền riêng theo §18.
14. Notification và client đã chốt
4 API: GET /api/v1/notifications; GET /api/v1/notifications/{notificationId}; PATCH /api/v1/notifications/{notificationId}/read; GET /api/v1/notifications/unread-count. Own account kể cả ADMIN; resource người khác404. Không read-all trong MVP. page0/size20/max100, isRead/type, sort createdAt DESC/notificationId DESC; cutoff90ngày áp dụng list/detail/count/read, không chờ cleanup. Mark-read lặp giữ readAt.
7 template giao thương Contract v1 giữ nguyên. Bổ sung 3 template: REPUTATION_CHANGED title “Điểm uy tín đã thay đổi”, content “Điểm uy tín của bạn thay đổi từ {beforeScore} thành {afterScore}. Lý do: {reasonCode}.”; ACCOUNT_LOCKED title “Tài khoản đã bị khóa”, content “Tài khoản của bạn đã bị khóa. Vui lòng kiểm tra email để biết cách liên hệ hỗ trợ.”; ACCOUNT_UNLOCKED title “Tài khoản đã được mở khóa”, content “Tài khoản của bạn đã được mở khóa. Bạn có thể đăng nhập lại.” Không lộ bằng chứng/contacts hoặc dữ liệu bên kia. Client điều hướng ACCOUNT về hồ sơ cá nhân; link không cấp quyền. Migration type/referenceType và consumer phải hỗ trợ đủ 10 loại Notification trước tích hợp; không giữ CHECK chỉ 7 loại cũ.
Chat TEXT≤2000 ký tự,IMAGE≤5 MiB; media validator có trách nhiệm kiểm byte thực, không tin kích thước client khai. Upload/read ảnh thuộc service owner theo §18, không thêm media service độc lập.
15. Gateway, port và cấu hình
Route / port: Gateway8080 • Destination: Client entry; JWT/access-state
Route / port: /api/v1/auth/,/users/,/farmers/,/traders/,/admin/accounts/ dưới prefix /api/v1 • Destination: User8081
Route / port: /api/v1/plots/,/crop-seasons/,/logs/,/costs/ dưới prefix /api/v1 • Destination: Farming8082
Route / port: /api/v1/listings/,/api/v1/offers/ • Destination: Trading8083
Route / port: /api/v1/conversations/ và WebSocket Chat hiện có • Destination: Chat8084
Route / port: /api/v1/payments/ • Destination: Payment8085, gồm Contract/Deposit; dispute/admin và evidence theo §13/§18
Route / port: /api/v1/notifications/ • Destination: Notification8086, REST
Route / port: /internal/ • Destination: Không public; private service auth
Không rewrite/bỏ prefix /api/v1 nếu chưa có contract riêng. CORS/local origin, token storage và cấu hình deployment theo §17/§19. Keys/DB/SMTP/service secrets lấy từ env, không commit Git. Không có CONTRACT_SERVICE_URL riêng.
Route đặc biệt: Gateway từ chối public GET /api/v1/plots/{plotId}/summary trước route /api/v1/plots/; Trading gọi trực tiếp Farming bằng service key. GET Contract của participant trả thêm disputeSummary:{disputeId,status,responseDueAt,depositHold}|null để hai bên mở đúng hồ sơ; client không phải đoán disputeId. Review lần đầu gán assignedAdminId=actorId; idempotent review không ghi đè responseDueAt. Cùng endpoint review cho phép Admin độc lập nhận lại hồ sơ với note bắt buộc, kiểm expectedVersion để tránh ghi đè người đang xử lý và audit người trước/sau; không reset thời hạn. Không có endpoint handover riêng.
16. Kiểm thử chấp nhận trước tích hợp
1. Register ADMIN bị từ chối; seed Admin UNVERIFIED phải OTP; JWT RS256/iss/aud đúng; User state down→503.
2. Lock account bằng Admin hoặc score0: token cũ bị chặn sau commit ở Gateway/backend/WebSocket; refresh bị thu hồi; unlock không reset score hoặc bỏ nguyên nhân khóa khác.
3. POST Offer không mở Chat; accept nhiều Offer mở đúng một phòng/offerId; replay không trùng.
4. Hai Trader nạp cùng Listing: chỉ một winner; timeout giữa hai DB và retry vẫn một chốt/cọc/event; không báo thành công khi chưa xác định kết quả.
5. Snapshot thiếu cropType/GPS hoặc sai season/owner không tạo Listing; replica không có OTP/token/contact và event muộn không hiện lại profile đã ẩn.
6. Tranh chấp/job24h/release đua nhau: có hồ sơ giữ cọc hợp lệ thì không chi; RELEASED không đảo về LOCKED hoặc chi hai lần.
7. Reputation retry cùng/khác eventId nhưng cùng decision business key chỉ áp một lần; reward một lần/Contract/account; reversal trả actual delta, không vượt10.
8. Notification mọi recipients trong cùng transaction; crash trước offset không trùng; xóa nội dung90ngày rồi replay không tạo lại nhờ receipt; PAID không có thông báo DepositLOCKED thứhai.
9. EventContract stateVersion cũ không rollback card/Listing; schema/source/version sai→DLT; retry5/30/120 và publish-forward lỗi không mất event.
10. Admin dispute API không bỏ ownership khỏi participant API, không cho đọc tùy ý Chat; audit có actor/target/decision/time.
17. Frontend, token và CORS
Giữ repository/frontend framework hiện có; contract trình duyệt không buộc đổi framework. Frontend dev chuẩn http://localhost:5173, Gateway http://localhost:8080. Nếu port repo khác, cấu hình lại dev server về 5173 để nhóm dùng chung; đây là cấu hình chọn cho triển khai, không khẳng định repo hiện tại đã dùng port đó. Deployment dùng cùng HTTPS origin cho frontend và Gateway /api; domain thật lấy từ PUBLIC_APP_ORIGIN, không ghi domain giả vào source.
Login/refresh vẫn TokenPair JSON; refresh/logout body {refreshToken}. Access và refresh token chỉ ở bộ nhớ của phiên trang, không localStorage/sessionStorage/IndexedDB/cookie/URL. Reload/đóng tab mất token và cần đăng nhập lại; MVP không có remember-me. Hạn refresh 7 ngày vẫn là giới hạn server, không phải cam kết phiên trình duyệt tồn tại 7 ngày. Một refresh request tại một thời điểm, các request chờ dùng TokenPair mới; 401 chỉ thử refresh một lần, refresh lỗi thì xóa bộ nhớ và về login. 403 ACCOUNT_NOT_ACTIVE không retry refresh để vượt khóa. Logout gọi API khi access còn hợp lệ, xóa bộ nhớ trong finally; nếu access hết hạn nhưng refresh còn hợp lệ thì refresh trước logout. Token bị bỏ trên browser không tự được coi là đã revoke trên server.
Fetch dùng Authorization: Bearer, credentials:omit; không gửi token trong query/WebSocket URL. WebSocket xác thực ở message CONNECT theo giao thức Chat, trước mọi SUBSCRIBE/SEND và khi token hết hạn; reconnect với token mới. CORS Gateway allowlist đúng http://localhost:5173 ở dev; deploy cùng origin; allowCredentials=false, không wildcard; cho Authorization,Content-Type,Idempotency-Key,X-Request-Id và GET/POST/PUT/PATCH/DELETE/OPTIONS. OPTIONS chỉ xử lý preflight, không bỏ auth request nghiệp vụ. Backend không mở CORS public riêng; internal không qua Gateway.
18. Upload và đọc ảnh theo owner
MVP lưu file trên persistent volume riêng của User/Chat/Payment, ngoài webroot; database owner lưu metadata. Không mount volume của service khác, không đọc DB chéo; một instance ghi file mỗi owner trong bản demo. Backup DB và volume cùng nhau; container restart không mất ảnh. Khi cần nhiều replica, thay storage adapter bằng object storage sau MVP, không đổi DTO public.
Chỉ JPEG/PNG/WebP; tối đa 5 MiB (5.242.880 byte) mỗi ảnh, 20 megapixel sau decode; kiểm chữ ký/decoder và re-encode, không tin MIME/extension. Không SVG/HTML/PDF/ZIP trong upload MVP; tài liệu tranh chấp dùng mô tả văn bản hoặc ảnh chụp. UUID tên lưu trữ, không dùng filename/path client. 400 file hỏng/field sai; 413 quá dung lượng; 415 định dạng không hỗ trợ. Không fetch URL client gửi; không trả đường dẫn ổ đĩa. Download qua Gateway có Bearer, Cache-Control:private,no-store và X-Content-Type-Options:nosniff; frontend fetch blob rồi hiển thị, không đặt token trong img URL.
API: POST /api/v1/users/me/avatar • Quyền / request: Account ACTIVE; multipart file • Response: 201 {mediaId,avatarUrl,contentType,sizeBytes}; cập nhật avatar profile cùng metadata và public-profile outbox, ADMIN chỉ avatar của mình
API: GET /api/v1/users/media/{mediaId} • Quyền / request: ACTIVE, owner hoặc quyền xem public profile ACTIVE theo whitelist • Response: 200 bytes; không được xem/không tồn tại 404
API: POST /api/v1/conversations/{conversationId}/media • Quyền / request: Participant ACTIVE; multipart file • Response: 201 {mediaId,attachmentUrl,contentType,sizeBytes}; upload chưa tạo Message
API: GET /api/v1/conversations/{conversationId}/media/{mediaId} • Quyền / request: Participant ACTIVE; cùng conversation; file đã gắn message hoặc chính uploader của file tạm • Response: 200 bytes; người ngoài 404; ADMIN không có quyền đọc Chat mặc định
API: POST /api/v1/payments/disputes/{disputeId}/evidence • Quyền / request: Participant ACTIVE hoặc Admin độc lập đang xử lý; multipart file, description tùy chọn • Response: 201 {evidenceId,downloadUrl,contentType,sizeBytes}; evidence thuộc đúng dispute và uploader, bất biến
API: GET /api/v1/payments/disputes/{disputeId}/evidence/{evidenceId} • Quyền / request: Participant ACTIVE hoặc Admin độc lập có quyền hồ sơ • Response: 200 bytes; người ngoài 404
User/Chat có media_assets (Chat là collection) gồm media_id,owner_account_id,resource_id,storage_key,content_type,size_bytes,sha256,created_at,attached_at; Payment dùng dispute_evidence với các field tương ứng, không tạo media DB chung. File tạm chưa attach quá 24h được cleanup; không xóa ảnh đã gắn Message/bằng chứng cùng cleanup Notification 90 ngày. Ghi file hoàn chỉnh trước commit metadata; lỗi DB để orphan được cleanup sau 24h, không trả URL thành công khi file chưa bền vững.
Chat giữ send DTO IMAGE {messageType:"IMAGE",attachmentUrl}; attachmentUrl bắt buộc do endpoint upload Chat trả về, thuộc conversation và uploader, chưa gắn message khác. Service resolve URL về mediaId, kiểm metadata/ownership và attach cùng transaction Message/outbox. Không chấp nhận URL ngoài hoặc của participant khác. Mỗi ảnh dùng một message; lần gửi mới cần upload mới. User profile PATCH avatarUrl chỉ được dùng URL thuộc upload owner tương ứng; không cho Admin trỏ avatar của account khác vào file riêng của mình. Avatar upload đã cập nhật profile nên client không cần PATCH lại. Payment evidenceRefs là mảng evidenceId thuộc đúng hồ sơ; tạo dispute có thể gửi evidenceRefs=[] rồi upload, Admin chỉ kết luận vi phạm khi đủ bằng chứng.
Flow upload: Client Bearer → Gateway kiểm JWT/state → owner kiểm quyền resource và decode ảnh → volume owner + metadata DB owner → trả URL API có kiểm quyền → Client gửi message hoặc mở hồ sơ. File private không được phát trong Kafka payload; chỉ reference ID nghiệp vụ theo event contract.
19. Vận hành Admin và baseline tích hợp
Seed tối thiểu hai account ADMIN riêng với email thật cấu hình qua secret/env, từng người OTP trước ACTIVE; không dùng chung password/tài khoản, không thêm API create ADMIN. ADMIN không có role FARMER/TRADER trong cùng account. Admin phải từ chối xử lý khi có lợi ích liên quan hoặc đại diện một bên; API chặn actorId trùng farmerId/traderId, kiểm assignedAdminId và log actor/target/decision/reason/time. Quyết định đảo phải do Admin khác originalActorId. Không đủ Admin độc lập ACTIVE thì giữ hồ sơ/hold và báo 409 ADMIN_REVIEW_UNAVAILABLE, không tự bỏ kiểm tra quyền.
Account LOCKED không được vượt access-state để gọi API participant. Người bị khóa liên hệ địa chỉ SUPPORT_EMAIL ghi trong email khóa để nộp thông tin; đây là quy trình hỗ trợ thủ công, không tự xây hệ thống email ticket. Admin xác minh danh tính qua email đã đăng ký, ghi nguồn và bằng chứng vào hồ sơ; có thể POST /api/v1/payments/admin/contracts/{contractId}/disputes với {onBehalfOfAccountId,reasonCode,description,verificationNote}, trả 201 DTO dispute như API participant. onBehalfOfAccountId phải là một participant của Contract; Admin không giả JWT người dùng. Admin upload evidence qua §18, ghi rõ nguồn là participant nào. Log bảo mật không chứa OTP/token/toàn bộ file. cấu hình SUPPORT_EMAIL trước demo.
Git tối thiểu cho các repo: main có thể chạy; feat/<short-name>,fix/<short-name>; PR có một người khác review; không force-push main, không commit secret; giữ lịch sử và convention chi tiết đã có nếu không mâu thuẫn. Mỗi service có .env.example chỉ tên biến và giá trị mẫu không nhạy cảm. Giữ stack backend hiện có. PostgreSQL database/user riêng từng owner; Chat Mongo replica set; Kafka chung cho producer/consumer có trong §8–9. Farming không cần Kafka producer trong MVP.
Farming env: SERVER_PORT=8082,DATABASE_URL,USER_SERVICE_URL,JWT_PUBLIC_KEY_PATH,JWT_ISSUER=urn:soa:user-service,JWT_AUDIENCE=soa-api,ACCESS_STATE_TIMEOUT_MS=1000 và service key riêng cho từng caller trong secret. Compose định nghĩa farming-db và volume dữ liệu riêng; trong container dùng DNS service, không localhost cho dependency. Các service dùng port §15. User thêm SMTP_*,SUPPORT_EMAIL,JWT_PRIVATE_KEY_PATH,JWT_KEY_ID; các owner media thêm MEDIA_STORAGE_DIR/MAX_UPLOAD_BYTES; không dùng một service key chung toàn hệ thống.
User chuẩn hóa username/email trim + lowercase trước unique lookup, không thay dữ liệu lịch sử bị trùng bằng merge tự động. OTP cleanup hằng ngày xóa bản ghi đã dùng/hết hạn, không làm reset quota 5 mã/giờ/email; quota dùng timestamp phát hành tách khỏi cleanup. Login giới hạn 10 lần sai/15 phút theo cặp IP+username, vượt trả 429 với Retry-After; OTP vẫn giữ giới hạn đã chốt. Giới hạn IP không thay khóa reputation/Admin. JWT kid xác định khóa; rotate có giai đoạn overlap public key tối thiểu 16 phút (15 phút access + 60 giây clock skew), chỉ User giữ private; cấu hình public key set qua deployment, không tự thêm JWKS API. Clock skew tối đa 60 giây không nới access-state timeout 1 giây.
Trước demo phải điền domain/SMTP/email Admin/SUPPORT_EMAIL/service keys và kiểm migration/backfill bằng dữ liệu thật. Đây là cấu hình triển khai cần người giữ tài khoản cung cấp, không còn là quyết định nghiệp vụ chờ duyệt. Không cam kết hệ thống đã code/test chỉ từ việc hoàn thiện BA.
Tham chiếu triển khai bảo mật: OWASP HTML5 Security Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) về không lưu session identifier trong localStorage; OWASP File Upload Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) về allowlist file, giới hạn và lưu ngoài webroot. Các lựa chọn thời hạn/phạt/stack ở tài liệu là quyết định thiết kế của dự án, không phải khuyến nghị nghiệp vụ từ OWASP.
Change Log của Contract v2.1
- Hiệu lực, §6–10, §12–13: chuyển đề xuất thành baseline v2.1 theo chỉ đạo chọn phương án và thực hiện của người dùng. Nguồn: quyết định mới nhất + Contract v2.
- D01–D07: chốt 48h/72h, F04 −2/−3, phạt mô phỏng 20% cho Contract mới, settlement một lần, khiếu nại muộn, email khóa/mở, Admin complete có bằng chứng. Nguồn: TXT + quyết định áp dụng Contract v2.1.
- §7.1, §17–19: PATCH/visibility/backfill Farming; token bộ nhớ/CORS; media theo owner; Admin độc lập và cấu hình tích hợp. Nguồn: Contract v2.1 theo quyền người dùng giao lựa chọn.
- §9–12: thêm counterpartyId để thực thi cap thưởng; reversal chống đảo trùng và thu hồi thưởng sai; đóng hồ sơ có outcome rõ ràng. Nguồn: TXT + Contract v2.1.
Tình trạng quyết định của Contract v2.1
Không còn quyết định nghiệp vụ D01–D07 hoặc gói kỹ thuật v2 chờ duyệt trong phạm vi đã giao. Việc cung cấp domain/SMTP/seed email/secret, kiểm kê dữ liệu backfill và xác minh code hiện tại là công việc triển khai theo §19, không dùng dữ liệu giả để coi đã hoàn tất. Nghiệp vụ mới ngoài baseline phải được xử lý thành thay đổi phạm vi riêng.
Change Log
§1–3, §19, §21 và sơ đồ kiến trúc: 6 service main, Chat MVP, bổ sung Payment và REST Notification/Chat; Contract deployment có nhãn xác nhận. Nguồn: Conflict 01, 03–04, 08, 15; Contract 2, 12.
§4–9, §11–14: ownership/UUID, 5 bảng User nền và history/outbox/media bổ sung, role/status/OTP/Admin, public profile, Kafka/envelope/10 Notification event và lock tức thời đồng bộ giữa các service. Nguồn: Conflict 02, 05–07, 10–15; Contract 2–11.
§6–7, §12, §18 và ví dụ: loại fields public phone/buyingArea, endpoint Negotiation/Farming không được dùng để tự chốt; cấu hình JWT/Kafka theo nguồn ưu tiên. Nguồn: Conflict 09, 12–13; Contract 1, 4, 6, 12–13.
Cập nhật baseline v2.1: đóng D01–D07, chuẩn hóa API/event/schema/flow và các mục token/CORS/media/Admin theo phạm vi service. Nguồn: Conflict + Contract v2.1 theo chỉ đạo người dùng chọn phương án và thực hiện; nội dung tài liệu không chứng minh code đã triển khai.
Open Issues
Không còn quyết định nghiệp vụ/gói kỹ thuật chờ duyệt trong baseline v2.1. Cấu hình thật (domain, SMTP, seed email, SUPPORT_EMAIL, secrets), backfill dữ liệu và kiểm thử mã nguồn là việc triển khai theo Contract §19; không ghi chúng là đã hoàn tất. Mở vấn đề mới chỉ khi có thay đổi phạm vi hoặc mâu thuẫn mới được phát hiện.



