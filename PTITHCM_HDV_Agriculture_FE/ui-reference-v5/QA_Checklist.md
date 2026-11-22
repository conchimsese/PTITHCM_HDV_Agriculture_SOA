# Checklist duyệt UI Reference V5

## A. Farmer / plot / crop season
- [ ] Desktop sidebar đổi ruộng trực tiếp; trên mobile đổi ở khu chọn phía trên nội dung
- [ ] Khi đổi Plot, mùa vụ được đặt về Season thuộc Plot đó; không hiện dữ liệu Season ruộng cũ
- [ ] Plot chưa có mùa vụ hiển thị empty state, có đường dẫn tạo mùa vụ; không crash
- [ ] Tạo season xong mới có thể ghi nhật ký, chi phí, báo cáo
- [ ] Trang chủ hiển thị số Listing OPEN của chính Farmer, không tính chủ bài khác
- [ ] Đăng bán vẫn chỉ lấy snapshot, owner/FarmerId từ backend; không thêm field bắt buộc ảnh/chú thích vào API v2.1

## B. Listing / Market Feed / quyền
- [ ] Farmer có tab `Bài đăng của tôi` và tab đề xuất `Tham khảo thị trường`
- [ ] Farmer tham khảo không thấy Offer của người khác, không thấy `Gửi báo giá`
- [ ] Farmer chủ bài vào chi tiết sẽ thấy Offer list ngay dưới bài, nút đồng ý trao đổi theo trạng thái
- [ ] Trader Feed chỉ cho thấy tính năng gửi Offer; không thấy Offer của Trader khác
- [ ] Card bài có ảnh, chú thích, thông tin giống/sản lượng/diện tích, trạng thái
- [ ] Filter ban đầu đóng; bấm mới mở, dùng bán kính GPS có trong Contract
- [ ] Mobile filter không che toàn bộ nội dung thường trực, nút dễ bấm
- [ ] `Ảnh/chú thích` và `Farmer tham khảo` đều được dán nhãn tính năng **chưa duyệt Contract**
- [ ] Bài đã LOCKED không được tạo Offer mới, không báo đã hoàn tất chỉ vì Offer ACCEPTED

## C. Messenger / Payment
- [ ] Trên desktop: danh sách phòng | nội dung Chat | Offer/hợp đồng liên quan
- [ ] Mobile: danh sách phòng → phòng chat → nút trở về danh sách
- [ ] Không mở Chat tại POST Offer; chỉ sau Farmer accept và Chat consume OFFER_ACCEPTED
- [ ] Chat phòng khác ID theo Offer; không gộp chỉ vì cùng Trader/Farmer
- [ ] Số unread dựa trên participant, Notification tách riêng Chat badge
- [ ] Nạp/rút cọc không giả tiền thật, không tự chốt khi chấp nhận Contract

## D. Admin / Account / Notification
- [ ] Admin xem danh sách tài khoản và chi tiết theo đúng quyền
- [ ] Popup hồ sơ chỉ sửa field được phép; không sửa role/email/password ở đây
- [ ] Account LOCKED không được mở khóa nếu reputation 0 hoặc còn nguyên nhân khóa khác
- [ ] Thông báo và bộ đếm không trộn tài khoản khi chuyển vai trò demo
- [ ] Admin không mặc nhiên xem Chat participant hay Offer của mọi Farmer

## E. Responsive / tương tác
- [ ] 1440×900 desktop, 1024×768 tablet, 390×844 Android, 360×800 Android, 430×932 iPhone
- [ ] Tab/button/menu/form không tràn ngang; nút chính trên mobile cao ít nhất 48–52px
- [ ] Đọc được tiếng Việt, focus/keyboard và zoom 200%, chữ mô tả không quá nhỏ
- [ ] Mạng offline vẫn hiển thị các SVG minh họa ở bản standalone
- [ ] Escape đóng modal, không nhầm popup demo với tác vụ thật

## F. Kết quả kiểm thử tự động đã thực hiện trong môi trường tạo file
- [x] Cú pháp JavaScript được kiểm tra bằng `node --check`
- [x] Chromium 1440px: Farmer mine = 3, market = 5, Farmer market detail = 0 Offer; Farmer own detail = 3 Offer
- [x] Chromium 390px: kiểm tra cùng 4 trường hợp quyền như desktop
- [x] Trader Feed radius 5km = 1 demo listing, filter mở/đóng đúng
- [x] Trader T2 có 2 phòng trao đổi demo, có thể mở thread
- [x] Tạo Plot mới chưa có Season và mở empty state không phát sinh page errors
- [x] Admin account list render 4 account mẫu, không phát sinh page errors
- [ ] Kiểm thử tích hợp API thật (chưa làm)
- [ ] Kiểm thử trên Android/iPhone thật (chưa làm)
