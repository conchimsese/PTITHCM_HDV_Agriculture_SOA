package vn.ptit.soa.payment.contract;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@Profile("database-learning")
@ConditionalOnProperty(name = "payment.outbox.relay.enabled", havingValue = "true")
public class PaymentKafkaTopicConfig {
    @Bean
    NewTopic contractLifecycleTopic() {
        return TopicBuilder.name("soa.contract.lifecycle.v1").partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic depositTopic() {
        return TopicBuilder.name("soa.payment.deposit.v1").partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic reputationDecisionTopic() {
        return TopicBuilder.name("soa.payment.reputation-decision.v1")
                .partitions(3).replicas(1).build();
    }
}
