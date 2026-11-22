# Notification Service (MVP v2.1)

Dịch vụ thông báo trong kiến trúc Microservices Nông nghiệp (SOA).
Triển khai trên nền tảng **Java 21, Spring Boot 3.5.16, Maven 3.9.11, PostgreSQL 16, Kafka, Testcontainers**.

Cổng dịch vụ: **8086** (Gateway route: `/api/v1/notifications/**`).

---

## 1. Tính năng cốt lõi

1. **4 REST Endpoints (`/api/v1/notifications`)**:
   - `GET /api/v1/notifications`: Danh sách thông báo phân trang (`page`, `size` max 100), lọc `isRead`, `type`, sắp xếp `createdAt DESC, notificationId DESC`.
   - `GET /api/v1/notifications/{notificationId}`: Chi tiết thông báo (Resource scoping theo `sub` account, kể cả ADMIN không xem được người khác -> 404).
   - `PATCH /api/v1/notifications/{notificationId}/read`: Đánh dấu đọc có điều kiện atomic, idempotent (giữ nguyên timestamp `readAt` lần đầu).
   - `GET /api/v1/notifications/unread-count`: Đếm thông báo chưa đọc trong hạn lưu trữ.
   - **Retention Cutoff**: Áp dụng giới hạn lưu trữ 90 ngày (`createdAt > now - 90 days`) nhất quán trên tất cả API.

2. **Bảo mật & Inter-Service Contract**:
   - Xác thực RS256 JWT (`iss: urn:soa:user-service`, `aud: soa-api`, clock skew ≤ 60s).
   - Gọi kiểm tra trạng thái tức thì `GET /internal/v1/accounts/{sub}/access-state` từ User Service với `X-Service-Key`. Không cache `ACTIVE`; nếu tài khoản không ACTIVE trả 403 `ACCOUNT_NOT_ACTIVE`; lỗi/timeout trả 503 `ACCESS_STATE_UNAVAILABLE`.

3. **Kafka Consumer & 10 Event Contracts**:
   - Lắng nghe 6 topic nghiệp vụ:
     - `soa.trading.offer.v1`: `OFFER_CREATED`, `OFFER_ACCEPTED` (từ `trading-service`).
     - `soa.chat.message.v1`: `MESSAGE_CREATED` (từ `chat-service`).
     - `soa.contract.lifecycle.v1`: `CONTRACT_CREATED`, `CONTRACT_STATUS_CHANGED` (từ `payment-service`).
     - `soa.payment.deposit.v1`: `DEPOSIT_PAID`, `DEPOSIT_STATUS_CHANGED` (từ `payment-service`).
     - `soa.user.reputation.v1`: `REPUTATION_CHANGED` (từ `user-service`).
     - `soa.user.account.v1`: `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED` (từ `user-service`).
   - Consumer là giao tiếp máy-với-máy: Tài khoản `LOCKED` vẫn được lưu thông báo vào database (để xem khi mở khóa), nhưng REST API của họ bị chặn 403.
   - `DEPOSIT_STATUS_CHANGED` sang `LOCKED`: Validate hợp lệ nhưng không tạo notification (chỉ lưu receipt để dedup).

4. **Dedup, Advisory Lock & Transaction Boundaries**:
   - PostgreSQL transaction advisory lock theo `eventId` (`pg_advisory_xact_lock`).
   - SHA-256 Canonical Hash xác định (bất biến với thứ tự key và thứ tự `recipientIds`).
   - Ghi đồng thời `notification_receipts` và `notifications` cho tất cả người nhận trong cùng 1 DB transaction.
   - Chặn sự kiện tái sử dụng `eventId` khác payload (`EVENT_ID_REUSED`).

5. **Non-blocking Retry & Dead Letter Queue (DLT)**:
   - 3 topic retry riêng biệt: `$T.notification-retry-1` (5s), `$T.notification-retry-2` (30s), `$T.notification-retry-3` (120s).
   - Attempt 4 hoặc lỗi schema/poison pill -> Chuyển thẳng `$T.notification-dlt`.
   - Lưu trữ metadata: `originalTopic`, `originalPartition`, `originalOffset`, `eventId`, `correlationId`, `attempts`, `errorCode`, `errorMessage`.

6. **Retention Cleanup Job**:
   - Tác vụ `@Scheduled` chạy định kỳ lúc 02:00 AM mỗi ngày.
   - Xóa các thông báo quá 90 ngày; bảo toàn vĩnh viễn bảng `notification_receipts`.

---

## 2. Hướng dẫn chạy cục bộ (Local Development)

### Cách 1: Chạy bằng Docker Compose (Khuyên dùng)
Khởi động trọn bộ cơ sở dữ liệu PostgreSQL, Kafka và Notification Service:
```bash
docker compose up -d
```
Kiểm tra sức khỏe dịch vụ:
```bash
curl http://localhost:8086/actuator/health
```

### Cách 2: Chạy trực tiếp bằng Maven Wrapper
1. Chuẩn bị file `.env` từ [.env.example](.env.example):
```powershell
Copy-Item .env.example .env
```
2. Cập nhật thông tin kết nối PostgreSQL và Kafka trong `.env`.
3. Chạy ứng dụng:
```powershell
.\mvnw.cmd spring-boot:run
```

---

## 3. Kiểm thử tự động (Integration Tests)

Dự án sử dụng **Testcontainers** khởi chạy PostgreSQL 16 và MockWebServer thật:
```powershell
.\mvnw.cmd clean test
```
Toàn bộ **31 integration tests** kiểm tra đầy đủ mọi tình huống nghiệp vụ:
- `FoundationTest`: Flyway migration, schema check, health endpoint.
- `NotificationControllerTest`: 4 REST Endpoints, JWT RS256, access-state, cutoff 90 ngày.
- `EventConsumerServiceTest`: 10 Event Golden Fixtures, Deduplication, Replay sau xóa, Reused Event ID.
- `CanonicalJsonUtilTest`: Băm SHA-256 canonical bất biến.
- `KafkaRetryDltServiceTest`: Non-blocking retry 5s/30s/120s, chuyển DLT.
- `NotificationCleanupJobTest`: Xóa thông báo quá hạn, bảo toàn receipts.
- `UserGatewayProducerIntegrationTest`: Tích hợp chuỗi Producer -> Consumer -> User Service (Active/Locked/Timeout) -> Gateway REST.
