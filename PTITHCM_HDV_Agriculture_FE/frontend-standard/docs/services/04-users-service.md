# User — Auth, profile và Admin account

Account một role FARMER/TRADER/ADMIN; status UNVERIFIED/ACTIVE/LOCKED/INACTIVE. Public register chỉ Farmer/Trader, Admin seed backend. TokenPair {accessToken,refreshToken,tokenType:"Bearer",expiresIn,accountId,role}; access 15 phút, refresh rotate 7 ngày; token trong RAM.

| Method/path                                     | Request / response chính                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| POST /api/v1/auth/register                      | username,email,password,role,profile → AccountSummary + verificationEmailStatus |
| POST /api/v1/auth/verify-email                  | {email,otp} → ACTIVE                                                            |
| POST /api/v1/auth/resend-verification           | {email} → 202 generic                                                           |
| POST /api/v1/auth/login                         | {username,password} → TokenPair                                                 |
| POST /api/v1/auth/refresh                       | {refreshToken} → rotated TokenPair                                              |
| POST /api/v1/auth/logout                        | Bearer + {refreshToken} → 204                                                   |
| GET /api/v1/users/me                            | PrivateProfile                                                                  |
| PUT /api/v1/users/me                            | đầy đủ profile theo role, optional vắng trở thành null                          |
| GET /api/v1/users/{accountId}                   | PublicProfile                                                                   |
| GET /api/v1/farmers/{farmerId}                  | PublicProfile đúng Farmer                                                       |
| GET /api/v1/traders/{traderId}                  | PublicProfile đúng Trader                                                       |
| POST /api/v1/users/me/avatar                    | multipart file → mediaId,avatarUrl,contentType,sizeBytes; cập nhật profile luôn |
| GET /api/v1/users/media/{mediaId}               | bytes có quyền                                                                  |
| POST /api/v1/admin/accounts                     | Admin tạo Farmer/Trader UNVERIFIED, không tạo Admin                             |
| GET /api/v1/admin/accounts                      | page/size,role?,status?                                                         |
| GET /api/v1/admin/accounts/{accountId}          | AdminAccountDetail                                                              |
| PATCH /api/v1/admin/accounts/{accountId}        | subset profile allowlist                                                        |
| PATCH /api/v1/admin/accounts/{accountId}/status | {status,reason}                                                                 |
| DELETE /api/v1/admin/accounts/{accountId}       | 204, soft INACTIVE                                                              |

Farmer profile fullName/phone/address/province/district/avatarUrl; Trader businessName + buyingArea và các field liên hệ tương ứng. ADMIN profile=null, không PUT hồ sơ Farmer/Trader. PublicProfile chỉ accountId,displayName,avatarUrl,province,district,joinedAt; không public email/phone/reputation/badge. Đừng tự thêm PATCH /users/me chỉ vì prose có giải thích PATCH: bảng URL chỉ chốt PUT me.

OTP 6 số/10 phút, tối đa 5 lần sai, resend 60 giây và 5 mã/giờ/email; login 10 lần sai/15 phút theo IP+username, 429 có Retry-After. SMTP lỗi có thể register vẫn 201/UNVERIFIED + verificationEmailStatus FAILED; cho resend, không coi verified hoặc tạo account lặp.

Refresh cần single-flight, chống response của phiên cũ; hiện scaffold chỉ login/logout adapter, chưa có UI/refresh. Không sửa role/email/password qua API profile. Không tự khóa/xóa mình hay Admin ACTIVE cuối cùng. Không mở khóa account score0 khi chưa xử lý nguyên nhân. Reputation/reversal do User+Payment xử lý backend, không chặn các màn không liên quan.

## Nguồn và chi tiết request/response

[Spec đầy đủ](../../reference/contracts/04-users-service.md). Phần bên dưới trích mục 6–7 từ spec, không phải tuyên bố API đã chạy. Nếu khác source Chat/Payment, dùng ghi chú đối chiếu bên trên và docs/09, không tự bỏ yêu cầu nghiệp vụ.

<details>
<summary>Xem contract và ví dụ gốc</summary>

```text
6. API Contract
API/DTO User giữ Contract JSON đã chốt: login/refresh trả TokenPair có refreshToken; refresh/logout nhận {refreshToken}; logout Bearer ACTIVE và refresh token thuộc sub. URL/profile/Admin allowlist theo mục7 áp dụng; token lưu bộ nhớ frontend, không cookie trong MVP.
Method
Endpoint
Auth
Kết quả
POST
/api/v1/auth/register
Public, FARMER/TRADER only
201 AccountSummary + verificationEmailStatus
POST
/api/v1/auth/verify-email
Public có OTP/rate limit
200 {status:ACTIVE}
POST
/api/v1/auth/resend-verification
Public có rate limit
202 generic;503 nếu SMTP cần gửi bị lỗi
POST
/api/v1/auth/login
Public
200 TokenPair, chỉ ACTIVE
POST
/api/v1/auth/refresh
Refresh token
200 TokenPair, rotate
POST
/api/v1/auth/logout
Bearer ACTIVE
204, thu hồi refreshToken request thuộc sub
GET
/api/v1/users/me
Bearer ACTIVE
200 PrivateProfile
PUT
/api/v1/users/me
Bearer ACTIVE
200 PrivateProfile
GET
/api/v1/users/{accountId}
Bearer ACTIVE
200 PublicProfile
GET
/api/v1/farmers/{farmerId}
Bearer ACTIVE
200 PublicProfile, FARMER
GET
/api/v1/traders/{traderId}
Bearer ACTIVE
200 PublicProfile, TRADER
POST
/api/v1/admin/accounts
ADMIN ACTIVE
201, chỉ tạo FARMER/TRADER UNVERIFIED
GET
/api/v1/admin/accounts
ADMIN ACTIVE
200 page, filter role/status
GET
/api/v1/admin/accounts/{accountId}
ADMIN ACTIVE
200 AdminAccountDetail
PATCH
/api/v1/admin/accounts/{accountId}
ADMIN ACTIVE
200, profile field allowlist
PATCH
/api/v1/admin/accounts/{accountId}/status
ADMIN ACTIVE
200 AccountSummary
DELETE
/api/v1/admin/accounts/{accountId}
ADMIN ACTIVE
204, soft INACTIVE
GET
/internal/v1/accounts/{accountId}/access-state
Service authentication only
200 state/role;404 account absent

Không có API tạo thêm ADMIN, đổi role/email/password hoặc duyệt Trader. Avatar upload đã bổ sung tại Contract v2.1 §18 và mục API bên dưới. Admin profile PATCH không sửa password_hash/OTP/token/status; không gán avatar từ file private thuộc người khác.
6.1. Avatar API bổ sung
POST /api/v1/users/me/avatar: Bearer ACTIVE, multipart file JPEG/PNG/WebP ≤5 MiB; 201 {mediaId,avatarUrl,contentType,sizeBytes}, cập nhật profile + outbox. GET /api/v1/users/media/{mediaId}: Bearer ACTIVE, quyền owner/public profile ACTIVE; 200 bytes,404 khi không được xem,413 quá dung lượng,415 sai định dạng. Volume User riêng; metadata media_assets trong user_db; không fetch URL ngoài. Gateway giữ /api/v1/users/**, không route internal public.
7. API Examples và Data Contract
Register request:
{
   "username": "trader01",
   "email": "trader@example.com",
   "password": "<password>",
   "role": "TRADER",
   "profile": {
  "businessName": "ABC Rice",
  "phone": "0900000000",
  "address": "Can Tho",
  "province": "Can Tho",
  "district": null,
  "avatarUrl": null,
  "buyingArea": "Mien Tay"
   }
 }
Farmer thay businessName bằng fullName và không buyingArea. Transaction tạo account+đúng profile+OTP hash. Account commit trước SMTP; email lỗi vẫn UNVERIFIED, response201 kèm verificationEmailStatus FAILED, success SENT; retry bằng resend theo Contract đã chốt, không xóa account khi SMTP lỗi.
DTO/request
Fields DTO baseline
AccountSummary
accountId,username,email,role,status,createdAt
Verify email
{email,otp}
Resend
{email};202 generic không tiết lộ email không tồn tại/đã verified
Login
{username,password}
Refresh/logout
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
```

</details>
