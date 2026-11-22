# Payment — Contract, Deposit và Dispute

Payment sở hữu cả ba module; không có deployment Contract riêng. ID UUID; cọc mô phỏng 5%, tiền mua lúa ngoài app. Trader tạo Contract từ Offer ACCEPTED + conversation tương ứng, Farmer accept; sau cọc chốt độc quyền mới ACTIVE/LOCKED.

| Method/path                                                     | Body/quyền                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| POST /api/v1/payments/contracts                                 | Trader: offerId,conversationId,farmerId,totalAmount,deliveryDate,terms theo source hiện tại |
| PATCH /api/v1/payments/contracts/{contractId}                   | Trader own CREATED: totalAmount,deliveryDate,terms                                          |
| POST /api/v1/payments/contracts/{contractId}/accept             | Farmer own, không cần body nghiệp vụ                                                        |
| GET /api/v1/payments/contracts/{contractId}                     | participant/Admin theo quyền, có disputeSummary                                             |
| GET /api/v1/payments/deposits                                   | cursor/limit/status → {data,nextCursor} trong source                                        |
| GET /api/v1/payments/deposits/{contractId}                      | **contractId**, không thay bằng tracking ID                                                 |
| POST /api/v1/payments/deposits/{contractId}/pay                 | Trader own; body rỗng hoặc {}                                                               |
| POST /api/v1/payments/contracts/{contractId}/complete           | Trader own; body rỗng hoặc {}                                                               |
| POST /api/v1/payments/deposits/{contractId}/release             | Farmer own; body rỗng hoặc {}                                                               |
| POST /api/v1/payments/contracts/{contractId}/disputes           | participant: reasonCode,description,evidenceRefs[]                                          |
| GET /api/v1/payments/disputes/{disputeId}                       | participant/Admin                                                                           |
| POST /api/v1/payments/disputes/{disputeId}/responses            | statement,evidenceRefs[]                                                                    |
| POST /api/v1/payments/disputes/{disputeId}/evidence             | multipart file,description tùy chọn                                                         |
| GET /api/v1/payments/disputes/{disputeId}/evidence              | cursor/limit → {items,nextCursor}                                                           |
| GET /api/v1/payments/disputes/{disputeId}/evidence/{evidenceId} | bytes, không thêm /content                                                                  |
| GET /api/v1/payments/admin/disputes                             | Admin, cursor/limit/status → {items,nextCursor}                                             |
| POST /api/v1/payments/admin/disputes/{disputeId}/review         | {note,expectedVersion?}; không reset hạn                                                    |
| POST /api/v1/payments/admin/disputes/{disputeId}/decisions      | quyết định, version, evidence; Idempotency-Key=decisionId                                   |
| POST /api/v1/payments/admin/decisions/{decisionId}/reversal     | reversalDecisionId,reason,evidenceRefs[]                                                    |
| POST /api/v1/payments/admin/contracts/{contractId}/complete     | reason,evidenceRefs[],expectedVersion; điều kiện D07                                        |
| POST /api/v1/payments/admin/contracts/{contractId}/disputes     | onBehalfOfAccountId,reasonCode,description,verificationNote                                 |

Decision body: {decisionId,expectedVersion,outcome,liableAccountId?,violationCode?,penaltyPoints?,depositDisposition,reason,evidenceRefs[]}. Outcome đúng: NO_VIOLATION, FARMER_VIOLATION, TRADER_VIOLATION, MUTUAL_CANCEL, INSUFFICIENT_EVIDENCE. Không đổi thành TRADER_FAULT/DISMISSED. Disposition: KEEP_HELD,RELEASE_TO_FARMER,FORFEIT_TO_FARMER,REFUND_TO_TRADER,NONE; backend kiểm tổ hợp hợp lệ. Không tự tính số điểm phạt trên FE để kết luận.

Contract CREATED→PENDING_DEPOSIT→ACTIVE→COMPLETED, CANCELLED theo xử lý hợp lệ. Deposit PENDING→LOCKED→RELEASABLE→RELEASED, hoặc FORFEITED/REFUNDED. Dispute OPEN→UNDER_REVIEW→RESOLVED; hold chặn rút. deliveryDate+24h chỉ mở điều kiện rút, không tự complete/thưởng. Admin review responseDueAt +48h, không tự phạt vì im lặng; điều kiện thưởng completedAt+72h xử lý backend. Sau cọc terminal không tự đảo/chi lại khi reversal.

depositId=paymentId=paymentTrackingId là alias của tracking; contractId khác. Dù vậy URL cọc hiện tra theo contractId. Không gửi amount/paid=true để nạp; 409 refetch state, 503 chưa biết kết quả thì không báo thành công. Tiền response string, không parseFloat tính cọc. Chỉ sao chép DTO đã kiểm từ source/OpenAPI, không dùng chung một Page cho tất cả endpoint.

## Nguồn và chi tiết request/response

[Spec đầy đủ](../../reference/contracts/06-payment-service.md). Phần bên dưới trích mục 6–7 từ spec, không phải tuyên bố API đã chạy. Nếu khác source Chat/Payment, dùng ghi chú đối chiếu bên trên và docs/09, không tự bỏ yêu cầu nghiệp vụ.

<details>
<summary>Xem contract và ví dụ gốc</summary>

```text
6. API Contract — module Contract/Deposit thuộc Payment, giữ URL và quyền participant hiện có
Owner: Payment Service. Client Web/Mobile đi qua Gateway; identity từ JWT. Response thành công dùng JSON camelCase như User Service: object cho chi tiết, {data,nextCursor} cho danh sách; lỗi thống nhất {timestamp,status,code,message,path}.
Contract API — module thuộc Payment:

Method
Endpoint
Quyền / mục đích
POST
/api/v1/payments/contracts
Trader • gửi Contract từ Chat
GET
/api/v1/payments/contracts/{contractId}
Participant • xem Contract
PATCH
/api/v1/payments/contracts/{contractId}
Trader • sửa khi CREATED
POST
/api/v1/payments/contracts/{contractId}/accept
Farmer • accept; chưa chốt
POST
/api/v1/payments/contracts/{contractId}/complete
Trader • xác nhận hoàn tất
POST /api/v1/payments/contracts — Trader gửi Contract
Body: {offerId,conversationId,totalAmount,deliveryDate,terms}. Payment lấy traderId từ JWT, farmerId từ Offer do Trading xác nhận và kiểm tra conversationId/offerId/participant tại Chat; không tin ID chủ sở hữu do client tự gửi. 201 trả {contractId,offerId,conversationId,farmerId,traderId,totalAmount,deliveryDate,terms,status:"CREATED",createdAt,updatedAt}. Contract mới cố định penaltyRate=20 tính trên depositAmount, trả penaltyRate trong create/GET DTO và hiển thị trước Farmer accept; không lấy rate tùy ý từ client. Contract cũ giữ điều khoản đã accept.
GET /api/v1/payments/contracts/{contractId} — chỉ hai participant; 200 trả chi tiết trên.
PATCH /api/v1/payments/contracts/{contractId} — chỉ Trader, chỉ khi CREATED; cập nhật totalAmount/deliveryDate/terms, không đổi Offer hoặc participant; 200 trả Contract mới.
POST /api/v1/payments/contracts/{contractId}/accept — chỉ Farmer, body rỗng; transaction CREATED→PENDING_DEPOSIT và tạo một tracking PENDING; 200 {contractId,status,paymentTrackingId,depositRate:5,depositAmount}. Accept chưa chốt/khóa bài đăng; request lặp trả kết quả hiện tại, không tạo tracking/event trùng.
POST /api/v1/payments/contracts/{contractId}/complete — chỉ Trader, body rỗng, Contract ACTIVE; transaction COMPLETED và tracking RELEASABLE khi đang LOCKED. 200 {contractId, status, paymentTrackingId, depositStatus}; nếu cọc đã rút theo mốc +24h thì không hạ trạng thái RELEASED. Không tự đổi thời điểm xác nhận khi gọi lại. Điều kiện bắt buộc: không có tranh chấp hợp lệ OPEN/UNDER_REVIEW; kiểm row lock trước mở/rút cọc.
Lỗi: 400 dữ liệu/UUID sai; 401 thiếu token; 403 sai người/account không được phép; 404 Contract không có; 409 sai trạng thái; 503 không xác minh được dữ liệu liên service. Mỗi thay đổi được lưu phát thông báo Contract cho cả hai account; request lặp không thay đổi dữ liệu không tạo event mới.

Method
Endpoint
Quyền / mục đích
GET
/api/v1/payments/deposits/{contractId}
Hai bên • xem cọc hợp đồng
GET
/api/v1/payments/deposits
Hai bên • danh sách cọc của mình
POST
/api/v1/payments/deposits/{contractId}/pay
Trader • nạp cọc mô phỏng5% Contract; không nhận số tiền client tự khai

POST
/api/v1/payments/deposits/{contractId}/release
Farmer • rút khi RELEASABLE
GET /api/v1/payments/deposits/{contractId} — FARMER/TRADER của Contract. 200: paymentTrackingId, contractId, depositRate, depositAmount, status, paidAt, deliveryDate, releaseAt, releasedAt; 403/404.
GET /api/v1/payments/deposits — FARMER/TRADER. Query status, cursor, limit. 200: danh sách cọc của các Contract mình tham gia; 401 nếu chưa xác thực.
POST /api/v1/payments/deposits/{contractId}/pay — Trader đúng Contract PENDING_DEPOSIT và account ACTIVE; body rỗng, số tiền do Payment tính 5% từ Contract.
Backend mô phỏng giao dịch, không tích hợp cổng thanh toán và không nhận amount/paid=true do client khai báo. Khi kết quả mô phỏng thành công, Payment phối hợp thao tác chốt độc quyền tại Trading bằng offerId + contractId + paymentTrackingId. Trading tra Offer→Listing và bảo đảm chỉ một giao dịch được chốt theo bài đăng; hai Trader cùng nạp chỉ một yêu cầu được quyền thành công.
Chỉ trả 200 sau khi chốt hợp lệ và Payment lưu tracking LOCKED/Contract ACTIVE: {paymentTrackingId, contractId, depositAmount, status:"LOCKED", contractStatus:"ACTIVE", simulated:true}. Request lặp cùng tracking trả kết quả đã ghi, không nạp lại. 409 nếu bài đăng đã chốt Contract khác; 503 nếu phối hợp chưa xác định được kết quả. Không báo thành công khi chỉ mới gửi Kafka hoặc khi giao dịch mô phỏng thất bại.
POST /api/v1/payments/deposits/{contractId}/release — Farmer đúng Contract, account ACTIVE, tracking RELEASABLE. Backend mô phỏng rút, lưu RELEASED/releasedAt rồi trả 200, simulated=true; không chuyển tiền thật. 403 sai người, 409 chưa đủ điều kiện; request lặp cho lần rút đã thành công trả lại cùng kết quả, không rút hai lần.
API Contract và cọc đều thuộc Payment. Farmer accept Contract tạo tracking trong transaction nội bộ; Trader xác nhận hoàn tất cập nhật Contract COMPLETED và tracking RELEASABLE khi hợp lệ. Không cần CONTRACT_ACCEPTED/CONTRACT_COMPLETED trên Kafka để Payment gọi chính mình. Payment phát CONTRACT_CREATED/CONTRACT_STATUS_CHANGED cho Chat và Notification (cả hai account); DEPOSIT_PAID cho Notification và Trading theo luồng owner chốt; DEPOSIT_STATUS_CHANGED phục vụ trạng thái cọc nếu consumer cần.

6.1. API tranh chấp/Admin — baseline v2.1
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
6.2. Evidence và hỗ trợ account khóa
POST /api/v1/payments/disputes/{disputeId}/evidence: multipart file,description; participant ACTIVE hoặc Admin độc lập,201 {evidenceId,downloadUrl,contentType,sizeBytes}. GET cùng path/{evidenceId}:200 bytes,404 người ngoài; ảnh JPEG/PNG/WebP≤5 MiB,volume Payment,metadata dispute_evidence. POST /api/v1/payments/admin/contracts/{contractId}/disputes: Admin xác minh người gửi qua email đã đăng ký, body {onBehalfOfAccountId,reasonCode,description,verificationNote};201 dispute. Người bị khóa không gọi vượt access-state; Admin ghi rõ đại diện,không giả JWT. Quyền/DTO/storage theo Contract v2.1 §18–19.
GET Contract bổ sung disputeSummary:{disputeId,status,responseDueAt,depositHold}|null cho participant biết hồ sơ đang xử lý; Admin review đầu gán assignedAdminId=actorId,responseDueAt=now+48h. Review idempotent/handover không reset deadline; handover chỉ Admin độc lập và có audit.
7. API Examples
GET /api/v1/payments/deposits/550e8400-e29b-41d4-a716-446655440010
Ví dụ tạo Contract:
POST /api/v1/payments/contracts
{"offerId":"550e8400-e29b-41d4-a716-446655440020","conversationId":"550e8400-e29b-41d4-a716-446655440002","totalAmount":"92000000.00","deliveryDate":"2026-10-18T00:00:00Z","terms":"Hai bên thống nhất giao hàng theo điều khoản."}
201 response rút gọn: {"contractId":"550e8400-e29b-41d4-a716-446655440010","status":"CREATED"}.
Farmer accept — response rút gọn: {"contractId":"550e8400-e29b-41d4-a716-446655440010","status":"PENDING_DEPOSIT","depositRate":5,"depositAmount":"4600000.00"}; chưa chốt Trader.
Trader gọi /api/v1/payments/deposits/{contractId}/pay, body {} — 200 response rút gọn: {"status":"LOCKED","contractStatus":"ACTIVE","depositAmount":"4600000.00","simulated":true} sau chốt độc quyền. Contract của Trader khác trong cùng bài đăng: 409.
Ví dụ mô phỏng: Contract 92.000.000 VND ×5%=cọc 4.600.000 VND. Backend lấy số tiền từ Contract đã accept. Tất cả nạp/rút/hoàn/mất cọc trong MVP là mô phỏng, không xử lý tiền thật.
POST /api/v1/payments/deposits/{contractId}/release — contractId là UUID String, Authorization: Bearer <token>. 409 CONFLICT nếu chưa đủ điều kiện rút; chỉ thành công khi Farmer đúng Contract, account ACTIVE và cọc RELEASABLE.
```

</details>
