package vn.soa.notification.template;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
import vn.soa.notification.entity.NotificationType;
import vn.soa.notification.event.EventEnvelope;

@Component
public class NotificationTemplateEngine {

    public NotificationTemplateResult render(NotificationType type, EventEnvelope envelope) {
        JsonNode data = envelope.data();

        return switch (type) {
            case OFFER_CREATED -> NotificationTemplateResult.of(
                    "Có offer mới",
                    "Bạn nhận được một offer mới cho bài đăng của mình."
            );

            case OFFER_ACCEPTED -> NotificationTemplateResult.of(
                    "Offer đã được chấp nhận",
                    "Offer của bạn đã được chấp nhận. Cuộc trò chuyện đã được tạo."
            );

            case MESSAGE_CREATED -> NotificationTemplateResult.of(
                    "Bạn có tin nhắn mới",
                    "Bạn vừa nhận được một tin nhắn mới trong cuộc trò chuyện."
            );

            case CONTRACT_CREATED -> NotificationTemplateResult.of(
                    "Hợp đồng mới được tạo",
                    "Hợp đồng giao thương mới đã được tạo và đang chờ xác nhận."
            );

            case CONTRACT_STATUS_CHANGED -> {
                String status = (data != null && data.hasNonNull("status"))
                        ? data.get("status").asText()
                        : "mới";
                yield NotificationTemplateResult.of(
                        "Trạng thái hợp đồng thay đổi",
                        "Hợp đồng đã chuyển sang trạng thái: " + status + "."
                );
            }

            case DEPOSIT_PAID -> {
                String amount = (data != null && data.hasNonNull("amount"))
                        ? data.get("amount").asText()
                        : "cọc";
                yield NotificationTemplateResult.of(
                        "Tiền cọc đã được xác nhận",
                        "Khoản tiền cọc (" + amount + ") đã được thanh toán và xác nhận thành công."
                );
            }

            case DEPOSIT_STATUS_CHANGED -> {
                String status = (data != null && data.hasNonNull("status"))
                        ? data.get("status").asText()
                        : "";
                // Requirement: DEPOSIT_STATUS_CHANGED sang LOCKED không tạo notification (chỉ persist receipt)
                if ("LOCKED".equalsIgnoreCase(status)) {
                    yield NotificationTemplateResult.suppress();
                }
                yield NotificationTemplateResult.of(
                        "Trạng thái tiền cọc thay đổi",
                        "Tiền cọc đã chuyển sang trạng thái: " + status + "."
                );
            }

            case REPUTATION_CHANGED -> {
                String beforeScore = (data != null && data.hasNonNull("beforeScore"))
                        ? data.get("beforeScore").asText()
                        : "0";
                String afterScore = (data != null && data.hasNonNull("afterScore"))
                        ? data.get("afterScore").asText()
                        : "0";
                String reasonCode = (data != null && data.hasNonNull("reasonCode"))
                        ? data.get("reasonCode").asText()
                        : "Hệ thống";
                yield NotificationTemplateResult.of(
                        "Điểm uy tín đã thay đổi",
                        "Điểm uy tín của bạn thay đổi từ " + beforeScore + " thành " + afterScore + ". Lý do: " + reasonCode + "."
                );
            }

            case ACCOUNT_LOCKED -> NotificationTemplateResult.of(
                    "Tài khoản đã bị khóa",
                    "Tài khoản của bạn đã bị khóa. Vui lòng kiểm tra email để biết cách liên hệ hỗ trợ."
            );

            case ACCOUNT_UNLOCKED -> NotificationTemplateResult.of(
                    "Tài khoản đã được mở khóa",
                    "Tài khoản của bạn đã được mở khóa. Bạn có thể đăng nhập lại."
            );
        };
    }
}
