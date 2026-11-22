package vn.ptit.soa.chat.media;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.ptit.soa.chat.conversation.Conversation;
import vn.ptit.soa.chat.conversation.ConversationRepository;

@Service
@Profile("database-learning")
public class ChatMediaService {
    private final ConversationRepository conversations;
    private final MediaAssetRepository assets;
    private final ChatImageCodec codec;
    private final Path storageDir;

    public ChatMediaService(ConversationRepository conversations, MediaAssetRepository assets,
            ChatImageCodec codec, @Value("${MEDIA_STORAGE_DIR:.media}") String directory) {
        this.conversations = conversations;
        this.assets = assets;
        this.codec = codec;
        if (directory == null || directory.isBlank()) throw new IllegalArgumentException("MEDIA_STORAGE_DIR is required.");
        this.storageDir = Path.of(directory).toAbsolutePath().normalize();
    }

    public UploadResult upload(String conversationId, String actorId, MultipartFile file) {
        String room = id(conversationId);
        String actor = id(actorId);
        requireParticipant(room, actor, true);
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Image file is required.");
        if (file.getSize() > ChatImageCodec.MAX_BYTES) throw new ChatImageCodec.ImageTooLargeException();
        try {
            byte[] raw;
            try (var input = file.getInputStream()) { raw = input.readNBytes(ChatImageCodec.MAX_BYTES + 1); }
            if (raw.length > ChatImageCodec.MAX_BYTES) throw new ChatImageCodec.ImageTooLargeException();
            ChatImageCodec.EncodedImage clean;
            try { clean = codec.clean(raw); }
            catch (IOException invalid) { throw new IllegalArgumentException("Image cannot be decoded."); }
            String key = UUID.randomUUID().toString();
            Path path = root().resolve(key + clean.extension());
            Files.write(path, clean.bytes(), StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
            String mediaId = UUID.randomUUID().toString();
            MediaAsset asset = new MediaAsset(mediaId, actor, room, key,
                    clean.contentType(), clean.bytes().length, sha256(clean.bytes()), Instant.now(), null);
            assets.insert(asset);
            return new UploadResult(mediaId, url(room, mediaId), clean.contentType(), clean.bytes().length);
        } catch (IOException error) {
            throw new IllegalStateException("Image could not be stored.", error);
        }
    }

    public UploadResult uploadSecure(String conversationId, String actorId, MultipartFile file) {
        UploadResult saved = upload(conversationId, actorId, file);
        return new UploadResult(saved.mediaId(), apiUrl(id(conversationId), saved.mediaId()),
                saved.contentType(), saved.sizeBytes());
    }

    public DownloadResult download(String conversationId, String mediaId, String actorId) {
        String room = id(conversationId);
        String actor = id(actorId);
        requireParticipant(room, actor, false);
        MediaAsset asset = assets.find(id(mediaId), room).orElseThrow(MediaNotFoundException::new);
        if (asset.attachedAt() == null && !actor.equals(asset.ownerAccountId())) throw new MediaNotFoundException();
        try {
            Path root = root();
            String extension = "image/jpeg".equals(asset.contentType()) ? ".jpg" : ".png";
            Path file = root.resolve(asset.storageKey() + extension).normalize();
            if (!file.startsWith(root) || Files.isSymbolicLink(file)
                    || !Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)
                    || Files.size(file) != asset.sizeBytes()) throw new MediaNotFoundException();
            byte[] bytes = Files.readAllBytes(file);
            if (!sha256(bytes).equals(asset.sha256())) throw new MediaNotFoundException();
            return new DownloadResult(asset.contentType(), bytes);
        } catch (IOException error) { throw new MediaNotFoundException(); }
    }

    // Files and Mongo metadata are two storage systems. Delete only unreferenced files after 24 hours.
    @Scheduled(fixedDelay = 3_600_000, initialDelay = 3_600_000)
    public void cleanupExpired() {
        Instant cutoff = Instant.now().minus(Duration.ofHours(24));
        try {
            Path root = root();
            for (MediaAsset asset : assets.expiredUnattached(cutoff)) {
                if (assets.deleteIfUnattached(asset.mediaId())) {
                    String ext = "image/jpeg".equals(asset.contentType()) ? ".jpg" : ".png";
                    Files.deleteIfExists(root.resolve(asset.storageKey() + ext));
                }
            }
            try (var files = Files.list(root)) {
                for (Path file : files.toList()) {
                    String name = file.getFileName().toString();
                    if (!name.matches("[0-9a-f-]{36}\\.(jpg|png)") || Files.isSymbolicLink(file)
                            || !Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)
                            || !Files.getLastModifiedTime(file).toInstant().isBefore(cutoff)) continue;
                    String key = name.substring(0, 36);
                    if (!UUID.fromString(key).toString().equals(key)) continue;
                    if (!assets.storageKeyExists(key)) Files.deleteIfExists(file);
                }
            }
        } catch (IOException error) {
            throw new IllegalStateException("Chat media cleanup failed.", error);
        }
    }

    private Conversation requireParticipant(String room, String actor, boolean requireActiveRoom) {
        Conversation conversation = conversations.findById(room).orElseThrow(MediaNotFoundException::new);
        if (!conversation.participantIds().contains(actor)) throw new MediaNotFoundException();
        if (requireActiveRoom && !"ACTIVE".equals(conversation.status()))
            throw new ConversationClosedException();
        return conversation;
    }

    public static String url(String conversationId, String mediaId) {
        return "/learning/conversations/" + conversationId + "/media/" + mediaId;
    }

    public static String apiUrl(String conversationId, String mediaId) {
        return "/api/v1/conversations/" + conversationId + "/media/" + mediaId;
    }

    public static String id(String value) {
        try {
            String parsed = UUID.fromString(value).toString();
            if (!parsed.equalsIgnoreCase(value)) throw new IllegalArgumentException();
            return parsed;
        } catch (RuntimeException invalid) { throw new IllegalArgumentException("ID must be a UUID."); }
    }

    private Path root() throws IOException {
        Files.createDirectories(storageDir);
        if (Files.isSymbolicLink(storageDir) || !Files.isDirectory(storageDir, LinkOption.NOFOLLOW_LINKS))
            throw new IOException("Invalid media directory.");
        return storageDir.toRealPath();
    }

    private String sha256(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }

    public record UploadResult(String mediaId, String attachmentUrl, String contentType, long sizeBytes) {}
    public record DownloadResult(String contentType, byte[] bytes) {}
    public static class MediaNotFoundException extends RuntimeException {}
    public static class ConversationClosedException extends IllegalArgumentException {
        public ConversationClosedException() { super("Conversation is closed."); }
    }
}
