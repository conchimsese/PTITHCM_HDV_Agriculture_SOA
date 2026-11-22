# Snapshot spec đầy đủ của nhóm

Nguồn: `E:/DocumentPTIT/Nam4Ki1/HuongDichVu/code/docs/specs`, cập nhật 02/11/2026 (Asia/Ho_Chi_Minh). Đủ sáu service + rule + contract chung và hai OpenAPI hiện có. Nội dung snapshot giữ nguyên, hash là SHA-256 byte nguồn trước Git chuẩn hóa newline.

**Bắt đầu bằng [bản bàn giao FE](../../docs/12_BAN_GIAO_FE.md).** Spec là yêu cầu, chưa chứng minh service đã triển khai. User/Farming/Trading/Notification chỉ được đối chiếu spec trong lần này; Chat/Payment được kiểm thêm source Java tại máy, chưa gọi backend live.

Trong prose chung có các từ SEND/SUBSCRIBE mang tính mô tả. Chat thực tế là WebSocket JSON, không có STOMP destination. Xem [giao thức chính xác](../../docs/13_WEBSOCKET_CHAT_JSON.md) và [chênh lệch spec/code](../../docs/09_CONTRACT_VA_CHO_CAN_CHOT.md).

| File | Nguồn | SHA-256 nguồn |
|---|---|---|
| [01-trading-service.md](01-trading-service.md) | `code/docs/specs/01-trading-service.md` | `4dc5f1ef6c00445edcdbcf477a2fb532afc4c73c4f1ab3cc5b8473f7a72fc5e5` |
| [02-farming-service.md](02-farming-service.md) | `code/docs/specs/02-farming-service.md` | `ff1bf9d3b4a55dec05bb8a52df561504731429a98cdc1bbe9b7e217e8175fd40` |
| [03-notification-service.md](03-notification-service.md) | `code/docs/specs/03-notification-service.md` | `6b63388371cf37f4289532bc0ead324d98f57f6e1d75ebd9f3f6277e272374aa` |
| [04-users-service.md](04-users-service.md) | `code/docs/specs/04-users-service.md` | `a8846322edcf82f836b434237f79ca287e15fa96558121b9bba862a4c993d06f` |
| [05-chat-service.md](05-chat-service.md) | `code/docs/specs/05-chat-service.md` | `8c5484f2718c0ea41b6dc2ac63b491fbba735572f164c282be718aeb79e1207e` |
| [06-payment-service.md](06-payment-service.md) | `code/docs/specs/06-payment-service.md` | `3a337ecc1de626d3e80a614edc770f65e29f2e1b3ea762d3b5d489c4cb2acd91` |
| [07-rule.md](07-rule.md) | `code/docs/specs/07-rule.md` | `836cec5975249c20bae242540257e1788c82d3acd863f404bbd475472e576f74` |
| [08-contract-chung.md](08-contract-chung.md) | `code/docs/specs/08-contract-chung.md` | `e09a2d6e2d4676fdefca09c272af0b4b444d79ff067a34ff83c1ac7baf521923` |
| [openapi-chat.yaml](openapi-chat.yaml) | `code/docs/specs/openapi-chat.yaml` | `7ecc729d1a666c2322bcaf0f64fd3704aa9b202403e3281f849c76fd8e54e625` |
| [openapi-payment.yaml](openapi-payment.yaml) | `code/docs/specs/openapi-payment.yaml` | `d7e59c8c6836a1cd09990d5b456cba7fb8e1404147b9f6bc635b54c475e050b1` |
