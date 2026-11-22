package vn.ptit.soa.payment.contract;

import java.sql.Timestamp;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("database-learning")
public class ContractRepository {
    private final JdbcTemplate jdbc;

    public ContractRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Contract insert(Contract contract) {
        jdbc.update("""
                INSERT INTO learning.contracts
                (contract_id,offer_id,conversation_id,farmer_id,trader_id,total_amount,terms,
                 delivery_date,status,penalty_rate,state_version,created_at,updated_at)
                VALUES (?::uuid,?::uuid,?::uuid,?::uuid,?::uuid,?,?,?,?,?,?,?,?)
                """, contract.contractId(), contract.offerId(), contract.conversationId(),
                contract.farmerId(), contract.traderId(), contract.totalAmount(), contract.terms(),
                Timestamp.from(contract.deliveryDate()), contract.status(), contract.penaltyRate(),
                contract.stateVersion(), Timestamp.from(contract.createdAt()),
                Timestamp.from(contract.updatedAt()));
        return contract;
    }

    public void requireUnusedConversation(String conversationId) {
        // All creators use the same transaction lock, including concurrent service instances.
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            try (var statement = connection.prepareStatement("SELECT pg_advisory_xact_lock(hashtextextended(?,0))")) {
                statement.setString(1, conversationId);
                statement.execute();
            }
            return null;
        });
        Boolean exists = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM learning.contracts WHERE conversation_id=?::uuid)",
                Boolean.class, conversationId);
        if (Boolean.TRUE.equals(exists)) throw new IllegalStateException("Conversation already has a Contract.");
    }

    public Optional<Contract> findById(String contractId) {
        return jdbc.query("SELECT * FROM learning.contracts WHERE contract_id=?::uuid",
                this::map, contractId).stream().findFirst();
    }

    public Optional<Contract> findByIdForUpdate(String contractId) {
        return jdbc.query("SELECT * FROM learning.contracts WHERE contract_id=?::uuid FOR UPDATE",
                this::map, contractId).stream().findFirst();
    }

    public void updateDraft(Contract contract) {
        int changed = jdbc.update("""
                UPDATE learning.contracts
                SET total_amount=?,terms=?,delivery_date=?,state_version=?,updated_at=?
                WHERE contract_id=?::uuid AND status='CREATED'
                """, contract.totalAmount(), contract.terms(), Timestamp.from(contract.deliveryDate()),
                contract.stateVersion(), Timestamp.from(contract.updatedAt()), contract.contractId());
        if (changed != 1) throw new IllegalStateException("Contract was not updated.");
    }

    public void markPendingDeposit(String contractId, long stateVersion, java.time.Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.contracts
                SET status='PENDING_DEPOSIT',state_version=?,updated_at=?
                WHERE contract_id=?::uuid AND status='CREATED'
                """, stateVersion, Timestamp.from(now), contractId);
        if (changed != 1) throw new IllegalStateException("Contract was not accepted.");
    }

    public void markActive(String contractId, long stateVersion, java.time.Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.contracts
                SET status='ACTIVE',state_version=?,updated_at=?
                WHERE contract_id=?::uuid AND status='PENDING_DEPOSIT'
                """, stateVersion, Timestamp.from(now), contractId);
        if (changed != 1) throw new IllegalStateException("Contract was not activated.");
    }

    public void markCompleted(String contractId, long stateVersion, java.time.Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.contracts
                SET status='COMPLETED',completed_confirmed_at=?,state_version=?,updated_at=?
                WHERE contract_id=?::uuid AND status='ACTIVE'
                """, Timestamp.from(now), stateVersion, Timestamp.from(now), contractId);
        if (changed != 1) throw new IllegalStateException("Contract was not completed.");
    }

    public void markCancelled(String contractId, long stateVersion, java.time.Instant now) {
        int changed = jdbc.update("""
                UPDATE learning.contracts
                SET status='CANCELLED',state_version=?,updated_at=?
                WHERE contract_id=?::uuid AND status='ACTIVE'
                """, stateVersion, Timestamp.from(now), contractId);
        if (changed != 1) throw new IllegalStateException("Contract was not cancelled.");
    }

    private Contract map(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new Contract(rs.getString("contract_id"), rs.getString("offer_id"),
                rs.getString("conversation_id"), rs.getString("farmer_id"),
                rs.getString("trader_id"), rs.getBigDecimal("total_amount"),
                rs.getString("terms"), rs.getTimestamp("delivery_date").toInstant(),
                rs.getString("status"), rs.getBigDecimal("penalty_rate"),
                rs.getTimestamp("completed_confirmed_at") == null ? null
                        : rs.getTimestamp("completed_confirmed_at").toInstant(),
                rs.getLong("state_version"), rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }
}
