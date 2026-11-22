# Kiểm thử và bàn giao

Hiện chỉ có test API client/contract: npm run check chạy typecheck/lint, 19 test và build web. npm run format:check kiểm style; npm run export:android kiểm native bundle. Không còn test:web/Playwright hay browser test demo. CI chạy ba nhóm lệnh trên. Bundle không thay kiểm thiết bị.

## Checklist khi nhóm có UI thật

| Module       | Kịch bản cần kiểm                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Auth         | register/OTP/SMTP failure, login ACTIVE, 401 refresh single-flight, 429 Retry-After, logout/cache/socket                 |
| Farming      | Plot chưa Season, đổi Plot reset Season, visibility, PATCH field vắng/null, date-only, report/PDF                        |
| Trading      | Feed GPS/page, owner/role, Offer tạo chưa Chat, accept nhiều, một winner sau cọc, 409/503                                |
| Chat         | JSON CONNECT/join/send/read, expired/LOCKED, image upload/private read, reconnect/dedup, badge riêng                     |
| Payment      | CREATED/accept/pay/complete/release, contractId trong URL cọc, dispute hold, version/idempotency, terminal không chi lại |
| Admin        | assignment độc lập, evidence, 48h không tự phạt, reversal đúng quyền, khóa không reset điểm                              |
| Notification | own account/cutoff90 ngày, read lặp, reference route, không read-all/Chat badge lẫn                                      |
| Platform     | web focus/zoom, native keyboard/back/safe-area/font scaling, LAN/emulator HTTPS/WS                                       |

Lần rà soát tài liệu kiểm source/spec, không gọi Gateway/SMTP/DB và không có tài khoản thật. Runtime tests của owner BE cần được bàn giao riêng. Kết quả kiểm khung ghi tại VERIFICATION.md, không đánh dấu luồng nghiệp vụ pass chỉ vì đã có file spec.
