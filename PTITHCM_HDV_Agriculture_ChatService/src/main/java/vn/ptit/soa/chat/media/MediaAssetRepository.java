package vn.ptit.soa.chat.media;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class MediaAssetRepository {
    private final MongoTemplate mongo;

    public MediaAssetRepository(MongoTemplate mongo) { this.mongo = mongo; }

    public void insert(MediaAsset asset) { mongo.insert(asset); }

    public Optional<MediaAsset> find(String id, String conversationId) {
        return Optional.ofNullable(mongo.findOne(Query.query(Criteria.where("_id").is(id)
                .and("resource_id").is(conversationId)), MediaAsset.class));
    }

    public boolean attach(String id, String conversationId, String ownerId, Instant now) {
        Query query = Query.query(Criteria.where("_id").is(id).and("resource_id").is(conversationId)
                .and("owner_account_id").is(ownerId).and("attached_at").is(null));
        return mongo.updateFirst(query, new Update().set("attached_at", now), MediaAsset.class)
                .getModifiedCount() == 1;
    }

    public List<MediaAsset> expiredUnattached(Instant cutoff) {
        return mongo.find(Query.query(Criteria.where("attached_at").is(null)
                .and("created_at").lt(cutoff)), MediaAsset.class);
    }

    public boolean deleteIfUnattached(String id) {
        return mongo.remove(Query.query(Criteria.where("_id").is(id)
                .and("attached_at").is(null)), MediaAsset.class).getDeletedCount() == 1;
    }

    public boolean storageKeyExists(String key) {
        return mongo.exists(Query.query(Criteria.where("storage_key").is(key)), MediaAsset.class);
    }
}
