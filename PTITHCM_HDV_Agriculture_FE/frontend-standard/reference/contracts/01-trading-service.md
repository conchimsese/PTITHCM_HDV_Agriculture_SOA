# Trading Service

AGRICULTURE MICROSERVICE: TRADING SERVICE SPECIFICATION
1. Project Overview
1.1. Mục tiêu hệ thống
Hệ thống gồm User, Farming, Trading, Chat, Payment và Notification. Trading sở hữu Listing/Offer, Chat sở hữu Conversation/Message, Payment sở hữu module Contract và Deposit trong payment_db; không có Contract Service riêng.
1.2. Phạm vi MVP
Hoàn thành trong 1.5 tháng. Tập trung vào các tính năng cốt lõi: Đăng bán lúa từ lô đất có sẵn, gợi ý nguồn hàng theo khoảng cách GPS (PostGIS), gửi báo giá (Offer), và chuyển hướng liền mạch sang phòng Chat để chốt đơn.
1.3. Đối tượng sử dụng
●      Farmer (Nông dân - Người bán)
●      Trader (Thương lái - Người mua)
●      Admin (Quản trị viên)
1.4. Business flow chính
Farmer tạo Listing từ snapshot Farming → Trader POST Offer PENDING (depositAmount=0) → OFFER_CREATED gửi Farmer → Farmer có thể accept nhiều Offer → OFFER_ACCEPTED tạo conversation riêng theo offerId và thông báo Trader → Trader tạo Contract trong Payment → Farmer accept Contract PENDING_DEPOSIT, tạo tracking PENDING → Trader nạp cọc mô phỏng 5% → Payment phối hợp Trading chốt độc quyền một giao dịch/Listing → Trading LOCKED, Payment Contract ACTIVE/cọc LOCKED → Kafka thông báo cả hai → hoàn tất Contract thì Trading SOLD. Chỉ rút khi đủ điều kiện và không có tranh chấp hợp lệ đang mở; mốc deliveryDate+24h không tự hoàn tất Contract. Giữ lịch sử các Offer/phòng khác; không tự REJECT hoặc xóa tất cả.
1.5. Nền tảng & Kiến trúc
●      Nền tảng: Web, Mobile App
●      Kiến trúc: Microservices, Event-Driven (Kafka), CQRS, Database per Service.
3. Service Responsibility
Service
Responsibility
Database
Owner
User
Authentication, Authorization, Profile Management
user_db
Member 4
Farming
Plot, Season, Cultivation Log, Yield Estimation
farming_db
Member 1
Trading
Listing, GPS Market Feed, Offer, Market Oracle
trading_db
Member 2
Chat
Real-time Conversation, Deep-link UI Messages
chat_db
Member 3
Payment
Contract, Deposit, tranh chấp và cọc mô phỏng; không ghi DB Trading/User
payment_db
Owner Payment phụ trách Contract/Deposit (chưa ghi tên thành viên)
Notification
Kafka event consumer, lưu thông báo, REST own account; OTP email thuộc User
notification_db
Member 4
Quy tắc quan trọng:
●      Mỗi service phải có: OWN DATABASE, OWN BUSINESS LOGIC, OWN API.
●      Tuyệt đối KHÔNG truy cập trực tiếp database của service khác.
4. Database Ownership
Service: Trading Service
Database: trading_db
Entities & Primary Keys:
●      listings (PK: listing_id - uuid)
●      offers (PK: offer_id - uuid)
●      farmer_replicas (PK: farmer_id - UUID, bằng accountId)
●      trader_replicas (PK: trader_id - UUID, bằng accountId)
Data Ownership & External References:
●     farmer_id (listings)  logical reference  farmer_replicas.farmer_id
●     farmer_id (farmer_replicas)  logical reference  user_db.accounts.account_id
●     trader_id (trader_replicas)  logical reference  user_db.accounts.account_id
●     plot_id (listings)  logical reference  farming_db.plots.plot_id
●      Conversation do Chat tạo sau OFFER_ACCEPTED; client dùng GET /api/v1/conversations đối chiếu offerId. Không thêm conversation_id vào offers chỉ để trả POST Offer. Không FK xuyên DB.
5. ERD của từng Service
5.3 Trading Service ERD
●      farmer_replicas (1) - (N) listings
●      trader_replicas (1) - (N) offers
●      listings (1) - (N) offers
Đặc tả Attribute cốt lõi:
●      listings: seed_type, estimated_yield, plot_lat, plot_lng (Composite Index cho GPS), expected_price, status.
●      offers: price, deposit_amount (khởi tạo0; cập nhật từ kết quả cọc mô phỏng Payment), max_deduction_percent, status. Một Listing chỉ chốt một Offer/Contract; Trading bảo vệ ràng buộc độc quyền trong transaction của mình.
5.4. ERD bổ sung v2.1
Listing lưu winning_contract_id,winning_payment_tracking_id; row lock/conditional update cùng transaction LOCKED đảm bảo một winner. Hai replica giữ profile_version BIGINT/public_visible BOOLEAN; không FK sang User/Payment. Idempotency theo paymentTrackingId và so request hash; cùng key khác body409 IDEMPOTENCY_CONFLICT. Transaction outbox cùng Listing/Offer cho producer; không dùng Kafka để tranh quyền chốt. Snapshot chọn cropSeasonId bắt buộc và không tạo Listing từ dữ liệu thiếu/Plot ẩn.
6. API Contract
GET Listing Feed (Dành cho Trader lướt sóng GPS)
●      Method: GET
●      Endpoint: /api/v1/listings/feed
●      Authentication: JWT hợp lệ, account ACTIVE; POST Offer: TRADER; GET Feed: TRADER/ADMIN theo quyền cũ
●      Owner: Trading Service | Consumer: Mobile App / Web App
●      Request Query: lat, lng, radius và page=0, size=20, max100; giữ filter GPS hiện có. Không bổ sung sort/filter nghiệp vụ khác khi chưa duyệt.
●      Response (200 OK):
JSON
{
  "items": [
	{
      "listingId": "44444444-4444-4444-8444-444444444444",
      "seedType": "ST25",
      "plotLat": 10.125,
      "plotLng": 106.450,
      "distanceKm": 2.5,
      "farmer": {
        "farmerId": "11111111-1111-4111-8111-111111111111",
        "fullName": "Nguyễn Văn A"
 
  	}
	}
  ], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1
}
 
POST Create Offer — TRADER ACTIVE; depositAmount khởi tạo0 bởi backend, không nhận field depositAmount làm bằng chứng nạp cọc. Cọc mô phỏng5% tính từ Contract đã accept do Payment xác nhận.
●      Method: POST
●      Endpoint: /api/v1/offers
●      Authentication: JWT hợp lệ, account ACTIVE; POST Offer: TRADER; GET Feed: TRADER/ADMIN theo quyền cũ
●      Owner: Trading Service | Consumer: Mobile App / Web App
●      Request Body:
JSON
{
  "listingId": "44444444-4444-4444-8444-444444444444",
  "price": "8500.00",
 
  "maxDeductionPercent": 2,
  "message": "Chốt nhé anh trai"
}
 
●      Response (201 Created):
JSON
{
  "offerId": "33333333-3333-4333-8333-333333333333",
  "status": "PENDING"
 
}
 
Tạo Listing từ mùa vụ cụ thể — v2.1
Trading tạo Listing: POST /api/v1/listings, FARMER ACTIVE; request {plotId,cropSeasonId,expectedPrice} với UUID và expectedPrice là decimal string VND dương. farmerId lấy từ sub, không nhận snapshot/owner do client tự khai. Trading gọi Farming summary với cropSeasonId, kiểm farmerId và giữ crop_season_id/seed_type/estimated_yield/area/GPS snapshot theo field mapping hiện có. Response201 {listingId,farmerId,plotId,cropSeasonId,seedType,estimatedYield,area,latitude,longitude,expectedPrice,status:"OPEN"}; 400 validation,403 owner/role,409 SNAPSHOT_INCOMPLETE,503 dependency. Listing schema bổ sung crop_season_id logical ref; không FK cross-service.
6.1. Internal deposit-commit — baseline v2.1
ID thống nhất: depositId = paymentId = paymentTrackingId = payment_tracking.payment_tracking_id trong MVP vì chỉ có một tracking/cọc cho mỗi Contract, chưa có entity giao dịch gateway riêng. Đây là các alias DTO của cùng UUID, không tạo ba bản ghi/ID. ContractId là ID khác. API cọc hiện nhận {contractId} vẫn giữ tên/path đó, không đổi nghĩa âm thầm.
Payment chỉ gọi Trading bằng service key riêng; Trading derive listingId từ offerId, kiểm Offer ACCEPTED, đúng participant và Contract. Không nhận listingId do client khai làm nguồn sự thật.
API thống nhất: POST /internal/v1/offers/{offerId}/deposit-commit • Request: {contractId,paymentTrackingId,depositAmount,currency}; Idempotency-Key=paymentTrackingId • Response và idempotency: 200 {offerId,listingId,contractId,paymentTrackingId,listingStatus:"LOCKED"}; cùng key/body trả kết quả đã ghi; key khác đã thắng Listing→409 LISTING_ALREADY_COMMITTED
API thống nhất: GET /internal/v1/offers/{offerId}/deposit-commit • Request: Query contractId,paymentTrackingId • Response và idempotency: 200 kết quả chốt;404 chưa có;403 caller không được phép
Recovery: Payment tạo tracking cùng ý định nạp bền vững trước REST; một attempt dùng cùng trackingId. Trading khóa row Listing và lưu winningContractId/winningPaymentTrackingId trong cùng transaction LOCKED. Nếu response mất hoặc Payment crash sau Trading commit, recovery đọc kết quả và hoàn tất tracking/Contract; retry không tạo attempt mới. Chưa biết kết quả trả503, không trả nạp thành công và không tự thả Listing cho người khác. Nếu Trading trả409 đã có winner khác, tracking vẫn PENDING và không ghi paidAt/DEPOSIT_PAID. Không có API thả claim trong MVP; recovery luôn hoàn tất cùng tracking đã thắng. Khi dependency lỗi, giữ trạng thái đang đối soát và retry cùng key; không cho một giao dịch thứ hai thắng.
Trading consume DEPOSIT_PAID để cập nhật depositAmount nhưng không dùng event này để tranh quyền thắng. Trading consume CONTRACT_STATUS_CHANGED, chỉ COMPLETED của winningContractId mới chuyển SOLD; event muộn/version cũ không rollback state.
7. API Contract Matrix
From
To
Method
Endpoint
Purpose
Sync/Async
Trading
Farming
GET
/api/v1/plots/{plotId}/summary — URL baseline giữ; xác thực service key và quyền truy cập theo snapshot contract
Kéo snapshot data (seed, yield, lat, lng) lúc Nông dân tạo Listing.
Sync
Payment (module Contract)
Trading
GET
/api/v1/offers/{id}
Lấy Offer/participant/giá hiện tại từ Trading để tạo Contract; không đọc trading_db.
Sync
Gateway
Trading
POST
/api/v1/offers
Trader gửi Báo giá mới.
Sync
8. Event Contract
Event Name
Producer
Consumers
Trigger
USER_PROFILE_UPDATED — User phát event public đồng bộ replica Trading
User
Trading
Update bảng farmer_replicas & trader_replicas khi đổi tên/avatar.
OFFER_CREATED
Trading
Notification
Sau lưu Offer PENDING thành công, gửi OFFER_CREATED cho Farmer qua Notification; không mở Chat.
OFFER_ACCEPTED
Trading
Chat, Notification
Sau Farmer accept Offer thành công, phát OFFER_ACCEPTED; Chat tạo conversation, Notification gửi Trader. Không tự khóa Listing/sinh PDF chỉ vì accept.
Payload Example: OFFER_CREATED — eventVersion1/referenceType OFFER; topic soa.trading.offer.v1, key offerId; data offerId/listingId/farmerId/traderId theo Contract đã duyệt
JSON
{
  "eventId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "eventType": "OFFER_CREATED",
  "eventVersion": 1, "referenceType": "OFFER", "occurredAt": "2026-09-25T10:00:00Z",
  "sourceService": "trading-service",
  "recipientIds": ["11111111-1111-4111-8111-111111111111"],
  "referenceId": "33333333-3333-4333-8333-333333333333",
  "data": {
    "offerId": "33333333-3333-4333-8333-333333333333",
    "listingId": "44444444-4444-4444-8444-444444444444",
    "farmerId": "11111111-1111-4111-8111-111111111111",
    "traderId": "22222222-2222-4222-8222-222222222222",
    "price": "8500.00"
  }
}
 
9. Authentication & Authorization
Security đã chốt 07/10/2026: User ký RS256, access token 15 phút; iss=urn:soa:user-service, aud=soa-api; sub=accountId UUID, role=FARMER/TRADER/ADMIN, iat/exp/jti. Chỉ User giữ private key; Gateway/backend verify bằng public key, forward Bearer và kiểm ownership. GET /internal/v1/accounts/{accountId}/access-state đọc DB primary, không cache ACTIVE, timeout tổng 1 giây; không kiểm tra được →503 ACCESS_STATE_UNAVAILABLE; account không ACTIVE →403 ACCOUNT_NOT_ACTIVE. Internal dùng X-Service-Key riêng từng caller, private network/HTTPS khi triển khai, không route public. WebSocket Chat kiểm state trước SEND/SUBSCRIBE và push riêng tư.
Endpoint
Farmer
Trader
Admin
POST /listings
✓
✗
✗
GET /listings/feed
✗
✓
✓
GET /listings/{id}/offers
✓ (Owner)
✗
✗ (ngoài MVP)
POST /offers
✗
✓
✗
PUT /offers/{id}/accept
✓ (Owner)
✗
✗
10. Error Contract
Thống nhất 1 format trả lỗi duy nhất cho toàn bộ hệ thống:
JSON
{
  "timestamp": "2026-09-25T10:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Listing is already LOCKED, cannot accept new offers.",
  "path": "/api/v1/offers/{offerId}/accept"
}
 
HTTP/error baseline: 400 VALIDATION_ERROR; 401 UNAUTHORIZED; 403 FORBIDDEN/ACCOUNT_NOT_ACTIVE; 404 NOT_FOUND; 409 CONFLICT; 500 INTERNAL_SERVER_ERROR; 503 ACCESS_STATE_UNAVAILABLE khi không kiểm tra được account. Error DTO {timestamp,status,code,message,path}; traceId là field tùy chọn theo Contract v2.1 §3.
11. Data Contract
●      ID Format: UUID cho listings/offers/replica IDs, owner tạo ID; farmerId/traderId=accountId User. API/event UUID String, không Firebase/Auth0 ID hoặc Long thay accountId. UUID v7 là lựa chọn cũ cho ID Trading tự tạo, không đổi UUID owner khác.
●      Time Format: ISO 8601 UTC (2026-09-25T10:00:00Z).
●      Naming Convention:
○      API / JSON / DTO: camelCase (listingId, expectedPrice).
○      Database Schema: snake_case (listing_id, expected_price).
12. State Machine
Listing Status (listing_status)
OPEN → LOCKED khi Payment chốt độc quyền thành công và xác nhận cọc mô phỏng → SOLD khi Contract được xác nhận COMPLETED. Accept Offer/Contract không khóa Listing.
OPEN  CANCELED (Nông dân/Admin hủy bài).
(Không được phép: LOCKED  OPEN)
Offer Status (offer_status)
PENDING  ACCEPTED (Farmer đã accept để mở Chat; chưa tự coi đã chốt cọc).
PENDING → REJECTED theo thao tác từ chối hiện có; không tự REJECT mọi Offer khác khi chốt. Offer/phòng khác giữ lịch sử, không được chốt giao dịch thứ hai.
13. Business Rules
●      BR-TRD-001: Một lô đất (plot_id) chỉ được phép có duy nhất 1 bài đăng ở trạng thái OPEN.
●      BR-TRD-002 (Snapshotting): Thông tin sinh học (seed_type, estimated_yield, tọa độ) phải được copy cứng từ Farming Service sang Trading Service tại thời điểm tạo bài.
●      BR-TRD-003 (Anti N+1): Bắt buộc Query JOIN với bảng farmer_replicas và trader_replicas khi hiển thị danh sách, KHÔNG gọi API User Service trong vòng lặp.
●      BR-TRD-004: Chỉ Farmer owner xem Offer thuộc Listing mình. ADMIN xem Offer của người khác không thuộc MVP; trả403 FORBIDDEN.
●      BR-TRD-005: Farmer có thể accept nhiều Offer để trao đổi; mỗi accepted offer mở conversation riêng. Một Listing chỉ chốt một giao dịch khi nạp cọc mô phỏng5% thành công. Không tự khóa lúc accept, không tự REJECT/xóa lịch sử phòng khác.
14. Inter-Service Communication
●      Synchronous (REST API):
○     Trading  Farming (Lấy snapshot lô đất).
○     Contract  Trading (Lấy data chốt giá làm hợp đồng).
●      Asynchronous (Message Broker - Kafka):
○      USER_PROFILE_UPDATED: User → Trading, topic soa.user.profile.v1, key accountId. Data {accountId,role,profileVersion,publicVisible,profile:{displayName,avatarUrl,province,district,joinedAt}}; khi ẩn public profile gửi publicVisible=false,profile=null. Trading giữ farmer_replicas/trader_replicas, chỉ áp version mới; bootstrap bằng job User phát snapshot hiện hành. Không OTP/token/password/email/phone/address/reputation trong payload public; không coi replica là cơ chế khóa tức thời. Contract v2.1 §9 là chuẩn producer/consumer.
○      Topic/key đã chốt theo Contract v1: soa.trading.offer.v1/offerId; soa.chat.message.v1/conversationId; soa.contract.lifecycle.v1/contractId (producer payment-service); soa.payment.deposit.v1/depositId. Group Notification notification-service-v1; Chat OFFER_ACCEPTED dùng chat-offer-accepted-v1, độc lập Notification. CONTRACT_CREATED và CONTRACT_STATUS_CHANGED gửi [farmerId, traderId]; DEPOSIT_PAID và DEPOSIT_STATUS_CHANGED gửi cả hai; MESSAGE_CREATED chỉ người nhận. Reference MESSAGE=CONVERSATION/conversationId. DEPOSIT_STATUS_CHANGED chuyển LOCKED không tạo Notification, chỉ DEPOSIT_PAID thông báo lần nạp đó.
15. Repository Structure
Cấu trúc Package by Feature theo chuẩn NestJS (Domain-Driven Design):
Plaintext
src/
├── config/              	# Biến môi trường
├── common/              	# JwtGuard, ErrorFilter, Logger
├── prisma/              	# schema.prisma, PrismaService
├── modules/
│   ├── listings/        	# Nghiệp vụ Bài đăng bán
│   │   ├── dto/
│   │   ├── listings.controller.ts
│   │   ├── listings.service.ts
│   │   └── listings.module.ts
│   ├── offers/          	# Nghiệp vụ Offer
│   │   ├── dto/
│   │   ├── offers.controller.ts
│   │   ├── offers.service.ts
│   │   └── offers.module.ts
│   ├── replicas/        	# Consumer nghe Event từ Kafka
│   └── oracle/          	# Logic tính AVG(), MIN(), MAX() giá lúa
└── main.ts
 
16. Coding Convention
●     Flow bắt buộc: Controller  Service  PrismaService (Repository)  Database.
●      Controller: Chỉ parse Request, DTO Validation, gọi Service, trả Response. KHÔNG chứa if/else logic nghiệp vụ.
●      Service: Chứa toàn bộ Business Logic, ném Custom Exceptions nếu vi phạm Business Rules.
●      Dependency Injection: Khai báo constructor injection, không khởi tạo class bằng từ khóa new lung tung.
17. Git Convention  	
●      Branches: main (Production), develop (Staging).
●      Feature Branches: feature/trading-listings, feature/trading-offers, fix/gps-calculation.
●      Commit Messages: (Chuẩn Conventional Commits)
○      feat(listings): implement postGIS spatial query for feed
○      fix(offers): resolve state machine transition bug
○      chore(deps): update prisma version
Ví dụ:
feat(user): implement login API
feat(farming): add crop season CRUD
feat(notification): consume OFFER_CREATED event
18. Environment Configuration
Không commit file .env lên Git. Khai báo các biến bắt buộc:
Code snippet
SERVER_PORT=8083
 
# PostgreSQL Connection
DATABASE_URL=postgresql://user:pass@localhost:5432/trading_db
 
# JWT validation config (Đồng bộ với User Service)
JWT_ALGORITHM=RS256; JWT_ISSUER=urn:soa:user-service; JWT_AUDIENCE=soa-api; JWT_PUBLIC_KEY_LOCATION=<public key>; INTERNAL_SERVICE_KEY=<riêng caller>; ACCESS_STATE_TIMEOUT_MS=1000
 
# Message Broker
KAFKA_BOOTSTRAP_SERVERS=<Kafka bootstrap theo môi trường>
 
# External Services
FARMING_SERVICE_URL=http://farming-service:8082
 
19. Docker / Local Development
Sử dụng docker-compose.yml tổng.
Khởi động hệ thống: docker compose up -d
Port Allocation Matrix:
●      API Gateway: 8080
●      User Service: 8081
●      Farming Service: 8082
●      Trading Service: 8083
●      Chat Service: 8084
●      Payment Service: 8085 (Contract/Deposit là module trong Payment)
●      Notification: 8086
21. End-to-End Business Flow
Luồng Giao thương & Chốt Hợp đồng:
Farmer  Chọn Lô đất  Nhập giá mong muốn  POST /listings.
Trading Service  Kéo data sinh học từ Farming Service  Lưu DB trạng thái OPEN.
Trader  Mở App  Hệ thống gọi GET /listings/feed (Trading dùng PostGIS quét GPS ra bài đăng gần nhất).
Trader  Nhập giá; depositAmount thực thu do Payment xác nhận  Bấm Gửi Offer (POST /offers).
Trading Service  Lưu DB  Pub event OFFER_CREATED.
Notification consume OFFER_CREATED → thông báo cho Farmer.
Farmer xem danh sách Offer của Listing → PUT /api/v1/offers/{offerId}/accept qua Gateway → Trading kiểm tra quyền Owner.
Trading lưu Offer ACCEPTED → OFFER_ACCEPTED; nhiều Offer được accept, không khóa Listing hoặc REJECT các Offer khác ở bước này.
Chat consume OFFER_ACCEPTED → tạo conversation idempotent theo offerId; Notification thông báo Trader; client lấy danh sách conversation để đối chiếu offerId.
Hai participant trao đổi → Contract trong Payment → Farmer accept → Trader nạp cọc mô phỏng5% → chốt một giao dịch và Trading LOCKED; Contract hoàn tất → Trading SOLD.
23. AI AGENT DEVELOPMENT RULES
BEFORE CODING, THE AGENT MUST STRICTLY OBEY:
●      RULE-001 (Schema Bound): KHÔNG tự ý tạo thêm Table hoặc Column mới ngoài 4 entities đã định nghĩa (listings, offers, farmer_replicas, trader_replicas).
●      RULE-002 (Isolation): KHÔNG truy cập database của service khác. Để lấy User info, BẮT BUỘC query vào bảng _replicas.
●      RULE-003 (Enums Strictness): Mọi logic update trạng thái phải bám sát 100% Enum listing_status và offer_status. Code sẽ bị reject nếu set Status sai format.
●      RULE-004 (Contract Unawareness): Trading Service KHÔNG viết logic sinh PDF. Trading chỉ cập nhật trạng thái và bắn Kafka Event.
●      RULE-005 (Spatial Index): Phải sử dụng chức năng tính toán tọa độ (PostGIS/Haversine) cho API Listing Feed. Không lấy toàn bộ bảng ra RAM để dùng lệnh filter hay map.
●      RULE-006 (Layered Logic): Mọi logic Validate Business Rules (vd: Check lô đất đã có Listing OPEN chưa) PHẢI nằm ở Service layer, KHÔNG để ở Controller.
●      RULE-007 (Ambiguity Check): Nếu Requirement mâu thuẫn  Đánh dấu CẦN XÁC NHẬN, dừng code, không tự suy đoán.
 
Luồng tích hợp đã đồng bộ
POST /api/v1/offers → Trading lưu PENDING → OFFER_CREATED → Notification gửi Farmer; response chỉ offerId/status, không chatRoomId/conversationId.
Farmer xem Offer của Listing → PUT /api/v1/offers/{offerId}/accept → Trading lưu ACCEPTED → OFFER_ACCEPTED → Chat tạo conversation theo offerId → Notification gửi Trader → client lấy danh sách Chat và đối chiếu offerId. Chat chưa xử lý thì chưa hứa conversationId tức thời.
Payment điều phối cọc mô phỏng5% tổng giá trị Contract; Offer.depositAmount ban đầu0, chỉ cập nhật khi Payment đã xác nhận thành công. Payment phối hợp REST/Kafka; Trading cập nhật Listing/Offer bằng transaction trong trading_db, không cho Payment ghi DB.
Contract tích hợp Trading đã chốt 07/10/2026
Nguồn cập nhật: Conflict đã chốt, Contract chung v2.1 và xulycontract(1).txt; người dùng đã giao quyền lựa chọn phương án và cập nhật trực tiếp. D01–D07 và gói kỹ thuật có hiệu lực theo v2.1. Ưu tiên quyết định mới nhất → Conflict đã chốt → Contract → rule → spec; không dùng đề xuất cũ để mở lại các mục đã đóng.
USER_PROFILE_UPDATED: User → Trading, topic soa.user.profile.v1, key accountId. Data {accountId,role,profileVersion,publicVisible,profile:{displayName,avatarUrl,province,district,joinedAt}}; khi ẩn public profile gửi publicVisible=false,profile=null. Trading giữ farmer_replicas/trader_replicas, chỉ áp version mới; bootstrap bằng job User phát snapshot hiện hành. Không OTP/token/password/email/phone/address/reputation trong payload public; không coi replica là cơ chế khóa tức thời. Contract v2.1 §9 là chuẩn producer/consumer.
Topic/key đã chốt theo Contract v1: soa.trading.offer.v1/offerId; soa.chat.message.v1/conversationId; soa.contract.lifecycle.v1/contractId (producer payment-service); soa.payment.deposit.v1/depositId. Group Notification notification-service-v1; Chat OFFER_ACCEPTED dùng chat-offer-accepted-v1, độc lập Notification. CONTRACT_CREATED và CONTRACT_STATUS_CHANGED gửi [farmerId, traderId]; DEPOSIT_PAID và DEPOSIT_STATUS_CHANGED gửi cả hai; MESSAGE_CREATED chỉ người nhận. Reference MESSAGE=CONVERSATION/conversationId. DEPOSIT_STATUS_CHANGED chuyển LOCKED không tạo Notification, chỉ DEPOSIT_PAID thông báo lần nạp đó.
Snapshot Farming cropType→Listing.seedType; expectedYield kg→estimated_yield; latitude/longitude→plot_lat/plot_lng; diện tích m². Chỉ copy snapshot qua REST, không query farming_db.
Farmer tạo Listing từ snapshot Farming → Trader POST Offer PENDING (depositAmount=0) → OFFER_CREATED gửi Farmer → Farmer có thể accept nhiều Offer → OFFER_ACCEPTED tạo conversation riêng theo offerId và thông báo Trader → Trader tạo Contract trong Payment → Farmer accept Contract PENDING_DEPOSIT, tạo tracking PENDING → Trader nạp cọc mô phỏng 5% → Payment phối hợp Trading chốt độc quyền một giao dịch/Listing → Trading LOCKED, Payment Contract ACTIVE/cọc LOCKED → Kafka thông báo cả hai → hoàn tất Contract thì Trading SOLD. Chỉ rút khi đủ điều kiện và không có tranh chấp hợp lệ đang mở; mốc deliveryDate+24h không tự hoàn tất Contract. Giữ lịch sử các Offer/phòng khác; không tự REJECT hoặc xóa tất cả.
Chuẩn đối chiếu chung — CONTRACT CHUNG MVP v2.1
Tab rule chứa toàn văn Contract v2.1, là đầu mối đối chiếu API/event/schema/flow cho nhóm. Service này theo §3,§5–9 và§16; Trading giữ Listing/Offer/replica, Payment không ghi trading_db. D01–D07 và gói kỹ thuật v2.1 đã có hiệu lực theo chỉ đạo chọn phương án và thực hiện. Áp dụng thêm §17–19 cho token/CORS/media/Admin; mọi endpoint/event mới phải được triển khai đúng contract, không còn chờ duyệt nghiệp vụ.
Gateway snapshot v2.1: /api/v1/plots/{plotId}/summary là giao tiếp Trading→Farming trực tiếp, service key riêng; Gateway chặn public path này trước wildcard /plots/**. cropSeasonId query bắt buộc; không dùng header client để vượt ownership.
Change Log
§1, §3–9, §11–14, §18–21: Kafka, UUID account/profile/replicas, sửa user_db.accounts.account_id, bỏ response Chat lúc POST Offer, OFFER_CREATED tới Notification và OFFER_ACCEPTED tới Chat/Notification. Nguồn: Conflict 01–07, 13; Contract 2–4, 8–9, 12.
§1, §5–6, §12–13, §21: chốt nhiều Offer, cọc mô phỏng5%, Contract thuộc Payment, Listing LOCKED lúc chốt/SOLD lúc hoàn tất và không auto-REJECT Offer khác. Nguồn: quyết định nhóm 07/10 mục1–8; Contract cập nhật.
§5–8, §13–14: cropType/GPS/kg/m² từ Farming, giữ URL snapshot baseline; giữ replica User và đồng bộ event public; ADMIN xem Offer người khác ngoài MVP. Nguồn: mục8–10.
§9–10, §18–19: identity không dựa header client, ACTIVE/lock tức thời/fail closed, HTTP errors và cấu hình broker đồng bộ. Nguồn: Conflict 07, 10–12; Contract 4–5.
Cập nhật baseline v2.1: đóng D01–D07, chuẩn hóa API/event/schema/flow và các mục token/CORS/media/Admin theo phạm vi service. Nguồn: Conflict + Contract v2.1 theo chỉ đạo người dùng chọn phương án và thực hiện; nội dung tài liệu không chứng minh code đã triển khai.
Open Issues
Không còn quyết định nghiệp vụ/gói kỹ thuật chờ duyệt trong baseline v2.1. Cấu hình thật (domain, SMTP, seed email, SUPPORT_EMAIL, secrets), backfill dữ liệu và kiểm thử mã nguồn là việc triển khai theo Contract §19; không ghi chúng là đã hoàn tất. Mở vấn đề mới chỉ khi có thay đổi phạm vi hoặc mâu thuẫn mới được phát hiện.



