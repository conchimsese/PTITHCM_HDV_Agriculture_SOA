# Farming Service — Microservice Quản lý Canh tác Lúa nước

Dịch vụ độc lập trong kiến trúc Microservices phụ trách lưu trữ, quản lý nghiệp vụ canh tác lúa nước (Rice Only), nhật ký canh tác, chi phí, xuất báo cáo PDF và cung cấp snapshot phục vụ Trading Service.

---

## 1. Công nghệ & Kiến trúc
- **Runtime & Framework:** Node.js (v24+) + Express.js.
- **Cơ sở dữ liệu:** PostgreSQL (Database per Service — `farming_db`).
- **Mô hình phân lớp nghiêm ngặt:** `Controller` $\rightarrow$ `Service` $\rightarrow$ `Repository`.
  - **Controller:** Tiếp nhận HTTP request, parse input, gọi Service và định dạng JSON response theo chuẩn camelCase.
  - **Service:** Xử lý toàn bộ logic nghiệp vụ, quy tắc xác thực, kiểm tra quyền sở hữu (`ownership`) và gọi xác minh trạng thái tài khoản thời gian thực (`access-state`).
  - **Repository:** Thực thi các câu lệnh SQL an toàn (tham số hóa chống SQL Injection) tương tác với PostgreSQL.
- **Bảo mật:**
  - Token JWT ký bằng **RS256** từ User Service (`sub = accountId`, `role = FARMER`, `iss = urn:soa:user-service`, `aud = soa-api`).
  - Kiểm tra trạng thái tài khoản thời gian thực qua `GET /internal/v1/accounts/{accountId}/access-state` (áp dụng chính sách **Fail-Closed**: timeout 1s/lỗi mạng $\rightarrow$ 503; không `ACTIVE` $\rightarrow$ 403).
  - Giao tiếp nội bộ với Trading Service bảo vệ bằng `X-Service-Key`.
- **Nguyên tắc dữ liệu cốt lõi:**
  - **Rice Only:** Chỉ quản lý lúa nước, không có bảng `crops` hay bảng `reports` riêng biệt.
  - **Soft Delete / Data Retention:** Tuyệt đối không dùng `DELETE` SQL; áp dụng cờ `is_visible = false` khi người dùng ẩn dữ liệu.
  - **Soft FK:** `plots.farmer_id` là tham chiếu logic đến User Service, không tạo khóa ngoại vật lý xuyên database.

---

## 2. Cấu trúc thư mục dự án

```
farming-service/
├── assets/
│   └── fonts/                   # Font chữ Unicode tiếng Việt TrueType phục vụ PDFKit
│       ├── Roboto-Regular.ttf
│       └── Roboto-Bold.ttf
├── docs/                        # Tài liệu phân tích và đặc tả hệ thống
│   ├── BA - SOA (7).docx
│   └── farming-spec.md
├── keys/                        # Khóa công khai RSA verify token JWT RS256
│   ├── public.pem
│   └── private.pem
├── src/
│   ├── common/                  # Các thành phần dùng chung
│   │   ├── errors/              # AppError hierarchy chuẩn hóa theo §10
│   │   ├── middlewares/         # auth, access-state, internal-auth, error-handler, validate
│   │   ├── repositories/        # BaseRepository (snakeToCamel, buildUpdateClause)
│   │   └── utils/               # response.util (phân trang chuẩn)
│   ├── config/                  # Quản lý môi trường (env.js) và kết nối PostgreSQL (database.js)
│   ├── database/                # Database migrations & migration runner
│   │   ├── migrations/
│   │   │   └── 001_initial_farming_schema.sql
│   │   └── migrate.js
│   ├── modules/                 # 4 Modules nghiệp vụ cốt lõi
│   │   ├── plots/               # Controller, Service, Repository, DTO Validation, Routes
│   │   ├── crop-seasons/
│   │   ├── farming-logs/
│   │   ├── costs/
│   │   └── reports/             # Báo cáo JSON & xuất PDF
│   ├── app.js                   # Cấu hình Express app
│   ├── routes.js                # Router tổng hợp gắn dưới /api/v1
│   └── server.js                # Entrypoint server (cổng 8082, graceful shutdown)
├── tests/                       # 7 test suites bao phủ đầy đủ nghiệp vụ và bảo mật
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 3. Cài đặt & Khởi chạy

### Yêu cầu môi trường
- Node.js $\ge$ 20 (Khuyến nghị Node.js v24 LTS)
- PostgreSQL $\ge$ 16 (hoặc Docker / Docker Compose)

### Cài đặt dependencies
```bash
npm install
```

### Cấu hình biến môi trường
Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```
Các thông số cấu hình chính trong `.env`:
- `SERVER_PORT=8082` (Port chính thức đã chốt của Farming Service)
- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/farming_db`
- `JWT_PUBLIC_KEY_PATH=keys/public.pem`
- `JWT_ISSUER=urn:soa:user-service`
- `JWT_AUDIENCE=soa-api`
- `USER_SERVICE_URL=http://localhost:8081`
- `ACCESS_STATE_TIMEOUT_MS=1000`
- `TRADING_SERVICE_KEY=trading-farming-internal-secret-key`

### Chạy Database Migration
Khởi tạo 4 bảng (`plots`, `crop_seasons`, `farming_logs`, `costs`) và các index tối ưu:
```bash
npm run migrate
```

### Khởi động Server
- Chế độ phát triển (Hot reload với Nodemon):
  ```bash
  npm run dev
  ```
- Chế độ sản xuất (Production):
  ```bash
  npm start
  ```

---

## 4. Chạy Kiểm thử (Test Suite)
Dự án được trang bị 7 bộ kiểm thử toàn diện, kiểm tra từng module từ Unit, Integration đến Bảo mật:
```bash
npm test
```
*Kết quả hiện tại: 7 test suites vượt qua 100% (58/58 tests).*

---

## 5. Danh mục 18 API Contracts chuẩn hóa

| STT | Phương thức | Đường dẫn API | Mục đích | Caller / Auth |
| :---: | :---: | :--- | :--- | :---: |
| 1 | `POST` | `/api/v1/plots` | Tạo mới thửa ruộng | FARMER (JWT) |
| 2 | `GET` | `/api/v1/plots` | Danh sách thửa ruộng phân trang (`page`, `size`) | FARMER (JWT) |
| 3 | `GET` | `/api/v1/plots/:plotId` | Xem chi tiết thửa ruộng | FARMER (JWT) |
| 4 | `PUT` | `/api/v1/plots/:plotId` | Cập nhật thông tin thửa ruộng | FARMER (JWT) |
| 5 | `PATCH` | `/api/v1/plots/:plotId/visibility` | Ẩn/Hiện thửa ruộng (`isVisible: boolean`) | FARMER (JWT) |
| 6 | `POST` | `/api/v1/plots/:plotId/crop-seasons` | Khởi tạo mùa vụ lúa trên thửa ruộng | FARMER (JWT) |
| 7 | `GET` | `/api/v1/crop-seasons/:cropSeasonId` | Xem chi tiết mùa vụ lúa | FARMER (JWT) |
| 8 | `PUT` | `/api/v1/crop-seasons/:cropSeasonId` | Cập nhật mùa vụ (không được xóa `cropType`) | FARMER (JWT) |
| 9 | `PATCH` | `/api/v1/crop-seasons/:cropSeasonId/complete` | Hoàn thành mùa vụ (cập nhật `actualYield`) | FARMER (JWT) |
| 10 | `POST` | `/api/v1/crop-seasons/:cropSeasonId/logs` | Ghi nhận nhật ký canh tác (6 loại `workType`) | FARMER (JWT) |
| 11 | `PATCH` | `/api/v1/logs/:logId` | Cập nhật nhật ký canh tác (`description: null` để xóa) | FARMER (JWT) |
| 12 | `PATCH` | `/api/v1/logs/:logId/visibility` | Ẩn/Hiện nhật ký canh tác | FARMER (JWT) |
| 13 | `POST` | `/api/v1/crop-seasons/:cropSeasonId/costs` | Ghi nhận chi phí phát sinh | FARMER (JWT) |
| 14 | `PATCH` | `/api/v1/costs/:costId` | Cập nhật chi phí phát sinh | FARMER (JWT) |
| 15 | `PATCH` | `/api/v1/costs/:costId/visibility` | Ẩn/Hiện khoản chi phí | FARMER (JWT) |
| 16 | `GET` | `/api/v1/crop-seasons/:cropSeasonId/report` | Báo cáo tổng hợp mùa vụ (JSON) | FARMER (JWT) |
| 17 | `GET` | `/api/v1/crop-seasons/:cropSeasonId/report/pdf` | Xuất báo cáo lịch sử mùa vụ dạng file PDF | FARMER (JWT) |
| 18 | `GET` | `/api/v1/plots/:plotId/summary` | Cung cấp snapshot thửa ruộng/vụ mùa (`?cropSeasonId=`) | Trading Service (`X-Service-Key`) |

---

## 6. Định dạng lỗi thống nhất (Error Contract §10)
Mọi phản hồi lỗi từ Farming Service đều tuân thủ chặt chẽ định dạng:
```json
{
  "timestamp": "2026-10-30T10:00:00.000Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Chi tiết thông báo lỗi",
  "path": "/api/v1/..."
}
```
Các mã lỗi tiêu chuẩn:
- `VALIDATION_ERROR` (400): Tham số hoặc dữ liệu request không hợp lệ.
- `UNAUTHORIZED` (401): Thiếu token, token hết hạn hoặc sai chữ ký.
- `FORBIDDEN` / `ACCOUNT_NOT_ACTIVE` (403): Sai quyền hạn, không phải chủ sở hữu hoặc tài khoản bị khóa.
- `NOT_FOUND` (404): Tài nguyên yêu cầu không tồn tại.
- `CONFLICT` / `SNAPSHOT_INCOMPLETE` (409): Xung đột trạng thái mùa vụ hoặc snapshot thiếu dữ liệu.
- `INTERNAL_SERVER_ERROR` (500): Lỗi hệ thống nội bộ.
- `SERVICE_UNAVAILABLE` / `ACCESS_STATE_UNAVAILABLE` (503): User Service không phản hồi kiểm tra trạng thái tài khoản.
