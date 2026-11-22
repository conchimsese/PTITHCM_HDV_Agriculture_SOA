package vn.ptit.soa.chat.media;

import static org.junit.jupiter.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class ChatImageCodecTest {
    private final ChatImageCodec codec = new ChatImageCodec();

    @Test
    void validPngIsReencodedAndCannotSmuggleTrailingBytes() throws Exception {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream source = new ByteArrayOutputStream();
        ImageIO.write(image, "png", source);
        byte[] raw = source.toByteArray();
        byte[] withTrailingBytes = java.util.Arrays.copyOf(raw, raw.length + 4);
        withTrailingBytes[raw.length] = '<';
        ChatImageCodec.EncodedImage result = codec.clean(withTrailingBytes);
        assertEquals("image/png", result.contentType());
        assertNotNull(ImageIO.read(new java.io.ByteArrayInputStream(result.bytes())));
        assertFalse(java.util.Arrays.equals(withTrailingBytes, result.bytes()));
    }

    @Test
    void rejectsNonImageAndCorruptPng() {
        assertThrows(ChatImageCodec.UnsupportedImageException.class,
                () -> codec.clean("<svg>unsafe</svg>".getBytes()));
        byte[] fakePng = {(byte) 137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0};
        assertThrows(Exception.class, () -> codec.clean(fakePng));
    }

    @Test
    void webpDecoderIsAvailable() {
        assertTrue(ImageIO.getImageReadersByFormatName("WebP").hasNext());
    }
}
