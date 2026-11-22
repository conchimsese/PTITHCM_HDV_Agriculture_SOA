# Chuẩn frontend nhóm — Ruộng Lúa Việt

Đây là **khung thư mục để nhóm bắt đầu code**. Web đã có màn hình đăng nhập, đăng ký và xác minh OTP email tại `/dang-nhap`, `/dang-ky`. Ô đăng nhập nhận số điện thoại hoặc email; Google cần cấu hình OAuth và endpoint backend. Xem [hướng dẫn module tài khoản](apps/web/src/features/users/README.md) để biết các yêu cầu backend còn thiếu. Các màn hình nghiệp vụ và mobile tiếp tục được nhóm triển khai.

- `apps/web`: React + Vite, entry `src/app/App.tsx`.
- `apps/mobile`: React Native + Expo Router, entry `src/app/index.tsx`, layout `src/app/_layout.tsx`.
- Module User đã có hồ sơ cá nhân/công khai, chỉnh sửa profile và avatar, quản trị tài khoản trên web/mobile; mobile có đăng nhập/đăng ký/OTP. Xem README trong `apps/{web,mobile}/src/features/users` để biết route và giới hạn tích hợp backend.
- Trong mỗi app: `src/features/{users,farming,trading,chat,payments,notifications,admin}` có folder pages/screens, components, hooks để nhóm viết code.
- `src/shared`: UI/layout/hooks dùng chung trong từng app, config và API runtime.
- `packages/contracts`, `packages/api-client`, `packages/design-tokens`: nền tảng dùng chung, có ví dụ adapter API và test; không tự dựng UI.
- `docs`: quy tắc tổ chức/chia việc, xem trạng thái hiện tại ở docs/11_KHUNG_CODE_MODULE.md.
- `reference/contracts`: tài liệu nghiệp vụ và OpenAPI.
- Mẫu UI V5 giữ riêng tại `../ui-reference-v5/`, nhóm mở để tham khảo thiết kế.

## Bàn giao API và nghiệp vụ cho nhóm

Đọc **[bản bàn giao đủ sáu service](docs/12_BAN_GIAO_FE.md)** trước khi code; có guide từng service, API/request/response, quyền, trạng thái, điểm thiếu và **[WebSocket Chat JSON](docs/13_WEBSOCKET_CHAT_JSON.md)** đã đối chiếu source. Snapshot đủ spec 01–08 và OpenAPI nằm trong reference/contracts. Đây là tài liệu hoàn chỉnh cho phạm vi đã có nguồn, không phải khẳng định backend/FE đã chạy đủ chức năng.

## Chạy

Tại folder này: `npm ci`, sau đó `npm run dev:web` hoặc `npm run dev:mobile`. Web tại http://localhost:5173. Mobile qua Expo Go/emulator. Cấu hình URL Gateway bằng `.env.example` của mỗi app; không có nút đổi role hoặc login demo.

## Cách nhóm code

1. Nhận module, đối chiếu API với backend owner.
2. Tạo page web/screen native trong feature tương ứng.
3. Tách component UI và hook theo nghiệp vụ.
4. DTO/schema đặt trong packages/contracts, API adapter trong packages/api-client.
5. Nối route của màn hình vào App.tsx (web) hoặc src/app (mobile).

Contract/Deposit/Dispute đều thuộc payments. Không dùng nhãn form hoặc dữ liệu prototype làm payload API thật.

## Kiểm tra

`npm run check`, `npm run format:check`, `npm run export:android`. Test hiện tập trung API client/contract, không có test UI demo.
