# Git và tiêu chí hoàn thành PR

Giữ main chạy được; mỗi feature là một nhánh, PR có ít nhất một bạn khác review. Không force-push main, không commit secret, node_modules, dist, file ký Android.

Ví dụ từ root repo:

```powershell
git switch main
git pull --ff-only
git switch -c feat/farming-plot-list
cd frontend-standard
npm ci
# code và kiểm tra
npm run check
npm run format:check
npm run export:android
```

Commit rõ nội dung: `feat(farming): add plot list on web and mobile`, `fix(chat): clear room cache on logout`, `docs(frontend): document deposit flow`. Dùng `feat/` và `fix/` nhất quán baseline; repo có develop thực tế thì mở PR vào nhánh tích hợp nhóm thống nhất, không tự tạo thêm tầng nhánh chỉ vì mẫu spec cũ.

## Checklist PR

- [ ] Ghi module, role, API request/response, file shared thay đổi.
- [ ] Có ảnh/chạy thử cả web và native mobile; nếu chỉ một platform phải ghi rõ và có issue nối tiếp.
- [ ] Loading/error/retry/empty/success, disable submit pending, validate field.
- [ ] Role + resource ownership; logout đổi account không lộ cache.
- [ ] DTO khớp backend, tiền string, UUID, không tự sửa status hợp đồng/cọc.
- [ ] Không thêm quyền/UI ngoài contract; phần đề xuất được ghi riêng.
- [ ] Checks pass; native bundle pass nếu sửa mobile/shared; không coi bundle là test trên Android thật.
- [ ] Không commit `.env`, token, DB key, node_modules, dist, APK/signing.
- [ ] README/contract cập nhật khi thay setup/giao tiếp. Lockfile commit cùng dependency.

Mẫu PR ở `templates/PULL_REQUEST.md`. Không merge module có nút bấm giả thông báo “thành công” khi API chưa gọi. Có thể merge skeleton nhưng phải ghi rõ chưa triển khai; hiện chỉ giữ folder và entry point tối thiểu.
