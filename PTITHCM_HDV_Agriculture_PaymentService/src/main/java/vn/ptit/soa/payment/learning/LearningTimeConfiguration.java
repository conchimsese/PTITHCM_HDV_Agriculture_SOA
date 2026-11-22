package vn.ptit.soa.payment.learning;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@Profile("database-learning")
public class LearningTimeConfiguration {
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
