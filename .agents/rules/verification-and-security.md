---
trigger: always_on
---

# Bảo mật, Git Hygiene & Kiểm chứng Thực tế

- **Bí mật & cấu hình cục bộ:** Tuyệt đối không commit `.env`, `.env.*`, `**/secrets/`, `**/keys/`, `*.pem`, `*.key` hoặc mật khẩu thật vào Git. Chỉ commit file mẫu `.env.example` và script nhận tham số như `-Password`.
- **Line ending trên Windows:** Giữ nguyên `LF` (không đổi sang `CRLF`) cho các script shell và Maven wrapper (`mvnw`).
- **Đồng bộ quy tắc AI đa nền tảng:** Sau khi thêm, sửa hoặc xóa file trong `.agents/rules/`, `AGENTS.md` hoặc `MAP.md`, chạy `python scripts/sync-ai-config.py` để đồng bộ `AGENTS.md`, `CLAUDE.md` và `.claude/rules/`.
- **Kiểm chứng trước khi báo xong:**
  - Chạy `python scripts/sync-ai-config.py --check`.
  - Chạy các lệnh kiểm tra liên quan (`npm run check`, `npm run format:check`, unit/integration test backend hoặc smoke test qua `http://localhost:8080` khi sửa code).
  - Chỉ báo đạt đối với những kiểm thử thực sự đã chạy sau lần sửa cuối cùng; nêu rõ phạm vi chưa chạy hoặc dịch vụ ngoài bị thiếu nếu có.
