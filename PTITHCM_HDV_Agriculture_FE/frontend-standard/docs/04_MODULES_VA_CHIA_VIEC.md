# Module, màn hình và chia việc

Mỗi module có folder tương ứng ở cả hai app. Người phụ trách một nghiệp vụ phải thống nhất DTO/API trước; có thể chia người làm web/mobile, cùng dùng package shared. Cột người thực hiện để nhóm điền; chỉ Hưng có phạm vi Chat + Contract/Payment đã ghi trong tài liệu đồ án, không suy đoán phân công khác.

| Module               | Backend owner | Web page / Native screen cần làm                 | Vai trò / quyền                                      | Người nhận                  |
| -------------------- | ------------- | ------------------------------------------------ | ---------------------------------------------------- | --------------------------- |
| users                | User          | Login, Register, VerifyEmail, Profile            | register chỉ Farmer/Trader; Admin seed từ BE         | Nhóm điền                   |
| farming / plots      | Farming       | PlotList, PlotDetail, PlotForm                   | Farmer own Plot; ruộng chưa có Season có empty-state | Nhóm điền                   |
| farming / seasons    | Farming       | SeasonList, SeasonDetail, SeasonForm             | Farmer, mùa vụ thuộc Plot đã chọn                    | Nhóm điền                   |
| farming / journal    | Farming       | JournalList, JournalForm                         | Farmer, theo cropSeasonId                            | Nhóm điền                   |
| farming / costs      | Farming       | CostList, CostForm, SeasonReport                 | Farmer, tiền dạng string, ẩn mềm                     | Nhóm điền                   |
| trading / listings   | Trading       | MyListings, CreateListing, ListingDetail         | Farmer own, chọn Plot + Season cụ thể                | Nhóm điền                   |
| trading / feed       | Trading       | Marketplace                                      | Trader; Admin read theo quyền Feed đã chốt           | Ví dụ có sẵn, nhóm tiếp tục |
| trading / offers     | Trading       | CreateOffer, MyOffers, ListingOffers             | Trader gửi; Farmer owner xem/accept                  | Nhóm điền                   |
| chat                 | Chat          | ConversationList, ChatRoom, ImagePreview         | Chỉ participant, phòng sau OFFER_ACCEPTED            | Hưng (BE); FE nhóm điền     |
| payments / contracts | Payment       | ContractDetail, CreateContract, AcceptContract   | Trader tạo từ offer đã accept; Farmer accept         | Hưng (BE); FE nhóm điền     |
| payments / deposits  | Payment       | DepositHistory, DepositDetail                    | Trader nạp mô phỏng, Farmer rút đủ điều kiện         | Hưng (BE); FE nhóm điền     |
| payments / disputes  | Payment       | DisputeDetail, CreateDispute, EvidenceUpload     | Participant + Admin độc lập theo API                 | Hưng (BE); FE nhóm điền     |
| notifications        | Notification  | NotificationList, NotificationDetail             | own account, badge riêng Chat                        | Nhóm điền                   |
| admin / accounts     | User          | AccountList, AccountDetail, EditAccount          | Admin theo allowlist, không tự sửa role              | Nhóm điền                   |
| admin / disputes     | Payment       | DisputeQueue, ReviewDispute, DecisionForm        | Admin, assignment/conflict-of-interest               | Nhóm điền                   |
| dashboard            | Nhiều owner   | FarmerDashboard, TraderDashboard, AdminDashboard | Chỉ dữ liệu đúng role/API đã có                      | Nhóm điền                   |

Tên trong bảng là **đích triển khai**, chưa phải màn đã viết. Hiện chưa có navigator nghiệp vụ hay Workspace; metadata `packages/contracts/src/modules.ts` chỉ là tham khảo phạm vi, nhóm tự nối route khi thêm màn thật. Màn con/detail đi qua route params web hoặc route params được kiểm theo moduleId trên mobile; không truyền toàn bộ DTO/token trong navigation.

## Bàn giao giữa module

1. User cung cấp session/accountId/role/token. Mọi module đọc phiên qua store, không có role switch trong api mode.
2. Farming trả Plot/Season cho tạo Listing; không có Season thì tạo Season trước. Trading gửi `plotId,cropSeasonId,expectedPrice`, không gửi owner/snapshot tự chế.
3. Offer PENDING chưa có phòng Chat. Accept Offer có thể nhiều bên; client đọc conversations để tìm theo offerId, không tự tạo phòng hay tự loại tất cả Offer khác.
4. Chat hiển thị card tham chiếu Contract; gọi Payment adapter, không tự sửa Contract state qua Chat API.
5. Deposit thành công và backend chốt độc quyền mới ACTIVE/LOCKED. Mốc deliveryDate+24h chỉ mở điều kiện rút, không tự hoàn tất.
6. Notification route theo referenceType/referenceId đã allowlist, không mở URL bất kỳ từ payload. Badge Chat lấy unread Chat; badge Notification lấy Notification.

## Thứ tự triển khai

- **Mốc A:** hai app chạy được, tokens/role, login/OTP/profile và Farming list/create.
- **Mốc B:** Farming season/log/cost → tạo Listing → Feed GPS → Offer → Farmer accept.
- **Mốc C:** phòng Chat/history/text/image/realtime → tạo/accept Contract.
- **Mốc D:** nạp cọc mô phỏng/complete/release → dispute/Admin → Notification và dashboard tổng hợp.
- **Mốc E:** kiểm toàn luồng cả hai app với backend thật, lỗi dependency/role/ownership, build APK + web.

Mỗi issue ghi rõ sửa file nào, API nào, người làm web/mobile/shared, các điều kiện xong. Không giao chung “làm toàn FE Farmer” nếu chưa thống nhất thư mục và API. Dùng mẫu `templates/FEATURE_TASK.md`.
