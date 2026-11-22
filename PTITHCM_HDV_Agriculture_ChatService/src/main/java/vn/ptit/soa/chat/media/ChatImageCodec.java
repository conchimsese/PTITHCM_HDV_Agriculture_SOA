package vn.ptit.soa.chat.media;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.stereotype.Component;

@Component
public class ChatImageCodec {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final long MAX_PIXELS = 20_000_000L;

    public EncodedImage clean(byte[] input) throws IOException {
        String signature = signature(input);
        try (ImageInputStream stream = ImageIO.createImageInputStream(new ByteArrayInputStream(input))) {
            if (stream == null) throw new IllegalArgumentException("Image cannot be decoded.");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) throw new IllegalArgumentException("Image cannot be decoded.");
            ImageReader reader = readers.next();
            try {
                reader.setInput(stream, true, true);
                String decoded = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!signature.equals(decoded) && !("jpeg".equals(signature) && "jpg".equals(decoded))) {
                    throw new IllegalArgumentException("Image signature and decoder disagree.");
                }
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels < 1 || pixels > MAX_PIXELS) throw new ImageTooLargeException();
                BufferedImage image = reader.read(0);
                if (image == null) throw new IllegalArgumentException("Image cannot be decoded.");
                String format = "jpeg".equals(signature) ? "jpeg" : "png";
                if ("jpeg".equals(format)) {
                    BufferedImage rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
                    Graphics2D graphics = rgb.createGraphics();
                    try {
                        graphics.setColor(Color.WHITE);
                        graphics.fillRect(0, 0, rgb.getWidth(), rgb.getHeight());
                        graphics.drawImage(image, 0, 0, null);
                    } finally { graphics.dispose(); }
                    image = rgb;
                }
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                if (!ImageIO.write(image, format, out)) throw new IllegalArgumentException("Image cannot be re-encoded.");
                byte[] bytes = out.toByteArray();
                if (bytes.length > MAX_BYTES) throw new ImageTooLargeException();
                return new EncodedImage(bytes, "jpeg".equals(format) ? "image/jpeg" : "image/png",
                        "jpeg".equals(format) ? ".jpg" : ".png");
            } finally { reader.dispose(); }
        }
    }

    private String signature(byte[] bytes) {
        if (bytes.length >= 3 && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216
                && (bytes[2] & 255) == 255) return "jpeg";
        byte[] png = {(byte) 137, 80, 78, 71, 13, 10, 26, 10};
        if (bytes.length >= 8) {
            boolean same = true;
            for (int i = 0; i < 8; i++) same &= bytes[i] == png[i];
            if (same) return "png";
        }
        if (bytes.length >= 12 && ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return "webp";
        throw new UnsupportedImageException();
    }

    private boolean ascii(byte[] bytes, int offset, String text) {
        for (int i = 0; i < text.length(); i++) if (bytes[offset + i] != text.charAt(i)) return false;
        return true;
    }

    public record EncodedImage(byte[] bytes, String contentType, String extension) {}
    public static class ImageTooLargeException extends RuntimeException {}
    public static class UnsupportedImageException extends RuntimeException {}
}
