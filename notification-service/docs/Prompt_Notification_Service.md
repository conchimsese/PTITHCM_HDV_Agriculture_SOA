# Prompt vibe code Notification Service

Dán nội dung dưới vào coding agent tại repo Notification, kèm BA - SOA.docx. Dùng agent/repo riêng với User để tránh sửa lẫn ownership.

---

Bạn là senior Java/Spring Boot engineer. Hãy trực tiếp triển khai Notification Service MVP theo phần Notification Service và CONTRACT CHUNG MVP v2.1 trong BA - SOA.docx. Đọc repo, thực hiện code/migrations/tests/README theo từng phần chạy được; không chỉ trả kế hoạch hoặc code giả.

## 1. Nguồn, stack và giới hạn

- Đọc AGENTS.md và repo hiện có trước sửa. Nếu tài liệu chưa có/không đọc được, báo thiếu đúng file; không giả định đã đọc.
- Ưu tiên quyết định mới nhất → Conflict → Contract v2.1 → rule → spec. V2.1 đã chốt receipts và10event; các đoạn cũ chỉ7event/chờ duyệt không được làm mất tính năng.
- Chỉ sửa Notification repo và integration fixtures/tài liệu của nó. Không tạo/sửa User,Chat,Payment,Trading hoặc Gateway implementation nếu không được yêu cầu.
- Java21/Spring Boot3.x theo repo; nếu trống, hướng Boot3.5.x/Maven theo BA, patch và APIs kiểm tài liệu đúng BOM. Spring Web,Validation,Security/OAuth2 JWT Resource Server,JPA,PostgreSQL,Flyway,Spring Kafka,Actuator và tests phù hợp. Không dùng JWT private key,không Redis/WebSocket/SSE/realtime riêng,không read-all/admin-other/RFQ/template editor.
- notification_db riêng,không DB/FK xuyên service,UUID/UTC/DTO camelCase/DB snake_case. REST frontend route /api/v1/notifications/**,port8086,Gateway8080,User8081.

## 2. Schema và REST

Flyway cho notifications và notification_receipts:

- notifications theo §5.1: notificationId,eventId,recipientId,type,title,content,sourceService,sourceEvent,referenceType,referenceId,status,occurredAt,createdAt,readAt; unique(event_id,recipient_id). status UNREAD/READ; CHECK readAt nhất quán.
- referenceType bắt buộc hỗ trợ ACCOUNT ngoài OFFER/CONVERSATION/CONTRACT/DEPOSIT; bảng cũ chưa ghi ACCOUNT nhưng v2.1/3 User event yêu cầu.
- Receipt PK(event_id,recipient_id),processedAt,payloadHash; không FK notification/user,không cleanup receipts trong MVP. Index list/unread/createdAt theo spec.
- Migration type/validator đủ10event,không giữ CHECK chỉ7loại.

Bốn endpoint chính xác:
1. GET /api/v1/notifications → {items,page,size,totalElements,totalPages}.
2. GET /api/v1/notifications/{notificationId} → NotificationDto.
3. PATCH /api/v1/notifications/{notificationId}/read không body → {notificationId,status,readAt}.
4. GET /api/v1/notifications/unread-count → {count}.

Page0,size20,max100;filter isRead/type;createdAt DESC/notificationId DESC. Resource scoping recipientId=sub;không recipientId query/body. ADMIN chỉ own account. ID người khác/không có/quá retention404. Mark-read concurrent/idempotent giữ readAt lần đầu. DTO không expose recipientId/eventId/raw data.

Cutoff createdAt>now−90ngày áp dụng list/detail/count/read trước cleanup. Dùng clock testable và nhất quán cutoff trong mỗi request. Cleanup nội dung theo batch,không xóa receipts. Không tự áp retention90ngày cho media hoặc Kafka.

## 3. Security

- Verify RS256 signature/algorithm/exp/iss urn:soa:user-service/aud soa-api;sub UUID,roleFARMER/TRADER/ADMIN,kid/public-key set;clock skew≤60s,key overlap như v2.1. Không tự thêm OIDC/JWKS discovery; issuer URN không phải URL discovery.
- Protected REST gọi GET /internal/v1/accounts/{sub}/access-state của User với service key riêng Notification,timeout tổng1giây,không cache ACTIVE. state không ACTIVE403 ACCOUNT_NOT_ACTIVE;timeout/unavailable503 ACCESS_STATE_UNAVAILABLE;account không tồn tại từ chối. Không trust x-user-id/x-user-role client.
- JWT thiếu/sai/hết hạn401;service không có private key. CORS ở Gateway;backend không mở wildcard CORS. Internal không public.
- Kafka consumer là máy với máy,không dùng JWT recipient và không gọi access-state để loại account LOCKED; vẫn persist thông báo của họ. REST LOCKED bị chặn,email khóa/mở do User gửi.
- Health tối thiểu,không expose config/secrets. Error DTO timestamp/status/code/message/path/traceId?;không token/key/stacktrace/raw payload.

## 4. Event contract bắt buộc

Envelope v1: eventId,eventType,eventVersion:1,sourceService,occurredAt,actorId?,recipientIds,referenceType,referenceId,correlationId?,data. UUID/UTC,recipients không rỗng,sắp/loại trùng khi canonicalize. Validate required fields/types/source theo event; dữ liệu optional mở rộng không tự coi là invalid nếu tương thích contract.

Group chính notification-service-v1;subscribe6 business topics:

| Topic/key | Event | Source |
|---|---|---|
| soa.trading.offer.v1 / offerId | OFFER_CREATED,OFFER_ACCEPTED | trading-service |
| soa.chat.message.v1 / conversationId | MESSAGE_CREATED | chat-service |
| soa.contract.lifecycle.v1 / contractId | CONTRACT_CREATED,CONTRACT_STATUS_CHANGED | payment-service |
| soa.payment.deposit.v1 / depositId | DEPOSIT_PAID,DEPOSIT_STATUS_CHANGED | payment-service |
| soa.user.reputation.v1 / accountId | REPUTATION_CHANGED | user-service |
| soa.user.account.v1 / accountId | ACCOUNT_LOCKED,ACCOUNT_UNLOCKED | user-service |

Data required/reference theo v2.1 §8–9. DEPOSIT alias depositId=paymentId=paymentTrackingId,một UUID;contractId khác. Farmer/Trader đều nhận Contract/Deposit;Offer_CREATEDFarmer,Offer_ACCEPTEDTrader;Message recipient còn lại,không sender. Dùng recipients producer,không query DB/REST để suy recipients thiếu.

USER_PROFILE_UPDATED và CONTRACT_REPUTATION_DECIDED không thuộc subscription Notification. Không tự tính điểm hoặc dựa Deposit status để tạo REPUTATION_CHANGED.

DEPOSIT_STATUS_CHANGED chuyển LOCKED: validate hợp lệ nhưng không tạo notification;DEPOSIT_PAID là thông báo nạp. Nên persist receipt/hash cho event bị lọc để vẫn kiểm eventId reused/replay; ghi lựa chọn này trong ADR. Contract ACTIVE có thông báo Contract riêng,không viết lại nội dung “đã nạp cọc”.

3 User event reference ACCOUNT/accountId,recipient=[accountId],payload v2.1. 3 template đúng §14. 7 title/template giao thương theo baseline v1; nếu repo/tài liệu chưa cung cấp đủ literal content/statusLabel, ghi wording dự thảo và mapping enum từ Payment cho owner duyệt,không tự mô tả một trạng thái như đã chi tiền khi nó chỉ đủ điều kiện rút. Chỗ wording thiếu không chặn code schema/dedup/REST.

## 5. Dedup và transaction

- PostgreSQL transaction advisory lock theo eventId (hoặc cơ chế tương đương có test). So canonical SHA256 business envelope với receipts của eventId trước insert,kể cả recipients thay đổi. Same eventId khác payload→DLT EVENT_ID_REUSED,không overwrite.
- Canonicalization xác định: keys ổn định,recipientIds sorted/dedup,không retry transport headers;giữ business data. Có fixtures chứng minh thứ tự key/recipients không đổi nghĩa.
- Receipt + notifications cho toàn bộ recipients mới cùng transaction;recipient2 lỗi rollback cả event. ON CONFLICT có kiểm soát,không catch unique violation rồi tiếp tục trong transaction PostgreSQL đã abort.
- Duplicate hợp lệ success; replay sau xóa content không tạo lại. Listener chỉ hoàn tất/offset commit sau DB commit,không ack sớm.
- enable.auto.commit=false;DB transaction ở persistence service,boundary dễ kiểm chứng,không Kafka container transaction cho non-blocking retry.

## 6. Retry/DLT/replay

- Lần đầu +3retry:5s,30s,120s;failed attempt4→DLT. Với mỗi topicT:names T.notification-retry-1/2/3,T.notification-dlt;retry/DLT retention7ngày.
- Dùng cơ chế non-blocking phù hợp Spring Kafka resolved version;không Thread.sleep120s trên main listener,không default exponential rồi claim đúng5/30/120.
- Schema/UUID/eventVersion/source invalid→DLT trực tiếp;DB/dependency transient→retry. Không biến mọi lỗi thành transient.
- Broker xác nhận publish retry/DLT trước commit record gốc. Forward lỗi không drop/commit như recovered;pause/backoff/alert phù hợp. Test đường broker lỗi khi forward.
- Poison bytes phải đi DLT với payload gốc+metadata ngay cả lỗi deserialize;không bị loop do serializer không gửi được bytes. Không log payload nhạy cảm.
- DLT có original topic/partition/offset/eventId khi đọc được,attempts/errorCode/failedAt/correlationId. Không bật log-and-discard consumer,không infinite automatic replay. README có quy trình kiểm/replay giữ eventId/payload;repair payload không giả thành duplicate đã duyệt.
- Retry có thể đổi thứ tự;Notification chỉ lịch sử,không dùng event để cập nhật trạng thái Contract/account. occurredAt khác createdAt,retention/sort theo createdAt.

## 7. Triển khai và kiểm thử

Thực hiện tuần tự: (1) application/schema/security/errors/4REST, (2)10event DTO/template/fixtures, (3)dedup transaction/consumer, (4)retry/DLT/cleanup/replay, (5)integration User/Gateway/producer fixtures. Tiếp tục sau check pass,không hỏi lại routine.

PostgreSQL/Kafka thật qua Testcontainers cho hành vi concurrency/offset/ON CONFLICT,retry. Mock User HTTP trong test để kiểm200 ACTIVE/nonACTIVE404/down/timeout;runtime không fallback ACTIVE.

Tests bắt buộc:own vs other kể cả ADMIN;pagination/filter/cutoff/readAt race;10event/source/version/refACCOUNT;DEPOSIT LOCKED filtered;2recipients/duplicate list/partial rollback;concurrent sameevent;differenteventId cùng nghiệp vụ không được tự business-dedup ngoài contract Notification;eventId reused khác data/recipients→DLT;crash DBcommit trước offset→không trùng;cleanup90ngày rồi replay;retry4 attempts/lịch5/30/120,DLT retention config,forward failure không mất record;poison deserialize;Kafka LOCKED recipient vẫn persist,REST bị403;không subscribe profile/decision.

Đầu ra:code/Flyway/Dockerfile/Compose local Notification,.env.example,README,docs/implementation-decisions.md,10 golden fixtures và kết quả tests thật. Không hardcode secrets;public key/service key lấy từ env,không dùng fake token ở runtime. Nếu infra không chạy được,báo test nào chưa chạy thay vì đánh dấu pass. Fixtures không chứng minh producer thật đã tích hợp.

Bắt đầu đọc repo và triển khai ngay. Cuối lượt báo module đã hoàn tất,checks thực tế,blockers cục bộ và bước ghép User/Gateway.
