package vn.soa.notification.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.soa.notification.entity.NotificationReceiptEntity;
import vn.soa.notification.entity.NotificationReceiptId;

@Repository
public interface NotificationReceiptRepository extends JpaRepository<NotificationReceiptEntity, NotificationReceiptId> {
    java.util.Optional<NotificationReceiptEntity> findFirstByIdEventId(java.util.UUID eventId);
}
