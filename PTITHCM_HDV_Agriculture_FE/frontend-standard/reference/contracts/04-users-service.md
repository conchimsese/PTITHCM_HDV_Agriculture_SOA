# Users Service

User Service Specification MVP
1. Service Overview
User sở hữu authentication, account/role/status, public/private profile, OTP/refresh, reputation0–10 và lịch sử điểm FARMER/TRADER. User tự khóa khi điểm 0 theo xulycontract; không đọc payment_db hoặc DB service khác. Bản cập nhật 07/10/2026 theo quyết định nhóm1–16 và TXT.
Nguồn cập nhật: Conflict đã chốt, Contract chung v2.1 và xulycontract(1).txt; người dùng đã giao quyền lựa chọn phương án và cập nhật trực tiếp. D01–D07 và gói kỹ thuật có hiệu lực theo v2.1. Ưu tiên quyết định mới nhất → Conflict đã chốt → Contract → rule → spec; không dùng đề xuất cũ để mở lại các mục đã đóng.
2. Architecture Overview
6 service MVP gồm User / Farming / Trading / Chat / Payment / Notification. Contract là module trong Payment. User publish USER_PROFILE_UPDATED đồng bộ replica Trading và các event REPUTATION_CHANGED/ACCOUNT_LOCKED/ACCOUNT_UNLOCKED; consume quyết định xử lý Contract sau khi contract event được chốt. Không gửi OTP/token/contact riêng tư qua Kafka.
 
Sơ đồ kiến trúc User Service
Gateway không route /internal/** public; Bearer RS256/public key/ownership/access-state1s theo contract. SMTP gửi OTP do User sở hữu; không dùng Notification/Kafka business cho OTP.
3. Service Responsibility
3.1. Trách nhiệm
· Đăng ký tài khoản.
· Đăng nhập và cấp access token.
· Authentication và Authorization.
· Quản lý role FARMER, TRADER, ADMIN.
· Mỗi account chỉ có một role.
· Quản lý trạng thái account.
· Email OTP qua SMTP và refresh token JSON, rotate7 ngày; không đưa OTP/token vào Kafka.
· Quản lý Farmer Profile.
· Quản lý Trader Profile; Trader chỉ cần email verified, không cần admin duyệt.
· Admin quản lý account trong giới hạn đã duyệt; hệ thống User cũng LOCKED khi reputation0, phân biệt nguyên nhân khóa.
· Cung cấp thông tin user/profile cho service khác qua API.
3.2. Không thuộc phạm vi
· Plot/crop season/cultivation/cost/harvest thuộc Farming Service.
· Listing/Offer thuộc Trading Service; RFQ chưa thuộc MVP đã chốt.
· Conversation/message thuộc Chat Service.
· Contract / Deposit / tranh chấp thuộc module Payment; User chỉ quản lý điểm và trạng thái account theo quyết định được xác nhận.
· Notification/event consumer thuộc Notification Service.
4. Database Ownership
User sở hữu user_db: giữ5 bảng account/profile/OTP/refresh và bổ sung lịch sử điểm theo xulycontract. Không thêm bảng audit Admin: audit bảo mật dùng log. Schema phục hồi publish/outbox cho luồng điểm phải được duyệt trước migration.
5. ERD của User Service
Bảng
Mục đích
Khóa chính
Quan hệ nội bộ
accounts
Danh tính, đăng nhập, role, trạng thái account
account_​id UUID
Parent
farmer_​profiles
Hồ sơ Farmer
farmer_​id UUID
PK và FK → accounts.account_​id
trader_​profiles
Hồ sơ Trader
trader_​id UUID
PK và FK → accounts.account_​id
email_​verification_​otps
OTP xác minh email có hạn dùng
otp_​id UUID
FK account_​id → accounts
refresh_​tokens
Phiên refresh có thể thu hồi
refresh_​token_​id UUID
FK account_​id → accounts
 
Tất cả FK ở trên đều nằm trong user_db. Không có FK từ user_db tới Farming/Trading/Chat/Contract/Notification/Payment. accounts với Farmer/Trader profile là 1–0..1 về mặt DB; quy tắc ứng dụng yêu cầu tạo đúng profile theo role khi đăng ký thành công.
5.1 accounts
Field
PostgreSQL
Bắt buộc /​ ràng buộc
Ý nghĩa
account_​id
UUID
PK, NOT NULL
ID dùng chung xuyên service
username
VARCHAR(100)
NOT NULL, UNIQUE
Tên đăng nhập
email
VARCHAR(254)
NOT NULL, UNIQUE sau chuẩn hóa
Gửi và xác minh OTP; thay email cần xác minh lại
password_​hash
VARCHAR(255)
NOT NULL
BCrypt hash, không trả về API
role
VARCHAR(20)
NOT NULL, CHECK role
Một trong FARMER/​TRADER/​ADMIN
status
VARCHAR(20)
NOT NULL, CHECK status
UNVERIFIED/​ACTIVE/​INACTIVE/​LOCKED
email_​verified_​at
TIMESTAMPTZ
NULL
Ghi thời điểm xác minh thành công
created_​at
TIMESTAMPTZ
NOT NULL
UTC
updated_​at
TIMESTAMPTZ
NOT NULL
UTC
 
Ràng buộc: chuẩn hóa email/username trước kiểm tra UNIQUE (ví dụ trim và lower-case cho email); username trim/lower-case trước UNIQUE theo v2.1 §19. role do người đăng ký chọn trong FARMER/TRADER, không cho tự chọn ADMIN.
5.2 farmer_profiles
Field
PostgreSQL
Bắt buộc /​ ràng buộc
Ý nghĩa
farmer_​id
UUID
PK, FK → accounts
Bằng account_​id, chỉ account role FARMER
full_​name
VARCHAR(150)
NOT NULL
Tên hiển thị
phone
VARCHAR(20)
NULL
Riêng tư
address
VARCHAR(255)
NULL
Địa chỉ chi tiết, riêng tư
province
VARCHAR(100)
NULL
Khu vực công khai
district
VARCHAR(100)
NULL
Khu vực công khai theo whitelist nhóm
avatar_​url
VARCHAR(500)
NULL
avatarUrl là URL đọc ảnh của User qua Gateway; POST /api/v1/users/me/avatar upload và cập nhật profile. Kiểm quyền đọc như public profile, không dùng URL ngoài do client tùy ý cung cấp.
created_​at
TIMESTAMPTZ
NOT NULL
UTC
updated_​at
TIMESTAMPTZ
NOT NULL
UTC
 
5.3 trader_profiles
Field
PostgreSQL
Bắt buộc /​ ràng buộc
Ý nghĩa
trader_​id
UUID
PK, FK → accounts
Bằng account_​id, chỉ account role TRADER
business_​name
VARCHAR(200)
NOT NULL
Tên hiển thị của Trader/​doanh nghiệp
phone
VARCHAR(20)
NULL
Riêng tư
address
VARCHAR(255)
NULL
Địa chỉ chi tiết, riêng tư
province
VARCHAR(100)
NULL
Khu vực công khai
district
VARCHAR(100)
NULL
Khu vực công khai theo whitelist nhóm
avatar_​url
VARCHAR(500)
NULL
Ảnh đại diện
buying_​area
VARCHAR(255)
NULL
Khu vực thu mua, giữ trong private profile; không public theo whitelist mục12
created_​at
TIMESTAMPTZ
NOT NULL
UTC
updated_​at
TIMESTAMPTZ
NOT NULL
UTC
 
Không có verification_status, biological_standard hoặc truck_support trong MVP. Điều kiện sử dụng tài khoản Trader giống Farmer: role hợp lệ và email đã xác minh (accounts.status = ACTIVE).
5.4 email_verification_otps
Field
PostgreSQL
Bắt buộc /​ ràng buộc
Ý nghĩa
otp_​id
UUID
PK, NOT NULL
ID bản ghi OTP
account_​id
UUID
FK → accounts, NOT NULL
Chủ OTP
email
VARCHAR(254)
NOT NULL
Email mà mã xác minh áp dụng
code_​hash
VARCHAR(255)
NOT NULL
Hash mã 6 chữ số; không lưu/​ghi log mã gốc
expires_​at
TIMESTAMPTZ
NOT NULL
Hết hạn
used_​at
TIMESTAMPTZ
NULL
Đã dùng một lần
attempt_​count
INTEGER
NOT NULL, DEFAULT 0
Giới hạn đoán mã
created_​at
TIMESTAMPTZ
NOT NULL
UTC
 
OTP6 chữ số/10 phút/tối đa5 lần sai; resend cooldown60s, max5 lượt phát mã/giờ/email. HMAC-SHA-256 bằng server secret; mã mới vô hiệu mã cũ, used_at chỉ khi verify thành công. Row lock account/OTP chống race. User gửi SMTP; không publish OTP hoặc lưu trong Notification.
5.5 refresh_tokens
Field
PostgreSQL
Bắt buộc /​ ràng buộc
Ý nghĩa
refresh_​token_​id
UUID
PK, NOT NULL
ID phiên token
account_​id
UUID
FK → accounts, NOT NULL
Chủ phiên
token_​hash
VARCHAR(255)
NOT NULL, UNIQUE
Hash của token ngẫu nhiên
expires_​at
TIMESTAMPTZ
NOT NULL
Hết hạn
revoked_​at
TIMESTAMPTZ
NULL
Logout/​khóa/​thu hồi phiên
created_​at
TIMESTAMPTZ
NOT NULL
UTC
last_​used_​at
TIMESTAMPTZ
NULL
Dùng refresh lần gần nhất
 
Refresh token được rotate khi đổi access token: token cũ bị thu hồi và token mới được cấp trong một giao dịch. Khi khóa account, thu hồi tất cả refresh token của account. Access token JWT cũ không bị xóa khỏi client; quyền truy cập của nó bị từ chối bằng kiểm tra trạng thái account hiện tại ở mục 8.2.
Quan hệ và quyền sở hữu: Các FK ở trên chỉ nằm trong user_db. farmer_id/trader_id bằng account_id của account đúng role. Các service khác dùng logical reference qua account ID, không truy cập trực tiếp user_db.
Lock row account trước OTP/refresh; login/refresh kiểm ACTIVE trong transaction cấp phiên. Refresh token opaque≥32byte, DB SHA-256 hash,7 ngày/token, rotate bằng row lock; chỉ1 refresh đồng thời thành công. Lock thu hồi mọi refresh. Không thêm audit table; lịch sử điểm bổ sung theo xulycontract, không còn ràng buộc tuyệt đối5 bảng.
5.6 Reputation và lịch sử điểm — bổ sung theo xulycontract
User sở hữu reputation FARMER/TRADER: 0–10, khởi tạo 10, bước 0,5; ADMIN không áp dụng điểm hợp đồng. Chỉ phạt khi có quyết định được xác nhận. Một hành vi một mức phạt chính; hành vi độc lập như giả bằng chứng có thể xử lý riêng. Thưởng +0,5/account/Contract sau hoàn tất không vi phạm và hết hạn khiếu nại; không thưởng vì đã rút sau +24h, RELEASED nhưng Contract chưa hoàn tất, hủy/vi phạm hoặc Admin mở khóa. Hoàn đúng điểm đã trừ khi quyết định bị hủy; trần 10. Giới hạn thưởng 1 điểm/cặp Farmer–Trader/30 ngày theo TXT; mỗi Contract/account chỉ thưởng một lần. Thưởng sau completedAt+72 giờ khi hết hồ sơ mở; F04 −2 nếu khắc phục và hoàn tất, −3 nếu không khắc phục dẫn đến hủy; không cộng F06 cho cùng hành vi. Contract v2.1 §12 đã chốt.
User lưu điểm FARMER/TRADER và nguyên nhân khóa riêng quản trị/uy tín; chưa áp điểm cho ADMIN. Lịch sử điểm gồm accountId, contractId, decisionId, action, delta, beforeScore, afterScore, reason, time và version tham chiếu quyết định gốc. Phạt UNIQUE(decisionId, accountId, action); thưởng UNIQUE(contractId, accountId, COMPLETION_REWARD). Tất cả FK account/history nội bộ user_db; contractId chỉ logical reference Payment.
Transaction khóa row account, kiểm business key, ghi lịch sử, cập nhật điểm/status, thu hồi refresh; commit rồi ACK. Event giao lại dù eventId mới không trừ/cộng thêm. Điều chỉnh/hủy quyết định tham chiếu gốc và version; hoàn đúng delta, không tạo phạt mới. Publish cần outbox hoặc cơ chế phục hồi được duyệt; không ACK trước DB commit.
User được tự LOCKED khi reputation=0: khóa row account → ghi lịch sử → cập nhật điểm/status/nguyên nhân khóa → thu hồi mọi refresh token trong một transaction → commit → JWT cũ bị chặn theo access-state. Admin không mở khóa khi điểm vẫn 0; chỉ khi quyết định sửa/hủy đưa điểm>0 và không còn lý do khóa khác. Không tự reset điểm 1/10. Khóa không tự hủy Contract khác hoặc tịch thu cọc. Admin giải quyết quyền lợi/cọc theo quyền xử lý riêng, không giả danh participant hoặc bỏ ACTIVE guard của API người dùng.
5.7. Schema triển khai v2.1
User owns reputation_history(account_id,counterparty_id,contract_id,decision_id,decision_version,original_decision_id,action,requested_delta,actual_delta,before_score,after_score,reason_code,created_at), outbox và media_assets avatar. Unique(decision_id,account_id,action), unique reward(contract_id,account_id), unique reversal(original_decision_id,account_id); khóa row account trước tính cap +1/cặp/30 ngày. REVERSAL lấy ngược actual_delta gốc, gồm thu hồi thưởng sai; không ACK khi chưa có gốc. ADMIN không có reputation; FARMER/TRADER score ban đầu10,0..10,bước0,5. admin_lock/reputation_lock độc lập; chỉ unlock khi score>0 và không còn lý do khóa.
6. API Contract
API/DTO User giữ Contract JSON đã chốt: login/refresh trả TokenPair có refreshToken; refresh/logout nhận {refreshToken}; logout Bearer ACTIVE và refresh token thuộc sub. URL/profile/Admin allowlist theo mục7 áp dụng; token lưu bộ nhớ frontend, không cookie trong MVP.
Method
Endpoint
Auth
Kết quả
POST
/​api/​v1/​auth/​register
Public, FARMER/​TRADER only
201 AccountSummary + verificationEmailStatus
POST
/​api/​v1/​auth/​verify-email
Public có OTP/​rate limit
200 {status:ACTIVE}
POST
/​api/​v1/​auth/​resend-verification
Public có rate limit
202 generic;503 nếu SMTP cần gửi bị lỗi
POST
/​api/​v1/​auth/​login
Public
200 TokenPair, chỉ ACTIVE
POST
/​api/​v1/​auth/​refresh
Refresh token
200 TokenPair, rotate
POST
/​api/​v1/​auth/​logout
Bearer ACTIVE
204, thu hồi refreshToken request thuộc sub
GET
/​api/​v1/​users/​me
Bearer ACTIVE
200 PrivateProfile
PUT
/​api/​v1/​users/​me
Bearer ACTIVE
200 PrivateProfile
GET
/​api/​v1/​users/​{accountId}
Bearer ACTIVE
200 PublicProfile
GET
/​api/​v1/​farmers/​{farmerId}
Bearer ACTIVE
200 PublicProfile, FARMER
GET
/​api/​v1/​traders/​{traderId}
Bearer ACTIVE
200 PublicProfile, TRADER
POST
/​api/​v1/​admin/​accounts
ADMIN ACTIVE
201, chỉ tạo FARMER/​TRADER UNVERIFIED
GET
/​api/​v1/​admin/​accounts
ADMIN ACTIVE
200 page, filter role/​status
GET
/​api/​v1/​admin/​accounts/​{accountId}
ADMIN ACTIVE
200 AdminAccountDetail
PATCH
/​api/​v1/​admin/​accounts/​{accountId}
ADMIN ACTIVE
200, profile field allowlist
PATCH
/​api/​v1/​admin/​accounts/​{accountId}/​status
ADMIN ACTIVE
200 AccountSummary
DELETE
/​api/​v1/​admin/​accounts/​{accountId}
ADMIN ACTIVE
204, soft INACTIVE
GET
/​internal/​v1/​accounts/​{accountId}/​access-state
Service authentication only
200 state/​role;404 account absent
 
Không có API tạo thêm ADMIN, đổi role/email/password hoặc duyệt Trader. Avatar upload đã bổ sung tại Contract v2.1 §18 và mục API bên dưới. Admin profile PATCH không sửa password_hash/OTP/token/status; không gán avatar từ file private thuộc người khác.
6.1. Avatar API bổ sung
POST /api/v1/users/me/avatar: Bearer ACTIVE, multipart file JPEG/PNG/WebP ≤5 MiB; 201 {mediaId,avatarUrl,contentType,sizeBytes}, cập nhật profile + outbox. GET /api/v1/users/media/{mediaId}: Bearer ACTIVE, quyền owner/public profile ACTIVE; 200 bytes,404 khi không được xem,413 quá dung lượng,415 sai định dạng. Volume User riêng; metadata media_assets trong user_db; không fetch URL ngoài. Gateway giữ /api/v1/users/**, không route internal public.
7. API Examples và Data Contract
Register request:
{   "username": "trader01",   "email": "trader@example.com",   "password": "<password>",   "role": "TRADER",   "profile": { 	"businessName": "ABC Rice", 	"phone": "0900000000", 	"address": "Can Tho", 	"province": "Can Tho", 	"district": null, 	"avatarUrl": null, 	"buyingArea": "Mien Tay"   } }
Farmer thay businessName bằng fullName và không buyingArea. Transaction tạo account+đúng profile+OTP hash. Account commit trước SMTP; email lỗi vẫn UNVERIFIED, response201 kèm verificationEmailStatus FAILED, success SENT; retry bằng resend theo Contract đã chốt, không xóa account khi SMTP lỗi.
DTO/​request
Fields DTO baseline
AccountSummary
accountId,username,email,role,status,createdAt
Verify email
{email,otp}
Resend
{email};202 generic không tiết lộ email không tồn tại/​đã verified
Login
{username,password}
Refresh/​logout
{refreshToken};logout token phải thuộc sub
TokenPair
accessToken,refreshToken,tokenType:Bearer,expiresIn,accountId,role
PrivateProfile
AccountSummary+emailVerifiedAt+profile đúng role;ADMIN profile=null
PublicProfile
accountId,displayName,avatarUrl,province,district,joinedAt
AdminAccountDetail
AccountSummary+emailVerifiedAt+profile, không secret
Status PATCH
{status,reason}
 
PublicProfile whitelist {accountId, displayName, avatarUrl, province, district, joinedAt}; caller Bearer ACTIVE, target Farmer/Trader ACTIVE; target ADMIN/sai role/không ACTIVE trả404. Không email/phone/address/buyingArea/status/rating/badge. Reputation dùng nội bộ; public reputation chưa được nhóm duyệt.
PUT me gửi profile đầy đủ theo role: tên required, optional không gửi trở thành null; PATCH chỉ sửa field hiện diện. PATCH admin chỉ field hiện diện. Cho sửa Farmer fullName/phone/address/province/district/avatarUrl; Trader businessName/phone/address/province/district/avatarUrl/buyingArea. Không role/status/email/password. ADMIN chỉ có account, không hồ sơ Farmer/Trader; PUT profile của ADMIN trả400 VALIDATION_ERROR vì không có profile để cập nhật.
JWT RS256/15 phút/iss=urn:soa:user-service/aud=soa-api; sub UUID,role,iat,exp,jti,kid ở header. User private key; Gateway/backend public key. TokenPair JSON {accessToken,refreshToken,tokenType:"Bearer",expiresIn:900,accountId,role}; refresh/logout body {refreshToken}. Cả hai token ở bộ nhớ frontend, reload cần login; không cookie/localStorage/sessionStorage. Refresh single-flight; CORS credentials=false, allowlist http://localhost:5173 dev. Không đưa contact/OTP vào JWT.
8. Authentication & Authorization
Register: Client → API Gateway → User Service → user_db. Public register chỉ nhận FARMER hoặc TRADER; không cho tạo ADMIN qua request công khai. Sau đăng ký là UNVERIFIED; OTP email hợp lệ chuyển ACTIVE. Trader ACTIVE dùng các chức năng theo role mà không cần admin duyệt.
Login: User Service kiểm tra password BCrypt và trạng thái ACTIVE, sau đó cấp access token/refresh token. sub là accountId, claim role chỉ có một giá trị. Contract đã chốt Gateway forward Bearer gốc; backend verify public key và kiểm ownership, không tin header client. Không ghi log password/token, không trả password_hash.
Action
FARMER
TRADER
ADMIN
Public register
Có
Có
Không
Email OTP và login sau ACTIVE
Có
Có
Admin seed có kiểm soát bằng secret; xác minh email bằng OTP trước ACTIVE; không bypass OTP hoặc thêm API tạo ADMIN.
Đọc account/​profile của mình
Có
Có
Có (profile=null)
Sửa profile Farmer/​Trader của mình
Có
Có
Không có profile riêng trong MVP
Admin account CRUD/​khóa/​mở khóa
Không
Không
Có
Duyệt giấy tờ Trader
Không có trong MVP
Không có trong MVP
Không có trong MVP
 
8.1 Trạng thái account và refresh token
Đối tượng
Chuyển trạng thái
Điều kiện
Account
NEW → UNVERIFIED
Public register Farmer/​Trader
Account
UNVERIFIED → ACTIVE
Email OTP hợp lệ
Account
ACTIVE → LOCKED
Admin khóa, thu hồi refresh tokens
Account
LOCKED → ACTIVE
Admin mở khóa khi email đã xác minh
Account
ACTIVE → INACTIVE
Admin vô hiệu hóa mềm theo policy
Account
INACTIVE → ACTIVE
Admin kích hoạt lại khi email đã xác minh
 
Trader không có state machine duyệt riêng: đăng ký role TRADER → xác minh email → account ACTIVE. Khi Admin chuyển account sang LOCKED/INACTIVE, User Service cập nhật trạng thái và thu hồi tất cả refresh token trong cùng transaction; kể từ khi transaction commit, mọi request mới mang access token cũ của account đó phải bị từ chối theo mục 8.2. Request đã bắt đầu trước commit có thể đã được xử lý; không gọi đó là thu hồi tác vụ đang chạy.
8.2 Khóa account có hiệu lực ngay với access token cũ
Quyết định của nhóm: Không đợi JWT hết hạn. Chữ ký JWT và exp hợp lệ chưa đủ để cho phép request; account tại user_db phải đang ACTIVE tại thời điểm kiểm tra quyền truy cập.
1. User Service cung cấp API nội bộ GET /internal/v1/accounts/{accountId}/access-state cho Gateway/service được tin cậy; kết quả tối thiểu là accountId, status và accessAllowed = (status == ACTIVE). accountId lấy từ sub của JWT đã xác minh, không tin ID do client tự chọn. Endpoint được bảo vệ bằng service-to-service authentication và không public.
2. Gateway xác minh chữ ký/claims của JWT, sau đó gọi User Service cho mỗi request được bảo vệ, không cache trạng thái ACTIVE; chỉ chuyển tiếp khi accessAllowed = true. Gateway không được tin x-user-id/x-user-role do client gửi mà phải tự xác lập identity sau khi kiểm tra.
3. Các service không nhận trực tiếp request từ Internet. Luồng nội bộ đi thẳng tới một service mà sử dụng JWT của người dùng phải kiểm tra account state tương đương trước khi thực hiện nghiệp vụ; không được bỏ qua kiểm tra Gateway. Với WebSocket, cần kiểm tra trước mỗi hành động gửi/nhận cần quyền hoặc đóng kết nối khi account bị khóa; chỉ kiểm tra lúc bắt tay không đủ.
4. Nếu không đọc được trạng thái account vì User Service lỗi/timeout, request được bảo vệ không được tiếp tục như ACTIVE (fail closed; trả lỗi dịch vụ phù hợp). Refresh/login cũng chỉ cấp token khi account ACTIVE. Đường kiểm tra này không áp dụng cho register/verify-email và các endpoint public đã định nghĩa rõ.
Chi phí của quyết định này là mỗi request cần tra trạng thái đồng bộ và phụ thuộc User Service. Gateway, Chat/WebSocket và các service nhận token trực tiếp phải cập nhật shared Security/API Contract; không chỉ sửa User Service là đạt yêu cầu hiệu lực ngay.
Access-state trả accountId, status, role, accessAllowed; DB primary, Cache-Control:no-store, không cache ACTIVE. Caller LOCKED/INACTIVE/UNVERIFIED→403 ACCOUNT_NOT_ACTIVE; timeout/lỗi→503 ACCESS_STATE_UNAVAILABLE; account không tồn tại404→từ chối. X-Service-Key riêng caller, HTTPS/private network; timeout tổng1giây. User kiểm DB trực tiếp.
WebSocket kiểm tra trước SEND/SUBSCRIBE và trước push riêng tư, token hết hạn cần xác thực lại. Mở khóa có thể khiến JWT cũ còn hạn dùng lại được; nếu yêu cầu vô hiệu vĩnh viễn qua khóa/mở khóa phải bổ sung session version, chưa có trong5 bảng MVP.
Admin seed bằng secret, phải xác minh email qua OTP trước ACTIVE; không bypass OTP hoặc password mặc định trong Git. Không public/admin API tạo ADMIN mới. Cấm tự khóa/xóa mình và Admin ACTIVE cuối cùng. Profile PATCH theo allowlist, không role/email/password; role bất biến. Restore ACTIVE chỉ khi verified và reputation>0 đối với Farmer/Trader, không còn nguyên nhân khóa khác.
9. Error Contract
Schema lỗi {timestamp,status,code,message,path,traceId?}; traceId là field tùy chọn. Không stack trace/SQL/secret. Codes theo contract chung mục5:
HTTP
Code
Ý nghĩa
400
VALIDATION_​ERROR, OTP_​INVALID_​OR_​EXPIRED
Request/​OTP sai
401
UNAUTHORIZED, INVALID_​CREDENTIALS, INVALID_​REFRESH_​TOKEN
Token/​login sai
403
FORBIDDEN, ACCOUNT_​NOT_​ACTIVE
Sai role hoặc state
404
NOT_​FOUND, ACCOUNT_​NOT_​FOUND
Resource không thấy
409
ACCOUNT_​ALREADY_​EXISTS, INVALID_​STATE_​TRANSITION
Trùng dữ liệu hoặc state sai
429
RATE_​LIMITED
Rate limit, Retry-After
503
ACCESS_​STATE_​UNAVAILABLE, EMAIL_​DELIVERY_​UNAVAILABLE
Dependency lỗi
500
INTERNAL_​SERVER_​ERROR
Lỗi nội bộ
 
10. Inter-Service Communication
Caller
Interface
Policy
Gateway/​backend
GET /​internal/​v1/​accounts/​{accountId}/​access-state
Service auth, current state không cache ACTIVE
Trading/​Chat/​logical Contract
PublicProfile GET Users/​Farmers/​Traders
Đề xuất forward user Bearer hợp lệ khi có delegated request
Notification
recipientId=accountId
Logical reference; không FK/​query user_​db
User
SMTP
OTP email delivery, không business notification Kafka
 
USER_PROFILE_UPDATED: User → Trading, topic soa.user.profile.v1, key accountId. Data {accountId,role,profileVersion,publicVisible,profile:{displayName,avatarUrl,province,district,joinedAt}}; khi ẩn public profile gửi publicVisible=false,profile=null. Trading giữ farmer_replicas/trader_replicas, chỉ áp version mới; bootstrap bằng job User phát snapshot hiện hành. Không OTP/token/password/email/phone/address/reputation trong payload public; không coi replica là cơ chế khóa tức thời. Contract v2.1 §9 là chuẩn producer/consumer.
11. Validation
Field
Rule
username
Required, unique; trim/lowercase username và email trước kiểm tra. Không tự merge account lịch sử nếu trùng sau chuẩn hóa.
email
Required, unique sau chuẩn hóa; OTP xác minh email trước ACTIVE
password
Required, ít nhất 8 ký tự gồm chữ hoa, chữ thường, số, ký tự đặc biệt theo CF-USER-05
role khi public register
Chỉ FARMER hoặc TRADER; không nhận ADMIN
fullName
Required cho Farmer profile
businessName
Required cho Trader profile
phone/​address
Optional; chuỗi phone tối đa20, address255; không chứng nhận số điện thoại
OTP
Một lần dùng, có hạn, giới hạn số lần thử và gửi lại; 10phút/​5lần sai/​60s resend, xem contract mục6.1
refresh token
Chỉ lưu hash, kiểm tra hạn và trạng thái thu hồi; rotation khi refresh
 
Không có verification_status hoặc điều kiện admin duyệt Trader. Không trả OTP/hash/password/token qua profile API.
Validation: username3–100 ký tự sau chuẩn hóa, fullName1–150/businessName1–200, email tối đa254, avatarUrl URL hợp lệ tối đa500, buyingArea255. BCrypt tối đa72byte input cần reject password vượt giới hạn để không truncation; password tối thiểu8 gồm hoa/thường/số/đặc biệt giữ spec trước, chính sách này cần đối chiếu lại nếu nhóm đổi. Không tự nâng password policy ngoài requirement. Page0/size20/max100; admin list filter role/status, createdAt DESC/accountId DESC; filter ngày tạo chưa triển khai MVP contract này.
12. Repository Structure
user-service/   ├── src/main/java/.../   │   ├── controller/   │   ├── service/   │   ├── repository/   │   ├── entity/   │   ├── dto/   │   ├── mapper/   │   ├── security/   │   ├── exception/   │   └── config/   ├── src/main/resources/   │   ├── application.yml   │   └── db/migration/   ├── src/test/   ├── Dockerfile   ├── build file   └── README.md
13. Coding Rules
1. 	Controller không chứa business logic.
2. 	Service layer xử lý business rules.
3. 	Repository chỉ persistence.
4. 	DTO dùng cho API request/response.
5. 	Không expose entity/password_hash.
6. 	Không gọi repository của service khác.
7. 	Không truy cập database service khác.
8. 	Transaction boundary đặt ở service layer khi cần atomicity.
9. 	Schema change phải có migration.
10.  API change phải cập nhật contract và test.
14. Configuration
SERVER_PORT, DB_URL, DB_USERNAME, DB_PASSWORD, JWT_PRIVATE_KEY_LOCATION, JWT_PUBLIC_KEY_LOCATION, JWT_ISSUER, JWT_AUDIENCE, JWT_ACCESS_TTL, REFRESH_TOKEN_TTL, OTP_TTL, OTP_HMAC_SECRET, MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, INTERNAL_SERVICE_KEYS, SPRING_PROFILES_ACTIVE.
RS256 đã chốt; private/public key và issuer/audience cấu hình đồng bộ. User SMTP và access-state DB primary. Không commit private key/OTPsecret/password/service key; secrets inject env. Không JWT_SECRET HMAC thay RS256. PostgreSQL migration theo schema đã duyệt.
14.1. Frontend và cấu hình vận hành v2.1
Contract v2.1 §17: token bộ nhớ, refresh single-flight, logout kiểm token thuộc account, dev origin http://localhost:5173, credentials=false; deploy cùng HTTPS origin. §19: seed tối thiểu2 Admin riêng và OTP; SUPPORT_EMAIL cho account khóa; SMTP gửi LOCKED/UNLOCKED có retry/outbox, lỗi email không rollback lock. Login 10 lần sai/15 phút theo IP+username,429/Retry-After; OTP quotas giữ nguyên, cleanup không reset quota. Rotate kid/public key overlap16 phút,clock skew≤60s; User private key, không thêm JWKS API.
15. Testing Strategy
Level
Scope
Unit
Auth logic, role authorization, profile rules, validation
DB/​Repository
Persistence, unique username/​email, OTP dùng một lần, refresh token rotation
Integration
Register → OTP email → ACTIVE → login, refresh/​logout, profile, admin CRUD
Security
401/​403, token validation
Account lock
Token cũ bị từ chối ngay trên request mới sau khi LOCKED/​INACTIVE commit; lỗi User Service phải fail closed
API
Status code, request/​response
Contract
Compatibility với consumer
 
15.1 Minimum Test Cases
· Register Farmer thành công.
· Register Trader tạo account UNVERIFIED; xác minh email → ACTIVE, không có bước admin duyệt.
· Register role ADMIN qua API công khai → reject.
· OTP sai/hết hạn/đã dùng → reject.
· Refresh token hết hạn/thu hồi → reject; rotation không dùng lại token cũ.
· Username/email trùng → 409.
· Login đúng → 200 + token.
· Login sai → 401.
· /users/me không token → 401.
· Update own profile → thành công.
· Unauthorized admin operation → 403.
· Admin CRUD account, xóa mềm và khóa/mở khóa đúng quyền; không bỏ qua OTP khi kích hoạt account.
· Đăng nhập lấy access token rồi Admin khóa account → cùng token đó gọi Gateway/API mới bị từ chối ngay, dù exp chưa tới.
· Gateway không dùng cache ACTIVE; User Service mất kết nối → protected request không được phép đi tiếp.
· Token truyền theo luồng nội bộ/WebSocket không vượt qua kiểm tra trạng thái sau khi account bị khóa.
· Profile sai role → reject.
· Password không xuất hiện response/log.
15.2 Local Development & Docker
docker compose up -d
./mvnw clean package
./mvnw spring-boot:run
GET /actuator/health
NOTE: User Service dùng Java/Spring Boot theo quyết định hiện tại; command thực tế phụ thuộc build tool của repository.
16. Definition of Done
[ ] user_db migration ổn định.
[ ] Năm bảng nền accounts/farmer_profiles/trader_profiles/email_verification_otps/refresh_tokens và bổ sung reputation/history đúng ownership; migration mới theo gói schema v2 được duyệt.
[ ] Register, email OTP, Login, refresh/logout hoạt động; Trader chỉ cần email verified và role TRADER.
[ ] Authentication hoạt động.
[ ] Authorization hoạt động.
[ ] Profile API và admin account CRUD (xóa mềm) hoạt động; không có API duyệt Trader.
[ ] Validation + error contract hoạt động.
[ ] Không expose password_hash, OTP, token hash; không có verified badge của Trader.
[ ] Không truy cập DB service khác.
[ ] API docs cập nhật.
[ ] Unit/integration/API tests đạt.
[ ] Docker/local run được.
[ ] README có hướng dẫn chạy.
17. AI Agent Development Rules
11.  Đọc document này và API contract chung trước khi code.
12.  Chỉ sửa User Service trừ khi task yêu cầu thay đổi contract.
13.  Không tự tạo entity/table/role mới.
14.  Không tự đổi tên field/API.
15.  Không tạo cross-service FK.
16.  Không query DB service khác; dùng API contract.
17.  Requirement thiếu/mâu thuẫn → đánh dấu CẦN XÁC NHẬN.
18.  Mọi schema change phải có migration.
19.  Mọi API change phải cập nhật contract + test.
20.  Không commit secret.
18. Quyết định nhóm và baseline đã chốt
ID
Trạng thái
Nội dung
CF-USER-01
Đã chọn công nghệ/​hướng spec; patch đề xuất
Java/Spring Boot, PostgreSQL/JPA;5 bảng nền và lịch sử điểm theo TXT. Java21/Boot3.5.x/Maven là hướng triển khai hiện có, không tự nâng major dependency khi chưa kiểm tương thích.
CF-USER-02
ĐÃ CHỐT
JWT sub accountId/​role đơn; Gateway verify, không trust header client
CF-USER-03
ĐÃ CHỐT
Lock/​INACTIVE revoke refresh và chặn old JWT ngay trên request mới sau commit; fail closed
CF-USER-04
Giữ spec trước
Password BCrypt, không plaintext/​hash trong response
CF-USER-05
Giữ spec trước
Password8 ký tự có hoa/​thường/​số/​đặc biệt; input byte limit cần áp dụng phù hợp BCrypt
CF-USER-06
ĐÃ CHỐT
Register FARMER/​TRADER UNVERIFIED; email OTP→ACTIVE
CF-USER-07
ĐÃ CHỐT
Admin CRUD giới hạn/​soft delete/​lock; không bypass OTP, ADMIN không public register
CF-USER-08
ĐÃ CHỐT
Public whitelist tên/​avatar/​region/​joinedAt; private own account; không OTP/​hash/​token/​rating
CF-USER-09
ĐÃ CHỐT
Trader chọn role và verify email, không approval/​docs/​badge/​verification_​status/​biological_​standard/​truck_​support
CF-USER-10
ĐÃ CHỐT07/10/2026
RS256/15 phút/iss/aud/public key; OTP10 phút/5lần/60s; refresh JSON7 ngày; M2Mkey; profileBearerACTIVE; Admin seed OTP; reputation0–10/system lock.
 
Thuật toán/TTL/OTP/SMTP/JSON/Admin/profile/replica/reputation đã chốt; frontend token/CORS, key rotation và rate limit theo Contract v2.1 §17/§19. Không còn mục duyệt nghiệp vụ trong baseline.
19. Quick Reference
SERVICE: User. DATABASE:user_db. TABLES:accounts,farmer_profiles,trader_profiles,email_verification_otps,refresh_tokens. AccountId/FarmerId/TraderId UUID, profile ID=accountId đúng role. Trạng thái UNVERIFIED/ACTIVE/LOCKED/INACTIVE. Public register không ADMIN. Trader không verification flow. Internal access-state phục vụ khóa tức thời. API và error/DTO chi tiết xem contract chung mục4–6.
Trước code áp dụng Contract v2.1: JSON refresh/token bộ nhớ; User publish public profile và reputation/account events đúng topic/payload, có history/outbox/dedup. Schema, D01–D07 và API tranh chấp đã có hiệu lực; còn phải triển khai/migrate/test theo yêu cầu, không coi là code đã hoàn tất.
 
Luồng tích hợp đã đồng bộ
Register FARMER/TRADER → accounts UNVERIFIED → xác minh OTP → ACTIVE → login JWT/refresh → Gateway kiểm JWT + trạng thái hiện tại → User/service kiểm quyền và ownership. ADMIN đầu tiên seed có kiểm soát; không public register ADMIN, không bypass OTP.
Admin/system lock commit → thu hồi refresh → request mới qua Gateway/direct service/WebSocket bị chặn bằng access-state; state unavailable fail closed. System lock chỉ khi reputation0, unlock không được bypass điểm 0 hoặc nguyên nhân khóa khác.
Luồng reputation và Kafka đã đồng bộ 07/10/2026
Nguồn cập nhật: Conflict đã chốt, Contract chung v2.1 và xulycontract(1).txt; người dùng đã giao quyền lựa chọn phương án và cập nhật trực tiếp. D01–D07 và gói kỹ thuật có hiệu lực theo v2.1. Ưu tiên quyết định mới nhất → Conflict đã chốt → Contract → rule → spec; không dùng đề xuất cũ để mở lại các mục đã đóng.
USER_PROFILE_UPDATED: User → Trading, topic soa.user.profile.v1, key accountId. Data {accountId,role,profileVersion,publicVisible,profile:{displayName,avatarUrl,province,district,joinedAt}}; khi ẩn public profile gửi publicVisible=false,profile=null. Trading giữ farmer_replicas/trader_replicas, chỉ áp version mới; bootstrap bằng job User phát snapshot hiện hành. Không OTP/token/password/email/phone/address/reputation trong payload public; không coi replica là cơ chế khóa tức thời. Contract v2.1 §9 là chuẩn producer/consumer.
Payment phát CONTRACT_REPUTATION_DECIDED trên soa.payment.reputation-decision.v1/key accountId, data gồm decisionId/decisionVersion/originalDecisionId?/contractId/accountId/counterpartyId/action/violationCode?/requestedDelta/reasonCode/effectiveAt. User dedup business key, kiểm mã/mức, transaction score/history/lock/revoke refresh/outbox; publish REPUTATION_CHANGED và ACCOUNT_LOCKED/ACCOUNT_UNLOCKED khi có transition. Notification chỉ dựng nội dung. Topic/payload/template có hiệu lực theo v2.1 §9–12, không dữ liệu nhạy cảm.
User được tự LOCKED khi reputation=0: khóa row account → ghi lịch sử → cập nhật điểm/status/nguyên nhân khóa → thu hồi mọi refresh token trong một transaction → commit → JWT cũ bị chặn theo access-state. Admin không mở khóa khi điểm vẫn 0; chỉ khi quyết định sửa/hủy đưa điểm>0 và không còn lý do khóa khác. Không tự reset điểm 1/10. Khóa không tự hủy Contract khác hoặc tịch thu cọc. Admin giải quyết quyền lợi/cọc theo quyền xử lý riêng, không giả danh participant hoặc bỏ ACTIVE guard của API người dùng.
Security đã chốt 07/10/2026: User ký RS256, access token 15 phút; iss=urn:soa:user-service, aud=soa-api; sub=accountId UUID, role=FARMER/TRADER/ADMIN, iat/exp/jti. Chỉ User giữ private key; Gateway/backend verify bằng public key, forward Bearer và kiểm ownership. GET /internal/v1/accounts/{accountId}/access-state đọc DB primary, không cache ACTIVE, timeout tổng 1 giây; không kiểm tra được →503 ACCESS_STATE_UNAVAILABLE; account không ACTIVE →403 ACCOUNT_NOT_ACTIVE. Internal dùng X-Service-Key riêng từng caller, private network/HTTPS khi triển khai, không route public. WebSocket Chat kiểm state trước SEND/SUBSCRIBE và push riêng tư.
Chuẩn đối chiếu chung — CONTRACT CHUNG MVP v2.1
Tab rule chứa toàn văn Contract v2.1, là đầu mối đối chiếu API/event/schema/flow cho nhóm. Service này theo §4,§9–12,§14–16; JSON refresh đã chốt, điểm/lock/history và profile event theo ownership User. D01–D07 và gói kỹ thuật v2.1 đã có hiệu lực theo chỉ đạo chọn phương án và thực hiện. Áp dụng thêm §17–19 cho token/CORS/media/Admin; mọi endpoint/event mới phải được triển khai đúng contract, không còn chờ duyệt nghiệp vụ.
Change Log
§1–3, §5–8, §11, §15–19: giữ/đồng bộ 5 bảng, FARMER/TRADER/ADMIN, 4 account status, OTP/refresh, Admin giới hạn, private/public profile và khóa tức thời. Nguồn: Conflict 02, 07, 10–12; Contract 2–6.
§10: USER_PROFILE_UPDATED đồng bộ replica Trading, loại thông tin nhạy cảm; User bổ sung producer kết quả điểm/khóa và consumer quyết định xử lý theo TXT. Nguồn: nhóm 07/10 mục10; xulycontract§7–10.
§1, §5–8, §10–11, §14, §18: D01–D07/schema/event/media/token/Admin chuyển thành baseline v2.1 theo quyền người dùng giao chọn phương án. Nguồn: Conflict + Contract v2.1; không coi BA là bằng chứng code đã có.
Cập nhật baseline v2.1: đóng D01–D07, chuẩn hóa API/event/schema/flow và các mục token/CORS/media/Admin theo phạm vi service. Nguồn: Conflict + Contract v2.1 theo chỉ đạo người dùng chọn phương án và thực hiện; nội dung tài liệu không chứng minh code đã triển khai.
Open Issues
Không còn quyết định nghiệp vụ/gói kỹ thuật chờ duyệt trong baseline v2.1. Cấu hình thật (domain, SMTP, seed email, SUPPORT_EMAIL, secrets), backfill dữ liệu và kiểm thử mã nguồn là việc triển khai theo Contract §19; không ghi chúng là đã hoàn tất. Mở vấn đề mới chỉ khi có thay đổi phạm vi hoặc mâu thuẫn mới được phát hiện.



