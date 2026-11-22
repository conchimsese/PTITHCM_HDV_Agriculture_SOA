package vn.ptit.soa.chat.learning;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.ptit.soa.chat.conversation.Conversation;
import vn.ptit.soa.chat.conversation.ConversationService;

@RestController
@Profile("learning & database-learning")
@RequestMapping("/learning/accepted-offers")
public class LearningAcceptedOfferController {
    private final ConversationService conversations;

    public LearningAcceptedOfferController(ConversationService conversations) {
        this.conversations = conversations;
    }

    @PostMapping
    public Conversation simulate(@RequestBody AcceptedOfferRequest request) {
        return conversations.openForAcceptedOffer(request.offerId(), request.farmerId(), request.traderId());
    }

    public record AcceptedOfferRequest(String offerId, String farmerId, String traderId) {}
}
