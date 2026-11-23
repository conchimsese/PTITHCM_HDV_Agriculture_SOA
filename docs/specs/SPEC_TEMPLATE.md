# SPEC: <Tên tính năng / Thay đổi lớn>

- **Trạng thái:** `DRAFT — CHỜ APPROVE` *(chuyển thành `APPROVED` sau khi người dùng gõ `APPROVE`)*
- **Ngày tạo:** `YYYY-MM-DD`
- **Phạm vi ảnh hưởng:** *(VD: `trading-service-soa`, `api-gateway`, `packages/contracts`, `apps/web`)*

---

## 1. Mục tiêu & Phạm vi nghiệp vụ
- **Bài toán cần giải quyết:** ...
- **Trong phạm vi (In Scope):** ...
- **Ngoài phạm vi (Out of Scope):** ...
- **Vai trò sử dụng:** `FARMER` / `TRADER` / `ADMIN`

---

## 2. Database Schema & Migrations
- **Service & DB sở hữu:** *(VD: `trading-db` / PostgreSQL 16)*
- **Bảng / Cột / Enum mới hoặc chỉnh sửa:**
  ```sql
  -- Mô tả DDL hoặc Prisma/Flyway migration dự kiến
  ```
- **Tính tương thích dữ liệu cũ & Idempotency:** ...

---

## 3. API & Event Contracts
### 3.1. REST / WebSocket Endpoints (qua API Gateway `:8080`)
| Method | Path | Role | Request DTO | Response DTO | Error Codes |
|---|---|---|---|---|---|
| `POST` | `/api/v1/...` | `FARMER` | `{ ... }` | `{ ... }` | `400`, `403`, `409` |

### 3.2. Kafka Events (nếu có)
- **Topic / Event Type:** ...
- **Producer -> Consumer:** ...
- **Payload:**
  ```json
  {}
  ```

### 3.3. Đồng bộ Shared Contracts (`packages/contracts` & `packages/api-client`)
- Zod schemas / TypeScript types cần thêm hoặc sửa: ...

---

## 4. Phân quyền, Bảo mật & Quy tắc nghiệp vụ
- Kiểm tra ownership (`farmerId` / `traderId` / `participantIds`) và RBAC.
- Idempotency key / Concurrency / State transition guards.
- Ràng buộc dữ liệu mô phỏng (nếu liên quan tới cọc / thanh toán thử nghiệm).

---

## 5. Thiết kế UI/UX (V5 + Impeccable)
- **Route mới / thay đổi:** ...
- **Các trạng thái bắt buộc:** `Loading`, `Empty`, `Error` (kèm nút thử lại), `Success`.
- **Desktop (`1280px`) & Mobile (`390px`):** Bố cục, icon `<UiIcon />`, `tabular-nums`, vùng chạm `>= 44px`.

---

## 6. Kế hoạch Kiểm thử (Test Cases)
1. **Unit / Contract Tests:** ...
2. **Backend API / Kafka Integration:** ...
3. **E2E Browser (Desktop & 390px Mobile):** ...
4. **Checks bắt buộc:** `npm run check`, `npm run format:check`, `impeccable detect --json`, `python scripts/sync-ai-config.py --check`.

---

> **Cổng phê duyệt:** Vui lòng kiểm tra bản đặc tả trên. Gõ **`APPROVE`** để xác nhận bắt đầu viết code, hoặc nêu điểm cần điều chỉnh.
