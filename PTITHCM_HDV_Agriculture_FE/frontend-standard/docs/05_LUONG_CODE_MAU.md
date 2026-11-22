# Cách bắt đầu một module trong khung trống

Ví dụ nhóm nhận Farming:

1. Đối chiếu DTO/API danh sách ruộng với backend owner.
2. Tạo packages/contracts/src/farming.ts chứa type/schema, export qua index.ts.
3. Tạo packages/api-client/src/farming.ts gọi Gateway, export factory tạo client.
4. Tạo features/farming/hooks/usePlots.ts trong mỗi app để quản lý query/cache.
5. Tạo pages/PlotListPage.tsx (web) và screens/PlotListScreen.tsx (mobile), cùng component PlotCard riêng từng nền tảng.
6. Thêm route web trong src/app/App.tsx, route native trong src/app. Không đặt component/hook thông thường vào src/app của Expo Router.
7. Kiểm loading/error/empty/success, role/ownership, rồi mới thêm form tạo/sửa.

packages/api-client/src/trading.ts là ví dụ adapter API hiện có, không phải màn hình mẫu. packages/contracts/src/trading.ts minh họa kiểm response bằng schema. Không có page/role switch/form giả được cài sẵn.
