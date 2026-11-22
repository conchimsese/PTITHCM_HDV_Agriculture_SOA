package vn.ptit.soa.payment.dispute;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Profile("database-learning")
public class DisputeEvidenceService {
    private static final int ABSOLUTE_MAX_BYTES = 5 * 1024 * 1024;
    private static final long MAX_PIXELS = 20_000_000L;
    private final DisputeService disputes;
    private final DisputeEvidenceRepository evidence;
    private final Clock clock;
    private final Path storageDir;
    private final int maxBytes;

    public DisputeEvidenceService(DisputeService disputes, DisputeEvidenceRepository evidence,
            Clock clock, @Value("${MEDIA_STORAGE_DIR:.media}") String directory,
            @Value("${MAX_UPLOAD_BYTES:5242880}") long configuredMaxBytes) {
        this.disputes = disputes;
        this.evidence = evidence;
        this.clock = clock;
        if (directory == null || directory.isBlank() || configuredMaxBytes <= 0) {
            throw new IllegalArgumentException("Evidence storage configuration is invalid.");
        }
        this.storageDir = Path.of(directory).toAbsolutePath().normalize();
        this.maxBytes = (int) Math.min(configuredMaxBytes, ABSOLUTE_MAX_BYTES);
    }

    @Transactional
    public UploadResult upload(String disputeId, String actorId, boolean asAdmin,
            MultipartFile file, String description) {
        return upload(disputeId, actorId, asAdmin, file, description, null);
    }

    @Transactional
    public UploadResult upload(String disputeId, String actorId, boolean asAdmin,
            MultipartFile file, String description, String sourceAccountId) {
        Dispute dispute = disputes.requireEvidenceAccess(disputeId, actorId, asAdmin, true);
        String source = asAdmin
                ? disputes.requireEvidenceSource(dispute, sourceAccountId) : null;
        if (!asAdmin && sourceAccountId != null) {
            throw new IllegalArgumentException("Only an Admin can declare an evidence source.");
        }
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Image file is required.");
        if (file.getSize() > maxBytes) throw new ImageTooLargeException();
        if (description != null && description.length() > 5000) {
            throw new IllegalArgumentException("description is too long.");
        }
        try {
            byte[] raw;
            try (var input = file.getInputStream()) {
                raw = input.readNBytes(maxBytes + 1);
            }
            if (raw.length > maxBytes) throw new ImageTooLargeException();
            EncodedImage clean;
            try {
                clean = decodeAndReencode(raw);
            } catch (IOException invalid) {
                throw new IllegalArgumentException("Image cannot be decoded.");
            }
            Path root = root();
            String storageKey = UUID.randomUUID().toString();
            Path path = root.resolve(storageKey + clean.extension());
            Files.write(path, clean.bytes(), StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
            Instant now = clock.instant();
            String evidenceId = UUID.randomUUID().toString();
            DisputeEvidence metadata = new DisputeEvidence(evidenceId, dispute.disputeId(),
                    UUID.fromString(actorId).toString(), source, storageKey, clean.contentType(),
                    clean.bytes().length, sha256(clean.bytes()), description, now, now);
            evidence.insert(metadata);
            return new UploadResult(evidenceId,
                    "/learning/disputes/" + dispute.disputeId() + "/evidence/" + evidenceId,
                    clean.contentType(), clean.bytes().length);
        } catch (IOException failed) {
            throw new EvidenceStorageException("Evidence could not be stored.", failed);
        }
    }

    public EvidencePage list(String disputeId, String actorId, boolean asAdmin,
            String cursor, Integer requestedLimit) {
        Dispute dispute = disputes.requireEvidenceAccess(disputeId, actorId, asAdmin, false);
        int limit = requestedLimit == null ? 20 : requestedLimit;
        if (limit < 1 || limit > 100) {
            throw new IllegalArgumentException("limit must be between 1 and 100.");
        }
        EvidenceCursor before = decodeCursor(cursor);
        List<DisputeEvidence> found = evidence.findPage(dispute.disputeId(),
                before == null ? null : before.createdAt(),
                before == null ? null : before.id(), limit + 1);
        boolean more = found.size() > limit;
        List<EvidenceItem> items = found.subList(0, Math.min(limit, found.size())).stream()
                .map(item -> new EvidenceItem(item.evidenceId(), item.uploaderId(),
                        item.sourceAccountId(), item.description(), item.contentType(),
                        item.sizeBytes(), item.createdAt(),
                        "/learning/disputes/" + dispute.disputeId()
                                + "/evidence/" + item.evidenceId()))
                .toList();
        DisputeEvidence last = items.isEmpty() ? null : found.get(items.size() - 1);
        return new EvidencePage(items, more ? encodeCursor(last) : null);
    }

    private String encodeCursor(DisputeEvidence last) {
        String raw = last.createdAt() + "|" + last.evidenceId();
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private EvidenceCursor decodeCursor(String token) {
        if (token == null) return null;
        if (token.isBlank() || token.length() > 256) {
            throw new IllegalArgumentException("Invalid evidence cursor.");
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", -1);
            if (parts.length != 2) throw new IllegalArgumentException();
            return new EvidenceCursor(Instant.parse(parts[0]), strictUuid(parts[1]));
        } catch (RuntimeException invalid) {
            throw new IllegalArgumentException("Invalid evidence cursor.");
        }
    }

    private record EvidenceCursor(Instant createdAt, String id) {}

    public record EvidenceItem(String evidenceId, String uploaderId, String sourceAccountId,
            String description, String contentType, long sizeBytes, Instant createdAt,
            String downloadUrl) {}

    public record EvidencePage(List<EvidenceItem> items, String nextCursor) {}

    public DownloadResult download(String disputeId, String evidenceId,
            String actorId, boolean asAdmin) {
        Dispute dispute = disputes.requireEvidenceAccess(disputeId, actorId, asAdmin, false);
        String id = strictUuid(evidenceId);
        DisputeEvidence metadata = evidence.find(id, dispute.disputeId())
                .orElseThrow(EvidenceNotFoundException::new);
        try {
            Path root = root();
            String extension = "image/jpeg".equals(metadata.contentType()) ? ".jpg" : ".png";
            Path path = root.resolve(metadata.storageKey() + extension).normalize();
            if (!path.startsWith(root) || Files.isSymbolicLink(path)
                    || !Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)
                    || Files.size(path) != metadata.sizeBytes()) {
                throw new EvidenceNotFoundException();
            }
            byte[] bytes = Files.readAllBytes(path);
            if (!sha256(bytes).equals(metadata.sha256())) throw new EvidenceNotFoundException();
            return new DownloadResult(metadata.contentType(), bytes);
        } catch (IOException failed) {
            throw new EvidenceNotFoundException();
        }
    }

    // A failed database transaction can leave a file written before its metadata commits.
    public int cleanupOrphans() throws IOException {
        Path root = root();
        Instant cutoff = clock.instant().minus(Duration.ofHours(24));
        int removed = 0;
        try (var files = Files.list(root)) {
            for (Path path : files.toList()) {
                if (Files.isSymbolicLink(path) || !Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) continue;
                String name = path.getFileName().toString();
                if (!name.matches("[0-9a-fA-F-]{36}\\.(png|jpg)")) continue;
                String key = name.substring(0, 36);
                try {
                    if (!UUID.fromString(key).toString().equalsIgnoreCase(key)) continue;
                } catch (IllegalArgumentException invalid) {
                    continue;
                }
                if (Files.getLastModifiedTime(path, LinkOption.NOFOLLOW_LINKS).toInstant().isBefore(cutoff)
                        && !evidence.storageKeyExists(key)) {
                    if (Files.deleteIfExists(path)) removed++;
                }
            }
        }
        return removed;
    }

    private EncodedImage decodeAndReencode(byte[] raw) throws IOException {
        String detected = detect(raw);
        try (ImageInputStream imageStream = ImageIO.createImageInputStream(new ByteArrayInputStream(raw))) {
            if (imageStream == null) throw new IllegalArgumentException("Image cannot be decoded.");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageStream);
            if (!readers.hasNext()) throw new IllegalArgumentException("Image cannot be decoded.");
            ImageReader reader = readers.next();
            try {
                reader.setInput(imageStream, true, true);
                String decodedFormat = reader.getFormatName().toLowerCase(java.util.Locale.ROOT);
                if (!detected.equals(decodedFormat)
                        && !("jpeg".equals(detected) && "jpg".equals(decodedFormat))) {
                    throw new IllegalArgumentException("Image signature and decoder disagree.");
                }
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels < 1 || pixels > MAX_PIXELS) throw new ImageTooLargeException();
                BufferedImage image = reader.read(0);
                if (image == null) throw new IllegalArgumentException("Image cannot be decoded.");
                String outputFormat = "jpeg".equals(detected) ? "jpeg" : "png";
                if ("jpeg".equals(outputFormat)) {
                    BufferedImage rgb = new BufferedImage(image.getWidth(), image.getHeight(),
                            BufferedImage.TYPE_INT_RGB);
                    Graphics2D graphics = rgb.createGraphics();
                    try {
                        graphics.setColor(Color.WHITE);
                        graphics.fillRect(0, 0, rgb.getWidth(), rgb.getHeight());
                        graphics.drawImage(image, 0, 0, null);
                    } finally {
                        graphics.dispose();
                    }
                    image = rgb;
                }
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                if (!ImageIO.write(image, outputFormat, output)) {
                    throw new IllegalArgumentException("Image cannot be re-encoded.");
                }
                byte[] clean = output.toByteArray();
                if (clean.length > maxBytes) throw new ImageTooLargeException();
                return new EncodedImage(clean,
                        "jpeg".equals(outputFormat) ? "image/jpeg" : "image/png",
                        "jpeg".equals(outputFormat) ? ".jpg" : ".png");
            } finally {
                reader.dispose();
            }
        }
    }

    private String detect(byte[] bytes) {
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff
                && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) return "jpeg";
        byte[] png = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        if (bytes.length >= png.length) {
            boolean match = true;
            for (int i = 0; i < png.length; i++) match &= bytes[i] == png[i];
            if (match) return "png";
        }
        if (bytes.length >= 12 && ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return "webp";
        throw new UnsupportedImageException();
    }

    private boolean ascii(byte[] bytes, int offset, String text) {
        for (int i = 0; i < text.length(); i++) {
            if (bytes[offset + i] != (byte) text.charAt(i)) return false;
        }
        return true;
    }

    private Path root() throws IOException {
        Files.createDirectories(storageDir);
        if (Files.isSymbolicLink(storageDir)
                || !Files.isDirectory(storageDir, LinkOption.NOFOLLOW_LINKS)) {
            throw new IOException("Evidence storage directory is invalid.");
        }
        return storageDir.toRealPath();
    }

    private String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException unavailable) {
            throw new IllegalStateException("SHA-256 is unavailable.", unavailable);
        }
    }

    private String strictUuid(String value) {
        try {
            String id = UUID.fromString(value).toString();
            if (!id.equalsIgnoreCase(value)) throw new IllegalArgumentException();
            return id;
        } catch (RuntimeException invalid) {
            throw new EvidenceNotFoundException();
        }
    }

    private record EncodedImage(byte[] bytes, String contentType, String extension) {}

    public record UploadResult(String evidenceId, String downloadUrl,
            String contentType, long sizeBytes) {}

    public record DownloadResult(String contentType, byte[] bytes) {}

    public static class ImageTooLargeException extends RuntimeException {}
    public static class UnsupportedImageException extends RuntimeException {}
    public static class EvidenceStorageException extends RuntimeException {
        public EvidenceStorageException(String message, Throwable cause) { super(message, cause); }
    }
}
