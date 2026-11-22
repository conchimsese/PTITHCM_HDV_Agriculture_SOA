# Chạy và cấu hình web/mobile

Node 22.13+ (khuyến nghị Node24), npm theo lockfile root. Từ frontend-standard chạy npm ci; không cài riêng từng app.

| Lệnh                   | Kết quả                                                  |
| ---------------------- | -------------------------------------------------------- |
| npm run dev:web        | Vite localhost:5173, màn hình trống để thêm UI           |
| npm run dev:mobile     | Metro, mở Expo Go tương thích SDK hoặc development build |
| npm run dev:android    | mở Android Emulator đã cài/chạy                          |
| npm run build:web      | apps/web/dist                                            |
| npm run export:android | bundle JS/Hermes, không phải APK                         |
| npm run check          | typecheck/lint/test API/build web                        |
| npm run format:check   | format                                                   |

## Gateway

Copy .env.example thành .env trong từng app, restart dev server:

- Web: VITE_GATEWAY_URL=http://localhost:8080.
- Android Emulator: EXPO_PUBLIC_GATEWAY_URL=http://10.0.2.2:8080.
- Máy thật: EXPO_PUBLIC_GATEWAY_URL=http://<IPv4-LAN-máy-backend>:8080, cùng mạng và Gateway bind/firewall cho phép.
- Deploy: Gateway HTTPS thực tế, socket WSS; web có thể cùng origin với /api/v1.

Không còn VITE_DATA_SOURCE/EXPO_PUBLIC_DATA_SOURCE hay switch mock/API ở runtime. Không có login UI sẵn. API errors không fallback dữ liệu giả. Mock trong package chỉ là fixture cho test API, không tự hiển thị.

Web cần CORS đúng localhost:5173, credentials=false. Native không dùng CORS trình duyệt nhưng WS origin/Upgrade và auth vẫn phải đúng. Điện thoại localhost trỏ chính điện thoại. Expo tunnel chỉ dẫn Metro, không tự publish Gateway. Đọc docs/06 và docs/13.

VITE_* và EXPO_PUBLIC_* là public bundle variables; không đặt service key, DB password, JWT private key hoặc credentials test. Không commit .env. Tài khoản ACTIVE do backend owner cấp ngoài Git.

## Dependency và native build

Cài web bằng npm install <package> -w @agri/web. Native module dùng npx expo install <package> tại apps/mobile để khớp SDK. Giữ một root package-lock. Kiểm npx expo install --check và npx expo-doctor tại mobile khi đổi dependency. Expo Router typedRoutes đang tắt do vấn đề resolution khi dev trong workspace; route vẫn hoạt động, không tự bật lại khi chưa kiểm.

APK: apps/mobile/eas.json có preview profile; người phụ trách cấu hình Expo/EAS account và signing rồi dùng npx eas-cli build --platform android --profile preview. Chưa có APK/signing trong repo, không coi bundle export là app đã chạy trên thiết bị. Android có thể demo trên Windows; native iOS local cần macOS/Xcode.
