# V5 — Phân loại thay đổi UI và ảnh hưởng BA–SOA v2.1

## Không đổi backend (có thể làm frontend theo Contract đã duyệt)
- Thiết kế lại cấu trúc ba cột, typography, card, tabs, responsive, hành vi mở/đóng filter.
- Bộ chọn Plot/Crop Season từ dữ liệu Farming **thuộc cùng Farmer**. Không tự chọn mùa vụ mới nhất làm nguồn sự thật của Listing; lúc đăng bài vẫn buộc người dùng xác nhận mùa vụ.
- Giao diện trạng thái trống khi Plot chưa có Season. Nhật ký, chi phí, báo cáo thuộc đúng cropSeasonId.
- Trader tìm Listing theo `lat,lng,radius,page,size`; thay đổi bán kính là filter duy nhất hiển thị trong V5 demo.
- Farmer chủ sở hữu xem Offer của Listing mình, chấp nhận nhiều Offer để mở Chat. Offer của người khác phải ẩn và bị backend từ chối nếu truy cập trực tiếp.
- Chat room theo OFFER_ACCEPTED/offerId, không mở Chat khi POST Offer.
- Chỉnh cách hiển thị Notification/tin chưa đọc và trạng thái tài khoản theo đúng account người dùng.

## ĐỀ XUẤT CẦN NHÓM PHÊ DUYỆT trước khi viết API/schema
| Nội dung | Contract hiện tại | Quyết định cần duyệt |
|---|---|---|
| Farmer đọc **Tham khảo thị trường** | GET `/api/v1/listings/feed` hiện dành cho TRADER/ADMIN theo Contract Trading | Quyền Farmer xem bản công khai, loại dữ liệu hiển thị, bảo mật địa điểm, API/mục tiêu thị trường |
| Media của bài đăng Listing | POST Listing nhận `{plotId,cropSeasonId,expectedPrice}`, chưa có media/caption trong DTO | Bảng/owner media, upload/read, giới hạn loại/dung lượng, khi listing CANCELLED/LOCKED, bảo vệ file |
| Chú thích mô tả Listing | Chưa có field mô tả Listing được duyệt trong API | Field, validation, giới hạn ký tự, nội dung cho phép, quy tắc cập nhật |
| Thông tin giá | `expectedPrice` có decimal VND dương, chưa chốt rõ đơn vị kinh tế | Là giá/kg, tổng hay dạng khác; ràng buộc Offer/Contract tổng tiền |
| Lọc giống, vị trí tỉnh, trạng thái, từ khóa, sort giá | Trader Feed baseline chỉ `lat,lng,radius,page,size` | Không thiết kế như bộ lọc hoạt động thật trước khi bổ sung Contract |
| Danh sách Listing Farmer/chi tiết public đa vai trò | Tài liệu Trading cần đối chiếu thêm API list/detail thực tế với contract chung | Endpoint/query/response/ownership để mở các tab và truy cập detail |

**Nguyên tắc:** V5 là bản minh họa UX chứ không phải bằng chứng API đã được duyệt. Không đưa các bổ sung này vào migrations, Kafka hoặc frontend API calls chỉ vì có component trên bản mẫu.
