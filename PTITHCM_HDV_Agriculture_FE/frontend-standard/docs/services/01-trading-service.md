# Trading — Listing và Offer

Quyền: Farmer tạo Listing/xem Offer của bài mình/accept; Trader gửi Offer; Feed hiện TRADER/ADMIN. Chưa tự mở quyền Farmer đọc Feed công khai. `expectedPrice`/`price` là decimal string VND nhưng đơn vị kinh tế và radius request cần owner xác nhận; `distanceKm` response không chứng minh request radius dùng km.

| Method/path                         | Request                                     | Kết quả/chú ý                                                                       |
| ----------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| GET /api/v1/listings/feed           | lat,lng,radius,page,size                    | page items; seedType,plotLat,plotLng,distanceKm,farmer; không tự gán ảnh/giá/status |
| POST /api/v1/listings               | plotId,cropSeasonId,expectedPrice           | 201 Listing OPEN, snapshot do backend lấy từ Farming                                |
| POST /api/v1/offers                 | listingId,price,maxDeductionPercent,message | 201 offerId/status PENDING, chưa có conversationId                                  |
| GET /api/v1/listings/{id}/offers    | owner theo matrix quyền                     | route được nhắc trong spec nhưng chưa đủ DTO/pagination; phải xác nhận              |
| PUT /api/v1/offers/{offerId}/accept | Farmer owner; body cần xác nhận             | OFFER_ACCEPTED mở Chat qua Kafka, chưa khóa Listing                                 |

Màn cần làm: MyListings/CreateListing/ListingDetail, Marketplace, CreateOffer/MyOffers/ListingOffers. Chưa có contract đủ cho mọi API list/detail MyListings/MyOffers; không đoán endpoint chỉ vì mẫu UI có tab. 409 SNAPSHOT_INCOMPLETE cần Farmer bổ sung dữ liệu Farming. Không gọi summary Farming từ FE để thay backend snapshot.

Accept được nhiều Offer; chỉ một giao dịch thắng khi cọc thành công. Giữ lịch sử các Offer/phòng khác. Ảnh/caption Listing, lọc giống/giá/từ khóa chưa được baseline duyệt.

## Nguồn và chi tiết request/response

[Spec đầy đủ](../../reference/contracts/01-trading-service.md). Phần bên dưới trích mục 6–7 từ spec, không phải tuyên bố API đã chạy. Nếu khác source Chat/Payment, dùng ghi chú đối chiếu bên trên và docs/09, không tự bỏ yêu cầu nghiệp vụ.

<details>
<summary>Xem contract và ví dụ gốc</summary>

```text
6. API Contract
GET Listing Feed (Dành cho Trader lướt sóng GPS)
●      Method: GET
●      Endpoint: /api/v1/listings/feed
●      Authentication: JWT hợp lệ, account ACTIVE; POST Offer: TRADER; GET Feed: TRADER/ADMIN theo quyền cũ
●      Owner: Trading Service | Consumer: Mobile App / Web App
●      Request Query: lat, lng, radius và page=0, size=20, max100; giữ filter GPS hiện có. Không bổ sung sort/filter nghiệp vụ khác khi chưa duyệt.
●      Response (200 OK):
JSON
{
  "items": [
  {
      "listingId": "44444444-4444-4444-8444-444444444444",
      "seedType": "ST25",
      "plotLat": 10.125,
      "plotLng": 106.450,
      "distanceKm": 2.5,
      "farmer": {
        "farmerId": "11111111-1111-4111-8111-111111111111",
        "fullName": "Nguyễn Văn A"

    }
  }
  ], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1
}

POST Create Offer — TRADER ACTIVE; depositAmount khởi tạo0 bởi backend, không nhận field depositAmount làm bằng chứng nạp cọc. Cọc mô phỏng5% tính từ Contract đã accept do Payment xác nhận.
●      Method: POST
●      Endpoint: /api/v1/offers
●      Authentication: JWT hợp lệ, account ACTIVE; POST Offer: TRADER; GET Feed: TRADER/ADMIN theo quyền cũ
●      Owner: Trading Service | Consumer: Mobile App / Web App
●      Request Body:
JSON
{
  "listingId": "44444444-4444-4444-8444-444444444444",
  "price": "8500.00",

  "maxDeductionPercent": 2,
  "message": "Chốt nhé anh trai"
}

●      Response (201 Created):
JSON
{
  "offerId": "33333333-3333-4333-8333-333333333333",
  "status": "PENDING"

}

Tạo Listing từ mùa vụ cụ thể — v2.1
Trading tạo Listing: POST /api/v1/listings, FARMER ACTIVE; request {plotId,cropSeasonId,expectedPrice} với UUID và expectedPrice là decimal string VND dương. farmerId lấy từ sub, không nhận snapshot/owner do client tự khai. Trading gọi Farming summary với cropSeasonId, kiểm farmerId và giữ crop_season_id/seed_type/estimated_yield/area/GPS snapshot theo field mapping hiện có. Response201 {listingId,farmerId,plotId,cropSeasonId,seedType,estimatedYield,area,latitude,longitude,expectedPrice,status:"OPEN"}; 400 validation,403 owner/role,409 SNAPSHOT_INCOMPLETE,503 dependency. Listing schema bổ sung crop_season_id logical ref; không FK cross-service.
6.1. Internal deposit-commit — baseline v2.1
ID thống nhất: depositId = paymentId = paymentTrackingId = payment_tracking.payment_tracking_id trong MVP vì chỉ có một tracking/cọc cho mỗi Contract, chưa có entity giao dịch gateway riêng. Đây là các alias DTO của cùng UUID, không tạo ba bản ghi/ID. ContractId là ID khác. API cọc hiện nhận {contractId} vẫn giữ tên/path đó, không đổi nghĩa âm thầm.
Payment chỉ gọi Trading bằng service key riêng; Trading derive listingId từ offerId, kiểm Offer ACCEPTED, đúng participant và Contract. Không nhận listingId do client khai làm nguồn sự thật.
API thống nhất: POST /internal/v1/offers/{offerId}/deposit-commit • Request: {contractId,paymentTrackingId,depositAmount,currency}; Idempotency-Key=paymentTrackingId • Response và idempotency: 200 {offerId,listingId,contractId,paymentTrackingId,listingStatus:"LOCKED"}; cùng key/body trả kết quả đã ghi; key khác đã thắng Listing→409 LISTING_ALREADY_COMMITTED
API thống nhất: GET /internal/v1/offers/{offerId}/deposit-commit • Request: Query contractId,paymentTrackingId • Response và idempotency: 200 kết quả chốt;404 chưa có;403 caller không được phép
Recovery: Payment tạo tracking cùng ý định nạp bền vững trước REST; một attempt dùng cùng trackingId. Trading khóa row Listing và lưu winningContractId/winningPaymentTrackingId trong cùng transaction LOCKED. Nếu response mất hoặc Payment crash sau Trading commit, recovery đọc kết quả và hoàn tất tracking/Contract; retry không tạo attempt mới. Chưa biết kết quả trả503, không trả nạp thành công và không tự thả Listing cho người khác. Nếu Trading trả409 đã có winner khác, tracking vẫn PENDING và không ghi paidAt/DEPOSIT_PAID. Không có API thả claim trong MVP; recovery luôn hoàn tất cùng tracking đã thắng. Khi dependency lỗi, giữ trạng thái đang đối soát và retry cùng key; không cho một giao dịch thứ hai thắng.
Trading consume DEPOSIT_PAID để cập nhật depositAmount nhưng không dùng event này để tranh quyền thắng. Trading consume CONTRACT_STATUS_CHANGED, chỉ COMPLETED của winningContractId mới chuyển SOLD; event muộn/version cũ không rollback state.
7. API Contract Matrix
From
To
Method
Endpoint
Purpose
Sync/Async
Trading
Farming
GET
/api/v1/plots/{plotId}/summary — URL baseline giữ; xác thực service key và quyền truy cập theo snapshot contract
Kéo snapshot data (seed, yield, lat, lng) lúc Nông dân tạo Listing.
Sync
Payment (module Contract)
Trading
GET
/api/v1/offers/{id}
Lấy Offer/participant/giá hiện tại từ Trading để tạo Contract; không đọc trading_db.
Sync
Gateway
Trading
POST
/api/v1/offers
Trader gửi Báo giá mới.
Sync
```

</details>
