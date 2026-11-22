package vn.ptit.soa.chat.message;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@Profile("database-learning")
@ConditionalOnProperty(name = "chat.outbox.relay.enabled", havingValue = "true")
public class ChatKafkaTopicConfig {
    @Bean
    NewTopic chatMessageTopic() {
        return TopicBuilder.name("soa.chat.message.v1").partitions(3).replicas(1).build();
    }
}
