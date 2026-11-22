package vn.ptit.soa.chat.message;

import java.time.Instant;
import java.util.Optional;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class ChatMessageRepository {
    private final MongoTemplate mongo;

    public ChatMessageRepository(MongoTemplate mongo) {
        this.mongo = mongo;
        mongo.indexOps(ChatMessage.class).ensureIndex(new Index()
                .on("conversation_id", Sort.Direction.ASC)
                .on("created_at", Sort.Direction.DESC)
                .on("_id", Sort.Direction.DESC)
                .named("conversation_message_order"));
    }

    public ChatMessage insert(ChatMessage message) {
        return mongo.insert(message);
    }

    public Optional<ChatMessage> findById(String messageId) {
        return Optional.ofNullable(mongo.findById(messageId, ChatMessage.class));
    }

    public Optional<ChatMessage> markReadIfUnread(String messageId, String conversationId, Instant now) {
        Query query = Query.query(Criteria.where("_id").is(messageId)
                .and("conversation_id").is(conversationId).and("is_read").is(false));
        Update update = new Update().set("is_read", true).set("read_at", now);
        return Optional.ofNullable(mongo.findAndModify(query, update,
                FindAndModifyOptions.options().returnNew(true), ChatMessage.class));
    }

    public long countUnreadFromOthers(String conversationId, String readerId) {
        Query query = Query.query(Criteria.where("conversation_id").is(conversationId)
                .and("sender_id").ne(readerId).and("is_read").is(false));
        return mongo.count(query, ChatMessage.class);
    }

    public List<ChatMessage> listNewest(String conversationId, Instant beforeTime,
            String beforeMessageId, int limit) {
        Criteria criteria = Criteria.where("conversation_id").is(conversationId);
        if (beforeTime != null) {
            criteria = new Criteria().andOperator(criteria, new Criteria().orOperator(
                    Criteria.where("created_at").lt(beforeTime),
                    new Criteria().andOperator(Criteria.where("created_at").is(beforeTime),
                            Criteria.where("_id").lt(beforeMessageId))));
        }
        Query query = Query.query(criteria)
                .with(Sort.by(Sort.Order.desc("created_at"), Sort.Order.desc("_id")))
                .limit(limit);
        return mongo.find(query, ChatMessage.class);
    }
}
