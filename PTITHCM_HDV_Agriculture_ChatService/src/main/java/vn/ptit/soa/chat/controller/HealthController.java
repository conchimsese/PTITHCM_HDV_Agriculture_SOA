package vn.ptit.soa.chat.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    @GetMapping("/health")
    public HealthResponse health() {
        return new HealthResponse("chat-service", "UP");
    }

    public record HealthResponse(String service, String status) {}
}
