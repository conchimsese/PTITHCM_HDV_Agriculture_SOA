package vn.ptit.soa.chat.message;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class ChatOutboxRepository {
    private final MongoTemplate mongo;

    public ChatOutboxRepository(MongoTemplate mongo) {
        this.mongo = mongo;
        mongo.indexOps(ChatOutboxEvent.class).ensureIndex(new Index()
                .on("published_at", Sort.Direction.ASC)
                .on("lease_until", Sort.Direction.ASC)
                .on("occurredAt", Sort.Direction.ASC)
                .named("pending_outbox_order"));
    }

    public void insert(ChatOutboxEvent event) { mongo.insert(event); }

    public Optional<ChatOutboxEvent> claim(String relayId, Instant now, Duration lease) {
        Query query = Query.query(new Criteria().andOperator(
                Criteria.where("published_at").is(null),
                new Criteria().orOperator(Criteria.where("lease_until").is(null),
                        Criteria.where("lease_until").lte(now))))
                .with(Sort.by(Sort.Order.asc("occurredAt"), Sort.Order.asc("_id")));
        Update update = new Update().set("claimed_by", relayId)
                .set("lease_until", now.plus(lease)).inc("attempt_count", 1);
        return Optional.ofNullable(mongo.findAndModify(query, update,
                FindAndModifyOptions.options().returnNew(true), ChatOutboxEvent.class));
    }

    public boolean markPublished(String eventId, String relayId, Instant now) {
        Query query = Query.query(Criteria.where("_id").is(eventId)
                .and("claimed_by").is(relayId).and("published_at").is(null));
        return mongo.updateFirst(query, new Update().set("published_at", now)
                .unset("claimed_by").unset("lease_until"), ChatOutboxEvent.class)
                .getModifiedCount() == 1;
    }

    public void defer(String eventId, String relayId, Instant retryAt) {
        Query query = Query.query(Criteria.where("_id").is(eventId)
                .and("claimed_by").is(relayId).and("published_at").is(null));
        mongo.updateFirst(query, new Update().unset("claimed_by")
                .set("lease_until", retryAt), ChatOutboxEvent.class);
    }
}
