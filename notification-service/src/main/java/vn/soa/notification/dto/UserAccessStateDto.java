package vn.soa.notification.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.UUID;

public record UserAccessStateDto(
        UUID accountId,
        @JsonAlias("status") String state,
        String role
) {
    public boolean isActive() {
        return "ACTIVE".equalsIgnoreCase(state);
    }
}
