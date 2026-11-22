# Kế hoạch tích hợp và triển khai sau khi các backend hoàn thành

Ngày lập: 04/11/2026. Đầu vào: người dùng xác nhận các thành viên đã hoàn thành backend của service mình; BA/Contract v2.1, roadmap User và checklist bàn giao hiện tại. Trạng thái này là đầu vào để bắt đầu tích hợp; các kết quả liên service bên dưới cần chạy và ghi bằng chứng.

## 1. Mục tiêu và cách tổ chức

Đưa toàn bộ hệ thống lên một môi trường tích hợp chung, chạy đúng các luồng xuyên service, sau đó triển khai cùng phiên bản đã kiểm chứng lên môi trường demo/staging. Dùng Docker Compose tổng theo BA; giữ DB riêng theo service. Có thể dùng chung máy chủ DB nhưng database/credentials/quyền sở hữu phải tách biệt, không đọc hoặc ghi chéo DB.

Chỉ định một **người điều phối tích hợp** chịu trách nhiệm manifest phiên bản, Compose tổng, lịch kiểm thử và bảng lỗi. Mỗi service có một owner sửa code trong repo của mình. Người điều phối không tự sửa contract của producer để làm consumer chạy qua; hai owner chốt thay đổi cùng fixture/version.

User hiện có baseline168 test và30/30 deployment smoke check local; Phase6/7-local đã push lần lượt ở eefe7a2/3b93430. Đây là bằng chứng của User, không thay thế test với backend thật của các thành viên. Kế hoạch này chưa thực thi hoặc triển khai các repo khác.

## 2. Việc mỗi thành viên bàn giao trước khi ghép hệ thống

Mỗi owner điền một dòng trong bảng bàn giao chung, kèm các tài liệu tương ứng:

| Đầu vào | Nội dung cần cung cấp | Điều kiện đủ |
| --- | --- | --- |
| Phiên bản | Repo, branch, commit SHA, image tag/digest | Build được từ đúng commit; dùng cùng artifact khi lên staging |
| Cách chạy | Dockerfile, port, health/readiness, lệnh test và kết quả | Chạy được với DB mới, không phụ thuộc file riêng trên máy tác giả |
| Cấu hình | Env template, DNS service dependencies, volume, migration/seed | Có tên biến và nơi cấp secret; không gửi secret trong tài liệu/nhóm chat |
| HTTP/WebSocket | API spec hoặc collection, auth/error/status, endpoint nội bộ, WS handshake/destination nếu có | Consumer và producer cùng thống nhất request/response và quyền truy cập |
| Kafka | Topic, event/schema version, key, consumer group, ordering/dedup/retry/DLT | Có fixture xuất từ serializer/producer thật và kết quả consumer đọc được |
| Dữ liệu kiểm thử | Cách tạo identity/domain data, dữ liệu âm, dọn fixture | Tạo qua API/seed của owner; không chèn trực tiếp DB service khác |
| Điểm còn mở | Known issues, contract mismatch, phụ thuộc thiếu, migration không tương thích | Có owner và tiêu chí xử lý rõ trước khi bật chức năng liên quan |

Manifest đề xuất: `service / repo / commit / image digest / config revision / schema version / owner / test evidence`. Tránh dùng tag latest làm định danh bản nghiệm thu. Chốt repo hoặc thư mục tích hợp chung trước khi tạo Compose tổng; không biến compose local của User thành cấu hình production cho toàn nhóm.

## 3. Lịch dự kiến và điều kiện chuyển bước

Ước lượng **5 ngày làm việc** khi mỗi owner có thể hỗ trợ tích hợp hằng ngày và đã có máy đích. D1–D5 tính từ lúc nhận đủ gói bàn giao, không phải cam kết ngày phát hành. Nếu còn lỗi contract hoặc nghiệp vụ, kéo dài bước tương ứng; không bỏ gate để giữ lịch.

| Mốc | Công việc chính | Phụ trách | Đầu ra/điều kiện chuyển bước |
| --- | --- | --- | --- |
| D1 sáng | Thu gói bàn giao, chốt commit và contract; rà fixture Payment reversal2; lập bảng lỗi | Điều phối + tất cả owner | Manifest đủ; mismatch có người xử lý; xác định máy tích hợp/staging |
| D1 chiều | Compose tổng, network/DNS/DB/volume, broker/topic, SMTP test, secrets; build và health | Điều phối + mỗi owner | Một lệnh dựng được stack tích hợp; migrations trên DB mới đạt; service readiness UP |
| D2 | Gateway↔User↔backend; seed/verify hai Admin và Farmer/Trader; User→Trading profile; Trading→Farming snapshot | User, Gateway, Farming, Trading | Auth/state/ownership/private routes đúng; replica và snapshot đọc từ owner thật |
| D3 | Offer→Chat/Notification; Contract/cọc/Listing; Payment→User→Notification | Trading, Chat, Payment, User, Notification | Happy path xuyên service đạt; effects/event receipts đối soát được |
| D4 | Negative/concurrency/retry/replay/outage; ghép frontend nếu đã sẵn sàng | Mỗi cặp owner, điều phối, frontend | Các case bắt buộc ở mục5 đạt; lỗi chặn phát hành được sửa và retest |
| D5 | Deploy staging/demo, real SMTP/Admin, probes/rotation/backup restore; diễn tập demo và bàn giao | Điều phối + vận hành + tất cả owner | Biên bản nghiệm thu môi trường đích, manifest và runbook đủ; quyết định go/no-go |

Có thể làm song song: chuẩn bị hạ tầng và sửa mismatch ở D1; các nhóm User/Trading, Farming/Trading ở D2; frontend phát triển theo contract đã chốt từ D1. Frontend dùng mock cho phần còn chờ nhưng phải test lại với backend thật trước nghiệm thu; backend E2E qua API/WS không cần chờ giao diện hoàn chỉnh.

## 4. Dựng môi trường và thứ tự bật chức năng

1. Tạo stack **integration** riêng với DB/volume/namespace/topic phù hợp; không dùng dữ liệu demo thật hoặc DB cá nhân có giá trị cho test reset. Chốt Kafka partitions/retention/ACL và consumer groups theo contract; group phải tách theo ứng dụng tiêu thụ, không để các service khác nhau vô tình chia nhau một subscription.
2. Dựng DB của từng owner, Kafka và SMTP test. Owner chạy migration/seed đúng phiên bản và xác nhận readiness. Dùng DNS container thay localhost khi các service gọi nhau. Những dependency khác chỉ thêm theo gói bàn giao thực tế.
3. Khởi động User và Gateway, cấu hình public keys cho các backend, cấp service key riêng từng caller. Chỉ User giữ JWT private key. Tạo/verify hai Admin độc lập và ít nhất một Farmer/Trader; thêm người ngoài cuộc để test ownership.
4. Khởi động Farming/Trading/Chat/Payment/Notification; kiểm health và HTTP trực tiếp theo quyền nội bộ trước khi thử toàn luồng qua Gateway. Port BA: Gateway8080, User8081, Farming8082, Trading8083, Chat8084, Payment8085, Notification8086. Trong staging, chỉ Gateway là đầu vào public; DB/broker/backend và health được giới hạn theo mạng vận hành.
5. Kiểm producer fixture bằng consumer thật trước khi bật từng tuyến event. Bật User outbox và Trading profile consumer, chạy bootstrap snapshot khi cần, đối soát replica/version. Bootstrap là job opt-in; tắt lại sau khi kết thúc theo kế hoạch.
6. Bật các tuyến Offer/Chat/Notification và Contract/Deposit theo contract của owner. Bật Payment→User reputation **sau khi fixture xác nhận mọi reversal version2**, key/reference/data hợp lệ và phương án ordering/recovery đã thống nhất. Source phải lưu đủ thời gian nếu producer phát trong khi consumer tắt.
7. Xác nhận Notification nhận đúng người và User gửi mail khóa/mở qua worker riêng. Sau khi integration đạt, deploy cùng image digests lên staging với secrets/SMTP/domain/TLS của môi trường đó; chạy lại smoke và E2E quan trọng trước khi mở demo.

Compose tổng cần lưu network, dependencies, health checks và volume mapping; secret values lấy từ env/secret store được phân quyền. Thêm job CI của mỗi repo để chạy test/build, và job integration chạy trên môi trường biệt lập khi contract hoặc image digest thay đổi. Không dùng CI để tự bật consumer production khi fixture chưa đạt.

## 5. Kịch bản nghiệm thu bắt buộc

| ID | Kịch bản và kỳ vọng | Owner cùng ký kết quả |
| --- | --- | --- |
| INT-01 | Register→OTP→verify→login qua Gateway; protected API của từng backend nhận đúng identity/role. JWT sai issuer/audience/signature/role hoặc hết hạn bị từ chối; refresh/logout đúng contract | User, Gateway, từng backend |
| INT-02 | Không có key/sai key không gọi được access-state; `/internal/**` không route public. Gateway cũng chặn public Farming summary dành cho Trading trước wildcard `/plots/**`. Backend kiểm ownership, không tin header giả identity | Gateway, User, Farming, Trading |
| INT-03 | Sửa profile/avatar và bootstrap tạo đúng Trading replica; chỉ version lớn hơn được áp. Snapshot cũ/duplicate không làm hiện lại profile sau tombstone; payload public không lộ contacts/reputation | User, Trading |
| INT-04 | Farmer tạo plot/crop season hợp lệ rồi tạo Listing; Trading lấy summary qua API owner và lưu snapshot. Trader đọc feed. Sai owner/cropSeasonId thiếu hoặc sai phải bị từ chối theo contract | Farming, Trading, Gateway |
| INT-05 | Trader tạo Offer→Farmer nhận notification; Farmer accept→Chat tạo conversation idempotent theo offerId→Trader nhận notification. Accept Offer chưa khóa Listing hoặc loại các Offer khác; client không giả định conversationId có ngay | Trading, Chat, Notification |
| INT-06 | Hai participant trao đổi, tạo Contract trong Payment, Farmer accept, Trader nạp cọc mô phỏng5%; Payment xác nhận thành công mới cập nhật cọc/Listing LOCKED; Contract hoàn tất→Listing SOLD. Retry/request đồng thời không tạo hai giao dịch thắng hoặc thu/chi lặp | Payment, Trading, Chat, Notification theo event đã có |
| INT-07 | Quyết định phạt/thưởng từ Payment được User áp đúng một lần, kể cả eventId mới/cùng business key. Cùng key khác data phải được phát hiện; reward cap/ceiling ghi actual0 không cộng lại sau. Job thưởng72h thuộc Payment, dùng clock/test fixture được owner hỗ trợ trong môi trường biệt lập | Payment, User |
| INT-08 | Reversal version2 trỏ trực tiếp base version1, đảo actualDelta đã lưu rồi clamp0–10. Double reversal không đảo lại; thiếu gốc giữ retry/recovery. Score>0 chỉ bỏ reputation_lock, chờ Admin mở ACTIVE; giữ admin_lock/INACTIVE/verified guards, không đổi tiền/cọc hoặc đảo reversal | Payment, User |
| INT-09 | Admin lock hoặc score0→JWT cũ bị chặn trên request mới ở Gateway/backend; Chat kiểm state trước SEND/SUBSCRIBE/push riêng tư. Refresh bị thu hồi; User unavailable thì caller fail closed và đáp ứng timeout tổng1s; không cache ACTIVE để vượt lock | User, Gateway, tất cả backend, Chat |
| INT-10 | ACCOUNT_LOCKED/UNLOCKED và REPUTATION_CHANGED tới đúng Notification recipient; duplicate không nhân đôi tác động theo contract. Lock/unlock email do User gửi, phân biệt với thông báo trong ứng dụng; không gửi mail/điểm giả từ Notification | User, Notification |
| INT-11 | Broker down rồi recovery; consumer restart sau DB commit trước ACK; DLT forward lỗi; replay có thứ tự. Không mất record, không áp điểm/cọc hai lần. Theo dõi eventId/business key, source offset, receipt/outbox và trạng thái đích | Mỗi cặp producer/consumer |
| INT-12 | Restart image và restore DB/media trên môi trường đích giữ dữ liệu/quyền; JWT rotation overlap≥16phút được các owner chấp nhận; hai Admin thật và real SMTP hoạt động. Restore đối soát Kafka/outbox trước bật workers | Điều phối, vận hành, các owner liên quan |

Luồng demo tối thiểu: Farmer/Trader đăng nhập → Listing từ dữ liệu Farming → Offer → accept → Chat → Contract → cọc mô phỏng → hoàn tất → Notification; sau đó demo Admin lock, JWT cũ bị chặn và reversal/manual unlock bằng fixture nghiệp vụ do Payment tạo. Không chờ72h thực để test bằng cách sửa thời gian production; tách ca time-based sang test clock/fixture của Payment.

Các luồng dispute/cancel/settlement và tranh chấp nhiều Offer phải dùng đúng D01–D07, status và API đã chốt trong BA. Mỗi owner bổ sung happy/negative path của module mình vào collection chung; không thay đổi quyền/endpoint để rút ngắn demo.

## 6. Ghi bằng chứng và xử lý lỗi

Mỗi case lưu: `caseId / environment / thời điểm / commit-image manifest / fixture revision / correlation-event-business IDs / expected / observed / PASS-FAIL / owner / link log đã lọc`. Evidence gồm phản hồi API/WS và trạng thái nhận ở consumer thật, không chỉ log producer báo đã gửi. Owner tự đối soát DB của mình; không cấp quyền đọc chéo DB để test.

Bảng lỗi chung có mức độ, bước tái hiện, owner, phiên bản sửa và case retest. Lỗi auth/ownership, lộ dữ liệu, sai hoặc nhân đôi cọc/điểm, mất event, sai lock và không restore được là lỗi chặn phát hành. Mỗi ngày dành một buổi ngắn đối soát blocker; chỉ retest tuyến bị ảnh hưởng và bộ regression phù hợp sau sửa.

Khi có lỗi contract: ghi payload/schema khác nhau đã loại secret, hai owner chốt contract và fixture mới, sửa từng repo, build image mới, cập nhật manifest rồi chạy lại case. Không dùng dữ liệu mẫu thủ công khác producer thật để tuyên bố PASS.

## 7. Go/no-go và kế hoạch quay lại

Chỉ chuyển môi trường demo sang bản mới khi: manifest cố định; required API/WS/event cases đạt trên stack thật; không còn lỗi chặn phát hành; schema/secret/volume/probes phù hợp; Payment reversal2 được xác nhận; real SMTP/hai Admin thật đạt; backup restore có thời gian thực đo và các owner ký phần mình.

Trước rollout, lưu manifest/image cũ và backup theo runbook từng service. Rollback image chỉ thực hiện khi schema/config còn tương thích; migration không tương thích cần kế hoạch forward-fix hoặc restore vào môi trường mới. Không sửa Flyway checksum, hạ schema hoặc ghi đè DB đang phục vụ để ép rollback. Với restore, đối soát side effects và offsets liên service trước bật consumer/outbox; không tự reset offset hoặc giả lập đảo tiền/điểm.

Kết thúc bàn giao gồm Compose tổng + env templates, manifest đã nghiệm thu, collection API/WS/E2E, contract fixtures, biên bản kết quả, danh sách known issues được chấp nhận, runbook rollout/backup/recovery và kịch bản demo. Khi User-specific gates trong [deployment-and-handover.md](deployment-and-handover.md) có đủ bằng chứng, cập nhật Phase7 User từ local-only thành hoàn thành.

## 8. Ba việc nên làm ngay

1. Cử một người điều phối và yêu cầu mỗi owner bàn giao gói ở mục2, đặc biệt commit/image và fixture producer thật. Xác định máy tích hợp, máy/URL staging và tình trạng frontend để phân công D1–D5.
2. Chốt contract chung bằng đối chiếu producer/consumer, ưu tiên JWT/access-state, User profile replica, Trading→Farming summary và Payment reversal version2. Đánh dấu từng cặp tương thích hoặc có lỗi cần sửa.
3. Tạo môi trường Docker Compose tổng ở khu vực tích hợp đã thống nhất; chạy INT-01–04 trước, rồi mở rộng sang INT-05–12. Cập nhật kết quả theo từng gate thay vì chờ đến cuối mới ghép toàn hệ thống.
