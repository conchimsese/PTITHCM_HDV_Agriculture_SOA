# Đối chiếu spec, source và những phần còn thiếu

Ngày 02/11/2026. Nguồn toàn bộ code/docs/specs/01–08 và openapi-chat/payment; giữ snapshot trong reference/contracts. Đối chiếu thêm source secure Chat/Payment, lưu controller/handler tham khảo trong reference/observed-backend. Không có source chạy của User/Farming/Trading/Notification trong workspace này; **có spec không đồng nghĩa endpoint đã hoạt động**.

## Thứ tự sử dụng

Quyết định người dùng → baseline Contract v2.1/conflict đã chốt → service spec. Khi nối endpoint hiện tại, shape/path/protocol cần theo source/Swagger đúng version. Nếu implementation thiếu requirement nghiệp vụ, ghi issue để owner sửa, không tự hạ quyền hoặc thay rule cho khớp. Chưa có kiểm thử live Gateway/SMTP/tài khoản trong lần rà soát này.

## Những lỗi đã sửa trong bản FE

| Vấn đề                                    | Kết luận / nguồn                                                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Hướng dẫn STOMP                           | Sai với SecureChatWebSocketHandler: native WS text JSON, CONNECT/joinConversation/sendMessage/readMessage              |
| Tên event viết hoa kiểu Kafka             | Client nhận connected/joinedConversation/messageSent/messageRead/unreadCountChanged/contractUpdated/error              |
| POST /messages/image                      | SecureChatMessageController dùng chung POST /messages, messageType TEXT/IMAGE                                          |
| Download evidence thêm /content           | SecurePaymentEvidenceController dùng /evidence/{evidenceId}                                                            |
| Mọi cursor page dùng items/hasMore        | Chat + deposits dùng data,nextCursor; evidence/admin disputes dùng items,nextCursor; không tự thêm hasMore             |
| Deposit detail/pay/release nhận depositId | Controller hiện nhận contractId trong URL, trackingId vẫn là ID riêng                                                  |
| Create Contract example thiếu farmerId    | Source CreateRequest cần farmerId cùng offerId/conversationId; backend kiểm participant, không tin client tự cấp quyền |
| Kết luận thiếu spec Farming               | Đã có 02-farming-service.md, bổ sung đủ snapshot và guide                                                              |
| Outcome admin kiểu DISMISSED/TRADER_FAULT | Source dùng NO_VIOLATION/FARMER_VIOLATION/TRADER_VIOLATION/MUTUAL_CANCEL/INSUFFICIENT_EVIDENCE                         |
| Hướng dẫn có demo/UI đã code              | Hiện giữ folder trống, không có màn hình đăng nhập/feed/form nháp                                                      |

## Chỗ cần owner cung cấp hoặc làm rõ

| Module             | Chưa đủ / không được tự đoán                                                                                        | Có thể làm song song                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Gateway            | URL thực, CORS allowlist, WS Upgrade/origin; deployment host                                                        | layout/router, adapter theo prefix baseline                            |
| User               | test accounts ACTIVE/OTP, SMTP, schema runtime profile/Admin; refresh integration                                   | form/auth state theo spec                                              |
| Farming            | list Season theo Plot, list/detail Log/Cost; đầy đủ DTO detail/update và category enum                              | Plot create/list/detail, Season create, Journal/Cost create, report UI |
| Farming report     | summary.totalCost example number mâu thuẫn rule tiền string                                                         | UI tổng hợp, ghi issue chốt schema                                     |
| Trading            | đơn vị expectedPrice/Offer.price và radius input; list/detail MyListings/MyOffers, offers list/accept response/body | layout/feed query GPS + Offer create theo schema đã có                 |
| Listing UX mở rộng | media/caption, Farmer public Feed, filter giống/giá chưa duyệt                                                      | không đưa vào request cho tới khi đổi contract                         |
| Notification       | NotificationDto đầy đủ runtime; không có WS/device push/read-all trong MVP                                          | list/detail/read/count UI theo REST                                    |
| Chat/Payment       | source secure đã đối chiếu nhưng cần Gateway live, test accounts và data hợp lệ để E2E                              | DTO/REST/WS theo guide, mock test có schema                            |

Không ghi “không còn gì cần chốt” chỉ vì D01–D07 đã có quyết định. Các điểm trên là khoảng trống giao tiếp/triển khai thực tế, không mở lại nghiệp vụ đã chốt. Reputation/reversal liên quan backend User/Payment, không chặn toàn bộ FE.

## Rule không được thay

Farmer đăng Listing từ Plot+Season; Trader không đăng bài; một Plot một Listing OPEN. Có thể accept nhiều Offer; OFFER_ACCEPTED mới tạo Chat theo offerId; chỉ sau cọc5% mô phỏng và chốt độc quyền mới ACTIVE/LOCKED. COMPLETED mới SOLD; deliveryDate+24h không tự complete/thưởng. Payment chứa Contract/Deposit/Dispute; không thanh toán tiền lúa/logistics. Không public reputation/review/badge/contact riêng. Kafka, UUID, không DB/FK xuyên service; không áp PROJECT_CONTEXT cũ Long/RabbitMQ/Contract Service riêng.
