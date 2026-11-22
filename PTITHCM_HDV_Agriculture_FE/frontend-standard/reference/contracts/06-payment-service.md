# Payment Service

PAYMENT / DEPOSIT SERVICE
 
1. Service Overview
Payment Service sở hữu module Contract và module cọc trong cùng service. Trader gửi Contract từ Chat, Farmer chấp nhận; cọc bằng 5% tổng giá trị Contract. MVP chỉ mô phỏng nạp/rút cọc, không tích hợp cổng thanh toán hoặc thu/chuyển tiền thật. Một bài đăng có thể có nhiều Trader được accept để trao đổi, nhưng chỉ Trader nạp cọc mô phỏng thành công đầu tiên được chốt giao dịch.
Database payment_db (PostgreSQL) thuộc Payment, gồm contracts và payment_tracking. Payment tạo UUID cho Contract/tracking, quản lý điều khoản, trạng thái Contract và cọc. contracts.offer_id liên kết Trading; không lưu/sở hữu Listing, Trading giữ Offer → bài đăng. payment_tracking.contract_id là FK nội bộ tới contracts, UNIQUE. Payment không truy cập user_db/trading_db/farming_db.
 
2. Architecture Overview
Trading quản lý bài đăng/Offer và cho Farmer accept nhiều Trader → Chat mở phòng theo từng offerId → Trader gửi Contract qua Payment → Farmer accept, Contract PENDING_DEPOSIT và tracking PENDING → Trader nạp cọc mô phỏng 5% → phối hợp Trading chốt duy nhất một Trader theo bài đăng → Payment ghi cọc LOCKED và Contract ACTIVE → phát DEPOSIT_PAID cho Trading, CONTRACT_STATUS_CHANGED cho Chat/Notification. Accept Offer/Contract chưa chốt và chưa khóa Listing. Kafka giao tiếp liên service; Contract/cọc phối hợp nội bộ Payment, không qua service riêng.
 
3. Service Responsibility
3.1. Trách nhiệm
• Tạo, trả chi tiết, cập nhật điều khoản khi chưa accept, nhận Farmer accept và Trader xác nhận hoàn tất Contract; tạo một tracking/Contract, cọc 5%.
• Theo dõi PENDING, LOCKED, RELEASABLE, RELEASED, FORFEITED, REFUNDED.
• Mô phỏng nạp/rút cọc ở backend; phối hợp Trading bảo đảm một Trader được chốt/bài đăng, kể cả hai yêu cầu nạp đồng thời.
• Farmer rút khi Trader hoàn tất hoặc deliveryDate+24h VÀ không có tranh chấp hợp lệ đang mở; mọi release phải kiểm lại dưới row lock.
• Ghi xử lý vi phạm: Trader vi phạm mất cọc để Farmer nhận; Farmer vi phạm hoàn cọc cho Trader và ghi phạt 20% tiền cọc theo điều khoản đã accept cho Contract mới; Contract cũ giữ điều khoản đã accept.
3.2. Không thuộc phạm vi
• Không thanh toán tiền mua lúa; không xử lý shipper, đơn vận chuyển, theo dõi giao hàng.
• Không sở hữu/ghi trực tiếp Listing, Offer, Farm hoặc tài khoản. Trading quản lý trạng thái bài đăng và Trader được chốt; Payment quản lý Contract/cọc, gọi API/event Trading bằng offerId.
• Trader không có thao tác tự rút cọc sau khi đã LOCKED.
 
4. Database Ownership
payment_db sở hữu contracts và payment_tracking. Contract là module nội bộ Payment, không có Contract Service hay contract_db riêng. UUID là ID chuẩn cho các entity; contracts.offer_id tham chiếu logic Trading, farmer_id/trader_id tham chiếu User. Chi tiết hai bảng ở mục 5.
 
Một Contract có tối đa một payment_tracking; payment_tracking.contract_id UUID UNIQUE và FK nội bộ contracts.contract_id. Nhiều Contract của các Offer khác nhau có thể ở PENDING_DEPOSIT trên cùng bài đăng; không đặt unique offerId thay cho ràng buộc duy nhất theo bài đăng. Trading giữ ràng buộc bài đăng chỉ chốt một Trader; Payment kiểm tra/chốt qua Trading bằng offerId trước khi báo nạp thành công. Không thêm bảng tích hợp provider, vì MVP mô phỏng.
 
5. ERD của Payment Service
CONTRACTS thuộc module Payment/payment_db; schemaUUID dưới đã duyệt, offer_id logical reference Trading, không cócontract_db riêng.
 
CONTRACTS · Attribute
Type
Key
Req.
Rule
contract_id
UUID
PK
Yes
Payment tạo ID
offer_id
UUID
Logical ref
Yes
Offer được accept tại Trading
conversation_id
UUID
Logical ref
Yes
Phòng Chat của Offer
farmer_id
UUID
Logical ref
Yes
Farmer của Offer
trader_id
UUID
Logical ref
Yes
Trader gửi Contract
total_amount
DECIMAL(15,2)
—
Yes
Tổng giá trị VND; hai bên thống nhất
terms
TEXT
—
Yes
Điều khoản do Trader gửi, Farmer chấp nhận
delivery_date
TIMESTAMP
—
Yes
Mốc giao hàng để tính +24 giờ
status
VARCHAR(30)
—
Yes
CREATED/PENDING_DEPOSIT/ACTIVE/COMPLETED/CANCELLED
completed_confirmed_at
TIMESTAMP / null
—
No
Trader xác nhận hoàn tất
created_at
TIMESTAMP
—
Yes
Ngày tạo
updated_at
TIMESTAMP
—
Yes
Ngày cập nhật
 
PAYMENT_TRACKING · Attribute
Type
Rule / ý nghĩa
payment_tracking_id
UUID
PK
contract_id
UUID
UNIQUE • FK contracts.contract_id
deposit_rate
DECIMAL(5,2)
5% tổnggiá trịContract; Offer.depositAmount=0 trước nạp, Payment xác nhận sau mô phỏng thành công
 
deposit_amount
DECIMAL(15,2)
Cọc từ Contract
status
VARCHAR(30)
Enum trạng thái
paid_at
TIMESTAMP / null
Xác nhận nạp
delivery_date
TIMESTAMP
Snapshot từ Contract
completed_confirmed_at
TIMESTAMP / null
Trader xác nhận hoàn tất
release_at
TIMESTAMP / null
Đủ điều kiện rút
released_at
TIMESTAMP / null
Đã rút
cancellation_type
VARCHAR(30) / null
Loại vi phạm
refund_amount
DECIMAL(15,2) / null
Khoản hoàn
penalty_rate
DECIMAL(5,2) / null
20% depositAmount cho Contract mới; Contract cũ giữ điều khoản đã accept
penalty_amount
DECIMAL(15,2) / null
Khoản phạt
created_at
TIMESTAMP
Ngày tạo
updated_at
TIMESTAMP
Ngày cập nhật
contracts1:0..1 payment_tracking qua contract_id UNIQUE/FK nội bộ payment_db; offer_id logical ref Trading, không listing_id. Cọc5% totalAmount Contract đã accept, mô phỏng; Offer.depositAmount khởi tạo0, chỉ cập nhật từ Payment đã xác nhận thành công. Client không chứng minh đã thu tiền. TiềnAPI/event chuỗi decimal VND, DB DECIMAL.
 
5.3 Tranh chấp và quyết định vi phạm — theo xulycontract
Payment là owner tranh chấp và bằng chứng. Farmer/Trader đúng participant gửi lý do/mô tả/bằng chứng → hồ sơ OPEN và giữ cọc → Admin tiếp nhận UNDER_REVIEW → lấy phản hồi bên còn lại (hạn48 giờ từ lúc UNDER_REVIEW được ghi responseDueAt). Admin xác nhận kết luận có bằng chứng, không nhận một bên tự tuyên bố. Khi OPEN/UNDER_REVIEW, chặn chuyển RELEASABLE và chặn release dù đã qua +24h; khóa cùng row tracking khi mở tranh chấp/job/rút để tránh race. Không dùng account.status làm trạng thái tranh chấp. Sau RELEASED không đảo về LOCKED; khiếu nại muộn vẫn nhận, không đảo cọc đã chi; nghĩa vụ bù chỉ mô phỏng theo v2.1 §12.
Schema Payment bổ sung disputes,dispute_evidence,dispute_decisions và outbox theo Contract v2.1 §10/§12–13/§18. Dispute OPEN/UNDER_REVIEW/RESOLVED; một active dispute/Contract; response_due_at,resolved_at,outcome,assigned_admin_id,decision_version; decision bất biến có actor/reason/evidence. payment_tracking có dispute_hold,version và settlement metadata; unique một settlement/tracking. contracts thêm penalty_rate=20 cho Contract mới,immutable sau accept; nghĩa vụ penalty mô phỏng, không thu thêm ngoài cọc. FK chỉ payment_db.
User được tự LOCKED khi reputation=0: khóa row account → ghi lịch sử → cập nhật điểm/status/nguyên nhân khóa → thu hồi mọi refresh token trong một transaction → commit → JWT cũ bị chặn theo access-state. Admin không mở khóa khi điểm vẫn 0; chỉ khi quyết định sửa/hủy đưa điểm>0 và không còn lý do khóa khác. Không tự reset điểm 1/10. Khóa không tự hủy Contract khác hoặc tịch thu cọc. Admin giải quyết quyền lợi/cọc theo quyền xử lý riêng, không giả danh participant hoặc bỏ ACTIVE guard của API người dùng.
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
 
8. Authentication & Authorization
Gateway/User xác thực JWT và trạng thái account; Payment kiểm tra account ACTIVE và participant trước thao tác. Trader tạo/sửa Contract khi CREATED, nạp cọc và xác nhận hoàn tất; Farmer accept và rút khi đủ điều kiện; cả hai xem Contract/cọc của mình. Admin không tự nạp/rút hoặc quyết định vi phạm nếu không có quyền đã được nhóm xác định. Account khóa không tiếp tục thao tác dù JWT còn hạn; Payment không triển khai chức năng khóa tài khoản thay User. Internal API/Kafka có xác thực nội bộ, không tin x-user-id/x-user-role do client gửi.
 
9. Error Contract
Format chung: {"timestamp":"2026-09-27T00:00:00Z","status":409,"code":"CONFLICT","message":"Deposit is not releasable","path":"/api/v1/payments/deposits/{contractId}/release"}. contractId là UUID String.
400 VALIDATION_ERROR; 401 UNAUTHORIZED; 403 FORBIDDEN; 404 NOT_FOUND; 409 CONFLICT; 500 INTERNAL_SERVER_ERROR; 503 SERVICE_UNAVAILABLE. Nạp mô phỏng/chốt chưa thành công không trả trạng thái LOCKED/ACTIVE hoặc thông báo đã nạp. Timeout cần xác minh bằng định danh cũ; không tạo giao dịch mới để thử lại.
 
10. Inter-Service Communication
Chat/UI → Payment: API tạo/xem/cập nhật/accept/complete Contract. Payment xác thực participant và đối chiếu Offer được accept từ Trading; Farmer accept chỉ chuyển PENDING_DEPOSIT và tạo tracking PENDING, chưa chốt Trader. Contract module và Deposit module cùng payment_db, phối hợp transaction nội bộ.
Payment ↔ Trading: thao tác chốt đồng bộ, độc quyền theo bài đăng; request nhận offerId, contractId, paymentTrackingId (UUID), không yêu cầu Payment lưu listingId. Trading tra bài đăng từ offerId; cùng contract/tracking gọi lại trả cùng kết quả, contract khác trên bài đăng đã chốt bị từ chối. Accept Offer và accept Contract không thực hiện thao tác chốt này.
Sau khi cả kết quả chốt và LOCKED/ACTIVE được ghi nhận, Payment phát DEPOSIT_PAID để đồng bộ kết quả đã chốt; event này không thay thế kiểm tra độc quyền. Listing LOCKED là trạng thái đã chốt của Trading; Offer vẫn là Offer đã accept, không đổi thành LOCKED.
Nếu timeout/gián đoạn giữa hai service, Payment truy vấn hoặc retry bằng cùng định danh để phục hồi; không tạo tracking mới hoặc tự mở lại bài đăng đã chốt cho giao dịch khác. Chỉ báo thành công khi kết quả đã xác minh. API nội bộ cụ thể do Payment/Trading đồng bộ khi triển khai; đây là yêu cầu tích hợp, không phải xác nhận đã có API trong Trading.
Payment→Chat/Notification CONTRACT_CREATED/CONTRACT_STATUS_CHANGED trên soa.contract.lifecycle.v1, key contractId; recipientIds=[farmerId, traderId]. Chỉ phát đúng event trạng thái sau commit; không giả status change cho thay đổi điều khoản. Chat phát MESSAGE_CREATED→Notification, badge/read độc lập.
Payment quản lý quyết định xử lý vi phạm hợp lệ và các trạng thái cọc FORFEITED/REFUNDED; không nhận một bên tự tuyên bố làm căn cứ. DEPOSIT_STATUS_CHANGED có thể cấp trạng thái cọc cho Chat/Trading; thông báo thay đổi Contract cho hai bên đi qua CONTRACT_STATUS_CHANGED. Nạp/rút/hoàn trong MVP đều mô phỏng.
Không đọc user_db/trading_db/farming_db; contracts và payment_tracking cùng payment_db nên FK/transaction nội bộ được phép.
 
11. Validation & State Machine
 
Từ
Sang
Điều kiện
PENDING
LOCKED
Mô phỏng 5% + chốt độc quyền
LOCKED
RELEASABLE
Trader xác nhận xong hoặc +24 giờ
RELEASABLE
RELEASED
Farmer rút thành công
LOCKED / RELEASABLE
FORFEITED
Trader vi phạm; Farmer nhận cọc
LOCKED / RELEASABLE
REFUNDED
Farmer vi phạm; hoàn cọc Trader
Cọc: PENDING → LOCKED sau nạp mô phỏng thành công và chốt độc quyền bài đăng → RELEASABLE khi Trader xác nhận hoàn tất hoặc delivery_date+24h → RELEASED khi Farmer rút mô phỏng thành công. Chốt duy nhất xảy ra ở bước LOCKED, không ở accept Offer hay accept Contract. Điều kiện bắt buộc: không có tranh chấp hợp lệ OPEN/UNDER_REVIEW; kiểm row lock trước mở/rút cọc.
LOCKED/RELEASABLE → FORFEITED nếu Trader hủy/vi phạm (Farmer nhận cọc); LOCKED/RELEASABLE → REFUNDED nếu Farmer hủy/vi phạm (hoàn cọc cho Trader và ghi penalty_rate 20% depositAmount cho Contract mới; Contract cũ giữ điều khoản đã accept, penalty_amount). Không cho LOCKED quay về PENDING, RELEASED hoàn lại RELEASABLE hoặc rút hai lần.
Contract: CREATED (Trader gửi) → PENDING_DEPOSIT (Farmer accept) → ACTIVE (cọc mô phỏng thành công và chốt độc quyền) → COMPLETED (Trader xác nhận). CANCELLED chỉ theo quyết định hủy/vi phạm hợp lệ; không tự hủy các Contract/phòng khác vì một Trader đã chốt. Contract của giao dịch chưa thắng không được ACTIVE sau khi bài đăng chốt Contract khác. Mốc delivery_date+24h tác động quyền rút cọc, không giả lập xác nhận hoàn tất của Trader. Điều kiện bắt buộc: không có tranh chấp hợp lệ OPEN/UNDER_REVIEW; kiểm row lock trước mở/rút cọc.
Ràng buộc một giao dịch đã chốt nằm ở Trading theo bài đăng. Unique contract_id trong tracking chỉ ngăn tạo hai tracking cho cùng Contract, không ngăn hai Contract ở cùng bài đăng. Dùng DECIMAL cho 5% và snapshot delivery_date từ Contract.
 
11.1. Quyết định nghiệp vụ D01–D07 có hiệu lực
ID: D01 • Quyết định áp dụng: Phản hồi trong 48 giờ từ lúc Payment chuyển UNDER_REVIEW và ghi responseDueAt; xét thưởng sau 72 giờ từ completedAt. Hồ sơ mở trong hạn giữ thưởng đến khi giải quyết; im lặng không tự nhận thua. • Ảnh hưởng: Payment,User
ID: D02 • Quyết định áp dụng: F04 trừ2 khi vi phạm nhưng có thể khắc phục và cuối cùng hoàn tất; trừ3 khi không khắc phục và dẫn đến hủy do Farmer. Không cộng thêm F06 cho cùng hành vi. • Ảnh hưởng: Decision validation,User
ID: D03 • Quyết định áp dụng: Contract mới dùng penaltyRate=20 (% depositAmount), phải hiển thị và được hai bên accept; không tự áp 30%. Contract cũ giữ điều khoản đã accept, thiếu điều khoản thì không áp hồi tố. penaltyAmount=depositAmount×20/100 cho Farmer có lỗi dẫn đến hủy; ví dụ cọc 4.600.000 thì phạt mô phỏng 920.000. Làm tròn như §3 và chỉ ghi nghĩa vụ mô phỏng, không tự thu hoặc cấn thêm ngoài cọc 5%. • Ảnh hưởng: Payment
ID: D04 • Quyết định áp dụng: FORFEITED/REFUNDED biểu thị kết quả xử lý và chi trả mô phỏng hoàn tất trong cùng transaction quyết định; mỗi tracking tối đa một settlement. Không gọi release lần nữa. Settlement do Admin qua API riêng, có audit actor/decisionId, áp dụng cả account bị khóa. • Ảnh hưởng: Payment
ID: D05 • Quyết định áp dụng: Cọc đã RELEASED vẫn nhận hồ sơ khiếu nại muộn để Admin xem bằng chứng/uy tín; không đảo trạng thái cọc hoặc ghi chi trả lần hai. Nghĩa vụ bù lưu mô phỏng trong quyết định, không tự thu tiền. • Ảnh hưởng: Payment,User
ID: D06 • Quyết định áp dụng: User gửi email thông báo LOCKED/UNLOCKED cho email đã xác minh; Notification vẫn lưu lịch sử, REST vẫn chỉ ACTIVE. Email lỗi không rollback việc khóa; retry theo outbox, không gửi OTP qua Notification. • Ảnh hưởng: User,Notification
ID: D07 • Quyết định áp dụng: Admin được xác nhận hoàn tất thay khi Trader không thao tác nhưng có đủ bằng chứng và đã giải quyết tranh chấp; có reason/evidence/actor. Không dùng mốc+24h hoặc RELEASED làm bằng chứng hoàn tất. • Ảnh hưởng: Payment,Trading,User
Các mức khác giữ TXT: Farmer F01−1,F02−2,F03−2,F05−2,F06−3,F07−3,F08−5; Trader T01−1,T02−2,T03−2,T04−3,T05−3,T06−3,T07−5,T08−2. Chỉ áp dụng nghĩa vụ có trong Contract và lỗi đã xác nhận. Không phạt bất khả kháng được chấp nhận, lỗi ứng dụng/timeout, đồng thuận hủy/sửa, chưa có nghĩa vụ ACTIVE hoặc Trader không thắng Listing.
Thưởng+0,5 mỗi account/Contract hoàn tất không vi phạm sau 72 giờ từ completedAt và đã giải quyết hết tranh chấp; tối đa10 và1 điểm/cặp Farmer–Trader/30 ngày theo TXT. Không thưởng vì rút sau+24h, Admin mở khóa hoặc Contract hủy. Quyết định sai bị hủy hoàn đúng actual delta. Điểm0→User LOCKED và thu hồi refresh. Mở khóa chỉ khi score>0 và không còn nguyên nhân khóa khác; không reset điểm1/10.
11.2. Quy trình đóng hồ sơ, thưởng và khiếu nại muộn
Dispute: OPEN → UNDER_REVIEW → RESOLVED. Payment lưu createdAt,responseDueAt,resolvedAt,outcome,decisionVersion; decision/evidence không sửa xóa lịch sử. Quá 48 giờ không tự kết luận có lỗi; Admin quyết định bằng bằng chứng, hoặc NO_VIOLATION/INSUFFICIENT_EVIDENCE để đóng hồ sơ và bỏ hold. Không dùng INSUFFICIENT_EVIDENCE để phạt hoặc chi cọc ngay; việc rút sau đó vẫn phải đủ điều kiện thông thường. Chỉ đặt hold khi tracking còn LOCKED/RELEASABLE; sau RELEASED/FORFEITED/REFUNDED, nhận hồ sơ nhưng depositHold=false.
Decision depositDisposition được kiểm dưới khóa tracking: NO_VIOLATION/INSUFFICIENT_EVIDENCE → NONE, bỏ hold, không phạt; FARMER_VIOLATION dẫn đến CANCELLED → REFUND_TO_TRADER; TRADER_VIOLATION dẫn đến CANCELLED → FORFEIT_TO_FARMER; vi phạm đã khắc phục, Contract tiếp tục → NONE, chỉ phạt điểm theo mã. MUTUAL_CANCEL chỉ khi có bằng chứng cả hai đồng ý → REFUND_TO_TRADER nếu còn cọc, không phạt. Với hồ sơ sau khi tiền đã chi, disposition bắt buộc NONE dù xác nhận vi phạm; không đổi COMPLETED về CANCELLED và không đảo terminal deposit. NONE không thay đổi trạng thái tiền đã chi. KEEP_HELD chỉ là thao tác review, không phải kết quả RESOLVED. RELEASE_TO_FARMER chỉ trong thao tác hoàn tất/settlement đủ điều kiện, không tự gán vào kết luận thiếu bằng chứng.
Payment job xét thưởng từ completedAt+72h, mỗi Contract/account chỉ phát một COMPLETION_REWARD; chỉ Contract không có vi phạm đã xác nhận và không còn hồ sơ mở. User dùng counterpartyId để kiểm tổng thưởng dương của account với cùng đối tác trong 30 ngày trượt ≤1 điểm, khóa row account trước tính và ghi; một Contract nhận tối đa +0,5, điểm không quá 10. Nếu không được thưởng vì cap thì ghi quyết định đã xử lý với actualDelta=0, không cộng lại về sau. Khi khiếu nại muộn xác nhận Contract có vi phạm, Payment phát REVERSAL cho các thưởng đã cấp của Contract, rồi PENALTY cho bên có lỗi; không thu hồi hai lần. Thu hồi thưởng sai không phải hình phạt thứ hai cho cùng hành vi.
Contract COMPLETED chỉ khi đã xác nhận hoàn tất; +24h/RELEASED không thay thế completedAt. Mốc 72h để xét thưởng không gia hạn giữ cọc nếu điều kiện rút đã đủ. Khiếu nại muộn được tiếp nhận trong MVP, không tự đảo cọc đã chi. Payment API trả responseDueAt/status/decision để hai bên theo dõi; chưa thêm Kafka event Notification riêng cho từng bước dispute. Frontend tải lại hồ sơ khi mở trang và mỗi 30 giây khi trang đang hiển thị.
12. Repository Structure
payment-service/ tổ chức modules/contract (controller, service, repository, entity, dto) và modules/deposit (các lớp tương ứng), cùng security, events, trading-client, exception, config, migration, test, Dockerfile, README. Contract và cọc cùng PostgreSQL payment_db; transaction nội bộ quản lý accept/complete và tracking. Trading client xử lý chốt theo Offer, không đọc DB Trading.
 
13. Coding Rules
Nghiệp vụ Contract/cọc đặt trong service layer, cập nhật cùng payment_db bằng transaction nội bộ. Hai service Payment/Trading không dùng chung một transaction DB: chốt bài đăng phải độc quyền tại Trading, gọi lại idempotent theo contractId/paymentTrackingId và có bước kiểm tra kết quả sau timeout. Publish event sau lưu; retry giữ eventId. Không dùng một consumer Kafka DEPOSIT_PAID làm cơ chế duy nhất chống hai Trader cùng thắng. Không đọc DB khác. Chi tiết triển khai phục hồi/publish lại cần được kiểm thử trước khi tích hợp.
 
14. Configuration
SERVER_PORT=8085; DB_URL=payment_db; PAYMENT_MODE=SIMULATION; KAFKA_BOOTSTRAP_SERVERS; topic soa.payment.deposit.v1/key depositId và soa.contract.lifecycle.v1/key contractId; JWT RS256/public key/issuer/audience; USER_SERVICE_URL; TRADING_SERVICE_URL; INTERNAL_SERVICE_KEY; ACCESS_STATE_TIMEOUT_MS=1000. Không có provider/webhook/ContractServiceURL riêng; secrets từ env.
 
15. Testing Strategy
Test: nhiều Offer được accept nhưng một giao dịch chốt/Listing; cọc5% mô phỏng, accept chưa khóa. Hai Trader nạp đồng thời chỉ một thành công; retry/timeout không nạp/rút/chốt hai lần. MESSAGE_CREATED từ Chat đến Notification; Contract event cả hai; DEPOSIT_PAID không trùng thông báo Deposit LOCKED. Tranh chấp/job24h/release đồng thời giữ cọc đúng; account LOCKED không tự mất cọc. Không báo thành công trước lưu bền vững.
 
Flow settlement v2.1: Participant/hoặc Admin đại diện → Payment OPEN + hold khi còn cọc → Admin độc lập UNDER_REVIEW,48h phản hồi → decision có bằng chứng → transaction tracking/Contract/decision/outbox → Kafka decision→User và status thật→Trading/Chat/Notification. Admin complete thay phải có bằng chứng và giải quyết hồ sơ trước; +24h không tự complete. Admin không xử lý hồ sơ của mình; reversal bởi Admin khác originalActor. Dùng cursor20/max100 cho danh sách Payment, gồm Admin disputes.
16. Definition of Done
[ ] contracts và payment_tracking đúng schema UUID, FK nội bộ và migration.
[ ] Contract thuộc Payment; nhiều phòng trao đổi nhưng chỉ một Trader chốt/bài đăng sau cọc mô phỏng thành công.
[ ] MVP mô phỏng cọc/nạp/rút/hoàn; không tích hợp cổng hoặc chuyển tiền thật.
[ ] Trader hoàn tất hoặc +24h và không có tranh chấp hợp lệ → Farmer rút; không tự COMPLETED theojob24h.
[ ] FORFEITED/REFUNDED và penalty_rate 20% depositAmount với Contract mới, chỉ nghĩa vụ mô phỏng đúng nhánh vi phạm.
[ ] Không có FK/query xuyên DB; auth, error, API docs, test, Docker và README đạt.
 
17. AI Agent Development Rules
Contract là module trong Payment; không tạo service/DB Contract riêng. Payment sở hữu contracts và payment_tracking, UUID, FK nội bộ. Trading sở hữu Listing/Offer; không thêm listing_id vào Chat/Payment. Accept nhiều Offer mở nhiều phòng, chưa chốt; chỉ nạp cọc mô phỏng thành công chốt một Trader/bài đăng. Kiểm tra độc quyền qua Trading, retry nhất quán, không ACTIVE hai Contract của một bài đăng. Contract event do Payment phát cho cả hai account; Chat phát MESSAGE_CREATED cho Notification theo Conflict 13. Giữ cọc 5%, rule rút/vi phạm; không chuyển tiền thật.
 
18. Quyết định đã chốt và nội dung cần xác nhận
CF-PS-01: Contract và cọc thuộc Payment Service; MVP nạp/rút/hoàn cọc mô phỏng, tiền mua lúa ngoài app.
CF-PS-02: Cọc 5% tổng giá trị Contract. Farmer accept nhiều Trader để trao đổi; chỉ chốt một Trader khi nạp cọc mô phỏng thành công.
CF-PS-03: PostgreSQL payment_db gồm contracts và payment_tracking, UUID; contract_id FK nội bộ UNIQUE ở tracking, offer_id liên kết Trading.
CF-PS-04: Trader hoàn tất hoặc deliveryDate+24h mở quyền rút nếu không có tranh chấp hợp lệ. OPEN/UNDER_REVIEW giữ cọc kể cả đã RELEASABLE; release kiểm hold dưới row lock. +24h không tự COMPLETED hoặc thưởng điểm.
CF-PS-05: Admin kết luận vi phạm có bằng chứng; Trader có lỗi dẫn đến hủy→FORFEITED cho Farmer; Farmer có lỗi dẫn đến hủy→REFUNDED Trader. FORFEITED/REFUNDED là chi trả mô phỏng đã hoàn tất một lần, không release lại. Contract mới phạt mô phỏng20% depositAmount theo điều khoản được accept; Contract cũ giữ điều khoản đã accept, không áp hồi tố. Không thu/cấn tiền phạt ngoài cọc5%.
CF-PS-06: Trading quản lý Offer/Listing và ràng buộc chốt duy nhất theo bài đăng. Payment chốt qua offerId khi nạp cọc thành công, không lưu Listing. Accept Offer/Contract chưa khóa Listing. Mọi cập nhật Contract thông báo cả hai bên qua Notification.
 
19. Quick Reference
SERVICE: Payment Service | MODULES: Contract, Deposit | DATABASE: payment_db (PostgreSQL) | TABLES: contracts, payment_tracking | ID: UUID | MODE: SIMULATION | BROKER: Kafka.
STATUS: PENDING → LOCKED → RELEASABLE → RELEASED; LOCKED → FORFEITED hoặc REFUNDED khi vi phạm. RATE: 5%. RELEASE: Trader xác nhận hoàn tất hoặc delivery_date + 24 giờ. OTHER MONEY: ngoài app. Điều kiện bắt buộc: không có tranh chấp hợp lệ OPEN/UNDER_REVIEW; kiểm row lock trước mở/rút cọc.
 
 
 
 
Phụ lục A. API Contract Matrix
 
From
To
Method / Event
Purpose
Mode
Chat/UI
Payment
POST /api/v1/payments/contracts/{contractId}/accept
Accept và tạo tracking
Sync
Payment
Trading
DEPOSIT_PAID
Đồng bộ kết quả đã chốt
Async
Payment
Chat / Notification
CONTRACT_CREATED / CONTRACT_STATUS_CHANGED
Card; Notification theo recipientIds đã chốt từng transition
Async
Payment
Notification; Chat/Trading nếu owner chốt
DEPOSIT_STATUS_CHANGED
Cập nhật cọc
Async
Payment
Trading
API chốt qua offerId + contractId
Độc quyền theo bài đăng
Sync
Phụ lục B. Event Contract
Envelope đã duyệt: {eventId UUID, eventType, eventVersion:1, sourceService, occurredAt UTC, actorId UUID|null, recipientIds:[account UUID], referenceType, referenceId UUID, correlationId?, data}. Producer giữ eventId/payload qua retry; consumer ghi DB trước ACK. 7 event giao thương ban đầu giữ tên; xulycontract bổ sung REPUTATION_CHANGED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED từ User. USER_PROFILE_UPDATED chỉ đồng bộ Trading, không thuộc subscription Notification. Notification không tự tính điểm từ trạng thái cọc. Topic/key đã chốt theo Contract v1: soa.trading.offer.v1/offerId; soa.chat.message.v1/conversationId; soa.contract.lifecycle.v1/contractId (producer payment-service); soa.payment.deposit.v1/depositId. Group Notification notification-service-v1; Chat OFFER_ACCEPTED dùng chat-offer-accepted-v1, độc lập Notification. CONTRACT_CREATED và CONTRACT_STATUS_CHANGED gửi [farmerId, traderId]; DEPOSIT_PAID và DEPOSIT_STATUS_CHANGED gửi cả hai; MESSAGE_CREATED chỉ người nhận. Reference MESSAGE=CONVERSATION/conversationId. DEPOSIT_STATUS_CHANGED chuyển LOCKED không tạo Notification, chỉ DEPOSIT_PAID thông báo lần nạp đó.
Farmer accept Contract là API /api/v1/payments/contracts/{contractId}/accept trong Payment. Transaction chuyển CREATED→PENDING_DEPOSIT và tạo tracking PENDING; không chốt Trader. Payment phát CONTRACT_STATUS_CHANGED cho Chat/Notification với recipientIds=[farmerId, traderId]. Không có Kafka giữa hai module nội bộ.
DEPOSIT_PAID:Payment→Trading/Notification trên soa.payment.deposit.v1, key depositId; source payment-service, reference DEPOSIT/depositId; data depositId, paymentId, contractId, farmerId, traderId, amount (decimal string), currency VND; recipients cả hai. Chỉ phát khi nạp mô phỏng, chốt độc quyền và Payment LOCKED/ACTIVE đã lưu; không phát Deposit Status Notification LOCKED trùng. depositId=paymentId=paymentTrackingId theo Contract v2.1 §6; cùng UUID tracking, không sinh ba ID.
Trader hoàn tất Contract là API /api/v1/payments/contracts/{contractId}/complete trong Payment. Ghi COMPLETED/completed_confirmed_at và chuyển cọc LOCKED→RELEASABLE; cọc đã RELEASED theo mốc +24h thì giữ nguyên. Phát cập nhật Contract cho cả hai account. Mốc delivery_date+24h mở quyền rút cọc khi Trader quên xác nhận, không tự coi là Trader đã xác nhận hoàn tất Contract. Điều kiện bắt buộc: không có tranh chấp hợp lệ OPEN/UNDER_REVIEW; kiểm row lock trước mở/rút cọc.
CONTRACT_CREATED/CONTRACT_STATUS_CHANGED do payment-service phát tới Chat/Notification trên soa.contract.lifecycle.v1,key contractId,reference CONTRACT/contractId; recipients=[farmerId,traderId]. Không gửi Contract event trên topic Deposit.
CONTRACT_CREATED data={contractId,offerId,farmerId,traderId,status}; CONTRACT_STATUS_CHANGED data={contractId,farmerId,traderId,previousStatus,status,stateVersion}. Version tăng đơn điệu; no-op/retry không phát event mới, giữ eventId. Đổi điều khoản mà không đổi status không phát status change giả. Dùng previousStatus/status đúng Contract v1/v2, không trộn oldStatus/newStatus.
DEPOSIT_STATUS_CHANGED: Payment → Notification; recipients=[farmerId,traderId]; data depositId,contractId,farmerId,traderId,previousStatus,status,stateVersion; topic soa.payment.deposit.v1,key depositId. Chuyển LOCKED chỉ thông báo bằng DEPOSIT_PAID, không tạo Notification Deposit thứ hai. Không mặc định thêm Chat/Trading consumer cho DepositStatus.
 
Phụ lục C. Data Contract & Business Rules
API/JSON camelCase, DB snake_case; timestamp ISO 8601 UTC; tiền DECIMAL, VND. ID entity nội bộ và tham chiếu là UUID, owner tạo/quản lý, API/event truyền UUID String đúng giá trị; không Long/BIGINT thay UUID service khác. Migration UUID phải giữ ánh xạ liên kết và cập nhật owner/consumer đồng bộ; không FK hoặc query xuyên DB.
BR-PS-001: Một contractId chỉ có một payment_tracking; cọc = 5% tổng giá trị Contract đã Accept.
BR-PS-002: Chỉ Trader của Contract đặt cọc; client không tự đánh dấu LOCKED.
BR-PS-003: Chỉ nạp cọc mô phỏng thành công và chốt độc quyền theo bài đăng mới ghi LOCKED/ACTIVE, phát DEPOSIT_PAID cho Trading và cập nhật Contract cho cả hai account.
BR-PS-004:Farmer rút sau Trader hoàn tất hoặc deliveryDate+24h, và không có tranh chấp hợp lệ đangmở.Traderkhông tựrút.Account LOCKEDkhông bypass ACTIVE guard; cầnAdminxử lýtheoquyền riêng.
BR-PS-005: Trader vi phạm → FORFEITED cho Farmer; Farmer vi phạm → REFUNDED cho Trader, ghi penaltyRate 20% depositAmount cho Contract mới; Contract cũ giữ điều khoản đã accept.
BR-PS-006: Payment quản lý Contract/cọc mô phỏng; tiền mua lúa ngoài app. Request/event lặp không chốt/nạp/rút hai lần; hai Trader cùng bài đăng không được cùng ACTIVE.
 
Phụ lục D. Git Convention & End-to-End Business Flow
Nhánh: feature/payment-deposit, feature/payment-release. Commit: feat(payment): ..., fix(payment): ..., docs(payment): ...; tích hợp qua develop, phát hành từ main theo quy ước nhóm.
Trading hiển thị danh sách Trader Offer → Farmer accept nhiều Offer, chưa khóa Listing → Chat mở từng conversation theo offer_id → Trader gửi Contract qua Payment → Farmer accept, PENDING_DEPOSIT → Trader nạp cọc mô phỏng 5% → Payment/Trading xác nhận chốt độc quyền bài đăng → Payment LOCKED/ACTIVE, Trading khóa bài đăng/chọn Trader → CONTRACT_STATUS_CHANGED thông báo cả Farmer và Trader → Trader xác nhận hoàn tất hoặc delivery_date+24h → Farmer rút mô phỏng. Trader khác không được nạp thành công/chốt thêm; lịch sử Chat không tự xóa. Điều kiện bắt buộc: không có tranh chấp hợp lệ OPEN/UNDER_REVIEW; kiểm row lock trước mở/rút cọc.
Phụ lục E. Event Contract chung — gợi ý tham khảo
Kafka/UUID, nhiều Offer trao đổi nhưng một giao dịch chốt/Listing, Contract thuộc Payment và cọc5% mô phỏng đã duyệt. Bảng7event giao thương dùng topic/key Contract v1, recipients Contract/Deposit cả hai;3event User bổ sung theo TXT ghi ở User/Notification và Contract v2. Không tự thêm RFQ/OFFER_REJECTED notification.
 
Event
Producer / Kafka topic
Consumers
referenceId / key
recipientIds (account UUID)
OFFER_CREATED
Trading / soa.trading.offer.v1
Notification
offerId / offerId
Farmer của bài đăng
OFFER_ACCEPTED
Trading / soa.trading.offer.v1
Chat, Notification
offerId / offerId
Trader được accept để trao đổi, chưa chốt
CONTRACT_CREATED
Payment / soa.contract.lifecycle.v1
Chat, Notification
contractId / contractId
Farmer và Trader: [farmerId, traderId]
CONTRACT_STATUS_CHANGED
Payment / soa.contract.lifecycle.v1
Chat, Notification
contractId / contractId
Farmer và Trader: [farmerId, traderId]
DEPOSIT_PAID
Payment / soa.payment.deposit.v1
Trading, Notification
DEPOSIT/depositId; key depositId; depositId=paymentId=paymentTrackingId
Farmer và Trader: [farmerId, traderId]
DEPOSIT_STATUS_CHANGED
Payment / soa.payment.deposit.v1
Notification (lọc LOCKED để tránh trùng DEPOSIT_PAID)
DEPOSIT/depositId; key depositId; depositId=paymentId=paymentTrackingId
Farmer và Trader: [farmerId, traderId]
MESSAGE_CREATED
Chat / soa.chat.message.v1 — topic đã duyệt
Notification
CONVERSATION/conversationId; key conversationId
Người nhận, không sender
MVP Chat phát MESSAGE_CREATED cho Notification theo Conflict 13. CONTRACT_ACCEPTED/CONTRACT_COMPLETED là thao tác module nội bộ Payment, không có service/group/topic Contract riêng. Notification nhận CONTRACT_CREATED/CONTRACT_STATUS_CHANGED từ Payment và thông báo cả hai bên mỗi lần cập nhật Contract. DEPOSIT_PAID cấp kết quả chốt cho Trading; thông báo trạng thái cọc không tạo trùng thông báo Contract. RFQ_* vẫn ngoài baseline; OFFER_REJECTED thuộc quyết định Trading. Topic/key, tên trạng thái Listing LOCKED và API chốt nguyên tử theo offerId cần ánh xạ contract của Trading; yêu cầu nghiệp vụ chốt một Trader sau cọc thành công đã được xác nhận.
 
 
Luồng tích hợp đã đồng bộ
Payment điều phối cọc; depositAmount ở Offer biểu thị tiền cọc mô phỏng đã xác nhận. Payment xác nhận nghiệp vụ rồi phát DEPOSIT_PAID/DEPOSIT_STATUS_CHANGED qua Kafka cho Notification với recipientIds account UUID; không gửi recipientIds rỗng cho event cần thông báo.
Trading sở hữu Listing/Offer; Payment chỉ REST/Kafka, không truy cập trading_db. Contract/Deposit/tranh chấp thuộc Payment/payment_db; User quản lý điểm và khóa account. Payment không sửa user_db.
Quy tắc xử lý hợp đồng/cọc/uy tín đã đồng bộ 07/10/2026
Nguồn cập nhật: Conflict đã chốt, Contract chung v2.1 và xulycontract(1).txt; người dùng đã giao quyền lựa chọn phương án và cập nhật trực tiếp. D01–D07 và gói kỹ thuật có hiệu lực theo v2.1. Ưu tiên quyết định mới nhất → Conflict đã chốt → Contract → rule → spec; không dùng đề xuất cũ để mở lại các mục đã đóng.
Payment owns dispute/evidence. Participant mở OPEN, hold khi cọc LOCKED/RELEASABLE; Admin nhận UNDER_REVIEW ghi responseDueAt=now+48h, lấy phản hồi, kết luận dựa bằng chứng → RESOLVED. Không tự phạt do im lặng. Có hold chặn release/+24h; mọi thao tác khóa cùng row tracking. Sau RELEASED/FORFEITED/REFUNDED nhận khiếu nại với hold=false, không đảo/chi lại. Reward sau completedAt+72h nếu đủ điều kiện. Các quyết định D01–D07 tại Contract v2.1 §12 có hiệu lực.
Farmer: F01 giao trễ sau gia hạn nhưng khắc phục và hoàn thành: −1; F02 trễ nghiêm trọng, không khắc phục: −2; F03 giao thiếu ngoài dung sai, không khắc phục: −2; F04 sai giống/chất lượng/quy cách: −2 nếu khắc phục và hoàn tất; −3 nếu không khắc phục dẫn đến hủy do Farmer, không cộng F06 cho cùng hành vi; F05 tự thay giá/điều kiện sau ACTIVE: −2; F06 từ chối giao/bỏ Contract: −3; F07 bán hàng đã cam kết cho bên khác: −3; F08 giả bằng chứng để hưởng cọc: −5. Chỉ áp dụng nghĩa vụ có trong Contract và trách nhiệm đã xác nhận.
Trader: T01 nhận hàng trễ sau gia hạn nhưng vẫn hoàn thành: −1; T02 trễ nghiêm trọng, không khắc phục: −2; T03 tự giảm giá/đổi điều kiện sau ACTIVE: −2; T04 từ chối hàng đạt điều kiện: −3; T05 bỏ Contract sau chốt cọc: −3; T06 không thanh toán tiền ngoài ứng dụng: −3 khi có bằng chứng; T07 giả bằng chứng: −5; T08 cố ý cản Farmer nhận cọc: −2. Không tự phạt vì quên bấm hoàn tất.
Không phạt khi chưa phát sinh nghĩa vụ ACTIVE/cọc, hai bên đồng thuận hủy/sửa, bất khả kháng được chấp nhận, lỗi ứng dụng/timeout, khiếu nại chưa kết luận hoặc thiếu bằng chứng, nghĩa vụ tiên quyết bên kia chưa hoàn thành, Trader chưa bấm hoàn tất nhưng không có bằng chứng cố ý. Trader không thắng Listing không vi phạm. Một hành vi chỉ chịu một mức phạt chính; hành vi độc lập như giả bằng chứng có thể xử lý riêng.
User sở hữu reputation FARMER/TRADER: 0–10, khởi tạo 10, bước 0,5; ADMIN không áp dụng điểm hợp đồng. Chỉ phạt khi có quyết định được xác nhận. Một hành vi một mức phạt chính; hành vi độc lập như giả bằng chứng có thể xử lý riêng. Thưởng +0,5/account/Contract sau hoàn tất không vi phạm và hết hạn khiếu nại; không thưởng vì đã rút sau +24h, RELEASED nhưng Contract chưa hoàn tất, hủy/vi phạm hoặc Admin mở khóa. Hoàn đúng điểm đã trừ khi quyết định bị hủy; trần 10. Giới hạn thưởng 1 điểm/cặp Farmer–Trader/30 ngày theo TXT; mỗi Contract/account chỉ thưởng một lần. Thưởng sau completedAt+72 giờ khi hết hồ sơ mở; F04 −2 nếu khắc phục và hoàn tất, −3 nếu không khắc phục dẫn đến hủy; không cộng F06 cho cùng hành vi. Contract v2.1 §12 đã chốt.
User được tự LOCKED khi reputation=0: khóa row account → ghi lịch sử → cập nhật điểm/status/nguyên nhân khóa → thu hồi mọi refresh token trong một transaction → commit → JWT cũ bị chặn theo access-state. Admin không mở khóa khi điểm vẫn 0; chỉ khi quyết định sửa/hủy đưa điểm>0 và không còn lý do khóa khác. Không tự reset điểm 1/10. Khóa không tự hủy Contract khác hoặc tịch thu cọc. Admin giải quyết quyền lợi/cọc theo quyền xử lý riêng, không giả danh participant hoặc bỏ ACTIVE guard của API người dùng.
Topic/key đã chốt theo Contract v1: soa.trading.offer.v1/offerId; soa.chat.message.v1/conversationId; soa.contract.lifecycle.v1/contractId (producer payment-service); soa.payment.deposit.v1/depositId. Group Notification notification-service-v1; Chat OFFER_ACCEPTED dùng chat-offer-accepted-v1, độc lập Notification. CONTRACT_CREATED và CONTRACT_STATUS_CHANGED gửi [farmerId, traderId]; DEPOSIT_PAID và DEPOSIT_STATUS_CHANGED gửi cả hai; MESSAGE_CREATED chỉ người nhận. Reference MESSAGE=CONVERSATION/conversationId. DEPOSIT_STATUS_CHANGED chuyển LOCKED không tạo Notification, chỉ DEPOSIT_PAID thông báo lần nạp đó.
Security đã chốt 07/10/2026: User ký RS256, access token 15 phút; iss=urn:soa:user-service, aud=soa-api; sub=accountId UUID, role=FARMER/TRADER/ADMIN, iat/exp/jti. Chỉ User giữ private key; Gateway/backend verify bằng public key, forward Bearer và kiểm ownership. GET /internal/v1/accounts/{accountId}/access-state đọc DB primary, không cache ACTIVE, timeout tổng 1 giây; không kiểm tra được →503 ACCESS_STATE_UNAVAILABLE; account không ACTIVE →403 ACCOUNT_NOT_ACTIVE. Internal dùng X-Service-Key riêng từng caller, private network/HTTPS khi triển khai, không route public. WebSocket Chat kiểm state trước SEND/SUBSCRIBE và push riêng tư.
List Deposits giữ cursor, limit mặc định20/max100, filter status hiện có, sort mới nhất trước và UUID tie-breaker; response có nextCursor. Tiền API/event dùng chuỗi decimal,currency VND; DB DECIMAL, không float. depositId=paymentId=paymentTrackingId đã chốt; cursor sort createdAt DESC/paymentTrackingId DESC.
Farmer tạo Listing từ snapshot Farming → Trader POST Offer PENDING (depositAmount=0) → OFFER_CREATED gửi Farmer → Farmer có thể accept nhiều Offer → OFFER_ACCEPTED tạo conversation riêng theo offerId và thông báo Trader → Trader tạo Contract trong Payment → Farmer accept Contract PENDING_DEPOSIT, tạo tracking PENDING → Trader nạp cọc mô phỏng 5% → Payment phối hợp Trading chốt độc quyền một giao dịch/Listing → Trading LOCKED, Payment Contract ACTIVE/cọc LOCKED → Kafka thông báo cả hai → hoàn tất Contract thì Trading SOLD. Chỉ rút khi đủ điều kiện và không có tranh chấp hợp lệ đang mở; mốc deliveryDate+24h không tự hoàn tất Contract. Giữ lịch sử các Offer/phòng khác; không tự REJECT hoặc xóa tất cả.
Chuẩn đối chiếu chung — CONTRACT CHUNG MVP v2.1
Tab rule chứa toàn văn Contract v2.1, là đầu mối đối chiếu API/event/schema/flow cho nhóm. Service này theo §3–6,§8–13,§15–16; Contract/Deposit/Dispute, chốt độc quyền, decision→User và hold/release. D01–D07 và gói kỹ thuật v2.1 đã có hiệu lực theo chỉ đạo chọn phương án và thực hiện. Áp dụng thêm §17–19 cho token/CORS/media/Admin; mọi endpoint/event mới phải được triển khai đúng contract, không còn chờ duyệt nghiệp vụ.
Change Log
§1–6, §10–12, §17–19, Phụ lục B–E: Contract/Deposit/Dispute thuộc Payment; cọc5%, chốt Listing bằng REST idempotent, D01–D07/penalty mô phỏng20% tiền cọc cho Contract mới đã áp dụng. Nguồn: Conflict + Contract v2.1.
§6, §10, Phụ lục A–B/E: DEPOSIT_PAID và DEPOSIT_STATUS_CHANGED thêm Notification, recipientIds do producer cung cấp; MESSAGE_CREATED thuộc Chat→Notification, không cấm tin nhắn Notification. Nguồn: Conflict 05, 13; Contract 8–11.
§4–5, §8–9, §13–16: UUID owner, không DB/FK xuyên service, Kafka, JWT/account ACTIVE/lock tức thời/fail closed và publish sau lưu. Nguồn: Conflict 02, 04, 06–07, 10–12; Contract 3–5, 10.
Phụ lục event/table: topic theo Contract v2.1; recipients/source và alias paymentTrackingId=depositId=paymentId đã có hiệu lực. Nguồn: Contract 9, 13.
Cập nhật baseline v2.1: đóng D01–D07, chuẩn hóa API/event/schema/flow và các mục token/CORS/media/Admin theo phạm vi service. Nguồn: Conflict + Contract v2.1 theo chỉ đạo người dùng chọn phương án và thực hiện; nội dung tài liệu không chứng minh code đã triển khai.
Open Issues
Không còn quyết định nghiệp vụ/gói kỹ thuật chờ duyệt trong baseline v2.1. Cấu hình thật (domain, SMTP, seed email, SUPPORT_EMAIL, secrets), backfill dữ liệu và kiểm thử mã nguồn là việc triển khai theo Contract §19; không ghi chúng là đã hoàn tất. Mở vấn đề mới chỉ khi có thay đổi phạm vi hoặc mâu thuẫn mới được phát hiện.



