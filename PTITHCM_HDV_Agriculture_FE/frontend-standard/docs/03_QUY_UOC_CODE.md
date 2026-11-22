# Quy ước viết code FE

## Đặt tên

| Loại             | Ví dụ                                            |
| ---------------- | ------------------------------------------------ |
| Folder nghiệp vụ | `farming`, `trading`, `payments`                 |
| Web page         | `PlotListPage.tsx`, `CreateContractPage.tsx`     |
| Native screen    | `PlotListScreen.tsx`, `CreateContractScreen.tsx` |
| Component        | `PlotCard.tsx`, `ContractStatusBadge.tsx`        |
| Hook             | `usePlots.ts`, `useCreateOffer.ts`               |
| API factory      | `createFarmingApi`, `createTradingApi`           |
| DTO/request      | `PlotDto`, `CreatePlotRequest`                   |
| Hàm/biến         | `getPlot`, `selectedCropSeasonId`                |
| Enum dữ liệu     | `PENDING_DEPOSIT`, không dịch giá trị gửi API    |

Tên code tiếng Anh; nhãn/validation người dùng tiếng Việt. ID đúng tên backend (`plotId`, `cropSeasonId`, `contractId`). Không đổi Farm/Plot qua lại trong payload. Nội dung giao diện có thể gọi “ruộng”.

## Trách nhiệm từng tầng

**Page/Screen** ghép UI, đọc params, gọi hook, quản lý form/người dùng chọn. Không nhét fetch, parse JWT, tính phạt hay logic settlement vào JSX.

**Component feature** nhận props có type, ví dụ `ListingCard({ listing })`; tránh biết toàn bộ state app. **Shared UI** chỉ biết Button/TextInput/Dialog, không biết hợp đồng hay Farmer.

**Hook** quản lý server state bằng TanStack Query: query key có accountId + filter + page/cursor, truyền AbortSignal, bật query đúng quyền. Mutation thành công invalidate đúng resource. Không tự sửa status ACTIVE/SOLD trước khi backend xác nhận.

**API adapter** chỉ biết đường dẫn Gateway, method, request/response schema. Adapter thật không lẫn dữ liệu mock. Tại runtime chọn một nguồn; lỗi API không chuyển sang mẫu.

**Contracts** dùng type/schema riêng cho mỗi DTO. Feed response không đồng nhất với create/detail response. TypeScript không kiểm JSON lúc chạy nên response API dùng schema khi đã biết contract. Không `any`, không `as` để che lỗi DTO, không `@ts-ignore` thay việc sửa type.

## State nào để đâu?

| State                         | Chỗ phù hợp                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| Form, đóng/mở modal, chọn tab | useState trong page/screen                                                                  |
| Account + tokens              | memory session store dùng chung; không persistent storage                                   |
| Danh sách ruộng/listing/chat  | TanStack Query, scope theo account/resource                                                 |
| Filter cần chia sẻ URL web    | search params của router; ví dụ hiện dùng local state cho đơn giản                          |
| Plot/CropSeason đang chọn     | parent feature/context phạm vi Farming; đổi Plot phải reset Season nếu không thuộc Plot mới |
| Giá trị suy ra                | tính từ data hoặc selector, tránh lưu trùng state                                           |

Khi logout/đổi account: clear query cache và phiên, đóng socket, bỏ blob URL/ảnh riêng tư. Không dùng một cache toàn cục không chứa accountId. Token giữ trong RAM theo baseline v2.1 trên cả hai client; reload/đóng app cần đăng nhập lại. SecureStore có thể cân nhắc sau một quyết định đổi chính sách, chưa dùng trong bộ khung.

## Forms và mutations

- Validate trước khi submit; hiển thị lỗi cạnh field và lỗi server dễ hiểu. Trim username, không trim password.
- Disable nút lúc pending; một click không tạo hai mutation. Không auto retry POST cọc/hợp đồng khi chưa biết kết quả. Dùng Idempotency-Key theo contract của endpoint, giữ cùng key cho cùng attempt; không tự tạo key mới khi timeout.
- `409`: refetch trạng thái, báo thay đổi/xung đột; không tự coi thao tác thành công. `503`: cho biết máy chủ chưa xử lý được/đang đối soát theo code cụ thể.
- Tiền giữ dạng decimal string; không parseFloat để tính tiền/cọc/phạt. Backend là nguồn tổng giá trị và quyền rút.

## UI web và native

- Mỗi screen có loading, error + retry, empty + hướng dẫn, success; có 403/404 khi liên quan.
- Dùng màu/khoảng cách V5. Native không copy CSS, dùng StyleSheet và token TS. Cỡ chữ hỗ trợ font scaling; thao tác chính tối thiểu khoảng 44–48 px/point.
- Web dùng label, nút thật, focus-visible, navigation bàn phím; native dùng accessibilityLabel/Role, keyboard phù hợp, KeyboardAvoidingView cho form.
- List native dùng FlatList, không map hàng trăm item trong ScrollView. Chat mobile tách danh sách/phòng, xử lý nút back; web có thể bố cục nhiều cột.
- Không tự thêm sao đánh giá/badge xác minh/reputation công khai. Không đưa tên bảng DB, service key hay stack trace vào flow người dùng.

Chạy Prettier/ESLint trước PR. Chỉ tách component khi có trách nhiệm rõ hoặc cần tái sử dụng; tránh file 1.000 dòng nhưng cũng không chia từng dòng JSX thành một file.
