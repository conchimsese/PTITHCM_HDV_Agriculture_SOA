# Notification — Thông báo account hiện tại

Cả Farmer/Trader/Admin chỉ đọc thông báo của chính mình; không có Admin đọc của người khác. Cutoff 90 ngày áp dụng cả list/detail/count/read.

| Method/path                                       | Request                 | Response                                       |
| ------------------------------------------------- | ----------------------- | ---------------------------------------------- |
| GET /api/v1/notifications                         | page,size,isRead?,type? | {items,page,size,totalElements,totalPages}     |
| GET /api/v1/notifications/{notificationId}        | UUID                    | NotificationDto                                |
| PATCH /api/v1/notifications/{notificationId}/read | không body              | {notificationId,status,readAt}; lặp giữ readAt |
| GET /api/v1/notifications/unread-count            | không body              | {count}                                        |

isRead map READ/UNREAD; không tự thêm read-all, xóa, WebSocket hoặc push notification của thiết bị. Spec cho REST current-account; tần suất refetch do FE chọn, không coi polling là realtime server push.

10 loại: OFFER_CREATED, OFFER_ACCEPTED, MESSAGE_CREATED, CONTRACT_CREATED, CONTRACT_STATUS_CHANGED, DEPOSIT_PAID, DEPOSIT_STATUS_CHANGED, REPUTATION_CHANGED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED. USER_PROFILE_UPDATED không phải notification. Backend tránh trùng thông báo khi deposit chuyển LOCKED. FE không consume Kafka.

Dùng referenceType/referenceId để mở đúng màn sau khi kiểm quyền, không mở URL tùy ý. Badge Chat và Notification riêng nhau. Message notification không chứa nội dung Chat riêng tư. Spec chưa liệt kê đầy đủ NotificationDto JSON cho mọi field; cần owner chốt schema thực tế thay vì đổi tên column DB thành DTO một cách máy móc.

## Nguồn và chi tiết request/response

[Spec đầy đủ](../../reference/contracts/03-notification-service.md). Phần bên dưới trích mục 6–7 từ spec, không phải tuyên bố API đã chạy. Nếu khác source Chat/Payment, dùng ghi chú đối chiếu bên trên và docs/09, không tự bỏ yêu cầu nghiệp vụ.

<details>
<summary>Xem contract và ví dụ gốc</summary>

```text
6. Integration Contract
Caller/producer
Interface
Mục đích
Gateway
REST /api/v1/notifications/**
Current-account API
Notification→User
GET /internal/v1/accounts/{accountId}/access-state
ACTIVE/role hiện tại; service auth
Trading
Kafka OFFER_CREATED/OFFER_ACCEPTED
Offer
Chat
Kafka MESSAGE_CREATED
Tin nhắn
Logical Contract owner
Kafka CONTRACT_CREATED/CONTRACT_STATUS_CHANGED
Hợp đồng
Payment
Kafka DEPOSIT_PAID/DEPOSIT_STATUS_CHANGED
Tiền cọc

Security đã chốt 07/10/2026: User ký RS256, access token 15 phút; iss=urn:soa:user-service, aud=soa-api; sub=accountId UUID, role=FARMER/TRADER/ADMIN, iat/exp/jti. Chỉ User giữ private key; Gateway/backend verify bằng public key, forward Bearer và kiểm ownership. GET /internal/v1/accounts/{accountId}/access-state đọc DB primary, không cache ACTIVE, timeout tổng 1 giây; không kiểm tra được →503 ACCESS_STATE_UNAVAILABLE; account không ACTIVE →403 ACCOUNT_NOT_ACTIVE. Internal dùng X-Service-Key riêng từng caller, private network/HTTPS khi triển khai, không route public. WebSocket Chat kiểm state trước SEND/SUBSCRIBE và push riêng tư.
7. API Contract Matrix
Tất cả endpoint yêu cầu Bearer hợp lệ, account ACTIVE. ADMIN không ngoại lệ về ownership.
Method
Endpoint
Request
Response
GET
/api/v1/notifications
page=0,size=20,isRead?,type?
200 trang NotificationDto
GET
/api/v1/notifications/{notificationId}
UUID
200 NotificationDto
PATCH
/api/v1/notifications/{notificationId}/read
Không body
200 {notificationId,status,readAt}
GET
/api/v1/notifications/unread-count
—
200 {count}

/read-all không thuộc MVP. Filter isRead=true→READ, false→UNREAD; type gồm7 loại giao thương và3 loại User đã duyệt, consumer User dùng topic/payload/template v2.1 §9/§14 đã có hiệu lực. page>=0, size1..100 mặc định20; sort createdAt DESC, notificationId DESC; response {items, page, size, totalElements, totalPages}. Own account và cutoff90 ngày cho list/detail/count/read; mark-read lặp giữ readAt.
```

</details>
