package vn.ptit.soa.chat.media;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document("media_assets")
public record MediaAsset(@Id String mediaId,
        @Field("owner_account_id") String ownerAccountId,
        @Field("resource_id") String resourceId,
        @Field("storage_key") String storageKey,
        @Field("content_type") String contentType,
        @Field("size_bytes") long sizeBytes,
        String sha256,
        @Field("created_at") Instant createdAt,
        @Field("attached_at") Instant attachedAt) {}
