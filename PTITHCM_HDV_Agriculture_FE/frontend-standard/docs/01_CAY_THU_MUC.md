# Cây thư mục hiện tại

```text
repo/
├── README.md
├── ui-reference-v5/                 # mẫu thiết kế HTML/CSS/JS để tham khảo
├── .github/workflows/              # CI
└── frontend-standard/
    ├── apps/
    │   ├── web/src/
    │   │   ├── main.tsx
    │   │   ├── app/App.tsx          # providers, nhóm thêm router/UI thật tại đây
    │   │   ├── features/            # users,farming,trading,chat,payments,notifications,admin
    │   │   │   └── <module>/        # pages/,components/,hooks/ hiện giữ folder trống
    │   │   └── shared/             # api/runtime.ts,config/env.ts,ui/,hooks/,layouts/
    │   └── mobile/src/
    │       ├── app/                # chỉ file route Expo Router
    │       │   ├── _layout.tsx      # providers + native stack
    │       │   └── index.tsx       # entry màn hình trống
    │       ├── features/
    │       │   └── <module>/        # screens/,components/,hooks/ giữ folder trống
    │       └── shared/             # api/config + ui/hooks/layouts trống
    ├── packages/
    │   ├── contracts/src/          # auth,common,trading,payments,modules
    │   ├── api-client/src/         # http,session,auth,trading,mock fixture/tests
    │   └── design-tokens/src/      # token TS không phụ thuộc DOM/native
    ├── docs/                       # hướng dẫn + docs/services cho sáu service
    ├── reference/contracts/        # snapshot spec 01–08 và OpenAPI
    ├── reference/observed-backend/ # source controller/WS để đối chiếu, không build
    ├── templates/                  # task/PR mẫu
    └── package.json, package-lock.json, tsconfig.base.json, config lint/test/format
```

## Đặt file mới

- Web: features/farming/pages/PlotListPage.tsx; native: features/farming/screens/PlotListScreen.tsx.
- Component: features/farming/components/PlotCard.tsx riêng mỗi nền tảng.
- Hook: features/farming/hooks/usePlots.ts; cache có accountId/filter/params.
- DTO: packages/contracts/src/farming.ts; API: packages/api-client/src/farming.ts; export qua index.ts.
- Shared UI không biết nghiệp vụ; appRegistry/menu/route chưa có, nhóm triển khai khi thêm màn thật.
- Contract/Deposit/Dispute thuộc payments; admin FE dùng User/Payment API, không có backend Admin riêng.

Hướng phụ thuộc: app → page/screen → feature hook/component → api-client → contracts. Hai app không import UI của nhau, packages không import app/env VITE/EXPO. Không tạo sáu app FE để tương ứng sáu backend service. Chỉ một Gateway cho hai client.
