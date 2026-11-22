# Từ mẫu V5 tới frontend nhóm

Repo gốc hiện có `app.js` khoảng 113 KB chứa nhiều vai trò/màn trong một file, `data.js` là dữ liệu mẫu, CSS desktop/mobile và HTML preview. Đây là tài sản tham khảo UX. Folder mới giúp tách thành code có thể phân công và nối backend.

## Ánh xạ

| Nguồn V5                       | Chuyển thành                                                 |
| ------------------------------ | ------------------------------------------------------------ |
| Màu/spacing/design-tokens.json | `packages/design-tokens`; web CSS và native StyleSheet       |
| Sidebar/header desktop         | `apps/web/src/shared/layouts/WebLayout.tsx`                  |
| Chọn role demo                 | Chỉ mock Login, bỏ khỏi api mode                             |
| Template màn Farmer            | `features/farming` / `features/trading` theo nghiệp vụ       |
| Marketplace feed               | Trading page web + native screen riêng                       |
| Messenger columns              | Web chat layout; native ConversationList/ChatRoom tách màn   |
| Card Contract                  | Payment component nhận DTO, Chat hiển thị tham chiếu         |
| Dữ liệu data.js                | Mock fixture có type, UUID mẫu; không dùng làm DB/state thật |
| Mobile_Preview_V5.html         | Tham khảo bố cục; không dùng thay app Android                |
| Popup sửa profile/admin        | Form User/Admin gọi API allowlist tương ứng                  |

## Cách chuyển một màn

1. Mở V5, chụp màn cần làm, ghi role/luồng/state.
2. Tách thành layout + component feature + form. Viết web bằng React, native bằng View/Text/FlatList.
3. Chỉ đưa field đã có contract vào DTO. Giao diện cần field chưa được duyệt thì ghi đề xuất, không tự thêm backend request.
4. Nối API qua adapter dùng chung; UI không đọc trực tiếp data.js.
5. Kiểm đủ loading/error/empty/quyền, so với UI mẫu và test backend.

Không chuyển toàn bộ 100 KB app.js một lần. Ưu tiên mỗi PR một lát nghiệp vụ có thể review. Không dùng `dangerouslySetInnerHTML` để nhúng prototype vào React hoặc dùng WebView để tính mobile là platform riêng.

Các phần **chưa có trong baseline API**: Farmer đọc public feed của Farmer khác, ảnh/caption Listing, giá mặc định /kg, filter giống/giá/từ khóa. Chúng có thể xuất hiện trong mẫu UX nhưng chưa được xem là endpoint đã triển khai. `CONTRACT_IMPACT.md` gốc vẫn là tài liệu đối chiếu quan trọng.
