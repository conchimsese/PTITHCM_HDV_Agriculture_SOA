---
trigger: glob
globs: PTITHCM_HDV_Agriculture_FE/frontend-standard/**
---

# Chuẩn Giao diện V5 & Impeccable (Frontend Web & Mobile)

Tuân thủ nghiêm túc [DESIGN.md](../../PTITHCM_HDV_Agriculture_FE/frontend-standard/DESIGN.md) khi tạo hoặc sửa bất kỳ màn hình/style nào:

- **Màu sắc & Tương phản (WCAG AA):**
  - Bảng màu chính: `--v5-forest: #164735`, `--v5-green: #246B45`, `--v5-ground: #F4F7F2`, `--v5-border: #DCE6DD`.
  - Không dùng `#D8AD47` làm màu chữ trên nền trắng/kem; mọi giá tiền hoặc trạng thái chờ dùng `#885B17` (`>= 5.4:1`).
  - Không dùng `border-left: 4px solid ...` kiểu side-tab trên hộp bo góc; dùng viền `1px` đồng đều, nền nhạt ngữ nghĩa và icon/huy hiệu dẫn đầu.
- **Icon & Kiểu chữ:**
  - Cấm dùng OS emoji (`🌾`, `📍`, `⚠️`, `🔍`, `🛒`, v.v.) hoặc ký tự thô (`♧`, `⇄`, `✓`) làm icon UI — dùng `<UiIcon name="..." />` nét `1.75`.
  - Dùng `'Be Vietnam Pro'` (`--v5-font`), `text-wrap: balance` cho `h1/h2`, `text-wrap: pretty` cho đoạn mô tả, `font-variant-numeric: tabular-nums` cho tiền VND, diện tích, sản lượng, giờ và KPI.
  - Diện tích ruộng luôn hiển thị qua `formatArea(m2)` (`ha` + `m²`).
- **Responsive 390px & A11y:**
  - Không tràn ngang ở viewport `390x844`; nút/tab/link chính đạt tối thiểu `44x44px`; bảng chuyển thành card xếp dọc dưới `720px`.
  - Giữ skip-link, `:focus-visible` `3px solid #D8AD47`, đóng drawer bằng `Escape`.
  - Không dùng `<iframe>` hoặc chép nguyên prototype HTML V5 vào cây sản phẩm; phân biệt rõ **Đăng nhập máy chủ** với **Demo trình duyệt**.
- **Kiểm tra bắt buộc:** Chạy `impeccable detect --json PTITHCM_HDV_Agriculture_FE/frontend-standard/apps/web/src` (0 cảnh báo `[]`), `npm run check` và `npm run format:check`.
