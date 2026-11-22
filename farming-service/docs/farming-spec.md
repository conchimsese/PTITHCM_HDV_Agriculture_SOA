**AGRICULTURE MICROSERVICE:**  
 **FARMING SERVICE SPECIFICATION**

Rice Only • PostgreSQL • Node.js \+ Express.js

| Thông tin | Giá trị |
| :---- | :---- |
| Service | Farming Service |
| Repository | farming-service |
| Phạm vi | Chỉ quản lý lúa nước (Rice Only) |
| Backend | Node.js \+ Express.js |
| Database | PostgreSQL |
| Database ownership | Farming Service |
| Core entities | plots, crop\_seasons, farming\_logs, costs |
| Primary role | FARMER |
| Development command | npm run dev |

*QUY TẮC TÀI LIỆU: Mọi thông tin chưa được nhóm chốt được ghi CHƯA CHỐT/TBD. AI Agent không được tự suy đoán và biến TBD thành requirement.*

**1\. Project Overview**

**1.1. Mục tiêu hệ thống**  
Farming Service quản lý dữ liệu và nghiệp vụ phục vụ canh tác lúa nước trong hệ thống Microservices. Phạm vi hiện tại chỉ dành cho lúa nước, không mở rộng sang các cây nông nghiệp khác.

**1.2. Phạm vi**  
Quản lý ruộng/lô đất trồng lúa (Plot).

Quản lý mùa vụ lúa (Crop Season).

Ghi nhận nhật ký canh tác (Farming Log).

Quản lý chi phí canh tác (Cost).

Tạo báo cáo từ dữ liệu canh tác và xuất báo cáo thành PDF.

**1.3. Đối tượng sử dụng**  
FARMER.

**1.4. Business flow chính**  
FARMER → Tạo Plot → Tạo Crop Season → Ghi Farming Log → Ghi Cost → Hoàn thành Crop Season → Tạo Report → Export PDF.

**1.5. Nền tảng & kiến trúc**  
Nền tảng tổng thể: Web và Mobile App.

Kiến trúc: Microservices, Database per Service.

Farming Service sở hữu database riêng.

**3\. Service Responsibility**

| Service | Responsibility | Database | Owner |
| :---- | :---- | :---- | :---- |
| Farming Service | Plot, Season, Cultivation Log, Cost, dữ liệu phục vụ Report/PDF | PostgreSQL | Farming Service |

Quy tắc: mỗi service có database, business logic và API riêng; service khác không được truy cập trực tiếp database Farming.

**4\. Database Ownership**

| Mục | Farming Service |
| :---- | :---- |
| Database | PostgreSQL |
| Entities | plots, crop\_seasons, farming\_logs, costs |
| PK | UUID |
| Internal FK | crop\_seasons.plot\_id → plots.plot\_id; farming\_logs.crop\_season\_id → crop\_seasons.crop\_season\_id; costs.crop\_season\_id → crop\_seasons.crop\_season\_id |
| External reference | plots.farmer\_id → User Service, Soft FK / logical reference |
| Physical FK xuyên database | Không có |
| Data ownership | Farming Service |

**4.1. External Reference**  
farmer\_id là tham chiếu logic đến User Service. Không tạo Foreign Key vật lý sang database User Service.

**5\. ERD của Farming Service**  
*ERD giữ plots/crop\_seasons/farming\_logs/costs. Đã chốt: crop\_seasons.crop\_type VARCHAR(100), JSON cropType, bắt buộc với mùa vụ mới; plots có latitude/longitude cho GPS MVP; expected\_yield/actual\_yield tính kg, area m². Không tạo crops/report table. Dữ liệu cũ chưa có giá trị giữ để owner bổ sung, không tự gán cropType/GPS.*

| Entity | Quan hệ |
| :---- | :---- |
| plots | 1 — N crop\_seasons |
| crop\_seasons | 1 — N farming\_logs |
| crop\_seasons | 1 — N costs |
| plots.farmer\_id | Soft FK → User Service |

**5.1. plots**

| Attribute | Type | Constraint |
| :---- | :---- | :---- |
| plot\_id | UUID | PK, NOT NULL |
| farmer\_id | UUID | NOT NULL, Soft FK → User Service |
| name | VARCHAR(100) | NOT NULL |
| area | DECIMAL(10,2) | NOT NULL, \> 0 |
| location | VARCHAR(255) | NOT NULL |
| description | TEXT | NULL |
| created\_at | TIMESTAMP | NOT NULL |
| updated\_at | TIMESTAMP | NOT NULL |

**5.2. crop\_seasons**

| Attribute | Type | Constraint |
| :---- | :---- | :---- |
| crop\_season\_id | UUID | PK, NOT NULL |
| plot\_id | UUID | FK, NOT NULL |
| season\_name | VARCHAR(100) | NOT NULL |
| start\_date | DATE | NOT NULL |
| end\_date | DATE | NULL |
| status | VARCHAR(20) | NOT NULL |
| expected\_yield | DECIMAL(10,2) | NULL |
| actual\_yield | DECIMAL(10,2) | NULL |
| created\_at | TIMESTAMP | NOT NULL |
| updated\_at | TIMESTAMP | NOT NULL |

**5.2.1. Field giống lúa đã được duyệt**

**crop\_type VARCHAR(100), JSON cropType, required/nonblank cho mùa vụ mới; latitude/longitude thuộc plots. Trading map cropType sang seedType; expectedYield kg, area m². Migration dữ liệu cũ chưa tự điền giá trị.**

**5.3. farming\_logs**

| Attribute | Type | Constraint |
| :---- | :---- | :---- |
| log\_id | UUID | PK, NOT NULL |
| crop\_season\_id | UUID | FK, NOT NULL |
| work\_type | VARCHAR(30) | NOT NULL |
| work\_date | DATE | NOT NULL |
| description | TEXT | NULL |
| quantity | DECIMAL(10,2) | NULL, \>= 0 |
| unit | VARCHAR(20) | NULL |
| created\_at | TIMESTAMP | NOT NULL |
| updated\_at | TIMESTAMP | NOT NULL |

**5.4. costs**

| Attribute | Type | Constraint |
| :---- | :---- | :---- |
| cost\_id | UUID | PK, NOT NULL |
| crop\_season\_id | UUID | FK, NOT NULL |
| category | VARCHAR(50) | NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL, \>= 0 |
| incurred\_date | DATE | NOT NULL |
| description | TEXT | NULL |
| created\_at | TIMESTAMP | NOT NULL |
| updated\_at | TIMESTAMP | NOT NULL |

# **6\. API CONTRACT**

## **6.1. Create Plot**

POST /api/v1/plots

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Tạo mới một Plot trồng lúa

Request:

{"name":"Ruộng A1","area":2500.5,"location":"An Giang","description":"Ruộng lúa Đông Xuân","latitude":10.123,"longitude":106.456}

Response:

{"plotId":"uuid","farmerId":"uuid","name":"Ruộng A1","area":2500.5,"location":"An Giang","description":"Ruộng lúa Đông Xuân","latitude":10.123,"longitude":106.456}

## **6.2. Get Farmer's Plots**

GET /api/v1/plots

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Lấy danh sách các Plot thuộc Farmer hiện tại

Request:

Không có request body.

Response:

{"items":\[{"plotId":"uuid","name":"Ruộng A1","area":2500.5,"location":"An Giang","description":"Ruộng lúa Đông Xuân","latitude":10.123,"longitude":106.456}\],"page":0,"size":20,"totalElements":1,"totalPages":1}

## **6.3. Get Plot Detail**

GET /api/v1/plots/{plotId}

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Lấy thông tin chi tiết một Plot

Request:

Không có request body.

Response:

{"plotId":"uuid","farmerId":"uuid","name":"Ruộng A1","area":2500.5,"location":"An Giang","description":"Ruộng lúa Đông Xuân","latitude":10.123,"longitude":106.456}

## **6.4. Update Plot**

PUT /api/v1/plots/{plotId}

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Cập nhật thông tin Plot

Request:

{"name":"Ruộng A1 \- Updated","area":2600.0,"location":"An Giang","description":"Ruộng lúa","latitude":10.123,"longitude":106.456}

Response:

{"plotId":"uuid","name":"Ruộng A1 \- Updated","area":2600.0,"location":"An Giang","description":"Ruộng lúa","latitude":10.123,"longitude":106.456}

## **6.5. Hide Plot**

PATCH /api/v1/plots/{plotId}/visibility

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Ẩn Plot, không xóa dữ liệu khỏi Database

Request:

{"isVisible":false}

Response:

{"plotId":"uuid","isVisible":false}

## **6.6. Create Crop Season**

POST /api/v1/plots/{plotId}/crop-seasons

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Tạo mùa vụ lúa trên một Plot

Request:

{"seasonName":"Đông Xuân 2026","startDate":"2026-11-01","expectedYield":1500,"cropType":"ST25"}

Response:

{"cropSeasonId":"uuid","plotId":"uuid","seasonName":"Đông Xuân 2026","startDate":"2026-11-01","endDate":null,"status":"IN\_PROGRESS","expectedYield":1500,"actualYield":null,"cropType":"ST25"}

## **6.7. Get Crop Season**

GET /api/v1/crop-seasons/{cropSeasonId}

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Lấy thông tin chi tiết mùa vụ

Request:

Không có request body.

Response:

{"cropSeasonId":"uuid","plotId":"uuid","seasonName":"Đông Xuân 2026","status":"IN\_PROGRESS","cropType":"ST25"}

## **6.8. Update Crop Season**

PUT /api/v1/crop-seasons/{cropSeasonId}

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Cập nhật thông tin mùa vụ

Request:

{"seasonName":"Đông Xuân 2026","startDate":"2026-11-01","expectedYield":1550,"cropType":"ST25"}

Response:

{"cropSeasonId":"uuid","seasonName":"Đông Xuân 2026","expectedYield":1550,"status":"IN\_PROGRESS","cropType":"ST25"}

## **6.9. Complete Crop Season**

PATCH /api/v1/crop-seasons/{cropSeasonId}/complete

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Hoàn thành mùa vụ

Request:

{"actualYield":1420}

Response:

{"cropSeasonId":"uuid","status":"COMPLETED","actualYield":1420}

## **6.10. Create Farming Log**

POST /api/v1/crop-seasons/{cropSeasonId}/logs

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Ghi nhận hoạt động canh tác

Request:

{"workType":"FERTILIZING","workDate":"2026-11-20","description":"Bón phân lần 1","quantity":50,"unit":"kg"}

Response:

{"logId":"uuid","cropSeasonId":"uuid","workType":"FERTILIZING","workDate":"2026-11-20","description":"Bón phân lần 1","quantity":50,"unit":"kg"}

## **6.11. Update Farming Log**

PATCH /api/v1/logs/{logId}

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Cập nhật nhật ký canh tác

Request:

Request: tập con không rỗng {workType,workDate,description,quantity,unit}; bỏ qua field không gửi, description:null để xóa; reject field ngoài allowlist/owner/ID và null ở field khác. Response 200 DTO create Log đầy đủ \+ isVisible. Ví dụ PATCH {"description":"Đã bón phân lần 2","quantity":40} → {"logId":"uuid","cropSeasonId":"uuid","workType":"FERTILIZING","workDate":"2026-11-20","description":"Đã bón phân lần 2","quantity":40,"unit":"kg","isVisible":true}. Quyền FARMER ACTIVE/owner; 400 input,403 quyền,404 không tồn tại,503 access-state.

## **6.12. Hide Farming Log**

PATCH /api/v1/logs/{logId}/visibility

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Ẩn Farming Log, giữ dữ liệu trong Database

Request:

{"isVisible":false}

Response:

{"logId":"uuid","isVisible":false}

## **6.13. Create Cost**

POST /api/v1/crop-seasons/{cropSeasonId}/costs

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Ghi nhận chi phí canh tác

Request:

{"category":"FERTILIZER","amount":"850000.00","incurredDate":"2026-11-20","description":"Phân bón lần 1"}

Response:

{"costId":"uuid","cropSeasonId":"uuid","category":"FERTILIZER","amount":"850000.00","incurredDate":"2026-11-20","description":"Phân bón lần 1"}

## **6.14. Update Cost**

PATCH /api/v1/costs/{costId}

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Cập nhật chi phí

Request:

Request: tập con không rỗng {category,amount,incurredDate,description}; field vắng giữ nguyên, description:null để xóa; reject ID/owner/cropSeasonId/status/isVisible. Response 200 DTO create Cost đầy đủ \+ isVisible. Ví dụ PATCH {"amount":"900000.00"} → {"costId":"uuid","cropSeasonId":"uuid","category":"FERTILIZER","amount":"900000.00","incurredDate":"2026-11-20","description":"Phân bón lần 1","isVisible":true}. Giữ validation create DTO, FARMER ACTIVE/owner; lỗi theo §10 và Contract v2.1 §7.1.

## **6.15. Hide Cost**

PATCH /api/v1/costs/{costId}/visibility

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Ẩn Cost, giữ dữ liệu trong Database

Request:

{"isVisible":false}

Response:

{"costId":"uuid","isVisible":false}

## **6.16. Get Farming Report**

GET /api/v1/crop-seasons/{cropSeasonId}/report

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Lấy báo cáo lịch sử canh tác của Crop Season

Request:

Không có request body.

Response:

{"cropSeason":{},"plot":{},"farmingLogs":\[\],"costs":\[\],"summary":{"totalCost":12500000,"expectedYield":1500,"actualYield":1420}}

## **6.17. Export Farming Report PDF**

GET /api/v1/crop-seasons/{cropSeasonId}/report/pdf

Owner: Farming Service

Consumer: Frontend / FARMER

Authentication: JWT

Purpose: Xuất báo cáo lịch sử canh tác thành file PDF

Request:

Không có request body.

Response:

Content-Type: application/pdf

## **6.18. Trading → Farming: Get Plot Summary — snapshot Plot/Season/cropType/GPS/kg/m²**

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

LAND\_PREPARATION  
 PLANTING  
 PEST\_CONTROL  
 WATERING  
 FERTILIZING  
 HARVESTING

Trading Integration: cropType map seedType; expectedYield kg; Plot latitude/longitude và area m². GET /api/v1/plots/{plotId}/summary trả snapshot đã chốt; endpoint crops/profile cũ bỏ vì không có entity crops. Trading copy snapshot tại thời điểm tạo Listing.

# **7\. API CONTRACT MATRIX**

| From | To | Method | Endpoint | Purpose | Sync/Async |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Frontend / FARMER | Farming | POST | /api/v1/plots | Tạo Plot | Sync |
| Frontend / FARMER | Farming | GET | /api/v1/plots | Lấy danh sách Plot | Sync |
| Frontend / FARMER | Farming | GET | /api/v1/plots/{plotId} | Lấy chi tiết Plot | Sync |
| Frontend / FARMER | Farming | PUT | /api/v1/plots/{plotId} | Cập nhật Plot | Sync |
| Frontend / FARMER | Farming | PATCH | /api/v1/plots/{plotId}/visibility | Ẩn/hiện Plot | Sync |
| Frontend / FARMER | Farming | POST | /api/v1/plots/{plotId}/crop-seasons | Tạo Crop Season | Sync |
| Frontend / FARMER | Farming | GET | /api/v1/crop-seasons/{cropSeasonId} | Lấy Crop Season | Sync |
| Frontend / FARMER | Farming | PUT | /api/v1/crop-seasons/{cropSeasonId} | Cập nhật Crop Season | Sync |
| Frontend / FARMER | Farming | PATCH | /api/v1/crop-seasons/{cropSeasonId}/complete | Hoàn thành Crop Season | Sync |
| Frontend / FARMER | Farming | POST | /api/v1/crop-seasons/{cropSeasonId}/logs | Tạo Farming Log | Sync |
| Frontend / FARMER | Farming | PATCH | /api/v1/logs/{logId} | Cập nhật Farming Log | Sync |
| Frontend / FARMER | Farming | PATCH | /api/v1/logs/{logId}/visibility | Ẩn/hiện Farming Log | Sync |
| Frontend / FARMER | Farming | POST | /api/v1/crop-seasons/{cropSeasonId}/costs | Tạo Cost | Sync |
| Frontend / FARMER | Farming | PATCH | /api/v1/costs/{costId} | Cập nhật Cost | Sync |
| Frontend / FARMER | Farming | PATCH | /api/v1/costs/{costId}/visibility | Ẩn/hiện Cost | Sync |
| Frontend / FARMER | Farming | GET | /api/v1/crop-seasons/{cropSeasonId}/report | Lấy Report | Sync |
| Frontend / FARMER | Farming | GET | /api/v1/crop-seasons/{cropSeasonId}/report/pdf | Export Report PDF | Sync |
| Trading | Farming | GET | /api/v1/plots/{plotId}/summary | Lấy Plot/Crop snapshot phục vụ Listing | Sync |

# **8\. EVENT CONTRACT**

## **8.1. CROP\_SEASON\_COMPLETED**

CROP\_SEASON\_COMPLETED: ngoài MVP; không publish, không tạo topic/consumer/Notification cho event này. Farming giữ dữ liệu nội bộ và REST snapshot; quyết định phạm vi tại Contract v2.1 §7.1.

Không có payload Kafka triển khai trong MVP cho mục này.

## **8.2. FARMING\_LOG\_CREATED**

FARMING\_LOG\_CREATED: ngoài MVP; không publish, không tạo topic/consumer/Notification cho event này. Farming giữ dữ liệu nội bộ và REST snapshot; quyết định phạm vi tại Contract v2.1 §7.1.

Không có payload Kafka triển khai trong MVP cho mục này.

## **8.3. COST\_CREATED**

COST\_CREATED: ngoài MVP; không publish, không tạo topic/consumer/Notification cho event này. Farming giữ dữ liệu nội bộ và REST snapshot; quyết định phạm vi tại Contract v2.1 §7.1.

Không có payload Kafka triển khai trong MVP cho mục này.

## **8.4. Soft Delete / Data Retention Rule**

Farming Service MUST NOT physically delete farming data from PostgreSQL.

Khi người dùng thực hiện thao tác “xóa”, service MUST sử dụng soft delete / visibility status thay vì DELETE SQL operation.

Áp dụng: Plot → isVisible \= false; Farming Log → isVisible \= false; Cost → isVisible \= false.

Dữ liệu vẫn được giữ lại để phục vụ lịch sử canh tác, báo cáo, Export PDF, truy vết dữ liệu và các nghiệp vụ khác trong tương lai.

Lưu ý: ERD phải có trường phục vụ Soft Delete/Visibility. Nếu ERD hiện tại chưa có trường này, đây là thay đổi schema cần nhóm xác nhận trước khi AI Agent implementation.

 

 

## **8.5. Schema visibility và snapshot v2.1**

plots/farming\_logs/costs bổ sung is\_visible BOOLEAN NOT NULL DEFAULT true; API isVisible. Visibility idempotent, không physical-delete/cascade; list/report lấy visible, owner GET detail vẫn đọc lịch sử. Plot ẩn không tạo snapshot mới nhưng snapshot Listing/Contract cũ giữ nguyên. crop\_seasons.crop\_type VARCHAR(100), Plot latitude/longitude NUMERIC(9,6), expectedYield kg, area m²; create mới bắt buộc đủ dữ liệu, migration cũ nullable đến khi bổ sung thực. List page0/size20/max100,createdAt DESC rồi ID DESC.

**9\. Authentication & Authorization**  
*FARMER và quyền sở hữu Plot/Crop là baseline. ĐÃ CHỐT: Gateway xác minh JWT, Farming kiểm tra danh tính/role/ownership, không tin header x-user-id/x-user-role từ client. Protected request chỉ account ACTIVE; LOCKED/INACTIVE từ chối ngay sau commit dù JWT chưa hết hạn. State không kiểm tra được phải fail closed.*

| Endpoint / Action | FARMER |
| :---- | :---- |
| Create Plot | ✓ |
| Read Plot | ✓ |
| Update Plot | ✓ |
| Delete Plot | ✓ |
| Create Crop Season | ✓ |
| Read / Update / Delete Crop Season | ✓ |
| Create / Read / Update / Delete Farming Log | ✓ |
| Create / Read / Update / Delete Cost | ✓ |
| Create Report / Export PDF | ✓ |

Security đã chốt 07/10/2026: User ký RS256, access token 15 phút; iss=urn:soa:user-service, aud=soa-api; sub=accountId UUID, role=FARMER/TRADER/ADMIN, iat/exp/jti. Chỉ User giữ private key; Gateway/backend verify bằng public key, forward Bearer và kiểm ownership. GET /internal/v1/accounts/{accountId}/access-state đọc DB primary, không cache ACTIVE, timeout tổng 1 giây; không kiểm tra được →503 ACCESS\_STATE\_UNAVAILABLE; account không ACTIVE →403 ACCOUNT\_NOT\_ACTIVE. Internal dùng X-Service-Key riêng từng caller, private network/HTTPS khi triển khai, không route public. WebSocket Chat kiểm state trước SEND/SUBSCRIBE và push riêng tư.

**10\. Error Contract**  
Farming Service sử dụng format lỗi thống nhất của hệ thống:

{  
   "timestamp": "2026-09-25T10:00:00Z",  
   "status": 400,  
   "code": "VALIDATION\_ERROR",  
   "message": "Invalid request",  
   "path": "/api/..."  
 }

Các error code dùng theo contract chung:

VALIDATION\_ERROR

UNAUTHORIZED

FORBIDDEN

NOT\_FOUND

CONFLICT

INTERNAL\_SERVER\_ERROR

SERVICE\_UNAVAILABLE

**11\. Data Contract**

| Hạng mục | Quy ước |
| :---- | :---- |
| ID | UUID |
| Time | ISO 8601 / UTC |
| API / JSON / DTO | camelCase |
| Database | snake\_case |

Ví dụ API: plotId, cropSeasonId, createdAt. Ví dụ Database: plot\_id, crop\_season\_id, created\_at.

**12\. State Machine**

**12.1. Crop Season**

| Status | Ý nghĩa |
| :---- | :---- |
| IN\_PROGRESS | Đang thực hiện |
| COMPLETED | Đã hoàn thành |

Business flow đã chốt: Crop Season đi từ quá trình thực hiện đến bước Hoàn thành Crop Season.

ERD hiện tại có ghi chú có thể mở rộng CANCELLED/PLANNED nếu nghiệp vụ sau này yêu cầu; các trạng thái này không được coi là requirement bắt buộc hiện tại.

**13\. Business Rules**

| Rule ID | Business Rule |
| :---- | :---- |
| BR-FRM-001 | Farming Service chỉ quản lý lúa nước; không hỗ trợ các cây nông nghiệp khác. |
| BR-FRM-002 | Farming Service sở hữu 4 entity cốt lõi: plots, crop\_seasons, farming\_logs, costs. |
| BR-FRM-003 | Một Farmer có thể quản lý nhiều Plot. |
| BR-FRM-004 | Một Plot có thể có nhiều Crop Season. |
| BR-FRM-005 | Một Crop Season có thể có nhiều Farming Log. |
| BR-FRM-006 | Một Crop Season có thể có nhiều Cost. |
| BR-FRM-007 | farmer\_id là Soft FK / logical reference đến User Service; không tạo physical FK xuyên database. |
| BR-FRM-008 | Service khác không được truy cập trực tiếp Farming Database. |
| BR-FRM-009 | Không tạo bảng crops riêng trong schema hiện tại. |
| BR-FRM-010 | Không tạo bảng report riêng; Report/PDF sử dụng dữ liệu Crop Season \+ Farming Log \+ Cost. |
| BR-FRM-011 | area phải \> 0\. |
| BR-FRM-012 | amount phải \>= 0\. |
| BR-FRM-013 | quantity nếu có phải \>= 0\. |

**14\. Inter-Service Communication**

**14.1. Synchronous – REST**  
Trading → Farming: lấy dữ liệu phục vụ Listing.

User không gọi Farming trong baseline MVP; không bổ sung endpoint khi chưa có use case. Trading gọi REST snapshot Farming bằng service key riêng.

**14.2. Asynchronous – Message Broker**  
Kafka chung của hệ thống; Farming không có event/consumer nghiệp vụ trong MVP và không cần outbox producer. Contract v2.1 §7.1 đóng các đề xuất event Farming trước đây.

Không tự tạo topic/event/payload.

Nguyên tắc: service-to-service communication không được bypass ownership bằng cách truy cập trực tiếp database.

**15\. Repository Structure**  
*Repository đã chốt: farming-service. Cấu trúc package bên dưới là cấu trúc đề xuất để Agent triển khai Node.js \+ Express.js; không phải business requirement.*

farming-service/  
 ├── src/  
 │   ├── config/  
 │   ├── common/  
 │   ├── modules/  
 │   │   ├── plots/  
 │   │   │   ├── dto/  
 │   │   │   ├── plots.controller.js  
 │   │   │   ├── plots.service.js  
 │   │   │   └── plots.repository.js  
 │   │   ├── crop-seasons/  
 │   │   │   ├── dto/  
 │   │   │   ├── crop-seasons.controller.js  
 │   │   │   ├── crop-seasons.service.js  
 │   │   │   └── crop-seasons.repository.js  
 │   │   ├── farming-logs/  
 │   │   │   ├── dto/  
 │   │   │   ├── farming-logs.controller.js  
 │   │   │   ├── farming-logs.service.js  
 │   │   │   └── farming-logs.repository.js  
 │   │   ├── costs/  
 │   │   │   ├── dto/  
 │   │   │   ├── costs.controller.js  
 │   │   │   ├── costs.service.js  
 │   │   │   └── costs.repository.js  
 │   │   └── reports/  
 │   │   	├── reports.controller.js  
 │   │   	└── reports.service.js  
 │   ├── app.js  
 │   └── server.js  
 ├── tests/  
 ├── .env.example  
 ├── package.json  
 └── README.md

**16\. Coding Convention**  
Backend của Farming là Node.js \+ Express.js.

Frontend không nằm trong repository farming-service; frontend là repository riêng của nhóm.

Flow bắt buộc: Controller → Service → Repository → Database.

Controller: nhận/parse request, validation và trả response; không chứa business logic.

Service: chứa business logic và kiểm tra Business Rules.

Repository: thực hiện truy cập PostgreSQL.

Dependency Injection/module wiring phải được tổ chức nhất quán theo codebase Node.js hiện tại.

API/JSON/DTO dùng camelCase; database dùng snake\_case.

Không truy cập database của service khác.

Ví dụ naming: PlotController, PlotService, PlotRepository; CreatePlotRequest; PlotResponse.

**17\. Git Convention**  
*Git baseline: main chạy được; feat/\<short-name\>,fix/\<short-name\>; PR một người khác review; không force-push main hoặc commit secret. Giữ convention chi tiết repo nếu không mâu thuẫn Contract v2.1 §19.*

Git convention tại Contract v2.1 §19 áp dụng cho Farming theo quyền người dùng giao chốt phương án.

**18\. Environment Configuration**  
*Cấu hình chính thức cho triển khai tại Contract v2.1 §19; giá trị secret lấy từ môi trường.*

SERVER\_PORT=8082; DATABASE\_URL; USER\_SERVICE\_URL; JWT\_PUBLIC\_KEY\_PATH; JWT\_ISSUER=urn:soa:user-service; JWT\_AUDIENCE=soa-api; ACCESS\_STATE\_TIMEOUT\_MS=1000; service key riêng từng caller.

Không commit secret/credential vào Git.

Dùng .env.example không có secret; trong Docker dùng DNS dependency, không localhost; Farming không cần Kafka producer trong MVP.

**19\. Docker / Local Development**  
*Development command giữ npm run dev theo stack hiện có; SERVER\_PORT=8082. Docker giữ cấu hình hiện có, không đổi stack Farming sang Spring chỉ vì User/Notification dùng Spring.*

| Mục | Giá trị |
| :---- | :---- |
| Development command | npm run dev |
| Docker Compose | Compose: farming-service \+ farming-db \+ volume riêng; giữ Node.js/Express. |
| Farming Service port | 8082 |
| PostgreSQL container/config | PostgreSQL: farming\_db, DB user và volume riêng; DATABASE\_URL lấy từ env. |

Port Farming 8082 đã chốt; không thay đổi theo port gợi ý trong tài liệu cũ.

**21\. End-to-End Business Flow**  
*Flow đã chốt cho Farming Service.*

| Bước | Actor/Action | Ý nghĩa |
| :---- | :---- | :---- |
| 1 | FARMER | Actor khởi tạo nghiệp vụ |
| 2 | Tạo Plot | Tạo và quản lý lô đất trồng lúa |
| 3 | Tạo Crop Season | Tạo mùa vụ trên Plot |
| 4 | Ghi Farming Log | Ghi nhật ký hoạt động canh tác |
| 5 | Ghi Cost | Ghi chi phí phát sinh |
| 6 | Hoàn thành Crop Season | Cập nhật mùa vụ sang COMPLETED |
| 7 | Tạo Report | Tạo báo cáo từ dữ liệu mùa vụ |
| 8 | Export PDF | Xuất báo cáo thành file PDF |

**21.1. Liên hệ với các service khác**  
User Service: cung cấp/định danh farmer\_id; không có physical FK xuyên database.

Trading Service: gọi Farming API để lấy dữ liệu phục vụ Listing.

Các service khác: chưa có flow Farming cụ thể được chốt ngoài những nội dung trên.

**23\. AI AGENT DEVELOPMENT RULES**  
BEFORE CODING, THE AGENT MUST STRICTLY OBEY:

| Rule | Nội dung |
| :---- | :---- |
| RULE-001 | Schema Bound: Không tự ý tạo thêm Table hoặc Column ngoài 4 entities đã định nghĩa: plots, crop\_seasons, farming\_logs, costs. |
| RULE-002 | Rice Only: Không thêm logic/entity/field nhằm hỗ trợ cây nông nghiệp khác khi chưa có requirement mới. |
| RULE-003 | Database Isolation: Không truy cập database của User, Trading hoặc service khác trực tiếp. |
| RULE-004 | External Reference: farmer\_id chỉ là logical/soft reference đến User Service; không tạo physical FK xuyên database. |
| RULE-005 | Contract Bound: Không tự thay đổi API Contract. Nếu contract mâu thuẫn giữa các tài liệu, đánh dấu CẦN XÁC NHẬN. |
| RULE-006 | Event Bound: Không tự tạo Event/Topic/Payload cho Farming khi Event Contract chưa được chốt. |
| RULE-007 | State Strictness: Logic Crop Season phải bám status đã chốt: IN\_PROGRESS, COMPLETED. |
| RULE-008 | Layered Logic: Business logic phải nằm ở Service layer; Controller không chứa business logic. |
| RULE-009 | Repository Isolation: Database access chỉ được thực hiện qua Repository/Data Access layer. |
| RULE-010 | No Report Entity: Không tự tạo bảng report. Report/PDF là output được tạo từ dữ liệu Farming hiện có. |
| RULE-011 | No Crop Entity: Không tự tạo bảng crops vì phạm vi hiện tại chỉ quản lý lúa nước và schema đã chốt không có entity này. |
| RULE-012 | No Secrets: Không hard-code credentials hoặc commit file .env chứa secret. |
| RULE-013 | TBD Protection: Bất kỳ requirement chưa chốt phải được đánh dấu CẦN XÁC NHẬN/TBD, không tự suy đoán. |
| RULE-014 | Before Coding: Agent phải đọc tài liệu Farming Service, ERD, API/Event Contract và Business Rules trước khi code. |
| RULE-015 | Conflict Check: Nếu tài liệu Farming và tài liệu service khác mô tả cùng một contract nhưng khác endpoint/payload, dừng phần implementation liên quan và yêu cầu xác nhận. |

Farming Service Specification | Rice Only | Node.js \+ Express.js | PostgreSQL

**Các điểm cần đồng bộ trước khi Agent code**  
Snapshot Trading/Farming giữ URL baseline /api/v1/plots/{plotId}/summary; bỏ URL /api/farming/crops/{id}/profile vì không có entity crops. DTO và scope quyền nội bộ theo §6.18 cập nhật.

Gateway/backend dùng RS256/public key và access-state theo Security Contract đã duyệt; account ACTIVE/ownership, timeout1s và fail closed; Farming port8082.

Farming event riêng: ngoài MVP, không publish; REST snapshot theo Contract v2.1 §7.

Git Convention: áp dụng Contract v2.1 §19.

Environment Configuration: áp dụng port 8082 và env tại §18/Contract v2.1 §19.

Farming port8082 đã chốt; Docker orchestration theo cấu hình project, không mở lại port.

Chỉ những chi tiết chưa được nhóm quyết định mới giữ nhãn xác nhận; cropType/GPS/unit/security/port/pagination áp dụng ngay theo quyết định07/10.

 

# **Luồng tích hợp đã đồng bộ**

FARMER ACTIVE → Gateway JWT/state → Farming ownership → Plot/Crop/Log/Cost/Report/PDF theo API cũ. farmerId là account UUID User, không FK user\_db.

Trading → REST snapshot Farming với cropSeasonId bắt buộc → copy snapshot Listing. crop\_type thuộc crop\_seasons, GPS thuộc Plot, kg/m² và DTO/URL theo Contract v2.1 §7; không query farming\_db.

## **Contract Farming đã chốt 07/10/2026**

Nguồn cập nhật: Conflict đã chốt, Contract chung v2.1 và xulycontract(1).txt; người dùng đã giao quyền lựa chọn phương án và cập nhật trực tiếp. D01–D07 và gói kỹ thuật có hiệu lực theo v2.1. Ưu tiên quyết định mới nhất → Conflict đã chốt → Contract → rule → spec; không dùng đề xuất cũ để mở lại các mục đã đóng.

Schema: crop\_seasons.crop\_type VARCHAR(100), không trắng, bắt buộc khi tạo mùa vụ mới; update không được xóa giống đã khai. Plot latitude trong\[-90,90\], longitude trong\[-180,180\]; GPS thuộc Plot, không đặt GPS trên crop\_seasons. Đơn vị expectedYield/actualYield là kg, area là m². Dữ liệu cũ chưa đủ field phải bổ sung trước khi dùng làm Listing snapshot.

Snapshot GET /api/v1/plots/{plotId}/summary?cropSeasonId={UUID} trả {plotId,farmerId,area,latitude,longitude,currentSeason:{cropSeasonId,cropType,expectedYield}}. Trading service key riêng và Farmer ID đã verify; Farming kiểm season thuộc Plot/owner. Không tự chọn mùa vụ mới nhất. Dữ liệu cũ thiếu cho phép null để backfill thực, không tạo Listing từ snapshot thiếu (409 SNAPSHOT\_INCOMPLETE). Không gán giống/GPS giả hoặc đọc DB chéo.

Danh sách page0, size20, max100, giữ filter hiện có; lỗi cropType/GPS/input400, sai quyền403, Plot không có404, snapshot thiếu dữ liệu không được tạo Listing; error format chung.

Security đã chốt 07/10/2026: User ký RS256, access token 15 phút; iss=urn:soa:user-service, aud=soa-api; sub=accountId UUID, role=FARMER/TRADER/ADMIN, iat/exp/jti. Chỉ User giữ private key; Gateway/backend verify bằng public key, forward Bearer và kiểm ownership. GET /internal/v1/accounts/{accountId}/access-state đọc DB primary, không cache ACTIVE, timeout tổng 1 giây; không kiểm tra được →503 ACCESS\_STATE\_UNAVAILABLE; account không ACTIVE →403 ACCOUNT\_NOT\_ACTIVE. Internal dùng X-Service-Key riêng từng caller, private network/HTTPS khi triển khai, không route public. WebSocket Chat kiểm state trước SEND/SUBSCRIBE và push riêng tư.

## **Chuẩn đối chiếu chung — CONTRACT CHUNG MVP v2.1**

Tab rule chứa toàn văn Contract v2.1, là đầu mối đối chiếu API/event/schema/flow cho nhóm. Service này theo §3,§4,§7,§15–16; cropType/GPS/kg/m² áp dụng, snapshot/backfill kỹ thuật theo baseline v2.1. D01–D07 và gói kỹ thuật v2.1 đã có hiệu lực theo chỉ đạo chọn phương án và thực hiện. Áp dụng thêm §17–19 cho token/CORS/media/Admin; mọi endpoint/event mới phải được triển khai đúng contract, không còn chờ duyệt nghiệp vụ.

Gateway snapshot v2.1: /api/v1/plots/{plotId}/summary là giao tiếp Trading→Farming trực tiếp, service key riêng; Gateway chặn public path này trước wildcard /plots/\*\*. cropSeasonId query bắt buộc; không dùng header client để vượt ownership.

# **Change Log**

§5, §6.18, §7, §13–14, §23: ghi field crop\_type/cropType được duyệt, giữ 4 entity, snapshot, schema/DTO/PATCH/visibility/backfill đã chốt tại v2.1 §7. Nguồn: Conflict 09; Contract 3, 12–13.

§6–9, §14, §17–19: PATCH Log/Cost/visibility, snapshot chọn season/backfill, auth/port/env và Farming không publish event MVP đã chốt. Nguồn: Conflict \+ Contract v2.1 §7/§19.

§4–5, §11, §21: giữ UUID owner, farmerId logical reference; REST/Kafka liên service, không truy cập chéo DB. Nguồn: Conflict 02, 06; Contract 2–3.

Cập nhật baseline v2.1: đóng D01–D07, chuẩn hóa API/event/schema/flow và các mục token/CORS/media/Admin theo phạm vi service. Nguồn: Conflict \+ Contract v2.1 theo chỉ đạo người dùng chọn phương án và thực hiện; nội dung tài liệu không chứng minh code đã triển khai.

# **Open Issues**

Không còn quyết định nghiệp vụ/gói kỹ thuật chờ duyệt trong baseline v2.1. Cấu hình thật (domain, SMTP, seed email, SUPPORT\_EMAIL, secrets), backfill dữ liệu và kiểm thử mã nguồn là việc triển khai theo Contract §19; không ghi chúng là đã hoàn tất. Mở vấn đề mới chỉ khi có thay đổi phạm vi hoặc mâu thuẫn mới được phát hiện.

