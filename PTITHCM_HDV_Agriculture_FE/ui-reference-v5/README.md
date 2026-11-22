# BA–SOA UI Reference V5 — Ruộng Lúa Việt

**Bản bàn giao thiết kế/frontend cho Farmer, Trader, Admin · 19/10/2026**

Bản V5 kế thừa phong cách C và bố cục desktop ba cột của V4. Mục tiêu: mọi thành viên cùng xem **một thiết kế thống nhất** để phát triển frontend, không dùng các mẫu dashboard khác nhau. Đây là **prototype tương tác chạy offline**, không phải ứng dụng đã nối backend, và không xử lý tiền thật. Toàn bộ dữ liệu (kể cả ID ngắn P1, L1, C1) là mẫu trực quan, không phải API payload production.

## 1. Mở bản thiết kế

- `BA_SOA_UI_Reference_V5_Standalone.html`: mở bằng Chrome/Edge; ảnh minh họa đã nhúng trong file, không cần chạy server. Phông Be Vietnam Pro có thể dùng khi online; khi offline trình duyệt dùng font dự phòng.
- `Mobile_Preview_V5.html`: trình xem khung điện thoại trên desktop, có nút chuyển Farmer/Trader/Admin và màn hình; cần đặt cạnh Standalone trong cùng thư mục.
- `index.html`: bản nhiều file để frontend dễ chỉnh sửa (`styles.css`, `mobile.css`, `v5.css`, `data.js`, `app.js`, `assets/`). Dùng Live Server hoặc local HTTP server để xem khi phát triển.
- `design-tokens.json`: màu sắc/typography/spacing chung.
- `CONTRACT_IMPACT.md`: những thay đổi UI được phép thực hiện ngay và những mở rộng cần nhóm phê duyệt.
- `QA_Checklist.md`: kiểm tra mobile, desktop, quyền, trạng thái dữ liệu, lỗi.

Ở góc phải trên có bộ chọn vai trò **chỉ dành cho demo**. Trên điện thoại có năm mục điều hướng phía dưới; Chat dùng hai màn hình danh sách/phòng tin. Khi mở một phòng Chat, quay lại danh sách trước để đổi vai trò demo.

## 2. Những thay đổi của V5 so với V4

1. **Ruộng đang chọn:** có ô chọn ruộng và mùa vụ ở sidebar desktop; thêm ô chọn ở phần nội dung trên mobile cho các màn hình canh tác. Khi chọn ruộng, cập nhật mùa vụ thuộc đúng ruộng đó. Màn hình ruộng chưa có mùa vụ hiển thị lời nhắc và nút tạo mùa vụ, không hiện dữ liệu mùa vụ cũ.
2. **Bảng tin bán lúa:** thay thẻ metadata nhỏ bằng card lớn kiểu feed: tiêu đề, vị trí, mô tả ngắn, ảnh ruộng minh họa, chỉ số và nút tác vụ. Không thêm like/share/comment.
3. **Bộ lọc:** thu gọn thành một nút ở góc thanh hành động. Chỉ hiển thị hộp lọc khi bấm; Trader lọc demo theo bán kính GPS, không tự thêm lọc giống, giá, điểm uy tín hoặc sort backend ngoài Contract.
4. **Farmer:** tab `Bài đăng của tôi` lọc theo owner; tab `Tham khảo thị trường` thể hiện đề xuất quyền xem thông tin Listing công khai, **không** xem Offer của người khác hay gửi Offer.
5. **Listing Detail:** Farmer là chủ bài xem danh sách Offer ngay bên dưới; Trader chỉ thấy nút gửi Offer khi Listing còn OPEN; Farmer xem bài người khác chỉ đọc.
6. **Chat Messenger:** danh sách nhiều cuộc hội thoại theo Offer ACCEPTED, tin nhắn ở giữa, Offer/Hợp đồng bên phải. Bộ đếm demo không lấy lẫn account khác; mobile chuyển danh sách/phòng riêng.
7. **Thông báo:** filter theo account mẫu; không đọc thông báo của vai trò khác khi chuyển vai trò. Admin có thông báo demo riêng.
8. **Admin:** popup form chỉnh tên giao diện mẫu, giải thích điều kiện khóa/mở tài khoản; không giả lập quyết định cọc hoặc thay state thực tế.
9. **Phông chữ mobile:** tăng cỡ chữ phụ và dòng chat; điều hướng dưới giữ như V4.

## 3. Phân quyền đúng vai trò (mẫu UI)

| Hành động | Farmer chủ Listing | Farmer khác | Trader | Admin |
|---|---|---|---|---|
| Xem bài Listing của mình | Có | Không | Qua Feed được duyệt | Không tự suy quyền |
| Xem các bài public của người khác | **Đề xuất cần duyệt** | **Đề xuất cần duyệt** | Có theo quyền Feed hiện tại | Theo Contract |
| Xem Offer trên bài | Có | Không | Không | Không trong MVP hiện tại |
| Tạo Listing từ ruộng/mùa vụ | Có | Có nếu own Plot | Không | Không |
| Gửi Offer | Không | Không | Có khi Listing OPEN | Không |
| Chat | Chỉ Offer đã accept của mình | Không | Chỉ Offer đã accept của mình | Không mặc nhiên |
| Hợp đồng/cọc | Participant hợp lệ | Không | Participant hợp lệ | Theo API xử lý được duyệt |

Không dùng frontend để thay vai trò hoặc cấp quyền thật. Backend phải xác minh JWT, trạng thái ACTIVE và quyền sở hữu theo Contract v2.1.

## 4. Quy tắc nghiệp vụ giữ nguyên

- Farming chỉ quản lý lúa nước, `Plot 1:N CropSeason`, journal/cost theo `cropSeasonId`. Plot mới có thể chưa có mùa vụ; cần tạo trước khi ghi nhật ký.
- Listing tạo từ snapshot Farming với `plotId`, `cropSeasonId`, `expectedPrice`; không nhận snapshot/GPS/ownerId do client tự gán làm nguồn sự thật. Một Plot chỉ có một Listing OPEN theo business rule hiện hành.
- `POST Offer` chỉ cho Trader; `OFFER_CREATED` tạo Notification, **chưa mở Chat**.
- Farmer có thể accept nhiều Offer. Chỉ `OFFER_ACCEPTED` mới mở một room idempotent theo `offerId` qua Kafka; không tạo room khi gửi Offer.
- Chấp nhận Offer/Contract không chốt bán. Chỉ sau cọc **mô phỏng 5%** thành công và Payment phối hợp Trading chốt độc quyền thì Listing LOCKED; hoàn tất Contract mới SOLD.
- Payment module Contract/Deposit/Dispute, không có Contract Service riêng; không chuyển tiền lúa, cọc thật trong MVP. Rút cọc phải đủ điều kiện, không có tranh chấp hợp lệ đang mở.
- Không công khai điểm uy tín/reputation, không tự gắn badge xác minh Trader, không hiển thị contact riêng từ public profile.
- Bộ lọc API Trading đã chốt chỉ có `lat,lng,radius,page,size`. Đơn vị kinh tế `expectedPrice`/`Offer.price` vẫn cần xác minh với nhóm, UI không được mặc định là đồng/kg.

## 5. Công nghệ / cấu trúc mã tham khảo

```text
BA_SOA_UI_Reference_V5/
├── index.html              # bản phát triển nhiều file
├── data.js                 # dữ liệu demo trong RAM
├── app.js                  # V4 và phần sửa V5, chung các vai trò
├── styles.css              # design system V4
├── mobile.css              # responsive gốc V4
├── v5.css                  # feed, filter, switcher, chữ mobile V5
├── assets/                 # 5 ảnh SVG minh họa ruộng lúa offline
├── design-tokens.json
├── BA_SOA_UI_Reference_V5_Standalone.html
├── Mobile_Preview_V5.html
├── CONTRACT_IMPACT.md
├── QA_Checklist.md
└── previews/               # ảnh chụp màn hình nếu có
```

Ảnh ruộng trong feed là **SVG minh họa tự tạo**, không phải ảnh thực của Farmer. Trong prototype V5, người dùng có thể chọn ảnh máy mình khi tạo Listing; ảnh chỉ hiển thị tại phiên thử và không upload lên backend.

Khi tích hợp thật: chia component theo domain/Farmer/Trader/Admin; API service theo Gateway, service nào sở hữu resource thì backend service đó xử lý quyền và dữ liệu. Không sao chép logic demo hoặc ID `F1`/`T2` vào production.

## 6. Trạng thái kiểm thử

Đã chạy kiểm tra bằng Chromium/Playwright qua HTML in-memory với viewport **1440px và 390px**: điều hướng Farmer, ba Listing sở hữu, năm Listing trong tab tham khảo (bao gồm bài của mình), quyền đọc Offer, filter radius Trader, chọn phòng Chat, tạo Plot chưa có Season, xem empty-state và Admin list. Các đường thử đó **không phát sinh page errors**. Đây không phải cam kết toàn bộ kịch bản đã kiểm thử hoặc sản phẩm sẵn sàng vận hành.

Cần nhóm tiếp tục kiểm thử bằng Chrome/Edge trên Windows, Android thực, zoom 200%, phông offline, đọc bảng chi phí, và xác thực API contract trước khi code backend.
