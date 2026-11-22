# Nền tảng Notification Service

Nguồn chuẩn: `BA - SOA.docx`, phần Notification Service Specification MVP và CONTRACT CHUNG MVP v2.1 (07/10/2026); đối chiếu `Prompt_Notification_Service.md`. Phạm vi lượt này theo yêu cầu trực tiếp: application, cấu hình, schema và health. Không consumer Kafka, API nghiệp vụ, cleanup hoặc JWT/access-state trong lượt này. Không sửa User Service.

## Đối chiếu và mâu thuẫn

- Notification §5.1, dòng `reference_type`, chỉ liệt kê OFFER/CONVERSATION/CONTRACT/DEPOSIT. Notification §10 và Contract v2.1 §9/§14 quy định ba event User dùng ACCOUNT. Đề xuất sửa bảng §5.1 bổ sung ACCOUNT; migration theo contract hiện tại hỗ trợ ACCOUNT và đủ 10 type.
- Notification §8, bảng subscription, chỉ có 7 event; §3/§9/§26 và Contract v2.1 §9/§14 bổ sung 3 User event. Đề xuất cập nhật bảng thành 10; schema không giới hạn theo bảng cũ.
- Notification §25 còn viết receipt hoặc alternative horizon cần duyệt, trong khi §4/§5.2/§11 và Contract v2.1 §10 đã duyệt notification_receipts. Đề xuất sửa câu DoD theo quyết định hiện tại; tạo receipts không FK và không xóa theo nội dung.
- BA User phần “Stack triển khai hiện tại” ghi Java21/Boot3.5.x/Maven; Prompt §1 áp dụng hướng này cho repo Notification trống. Không có patch Boot hoặc phiên bản Maven chính xác được nhóm chốt. Chọn kỹ thuật Boot 3.5.16, Maven 3.9.11, Wrapper 3.3.4; không coi đây là quyết định phiên bản chính xác của nhóm. Dependencies do Boot BOM quản lý.

Tham chiếu kỹ thuật: https://docs.spring.io/spring-boot/3.5/system-requirements.html (Java21 và Maven3.6.3+ tương thích); https://maven.apache.org/tools/wrapper/ (wrapper Windows only-script).

## Cấu hình và giới hạn

- API port cố định 8086. DB_URL/DB_USERNAME/DB_PASSWORD bắt buộc, không mật khẩu mặc định. `.env.example` nêu JDBC localhost:5432/notification_db và user notification_app.
- Spring Config Data nạp `optional:file:.env[.properties]` từ working directory. Đây là Java properties, không phải dotenv shell; biến môi trường ưu tiên hơn file. Không tự ghi/in các secret. README mô tả escaping.
- Flyway chạy khi ứng dụng khởi động; clean disabled, không baseline tự động. Hibernate ddl-auto=validate, không tạo/update schema. Chưa có entity nên kiểm schema chính là Flyway và integration test PostgreSQL.
- Chỉ expose `/actuator/health`, không details/components/config. Health UP gồm trạng thái DB. Chưa có endpoint nghiệp vụ cần JWT.
- Index/unique/check theo Notification §5.1–5.2. Không thêm business dedup hoặc ràng buộc mapping source/type/reference vượt schema đã chốt. Receipt PK hỗ trợ tra event_id; receipt+content transaction/hash/replay cần thực hiện ở lượt consumer.
- Không có AGENTS.md trong thư mục hiện tại hoặc các thư mục cha; source ban đầu chỉ có hai file docs, chưa có Git repository. `xulycontract(1).txt` được BA nhắc tới nhưng không được cung cấp riêng; không giả định đã đọc file đó, dùng nội dung baseline đã tích hợp trong BA.

## Kết quả kiểm tra 12/10/2026

- Windows: `mvnw.cmd -version` xác nhận Maven3.9.11, Java21.0.12.1.
- `mvnw.cmd -B -ntp clean verify`: BUILD SUCCESS; 3 tests, 0 failure/error/skipped. Tạo executable jar trong target.
- Docker/Testcontainers: PostgreSQL16.15 tạm với database notification_db/user notification_app; Flyway apply V1, validate và migrate lại không chạy thêm migration. Constraints và health HTTP được kiểm tra bằng FoundationTest.
- PostgreSQL localhost:5432 có mở port nhưng chưa kiểm tra xác thực/migration trên DB local vì không có credential. Không tạo/sửa role hoặc database trên instance đó.
- Health được kiểm tra trên port ngẫu nhiên của integration test; chưa chạy jar trên 8086 hoặc kiểm tra `.env` với secret thực. Cổng8086 và cơ chế import `.env` được cấu hình trong application.yml. Build/test không cần `.env`.
- Chưa kiểm tra Kafka/User/Gateway và REST nghiệp vụ, nằm ngoài phạm vi lượt này.

## Hoàn thành Phase 1: Security, Entities, Repository & 4 REST Endpoints (18/10/2026)

- **Dependencies:** Bổ sung `spring-boot-starter-security`, `spring-boot-starter-oauth2-resource-server`, `spring-boot-starter-validation`, `spring-security-test`.
- **Entities & Schema:**
  - `NotificationEntity` và `NotificationReceiptEntity` khớp 100% Flyway V1 schema với `ddl-auto: validate`. `payload_hash` map `bpchar` đúng chuẩn PostgreSQL `CHAR(64)`.
  - Enum chuẩn hóa: `NotificationType` (10 types), `ReferenceType` (OFFER, CONVERSATION, CONTRACT, DEPOSIT, ACCOUNT), `NotificationStatus` (UNREAD, READ).
- **Security & Authorization:**
  - Cấu hình Spring Security Resource Server xác thực RS256 JWT (`urn:soa:user-service`, `aud: soa-api`, clock-skew 60s).
  - Tách subject `sub` (accountId UUID) và roles (`ROLE_FARMER`, `ROLE_TRADER`, `ROLE_ADMIN`).
  - RestAuthenticationEntryPoint và RestAccessDeniedHandler trả về JSON ErrorResponse chuẩn contract `{timestamp, status, code, message, path}`.
- **Inter-service check:**
  - `UserServiceClient` gọi `GET /internal/v1/accounts/{sub}/access-state` với `X-Service-Key` và timeout tổng 1 giây. Nếu state không ACTIVE trả 403 `ACCOUNT_NOT_ACTIVE`; lỗi/timeout trả 503 `ACCESS_STATE_UNAVAILABLE`.
- **4 REST Endpoints (`/api/v1/notifications`):**
  1. `GET /api/v1/notifications`: Danh sách phân trang (`page`, `size` tối đa 100), filter `isRead`, `type`, sort `createdAt DESC, notificationId DESC`.
  2. `GET /api/v1/notifications/{notificationId}`: Chi tiết thông báo, kiểm tra quyền sở hữu chính chủ (kể cả ADMIN không xem được của người khác -> 404).
  3. `PATCH /api/v1/notifications/{notificationId}/read`: Đánh dấu đọc có điều kiện atomic, idempotent, giữ nguyên `readAt` lần đầu.
  4. `GET /api/v1/notifications/unread-count`: Đếm số thông báo UNREAD trong vòng 90 ngày.
  - Cutoff retention 90 ngày (`createdAt > now - 90 days`) được áp dụng nhất quán trên tất cả 4 endpoint.
- **Test Results:** 10/10 tests pass (3 FoundationTest, 7 NotificationControllerTest) trên PostgreSQL Testcontainers thật.

## Hoàn thành Phase 2: Kafka Consumer, 10 Event Contracts & Template Mapping (19/10/2026)

- **Dependencies:** Bổ sung `spring-kafka`, `spring-kafka-test`, `testcontainers:kafka`.
- **Event Envelope v1:**
  - `EventEnvelope` record: `eventId`, `eventType`, `eventVersion: 1`, `sourceService`, `occurredAt`, `actorId`, `recipientIds`, `referenceType`, `referenceId`, `correlationId`, `data`.
  - Validate nghiêm ngặt các trường bắt buộc; dữ liệu optional tương thích hợp đồng.
- **10 Golden Fixtures:** Đã tạo đủ 10 fixture JSON chuẩn tại `src/test/resources/fixtures/`:
  1. `offer_created.json` (`trading-service`)
  2. `offer_accepted.json` (`trading-service`)
  3. `message_created.json` (`chat-service`)
  4. `contract_created.json` (`payment-service`)
  5. `contract_status_changed.json` (`payment-service`)
  6. `deposit_paid.json` (`payment-service`)
  7. `deposit_status_changed.json` (`payment-service`)
  8. `reputation_changed.json` (`user-service`)
  9. `account_locked.json` (`user-service`)
  10. `account_unlocked.json` (`user-service`)
- **Template Engine (`NotificationTemplateEngine`):**
  - Khớp 100% template tiếng Việt theo Contract v2.1 §14.
  - Quy tắc đặc thù: `DEPOSIT_STATUS_CHANGED` khi `status = 'LOCKED'` không tạo notification (chỉ lưu receipt hash để dedup); `DEPOSIT_PAID` tạo thông báo cọc đã thanh toán.
- **Cơ chế Dedup & Transaction (`EventConsumerService`):**
  - PostgreSQL transaction advisory lock theo `eventId` (`pg_advisory_xact_lock`).
  - Hash canonical SHA-256 payload ổn định (`CanonicalJsonUtil`), tự động sort/deduplicate `recipientIds`.
  - Phát hiện `EVENT_ID_REUSED`: Nếu cùng `eventId` nhưng payload hash khác nhau -> bắn `EventIdReusedException` (để định tuyến sang DLT ở Phase 3/4).
  - Persist toàn bộ `notification_receipts` và `notifications` trong cùng 1 database transaction; commit offset Kafka chỉ sau khi DB commit (`MANUAL_IMMEDIATE`).
- **Kafka Listener & Topics:**
  - `NotificationKafkaListener` subscribe 6 topic kinh doanh:
    - `soa.trading.offer.v1`
    - `soa.chat.message.v1`
    - `soa.contract.lifecycle.v1`
    - `soa.payment.deposit.v1`
    - `soa.user.reputation.v1`
    - `soa.user.account.v1`
  - Group ID: `notification-service-v1`.
- **Test Results:** 15/15 tests pass (3 FoundationTest, 7 NotificationControllerTest, 5 EventConsumerServiceTest) trên Testcontainers PostgreSQL thật.

## Hoàn thành Phase 3: Idempotency, Transaction Boundaries & Dedup Engine (19/10/2026)

- **Độc lập và tính bất biến của Canonical SHA-256 Hash (`CanonicalJsonUtil`):**
  - Tự động sắp xếp trường JSON theo thứ tự bảng chữ cái (`ORDER_MAP_ENTRIES_BY_KEYS`).
  - Sắp xếp và loại trùng danh sách `recipientIds` tăng dần để thứ tự hoặc trùng lặp người nhận không làm biến đổi chuỗi hash đại diện.
  - Kiểm thử `CanonicalJsonUtilTest` chứng minh payload đảo thứ tự key hoặc duplicate recipients đều sinh cùng một mã hash 64-character SHA-256 chính xác.
- **Biên độ giao dịch (Transaction Boundaries) & Advisory Lock:**
  - `pg_advisory_xact_lock(eventId)` giữ khóa cho đến khi transaction kết thúc (commit hoặc rollback), ngăn ngừa triệt để 2 consumer cạnh tranh xử lý cùng 1 eventId.
  - Toàn bộ `notification_receipts` và `notifications` cho tất cả người nhận đều ghi trong **cùng 1 DB transaction**. Nếu bất kỳ người nhận nào phát sinh lỗi -> toàn bộ sự kiện được rollback sạch sẽ.
- **Kiểm soát tính lũy thừa (Idempotency) & Bảo toàn Receipt:**
  - Duplicate cùng payload: Trở về thành công ngay lập tức mà không ghi trùng dữ liệu vào database.
  - Replay sau khi dữ liệu `notifications` bị xóa do retention 90 ngày: Bản ghi `notification_receipts` vẫn tồn tại bền vững, phát hiện duplicate và ngăn chặn tái tạo thông báo cũ.
  - Event khác nhau (`eventId` khác nhau) nhưng có cùng nội dung nghiệp vụ: Không tự ý dedup ngoài hợp đồng, mỗi `eventId` được xử lý độc lập đúng ranh giới.
  - Cùng `eventId` nhưng payload khác nhau -> Ném `EventIdReusedException` báo vi phạm `EVENT_ID_REUSED`.
- **Test Results:** 20/20 tests pass (3 FoundationTest, 7 NotificationControllerTest, 8 EventConsumerServiceTest, 2 CanonicalJsonUtilTest).

## Hoàn thành Phase 4: Non-blocking Retry Topics (5s, 30s, 120s), DLT & Scheduled Retention Cleanup Job (27/10/2026)

- **Cơ chế Non-blocking Retry (5s, 30s, 120s):**
  - Triển khai `KafkaRetryDltService`: Quản lý 3 topic retry riêng biệt cho mỗi topic gốc $T$:
    - $T\text{.notification-retry-1}$: delay 5s (attempt 2).
    - $T\text{.notification-retry-2}$: delay 30s (attempt 3).
    - $T\text{.notification-retry-3}$: delay 120s (attempt 4).
  - Tách rời hoàn toàn khỏi thread listener chính (không `Thread.sleep`), bảo toàn throughput xử lý sự kiện.
  - Sau attempt 4 hoặc khi gặp lỗi non-retryable (sai schema `InvalidEventException`, trùng lặp sai payload `EventIdReusedException`), lập tức chuyển tiếp đến topic Dead Letter Queue $T\text{.notification-dlt}$.
- **DLT Metadata & Kiểm soát chuyển tiếp:**
  - `DeadLetterRecord` lưu trữ đầy đủ ngữ cảnh thất bại: `originalTopic`, `originalPartition`, `originalOffset`, `eventId`, `correlationId`, `attempts`, `errorCode`, `errorMessage`, `failedAt` và `payload` gốc.
  - Cam kết an toàn broker: Phải publish thành công vào topic Retry/DLT thì mới commit offset của message gốc; nếu forward gặp lỗi sẽ ném exception để giữ record, không bao giờ tự ý drop hoặc commit giả mạo.
- **Scheduled Retention Cleanup Job:**
  - `NotificationCleanupJob` kích hoạt định kỳ (`0 0 2 * * *`), xóa hàng loạt các thông báo trong bảng `notifications` có `created_at < now - 90 days`.
  - **Bảo toàn Receipts**: Bản ghi `notification_receipts` không bị xóa để bảo vệ khả năng dedup vĩnh viễn trước các kịch bản replay lại sự kiện cũ.
- **Test Results:** 28/28 tests pass:
  - `FoundationTest`: 3 tests
  - `NotificationControllerTest`: 7 tests
  - `EventConsumerServiceTest`: 8 tests
  - `CanonicalJsonUtilTest`: 2 tests
  - `KafkaRetryDltServiceTest`: 7 tests
  - `NotificationCleanupJobTest`: 1 test

## Hoàn thành Phase 5: Integration User/Gateway/Producer Fixtures, Docker & Hoàn tất Dự án (27/10/2026)

- **Kiểm thử tích hợp chuỗi liên dịch vụ (`UserGatewayProducerIntegrationTest`):**
  - Giả lập toàn bộ luồng tích hợp: Producer Kafka -> Consumer Notification Service -> User Service Access-State -> API Gateway REST.
  - Sử dụng `MockWebServer` để mô phỏng chính xác hành vi của User Service HTTP endpoint `/internal/v1/accounts/{accountId}/access-state` với `X-Service-Key`.
  - **Kiểm chứng tài khoản LOCKED**: Consumer Kafka vẫn tiếp nhận và persist thông báo bình thường (cho mục đích lưu vết khi mở khóa), nhưng các cuộc gọi REST qua Gateway từ tài khoản LOCKED bị chặn trả về `403 ACCOUNT_NOT_ACTIVE`.
  - **Kiểm chứng User Service gặp sự cố/timeout**: Hệ thống trả về `503 ACCESS_STATE_UNAVAILABLE` mà không bao giờ fallback cho phép truy cập trái phép.
- **Đóng gói Docker & Docker Compose (`Dockerfile`, `docker-compose.yml`):**
  - Multi-stage build `Dockerfile` tối ưu dựa trên Eclipse Temurin 21 (alpine), chạy bằng non-root user `appuser`.
  - `docker-compose.yml`: Định nghĩa đầy đủ môi trường cục bộ gồm PostgreSQL 16, Kafka (KRaft), và Notification Service với healthcheck và biến môi trường cấu hình sẵn.
- **Tài liệu & Cấu hình môi trường:**
  - Cập nhật `.env.example` đầy đủ 12 biến môi trường theo quy chuẩn microservice.
  - Cập nhật `README.md` mô tả toàn bộ kiến trúc, API contract, các luồng nghiệp vụ, hướng dẫn triển khai bằng Docker/Maven.
- **Tổng kết kiểm thử tự động toàn dự án:** **31/31 tests PASS 100%**:
  - `FoundationTest`: 3 tests
  - `NotificationControllerTest`: 7 tests
  - `EventConsumerServiceTest`: 8 tests
  - `CanonicalJsonUtilTest`: 2 tests
  - `KafkaRetryDltServiceTest`: 7 tests
  - `NotificationCleanupJobTest`: 1 test
  - `UserGatewayProducerIntegrationTest`: 3 tests





