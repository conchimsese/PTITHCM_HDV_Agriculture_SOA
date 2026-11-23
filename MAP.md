# MAP.md — Bản đồ Kiến trúc Agriculture SOA (Ruộng Lúa Việt)

## 1. Cấu trúc tổng thể
```text
PTITHCM_HDV_Agriculture_SOA/
├── .agents/rules/                     # Nguồn chân lý quy tắc AI (Antigravity)
├── .claude/rules/                     # Bản đồng bộ cho Claude Code (sinh tự động)
├── docs/specs/                        # Đặc tả tính năng (SPEC_TEMPLATE.md, SPEC.md)
├── scripts/sync-ai-config.py          # Đồng bộ AGENTS.md, CLAUDE.md, .claude/rules/
├── AGENTS.md / CLAUDE.md / MAP.md     # Playbook & bản đồ dự án
├── api-gateway/                       # Fastify API Gateway (:8080)
├── user-service/                      # Spring Boot Auth, OTP, JWT RS256, Admin (:8081)
├── farming-service/                   # Node/Express Lô đất, Mùa vụ, Nhật ký, Chi phí (:8082)
├── trading-service-soa/               # Node/TS/Prisma Listing, Offer, GPS, Media (:8083)
├── PTITHCM_HDV_Agriculture_ChatService/    # Spring Boot + MongoDB Chat + WS (:8084)
├── PTITHCM_HDV_Agriculture_PaymentService/ # Spring Boot Hợp đồng, Cọc mô phỏng, Tranh chấp (:8085)
├── notification-service/              # Spring Boot Kafka Consumer thông báo (:8086)
└── PTITHCM_HDV_Agriculture_FE/
    ├── infra/                         # compose.yml, .env.example, init-sql/, seed-local-*.ps1
    ├── ui-reference-v5/               # Tài liệu tham khảo thiết kế HTML/CSS V5 (không đưa vào app)
    └── frontend-standard/             # Monorepo Frontend (Vite React Web + Expo Mobile)
        ├── DESIGN.md                  # Hệ thống thiết kế V5 + Impeccable
        ├── apps/web/                  # Web React (:5173)
        ├── apps/mobile/               # Expo Router Android/iOS
        └── packages/
            ├── contracts/             # Zod schemas & domain enums dùng chung
            ├── api-client/            # HTTP client, in-memory token store & adapters
            └── design-tokens/         # Design tokens
```

## 2. Dịch vụ, Cổng & Hạ tầng (`infra/compose.yml`)
| Thành phần | Host Port | Database / Hạ tầng | Ghi chú chính |
|---|---|---|---|
| **Web Frontend** | `5173` | — | Vite + React (`VITE_GATEWAY_URL=http://localhost:8080`) |
| **API Gateway** | `8080` | — | Điểm vào duy nhất REST + WS `/ws/chat`, verify RS256 JWT |
| **User Service** | `8081` | `user-db` (`127.0.0.1:15432`) | Đăng ký, OTP qua Mailpit, JWT RS256, `/admin/accounts` |
| **Farming Service** | `8082` | `farming-db` (`127.0.0.1:5433`) | Plots (`area` theo `m²`), CropSeasons, Logs, Costs |
| **Trading Service** | `8083` | `trading-db` (`127.0.0.1:5434`) | Listings, upload/media ảnh, Offers, GPS Haversine |
| **Chat Service** | `8084` | `chat-db` (`127.0.0.1:27018`) | MongoDB `rs0`, tạo phòng khi `OFFER_ACCEPTED`, `/ws/chat` |
| **Payment Service** | `8085` | `payment-db` (`127.0.0.1:5435`) | Contract, Cọc mô phỏng 5%, Dispute & Admin decision |
| **Notification Service** | `8086` | `notification-db` (`127.0.0.1:5436`) | Tiêu thụ Kafka events, unread count & mark-read |
| **Kafka & Mailpit** | `9092` / `8025` | `kafka:19092`, SMTP `:1025` | Event bus & giao diện xem email OTP (`http://localhost:8025`) |

## 3. Routes chính của Frontend Web (`apps/web/src/app/App.tsx`)
- **Công khai:** `/dang-nhap`, `/dang-ky`, `/xac-minh-email` (có hộp Demo trình duyệt tách biệt ở chế độ `DEV`).
- **Chung mọi vai trò:** `/` (Dashboard theo vai trò), `/thong-bao`, `/tai-khoan`, `/nguoi-dung/:accountId`, `/bai-dang/:listingId`.
- **Nông dân (`FARMER`):** `/ruong-vu`, `/nhat-ky`, `/chi-phi`, `/bai-dang`, `/bai-dang/tao-moi`, `/bai-dang/:listingId/bao-gia`, `/bao-gia`, `/chat/*`, `/payments/*`.
- **Thương lái (`TRADER`):** `/thi-truong`, `/bao-gia`, `/chat/*`, `/payments/*`.
- **Quản trị (`ADMIN`):** `/thi-truong`, `/quan-ly-tai-khoan`, `/payments` (hàng đợi & xử lý tranh chấp), `/thong-bao`.

## 4. Lệnh vận hành & kiểm thử nhanh
```powershell
# Khởi chạy backend + DB + Kafka + Mailpit
docker compose -f PTITHCM_HDV_Agriculture_FE/infra/compose.yml --env-file PTITHCM_HDV_Agriculture_FE/infra/.env up -d --build

# Seed tài khoản & dữ liệu mẫu qua Gateway thật
.\PTITHCM_HDV_Agriculture_FE\infra\seed-local-demo.ps1 -Password "LocalPass!234"

# Khởi chạy Frontend Web (:5173)
cd PTITHCM_HDV_Agriculture_FE/frontend-standard; npm run dev:web

# Kiểm tra chất lượng Frontend & AI config
cd PTITHCM_HDV_Agriculture_FE/frontend-standard; npm run check; npm run format:check
python scripts/sync-ai-config.py --check
```
