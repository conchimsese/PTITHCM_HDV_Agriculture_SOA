package vn.ptit.soa.payment.security;
import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import vn.ptit.soa.payment.contract.*;
class MoneyJsonTest {
    @Test
    void moneyIsDecimalStringAndPointsAreStillNumbers() throws Exception {
        var json = new ObjectMapper().findAndRegisterModules();
        var now = Instant.now();
        var contract = new Contract("c","o","r","f","t",new BigDecimal("10000000.00"),
                "terms",now,"CREATED",new BigDecimal("20.00"),null,1,now,now);
        var root=json.readTree(json.writeValueAsString(contract));
        assertTrue(root.path("totalAmount").isTextual());
        assertEquals("10000000.00",root.path("totalAmount").asText());
        var paid=new DepositFinalizer.PayResult("p","c",new BigDecimal("500000.00"),"LOCKED","ACTIVE",true);
        assertTrue(json.readTree(json.writeValueAsString(paid)).path("depositAmount").isTextual());
        assertTrue(json.valueToTree(java.util.Map.of("requestedDelta",new BigDecimal("0.5"))).path("requestedDelta").isNumber());
    }
}
