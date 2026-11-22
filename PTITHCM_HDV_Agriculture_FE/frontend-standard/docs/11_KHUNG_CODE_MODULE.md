# Trạng thái khung hiện tại

Theo yêu cầu mới nhất, đã bỏ các UI demo và Workspace form nháp. Giữ folder để nhóm code, cấu hình build, provider/cache, API client và DTO dùng chung. Web/mobile khởi động với màn hình trống, không có nghiệp vụ giả.

Ví dụ nhận Farming: tạo pages/PlotListPage.tsx trên web và screens/PlotListScreen.tsx trên mobile; tạo components/PlotCard.tsx và hooks/usePlots.ts trong từng app. Dùng DTO/API chung trong packages, sau đó nối route tại entry point.

Đọc docs/12_BAN_GIAO_FE.md và guide trong docs/services để nhận việc theo API đã đối chiếu. Tất cả màn hình nghiệp vụ vẫn do nhóm triển khai; tài liệu bàn giao không bổ sung UI giả.
