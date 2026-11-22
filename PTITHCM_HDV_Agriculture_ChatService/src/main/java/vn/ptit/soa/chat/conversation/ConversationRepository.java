package vn.ptit.soa.chat.conversation;

import java.util.Optional;
import java.util.List;
import java.time.Instant;
import org.springframework.data.domain.Sort;
import org.springframework.context.annotation.Profile;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class ConversationRepository {
    private final MongoTemplate mongo;

    public ConversationRepository(MongoTemplate mongo) {
        this.mongo = mongo;
        mongo.indexOps(Conversation.class).ensureIndex(
                new Index().on("offer_id", org.springframework.data.domain.Sort.Direction.ASC)
                        .unique().named("unique_offer_id"));
        mongo.indexOps(Conversation.class).ensureIndex(new Index()
                .on("participant_ids", Sort.Direction.ASC)
                .on("updated_at", Sort.Direction.DESC)
                .on("_id", Sort.Direction.DESC)
                .named("participant_conversation_order"));
    }

    public Optional<Conversation> findByOfferId(String offerId) {
        Query query = Query.query(Criteria.where("offer_id").is(offerId));
        return Optional.ofNullable(mongo.findOne(query, Conversation.class));
    }

    public Optional<Conversation> findById(String conversationId) {
        return Optional.ofNullable(mongo.findById(conversationId, Conversation.class));
    }

    public List<Conversation> listForParticipant(String viewerId, Instant beforeTime,
            String beforeConversationId, int limit) {
        Criteria membership = Criteria.where("participant_ids").is(viewerId);
        Criteria criteria = membership;
        if (beforeTime != null) {
            criteria = new Criteria().andOperator(membership, new Criteria().orOperator(
                    Criteria.where("updated_at").lt(beforeTime),
                    new Criteria().andOperator(Criteria.where("updated_at").is(beforeTime),
                            Criteria.where("_id").lt(beforeConversationId))));
        }
        return mongo.find(Query.query(criteria)
                .with(Sort.by(Sort.Order.desc("updated_at"), Sort.Order.desc("_id")))
                .limit(limit), Conversation.class);
    }

    public Optional<Conversation> findByContractId(String contractId) {
        return Optional.ofNullable(mongo.findOne(Query.query(Criteria.where("contract_id").is(contractId)),
                Conversation.class));
    }

    public boolean linkContract(String conversationId, String contractId, java.time.Instant at) {
        Query query = Query.query(Criteria.where("_id").is(conversationId).and("contract_id").is(null));
        return mongo.updateFirst(query, new Update().set("contract_id", contractId)
                .set("updated_at", at), Conversation.class).getModifiedCount() == 1;
    }

    public boolean advanceContractVersion(String conversationId, String contractId,
            long version, String status) {
        Criteria older = new Criteria().orOperator(
                Criteria.where("contract_state_version").exists(false),
                Criteria.where("contract_state_version").lt(version));
        Query query = Query.query(new Criteria().andOperator(
                Criteria.where("_id").is(conversationId).and("contract_id").is(contractId), older));
        return mongo.updateFirst(query, new Update().set("contract_state_version", version)
                .set("contract_status", status), Conversation.class).getModifiedCount() == 1;
    }

    public void touch(String conversationId, java.time.Instant at) {
        mongo.updateFirst(Query.query(Criteria.where("_id").is(conversationId)),
                new Update().set("updated_at", at), Conversation.class);
    }

    public Conversation insert(Conversation conversation) {
        return mongo.insert(conversation);
    }
}
