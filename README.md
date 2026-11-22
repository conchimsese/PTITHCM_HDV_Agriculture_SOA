# Hệ thống Quản lý & Giao dịch Nông nghiệp (Agriculture SOA)

Hướng dẫn thiết lập, khởi chạy và kiểm thử toàn bộ hệ thống tích hợp gồm **Frontend**, **API Gateway**, **6 Backend Microservices**, **6 Database riêng biệt**, **Kafka** và **Mailpit** trên một máy.

---

## 1. Cấu trúc thư mục

Tất cả các repository đặt ngang hàng trong thư mục `SOA/`:

```text
SOA/
├── PTITHCM_HDV_Agriculture_FE/          # Frontend Web/Mobile + thư mục infra/
│   ├── infra/
│   │   ├── compose.yml                  # Docker Compose tổng (Gateway + 6 BE + 6 DB + Kafka + Mailpit)
│   │   ├── .env                         # Biến môi trường thực tế (không commit)
│   │   ├── .env.example                 # Mẫu biến môi trường
│   │   ├── keys/local-2026-10-18.pem    # Public key cho Chat & Payment
│   │   └── init-sql/trading_init.sql    # Schema khởi tạo cho trading-db
│   └── frontend-standard/               # Mã nguồn FE (Vite + React)
├── api-gateway/                         # Fastify API Gateway (:8080)
├── user-service/                        # User & Auth Service (:8081)
├── farming-service/                     # Farming Service (:8082)
├── trading-service-soa/                 # Trading Service (:8083)
├── PTITHCM_HDV_Agriculture_ChatService/ # Chat Service (:8084)
├── PTITHCM_HDV_Agriculture_PaymentService/ # Payment & Contract Service (:8085)
└── notification-service/                # Notification Service (:8086)
```

---

## 2. Yêu cầu môi trường

- **Docker Desktop** (Docker Engine + Docker Compose v2+) — nhớ **mở Docker Desktop trước khi chạy**.
- **Node.js >= 22.13** và **npm** (để chạy Frontend).
- **Git**.

---

## 3. Chuẩn bị cấu hình (chỉ cần làm 1 lần trên máy mới)

1. **Khóa JWT (RSA):**
   - Đảm bảo có cặp khóa `private.pem` và `public.pem` tại `user-service/secrets/local-auth/`.
   - Đảm bảo có bản sao `public.pem` đặt theo `JWT_KEY_ID` tại `PTITHCM_HDV_Agriculture_FE/infra/keys/local-2026-10-18.pem` (cho Chat & Payment).

2. **File môi trường hạ tầng (`infra/.env`):**
   - Nếu chưa có `PTITHCM_HDV_Agriculture_FE/infra/.env`, copy từ `PTITHCM_HDV_Agriculture_FE/infra/.env.example`:
     ```powershell
     Copy-Item PTITHCM_HDV_Agriculture_FE/infra/.env.example PTITHCM_HDV_Agriculture_FE/infra/.env
     ```
   - Điền mật khẩu DB, các `INTERNAL_*_KEY` (**bắt buộc khác nhau từng service và dài tối thiểu 32 byte**), `OTP_HMAC_SECRET` (>= 32 byte) và `JWT_PUBLIC_KEYS_JSON` (nội dung `public.pem` dạng 1 dòng cho API Gateway).

3. **File môi trường Frontend (`apps/web/.env`):**
   - Tạo `PTITHCM_HDV_Agriculture_FE/frontend-standard/apps/web/.env` (copy từ `.env.example`):
     ```env
     VITE_GATEWAY_URL=http://localhost:8080
     VITE_GOOGLE_CLIENT_ID=
     VITE_GOOGLE_LOGIN_PATH=
     ```

---

## 4. Khởi chạy Backend + API Gateway + Kafka + Database

Đứng tại thư mục `SOA/` và chạy lệnh sau:

```powershell
docker compose -f PTITHCM_HDV_Agriculture_FE/infra/compose.yml --env-file PTITHCM_HDV_Agriculture_FE/infra/.env up -d --build
```

### Kiểm tra trạng thái container & health

```powershell
docker compose -f PTITHCM_HDV_Agriculture_FE/infra/compose.yml --env-file PTITHCM_HDV_Agriculture_FE/infra/.env ps
```

Các endpoint kiểm tra nhanh:
- API Gateway: `GET http://localhost:8080/health`
- User Service: `GET http://localhost:8081/actuator/health`
- Farming Service: `GET http://localhost:8082/health`
- Trading Service: `GET http://localhost:8083/health`
- Chat Service: `GET http://localhost:8084/health`
- Payment Service: `GET http://localhost:8085/health`
- Notification Service: `GET http://localhost:8086/actuator/health`

### Xem log khi cần debug

```powershell
docker compose -f PTITHCM_HDV_Agriculture_FE/infra/compose.yml --env-file PTITHCM_HDV_Agriculture_FE/infra/.env logs -f api-gateway user-service trading-service
```

### Dừng hệ thống

```powershell
# Dừng toàn bộ container (giữ lại dữ liệu DB)
docker compose -f PTITHCM_HDV_Agriculture_FE/infra/compose.yml --env-file PTITHCM_HDV_Agriculture_FE/infra/.env down

# Dừng và xóa toàn bộ volume DB (reset sạch dữ liệu)
docker compose -f PTITHCM_HDV_Agriculture_FE/infra/compose.yml --env-file PTITHCM_HDV_Agriculture_FE/infra/.env down -v
```

---

## 5. Khởi chạy Frontend Web

Mở một terminal mới đứng tại thư mục `SOA/`:

```powershell
cd PTITHCM_HDV_Agriculture_FE/frontend-standard
npm install
npm run dev:web
```

Truy cập giao diện web tại: **http://localhost:5173**

---

## 6. Bảng cổng (Ports) dịch vụ

| Thành phần | Container / App | Host Port | Ghi chú |
|---|---|---|---|
| **Frontend Web** | Vite React | `5173` | http://localhost:5173 |
| **API Gateway** | `api-gateway` | `8080` | Điểm vào duy nhất cho FE / Postman |
| **User Service** | `user-service` | `8081` | Đăng ký, OTP, JWT RS256, Access-State |
| **Farming Service** | `farming-service` | `8082` | Lô đất, Mùa vụ, Nhật ký, Chi phí |
| **Trading Service** | `trading-service` | `8083` | Listing, Offer, Deposit-Commit |
| **Chat Service** | `chat-service` | `8084` | Phòng chat theo `offerId`, WebSocket `/ws/chat` |
| **Payment Service** | `payment-service` | `8085` | Contract, Cọc mô phỏng 5%, Hoàn tất |
| **Notification Service** | `notification-service` | `8086` | Thông báo realtime từ Kafka |
| **Kafka Broker** | `kafka` | `9092` | Nội bộ Docker dùng `kafka:19092` |
| **Mailpit (SMTP Test)** | `user-mail` | `8025` (Web) / `1025` (SMTP) | Xem email OTP tại http://localhost:8025 |
| **User DB** | `user-db` (PostgreSQL 17) | `127.0.0.1:15432` | Tránh trùng cổng `5432` trên Windows |
| **Farming DB** | `farming-db` (PostgreSQL 16) | `127.0.0.1:5433` | Tự chạy SQL migration khi init |
| **Trading DB** | `trading-db` (PostgreSQL 16) | `127.0.0.1:5434` | Tự chạy `infra/init-sql/trading_init.sql` |
| **Payment DB** | `payment-db` (PostgreSQL 17) | `127.0.0.1:5435` | Flyway tự chạy khi start app |
| **Notification DB** | `notification-db` (PostgreSQL 16) | `127.0.0.1:5436` | Flyway tự chạy khi start app |
| **Chat DB** | `chat-db` (MongoDB 8.0 `rs0`) | `127.0.0.1:27018` | Replica set khởi tạo bởi `chat-mongo-init` |

---

## 7. Hướng dẫn kiểm thử nhanh trên FE

1. Mở **http://localhost:5173** → chọn **Đăng ký** tạo 1 tài khoản **Nhà nông (`FARMER`)** và 1 tài khoản **Thương lái (`TRADER`)**.
2. Mở **http://localhost:8025** (Mailpit) để lấy **mã OTP 6 chữ số** và xác minh email cho từng tài khoản.
3. Đăng nhập bằng **email** hoặc **số điện thoại** vừa đăng ký.
4. Thực hiện luồng giao dịch khép kín qua API Gateway (`http://localhost:8080`):
   - **Farmer:** Tạo Lô đất → Tạo Mùa vụ → Tạo Listing (Trading tự lấy dữ liệu giống lúa, sản lượng, diện tích, GPS từ Farming).
   - **Trader:** Gửi Offer cho Listing → Farmer nhận **Notification** (`OFFER_CREATED`), chưa có phòng Chat.
   - **Farmer:** Accept Offer → Hệ thống tự tạo **1 phòng Chat** gắn `offerId` → Hai bên nhắn tin 2 chiều.
   - **Payment:** Trader tạo Contract → Farmer accept Contract → Trader nạp cọc mô phỏng 5% → Contract `ACTIVE`, Cọc `LOCKED`, Listing `LOCKED`.
   - **Hoàn tất:** Trader xác nhận hoàn tất Contract → Contract `COMPLETED`, Listing tự động chuyển `SOLD` qua Kafka.

---

## 8. Khắc phục lỗi thường gặp trên Windows

- **Lỗi `failed to connect to the docker API`:** Mở **Docker Desktop** và đợi engine báo Ready rồi chạy lại `docker compose`.
- **Lỗi `npm ci` thiếu `package-lock.json` ở `trading-service-soa`:** Chạy `npm --prefix trading-service-soa install --package-lock-only` trước khi build Docker.
- **Lỗi `/bin/sh: ./mvnw: not found` khi build Chat/Payment:** Đảm bảo file `mvnw` trong repo dùng line ending `LF` (không phải `CRLF`).
- **Lỗi cổng `5432` bị chặn quyền bind trên Windows:** `user-db` đã được ánh xạ ra `127.0.0.1:15432:5432` trong `compose.yml` (các service trong Docker vẫn gọi `user-db:5432`).
