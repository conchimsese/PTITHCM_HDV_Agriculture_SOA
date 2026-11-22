package vn.ptit.soa.chat.media;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import vn.ptit.soa.chat.conversation.Conversation;
import vn.ptit.soa.chat.conversation.ConversationRepository;
import java.nio.file.Path;

class ChatMediaServiceTest {
    private static final String ROOM = "f72a08bd-33d7-4221-9e55-55d5d7f2e2f0";
    private static final String OWNER = "233196d7-d149-451d-8006-91e6563be4f0";
    private static final String RECIPIENT = "e14961fb-7e5a-4613-8837-8cadf6a887de";
    @TempDir Path directory;

    @Test
    void temporaryImageIsOwnerOnlyAndAttachedImageCanBeReadAfterRoomCloses() throws Exception {
        ConversationRepository rooms = mock(ConversationRepository.class);
        MediaAssetRepository assets = mock(MediaAssetRepository.class);
        when(rooms.findById(ROOM)).thenReturn(Optional.of(room("ACTIVE")));
        ChatMediaService media = new ChatMediaService(rooms, assets, new ChatImageCodec(), directory.toString());
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
        var file = new MockMultipartFile("file", "test.png", "image/png", bytes.toByteArray());
        ChatMediaService.UploadResult uploaded = media.uploadSecure(ROOM, OWNER, file);
        assertEquals(ChatMediaService.apiUrl(ROOM, uploaded.mediaId()), uploaded.attachmentUrl());
        ArgumentCaptor<MediaAsset> inserted = ArgumentCaptor.forClass(MediaAsset.class);
        verify(assets).insert(inserted.capture());
        MediaAsset pending = inserted.getValue();
        when(assets.find(uploaded.mediaId(), ROOM)).thenReturn(Optional.of(pending));
        assertArrayEquals(bytes.toByteArray(), media.download(ROOM, uploaded.mediaId(), OWNER).bytes());
        assertThrows(ChatMediaService.MediaNotFoundException.class,
                () -> media.download(ROOM, uploaded.mediaId(), RECIPIENT));

        MediaAsset attached = new MediaAsset(pending.mediaId(), pending.ownerAccountId(), pending.resourceId(),
                pending.storageKey(), pending.contentType(), pending.sizeBytes(), pending.sha256(),
                pending.createdAt(), Instant.now());
        when(assets.find(uploaded.mediaId(), ROOM)).thenReturn(Optional.of(attached));
        when(rooms.findById(ROOM)).thenReturn(Optional.of(room("CLOSED")));
        assertArrayEquals(bytes.toByteArray(), media.download(ROOM, uploaded.mediaId(), RECIPIENT).bytes());
        assertThrows(ChatMediaService.ConversationClosedException.class,
                () -> media.uploadSecure(ROOM, OWNER, file));
    }

    private Conversation room(String status) {
        return new Conversation(ROOM, List.of(OWNER, RECIPIENT), null, null, status,
                Instant.now(), Instant.now());
    }
}
