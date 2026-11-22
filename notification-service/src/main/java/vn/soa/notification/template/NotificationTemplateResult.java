package vn.soa.notification.template;

public record NotificationTemplateResult(
        String title,
        String content,
        boolean suppressNotification
) {
    public static NotificationTemplateResult of(String title, String content) {
        return new NotificationTemplateResult(title, content, false);
    }

    public static NotificationTemplateResult suppress() {
        return new NotificationTemplateResult("", "", true);
    }
}
