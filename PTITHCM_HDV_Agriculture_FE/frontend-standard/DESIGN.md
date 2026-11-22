# Hệ thống Thiết kế — Ruộng Lúa Việt (V5 + Impeccable)

Tài liệu quy chuẩn giao diện web và mobile của nền tảng **Ruộng Lúa Việt**, kết hợp bảng màu nông nghiệp V5 với tiêu chuẩn thủ công Impeccable (tương phản WCAG AA, nhịp chữ rõ ràng, dữ liệu số thẳng hàng và khả năng chạm `>= 44px` trên di động).

## 1. Bảng màu & Tương phản (WCAG AA)

| Token / Vai trò              | Giá trị Hex | Nền áp dụng                                                          | Tỉ lệ tương phản tối thiểu | Mục đích                                     |
| ---------------------------- | ----------- | -------------------------------------------------------------------- | -------------------------- | -------------------------------------------- |
| `--v5-forest` (`brand900`)   | `#164735`   | `#FFFFFF` / `#F4F7F2`                                                | `> 9.5:1`                  | Thương hiệu, tiêu đề, khung nhấn đậm         |
| `--v5-green` (`brand700`)    | `#246B45`   | `#FFFFFF`                                                            | `> 6.2:1`                  | Nút chính, liên kết tương tác, trạng thái mở |
| `--v5-accent` (`harvest`)    | `#D8AD47`   | Chỉ dùng làm viền/outline (`:focus-visible`) hoặc trên nền `#164735` | `>= 3:1` (viền/chữ lớn)    | Focus ring bàn phím, điểm nhấn hero          |
| `--v5-bronze` (chữ vàng đất) | `#885B17`   | `#FFFFFF` / `#FEF8EC`                                                | `>= 5.4:1`                 | Giá bán, badge chờ xử lý, cảnh báo nhẹ       |
| `--v5-ink`                   | `#182820`   | `#FFFFFF` / `#F4F7F2`                                                | `> 13:1`                   | Văn bản nội dung chính                       |
| `--v5-muted`                 | `#526459`   | `#FFFFFF` / `#F4F7F2`                                                | `>= 5.6:1`                 | Nhãn phụ, chú thích, thời gian               |
| `--v5-ground`                | `#F4F7F2`   | Nền trang                                                            | —                          | Nền tổng thể dịu mắt, giảm chói              |
| `--v5-surface`               | `#FFFFFF`   | Nền thẻ                                                              | —                          | Thẻ nội dung (`border-radius: 18px`)         |
| `--v5-border`                | `#DCE6DD`   | Viền mảnh                                                            | —                          | Đường chia khối, viền thẻ `1px solid`        |
| `--v5-danger`                | `#A83939`   | `#FDF2F2` / `#FFFFFF`                                                | `> 5.5:1`                  | Lỗi, từ chối, cảnh báo nghiêm trọng          |
| `--v5-info`                  | `#2C6590`   | `#F0F6FA` / `#FFFFFF`                                                | `> 5.5:1`                  | Tọa độ GPS, nhãn thông tin đối soát          |

> **Quy tắc nghiêm ngặt**: Không dùng `#D8AD47` làm màu chữ trên nền trắng/kem; mọi giá tiền hoặc trạng thái chờ dùng `#885B17`. Không dùng `border-left: 4px solid ...` kiểu side-tab trên thẻ bo góc; thay bằng viền `1px` đồng đều, nền nhạt ngữ nghĩa và huy hiệu/icon dẫn đầu.

## 2. Kiểu chữ & Nhịp dữ liệu (`Be Vietnam Pro`)

- **Font chính**: `'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif` (nhúng qua Google Fonts ở `apps/web/index.html`, biến `--v5-font`).
- **Cân bằng dòng**:
  - `h1, h2 { text-wrap: balance; }` để tiêu đề ngắt dòng hài hòa.
  - `p { text-wrap: pretty; }` để tránh từ mồ côi ở cuối đoạn.
- **Số liệu thẳng hàng (`font-variant-numeric: tabular-nums`)**: Áp dụng bắt buộc cho tiền tệ VND, sản lượng (`tấn`/`kg`), diện tích (`ha`/`m²`), ngày giờ, huy hiệu đếm chưa đọc và ô bảng KPI.
- **Đơn vị diện tích thống nhất**: Toàn bộ màn hình dùng helper `formatArea(m2)` (`>= 10.000 m²` hiển thị `X,Y ha (Z m²)`).

## 3. Chiều sâu & Hệ thống thẻ

- **Mức 0 (Nền trang)**: `--v5-ground: #F4F7F2`.
- **Mức 1 (Thẻ tiêu chuẩn)**: `background: #FFFFFF; border: 1px solid #DCE6DD; border-radius: 18px; box-shadow: 0 1px 2px rgba(22, 71, 53, 0.05), 0 8px 24px rgba(22, 71, 53, 0.06);`.
- **Mức 2 (Thẻ nhấn Hero / Cảnh báo cọc mô phỏng)**: Nền gradient ấm (`#E7F2E6 -> #F8F2DB`) hoặc parchment (`#FDF7E7` viền `#E8D49C`).
- **Không lồng thẻ thừa**: Tránh đặt khung viền lồng nhiều lớp không cần thiết; vùng phụ tách bằng đường mảnh `1px solid #DCE6DD`.

## 4. Biểu tượng SVG (`UiIcon`) & Minh họa

- **Không dùng OS emoji** (`🌾`, `📍`, `⚠️`, `📷`, `🔍`, v.v.) hay ký tự thay icon (`♧`, `⇄`, `✓`) trong giao diện chính; sử dụng component `<UiIcon name="..." />` đồng nhất nét vẽ (`strokeWidth={1.75}`, `strokeLinecap="round"`, `strokeLinejoin="round"`).
- **Minh họa giống lúa V5**: Ánh xạ giống lúa (`ST25`, `OM18`, `Jasmine 85`, `Đài Thơm 8`, `IR50404`) qua `getRiceArtwork(seedType)` dùng 5 tệp SVG trong `apps/web/src/workspace/assets/`.

## 5. Responsive `390px` Mobile & Khả năng truy cập (A11y)

- **Vùng chạm tối thiểu**: Mọi nút bấm, tab, select, link hành động chính trên mobile đạt tối thiểu `44x44px`.
- **Không tràn ngang ở `390px`**: Thanh tiêu đề mobile thu gọn hợp lý (`Menu` + chuông thông báo nằm gọn trong `390px`), tab lọc tự xuống dòng (`flex-wrap: wrap`), bảng dữ liệu (`Bài đăng của tôi`, `Quản lý tài khoản`) tự chuyển thành danh sách thẻ xếp dọc dưới `720px`.
- **Điều hướng bàn phím**: Có skip-link chuyển tới `#main-content`, focus ring rõ `3px solid #D8AD47`, drawer đóng được bằng phím `Escape`.
- **Minh bạch mô phỏng**: Mọi thao tác nạp/rút cọc 5% gắn nhãn rõ ràng **"Cọc mô phỏng (môi trường thử)"** và phân biệt rạch ròi chế độ **Demo cục bộ** với **Đăng nhập máy chủ**.
