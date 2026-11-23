<!-- Synced by scripts/sync-ai-config.py from .agents/rules/spec-first.md (trigger: always_on). -->
# Quy trình Spec-First & Cổng phê duyệt (`APPROVE`)

Áp dụng cho **tính năng lớn**, **thay đổi schema DB**, **thay đổi API/Event contract giữa các service**, hoặc khi người dùng yêu cầu lập `SPEC.md` trước.

1. **Tạo đặc tả trước khi code:**
   - Sinh hoặc cập nhật `docs/specs/SPEC.md` dựa theo mẫu [SPEC_TEMPLATE.md](../../docs/specs/SPEC_TEMPLATE.md).
   - Trình bày đầy đủ: mục tiêu nghiệp vụ, phạm vi service bị ảnh hưởng, Database schema / migration, API & Kafka event contract, phân quyền RBAC & bảo mật, trạng thái UI (desktop & mobile 390px), và các test case nghiệm thu.
2. **Cổng dừng bắt buộc (`APPROVE`):**
   - Sau khi ghi `docs/specs/SPEC.md`, **DỪNG LẠI** và tóm tắt cho người dùng review.
   - **KHÔNG** chỉnh sửa code ứng dụng, schema hoặc cấu hình service cho tới khi người dùng phản hồi rõ ràng **`APPROVE`** (hoặc xác nhận đồng ý triển khai).
3. **Ngoại lệ (không cần `SPEC.md`, trừ khi người dùng yêu cầu):**
   - Sửa lỗi cục bộ nhỏ (bug fix), chỉnh chữ/copywriting, tinh chỉnh CSS trong một file, hoặc chạy kiểm thử/đồng bộ cấu hình.
