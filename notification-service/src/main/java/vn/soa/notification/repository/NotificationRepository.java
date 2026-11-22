package vn.soa.notification.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.soa.notification.entity.NotificationEntity;
import vn.soa.notification.entity.NotificationStatus;
import vn.soa.notification.entity.NotificationType;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {

    @Query("""
            SELECT n FROM NotificationEntity n
            WHERE n.recipientId = :recipientId
              AND n.createdAt > :cutoff
              AND (:status IS NULL OR n.status = :status)
              AND (:type IS NULL OR n.type = :type)
            """)
    Page<NotificationEntity> findByRecipientAndFilters(
            @Param("recipientId") UUID recipientId,
            @Param("cutoff") Instant cutoff,
            @Param("status") NotificationStatus status,
            @Param("type") NotificationType type,
            Pageable pageable
    );

    @Query("""
            SELECT n FROM NotificationEntity n
            WHERE n.notificationId = :notificationId
              AND n.recipientId = :recipientId
              AND n.createdAt > :cutoff
            """)
    Optional<NotificationEntity> findByIdAndRecipientAndCutoff(
            @Param("notificationId") UUID notificationId,
            @Param("recipientId") UUID recipientId,
            @Param("cutoff") Instant cutoff
    );

    @Query("""
            SELECT COUNT(n) FROM NotificationEntity n
            WHERE n.recipientId = :recipientId
              AND n.status = 'UNREAD'
              AND n.createdAt > :cutoff
            """)
    long countUnreadByRecipientAndCutoff(
            @Param("recipientId") UUID recipientId,
            @Param("cutoff") Instant cutoff
    );

    @Modifying
    @Query("""
            UPDATE NotificationEntity n
            SET n.status = 'READ', n.readAt = :readAt
            WHERE n.notificationId = :notificationId
              AND n.recipientId = :recipientId
              AND n.status = 'UNREAD'
              AND n.createdAt > :cutoff
            """)
    int markAsRead(
            @Param("notificationId") UUID notificationId,
            @Param("recipientId") UUID recipientId,
            @Param("readAt") Instant readAt,
            @Param("cutoff") Instant cutoff
    );

    @Modifying
    @Query("""
            DELETE FROM NotificationEntity n
            WHERE n.createdAt <= :cutoff
            """)
    int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
