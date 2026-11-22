# Farming — Ruộng, mùa vụ, nhật ký, chi phí, PDF

Chỉ FARMER ACTIVE và owner. Lúa nước; Plot 1:N CropSeason; nhật ký/chi phí theo cropSeasonId. UUID; area m², yield kg; cropType bắt buộc với mùa vụ mới, GPS latitude/longitude. Đổi Plot phải bỏ Season không thuộc Plot đó.

| Method/path                                        | Request / ý nghĩa                                     |
| -------------------------------------------------- | ----------------------------------------------------- |
| POST /api/v1/plots                                 | name,area,location,description,latitude,longitude     |
| GET /api/v1/plots                                  | page/size, chỉ ruộng của account                      |
| GET /api/v1/plots/{plotId}                         | chi tiết                                              |
| PUT /api/v1/plots/{plotId}                         | thay dữ liệu theo create DTO                          |
| PATCH /api/v1/plots/{plotId}/visibility            | {isVisible}                                           |
| POST /api/v1/plots/{plotId}/crop-seasons           | seasonName,startDate,expectedYield,cropType           |
| GET /api/v1/crop-seasons/{cropSeasonId}            | chi tiết                                              |
| PUT /api/v1/crop-seasons/{cropSeasonId}            | seasonName,startDate,expectedYield,cropType theo spec |
| PATCH /api/v1/crop-seasons/{cropSeasonId}/complete | {actualYield}                                         |
| POST /api/v1/crop-seasons/{cropSeasonId}/logs      | workType,workDate,description,quantity,unit           |
| PATCH /api/v1/logs/{logId}                         | subset workType,workDate,description,quantity,unit    |
| PATCH /api/v1/logs/{logId}/visibility              | {isVisible}                                           |
| POST /api/v1/crop-seasons/{cropSeasonId}/costs     | category,amount,incurredDate,description              |
| PATCH /api/v1/costs/{costId}                       | subset category,amount,incurredDate,description       |
| PATCH /api/v1/costs/{costId}/visibility            | {isVisible}                                           |
| GET /api/v1/crop-seasons/{cropSeasonId}/report     | cropSeason,plot,farmingLogs,costs,summary             |
| GET /api/v1/crop-seasons/{cropSeasonId}/report/pdf | bytes application/pdf, Bearer                         |

PATCH bỏ field thì giữ giá trị; description:null để xóa, không tự gửi null cho field khác. Ẩn mềm, không DELETE dữ liệu canh tác. Enum workType: LAND_PREPARATION, PLANTING, PEST_CONTROL, WATERING, FERTILIZING, HARVESTING. Category chi phí chưa có enum hoàn chỉnh trong contract, không suy từ một ví dụ FERTILIZER.

Report example dùng totalCost dạng number trong khi tiền toàn hệ thống quy định decimal string: cần owner sửa/xác nhận response trước schema. Các ví dụ detail/update đang trả tập field không đồng nhất, không coi chúng là DTO đầy đủ. GET list Season theo Plot, list Log/Cost và Log/Cost detail chưa được đặc tả đầy đủ dù phần quyền có nhắc CRUD. Có thể dùng report để đọc tổng hợp đúng scope nhưng không tự thay endpoint list đã thiếu bằng endpoint tự nghĩ ra.

GET /api/v1/plots/{plotId}/summary?cropSeasonId=... chỉ dành Trading bằng service key, Gateway chặn public. FE không gọi. PDF là report xuất ra, không đồng nghĩa upload tranh chấp được phép PDF.

## Nguồn và chi tiết request/response

[Spec đầy đủ](../../reference/contracts/02-farming-service.md). Phần bên dưới trích mục 6–7 từ spec, không phải tuyên bố API đã chạy. Nếu khác source Chat/Payment, dùng ghi chú đối chiếu bên trên và docs/09, không tự bỏ yêu cầu nghiệp vụ.

<details>
<summary>Xem contract và ví dụ gốc</summary>

```text
6. API CONTRACT
6.1. Create Plot
POST /api/v1/plots
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Tạo mới một Plot trồng lúa
Request:
{"name":"Ruộng A1","area":2500.5,"location":"An Giang","description":"Ruộng lúa Đông Xuân","latitude":10.123,"longitude":106.456}
Response:
{"plotId":"uuid","farmerId":"uuid","name":"Ruộng A1","area":2500.5,"location":"An Giang","description":"Ruộng lúa Đông Xuân","latitude":10.123,"longitude":106.456}
6.2. Get Farmer's Plots
GET /api/v1/plots
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Lấy danh sách các Plot thuộc Farmer hiện tại
Request:
Không có request body.
Response:
{"items":[{"plotId":"uuid","name":"Ruộng A1","area":2500.5,"location":"An Giang","description":"Ruộng lúa Đông Xuân","latitude":10.123,"longitude":106.456}],"page":0,"size":20,"totalElements":1,"totalPages":1}
6.3. Get Plot Detail
GET /api/v1/plots/{plotId}
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Lấy thông tin chi tiết một Plot
Request:
Không có request body.
Response:
{"plotId":"uuid","farmerId":"uuid","name":"Ruộng A1","area":2500.5,"location":"An Giang","description":"Ruộng lúa Đông Xuân","latitude":10.123,"longitude":106.456}
6.4. Update Plot
PUT /api/v1/plots/{plotId}
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Cập nhật thông tin Plot
Request:
{"name":"Ruộng A1 - Updated","area":2600.0,"location":"An Giang","description":"Ruộng lúa","latitude":10.123,"longitude":106.456}
Response:
{"plotId":"uuid","name":"Ruộng A1 - Updated","area":2600.0,"location":"An Giang","description":"Ruộng lúa","latitude":10.123,"longitude":106.456}
6.5. Hide Plot
PATCH /api/v1/plots/{plotId}/visibility
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Ẩn Plot, không xóa dữ liệu khỏi Database
Request:
{"isVisible":false}
Response:
{"plotId":"uuid","isVisible":false}
6.6. Create Crop Season
POST /api/v1/plots/{plotId}/crop-seasons
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Tạo mùa vụ lúa trên một Plot
Request:
{"seasonName":"Đông Xuân 2026","startDate":"2026-11-01","expectedYield":1500,"cropType":"ST25"}
Response:
{"cropSeasonId":"uuid","plotId":"uuid","seasonName":"Đông Xuân 2026","startDate":"2026-11-01","endDate":null,"status":"IN_PROGRESS","expectedYield":1500,"actualYield":null,"cropType":"ST25"}
6.7. Get Crop Season
GET /api/v1/crop-seasons/{cropSeasonId}
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Lấy thông tin chi tiết mùa vụ
Request:
Không có request body.
Response:
{"cropSeasonId":"uuid","plotId":"uuid","seasonName":"Đông Xuân 2026","status":"IN_PROGRESS","cropType":"ST25"}
6.8. Update Crop Season
PUT /api/v1/crop-seasons/{cropSeasonId}
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Cập nhật thông tin mùa vụ
Request:
{"seasonName":"Đông Xuân 2026","startDate":"2026-11-01","expectedYield":1550,"cropType":"ST25"}
Response:
{"cropSeasonId":"uuid","seasonName":"Đông Xuân 2026","expectedYield":1550,"status":"IN_PROGRESS","cropType":"ST25"}
6.9. Complete Crop Season
PATCH /api/v1/crop-seasons/{cropSeasonId}/complete
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Hoàn thành mùa vụ
Request:
{"actualYield":1420}
Response:
{"cropSeasonId":"uuid","status":"COMPLETED","actualYield":1420}
6.10. Create Farming Log
POST /api/v1/crop-seasons/{cropSeasonId}/logs
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Ghi nhận hoạt động canh tác
Request:
{"workType":"FERTILIZING","workDate":"2026-11-20","description":"Bón phân lần 1","quantity":50,"unit":"kg"}
Response:
{"logId":"uuid","cropSeasonId":"uuid","workType":"FERTILIZING","workDate":"2026-11-20","description":"Bón phân lần 1","quantity":50,"unit":"kg"}
6.11. Update Farming Log
PATCH /api/v1/logs/{logId}
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Cập nhật nhật ký canh tác
Request:
Request: tập con không rỗng {workType,workDate,description,quantity,unit}; bỏ qua field không gửi, description:null để xóa; reject field ngoài allowlist/owner/ID và null ở field khác. Response 200 DTO create Log đầy đủ + isVisible. Ví dụ PATCH {"description":"Đã bón phân lần 2","quantity":40} → {"logId":"uuid","cropSeasonId":"uuid","workType":"FERTILIZING","workDate":"2026-11-20","description":"Đã bón phân lần 2","quantity":40,"unit":"kg","isVisible":true}. Quyền FARMER ACTIVE/owner; 400 input,403 quyền,404 không tồn tại,503 access-state.
6.12. Hide Farming Log
PATCH /api/v1/logs/{logId}/visibility
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Ẩn Farming Log, giữ dữ liệu trong Database
Request:
{"isVisible":false}
Response:
{"logId":"uuid","isVisible":false}
6.13. Create Cost
POST /api/v1/crop-seasons/{cropSeasonId}/costs
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Ghi nhận chi phí canh tác
Request:
{"category":"FERTILIZER","amount":"850000.00","incurredDate":"2026-11-20","description":"Phân bón lần 1"}
Response:
{"costId":"uuid","cropSeasonId":"uuid","category":"FERTILIZER","amount":"850000.00","incurredDate":"2026-11-20","description":"Phân bón lần 1"}
6.14. Update Cost
PATCH /api/v1/costs/{costId}
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Cập nhật chi phí
Request:
Request: tập con không rỗng {category,amount,incurredDate,description}; field vắng giữ nguyên, description:null để xóa; reject ID/owner/cropSeasonId/status/isVisible. Response 200 DTO create Cost đầy đủ + isVisible. Ví dụ PATCH {"amount":"900000.00"} → {"costId":"uuid","cropSeasonId":"uuid","category":"FERTILIZER","amount":"900000.00","incurredDate":"2026-11-20","description":"Phân bón lần 1","isVisible":true}. Giữ validation create DTO, FARMER ACTIVE/owner; lỗi theo §10 và Contract v2.1 §7.1.
6.15. Hide Cost
PATCH /api/v1/costs/{costId}/visibility
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Ẩn Cost, giữ dữ liệu trong Database
Request:
{"isVisible":false}
Response:
{"costId":"uuid","isVisible":false}
6.16. Get Farming Report
GET /api/v1/crop-seasons/{cropSeasonId}/report
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Lấy báo cáo lịch sử canh tác của Crop Season
Request:
Không có request body.
Response:
{"cropSeason":{},"plot":{},"farmingLogs":[],"costs":[],"summary":{"totalCost":12500000,"expectedYield":1500,"actualYield":1420}}
6.17. Export Farming Report PDF
GET /api/v1/crop-seasons/{cropSeasonId}/report/pdf
Owner: Farming Service
Consumer: Frontend / FARMER
Authentication: JWT
Purpose: Xuất báo cáo lịch sử canh tác thành file PDF
Request:
Không có request body.
Response:
Content-Type: application/pdf
6.18. Trading → Farming: Get Plot Summary — snapshot Plot/Season/cropType/GPS/kg/m²
GET /api/v1/plots/{plotId}/summary
Owner: Farming Service
Consumer: Trading Service
Authentication: internal X-Service-Key của Trading; private network, không public qua Gateway; kiểm quyền caller và Farmer owner khi tạo Listing, không dùng header client làm identity.
Purpose: Cung cấp snapshot thông tin Plot/Crop phục vụ Trading tạo Listing
Communication: REST / Synchronous
Request:
Query cropSeasonId bắt buộc (UUID), không body. Thiếu/sai query400; season không thuộc Plot/owner403; Plot ẩn hoặc thiếu snapshot409; không tự chọn mùa vụ mới nhất.
Response:
{"plotId":"uuid","farmerId":"uuid","area":2500.5,"latitude":10.123,"longitude":106.456,"currentSeason":{"cropSeasonId":"uuid","cropType":"ST25","expectedYield":1500}}
Farming Log Work Type:
LAND_PREPARATION
 PLANTING
 PEST_CONTROL
 WATERING
 FERTILIZING
 HARVESTING
Trading Integration: cropType map seedType; expectedYield kg; Plot latitude/longitude và area m². GET /api/v1/plots/{plotId}/summary trả snapshot đã chốt; endpoint crops/profile cũ bỏ vì không có entity crops. Trading copy snapshot tại thời điểm tạo Listing.
7. API CONTRACT MATRIX
From
To
Method
Endpoint
Purpose
Sync/Async
Frontend / FARMER
Farming
POST
/api/v1/plots
Tạo Plot
Sync
Frontend / FARMER
Farming
GET
/api/v1/plots
Lấy danh sách Plot
Sync
Frontend / FARMER
Farming
GET
/api/v1/plots/{plotId}
Lấy chi tiết Plot
Sync
Frontend / FARMER
Farming
PUT
/api/v1/plots/{plotId}
Cập nhật Plot
Sync
Frontend / FARMER
Farming
PATCH
/api/v1/plots/{plotId}/visibility
Ẩn/hiện Plot
Sync
Frontend / FARMER
Farming
POST
/api/v1/plots/{plotId}/crop-seasons
Tạo Crop Season
Sync
Frontend / FARMER
Farming
GET
/api/v1/crop-seasons/{cropSeasonId}
Lấy Crop Season
Sync
Frontend / FARMER
Farming
PUT
/api/v1/crop-seasons/{cropSeasonId}
Cập nhật Crop Season
Sync
Frontend / FARMER
Farming
PATCH
/api/v1/crop-seasons/{cropSeasonId}/complete
Hoàn thành Crop Season
Sync
Frontend / FARMER
Farming
POST
/api/v1/crop-seasons/{cropSeasonId}/logs
Tạo Farming Log
Sync
Frontend / FARMER
Farming
PATCH
/api/v1/logs/{logId}
Cập nhật Farming Log
Sync
Frontend / FARMER
Farming
PATCH
/api/v1/logs/{logId}/visibility
Ẩn/hiện Farming Log
Sync
Frontend / FARMER
Farming
POST
/api/v1/crop-seasons/{cropSeasonId}/costs
Tạo Cost
Sync
Frontend / FARMER
Farming
PATCH
/api/v1/costs/{costId}
Cập nhật Cost
Sync
Frontend / FARMER
Farming
PATCH
/api/v1/costs/{costId}/visibility
Ẩn/hiện Cost
Sync
Frontend / FARMER
Farming
GET
/api/v1/crop-seasons/{cropSeasonId}/report
Lấy Report
Sync
Frontend / FARMER
Farming
GET
/api/v1/crop-seasons/{cropSeasonId}/report/pdf
Export Report PDF
Sync
Trading
Farming
GET
/api/v1/plots/{plotId}/summary
Lấy Plot/Crop snapshot phục vụ Listing
Sync
```

</details>
