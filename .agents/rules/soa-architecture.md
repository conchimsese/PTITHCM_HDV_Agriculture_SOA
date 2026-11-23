---
trigger: model_decision
description: Ranh giới microservice, định tuyến API Gateway, sự kiện Kafka, bảo mật JWT/RBAC và đồng bộ contract FE-BE trong Agriculture SOA.
---

# Kiến trúc & Hợp đồng Agriculture SOA

- **Cô lập dữ liệu từng service:** Mỗi microservice sở hữu database riêng (`user-db`, `farming-db`, `trading-db`, `chat-db`, `payment-db`, `notification-db`). Tuyệt đối không truy vấn chéo DB của service khác.
- **Điểm vào duy nhất:** Mọi request từ Web/Mobile đi qua `api-gateway` (`:8080`), bao gồm cả WebSocket `/ws/chat`. Không gọi trực tiếp cổng nội bộ service từ client.
- **Xác thực & phân quyền:**
  - Dùng RS256 JWT do `user-service` cấp, kết hợp kiểm tra `access-state` và `x-service-key` nội bộ.
  - Mọi `INTERNAL_*_KEY`, `SERVICE_KEY_*`, `OTP_HMAC_SECRET` phải riêng biệt theo từng cặp service và dài tối thiểu 32 byte.
- **Đồng bộ contract FE–BE:**
  - Khi thay đổi DTO, enum, route hoặc schema ở backend, phải kiểm tra và cập nhật đồng thời `PTITHCM_HDV_Agriculture_FE/frontend-standard/packages/contracts/` và `packages/api-client/`.
  - Giữ tương thích ngược cho các endpoint nhóm đang dùng; nếu bắt buộc đổi breaking contract, ghi rõ trong `docs/specs/SPEC.md` và kiểm thử lại cả hai đầu.
- **Quy tắc nghiệp vụ & mô phỏng:**
  - Phòng Chat chỉ được tự động tạo qua Kafka sau khi Farmer chấp nhận Offer (`OFFER_ACCEPTED`).
  - Thao tác cọc 5% là **cọc mô phỏng** dùng cho môi trường thử; giao diện phải gắn nhãn rõ ràng **"Cọc mô phỏng (môi trường thử)"**.
