package vn.ptit.soa.chat.learning;

import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.ptit.soa.chat.media.ChatMediaService;

@RestController
@Profile("learning & database-learning")
@RequestMapping("/learning/conversations/{conversationId}/media")
public class LearningChatMediaController {
    private final ChatMediaService media;
    public LearningChatMediaController(ChatMediaService media) { this.media = media; }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChatMediaService.UploadResult> upload(@PathVariable String conversationId,
            @RequestParam String actorId, @RequestPart("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(media.upload(conversationId, actorId, file));
    }

    @GetMapping("/{mediaId}")
    public ResponseEntity<byte[]> download(@PathVariable String conversationId, @PathVariable String mediaId,
            @RequestParam String actorId) {
        ChatMediaService.DownloadResult file = media.download(conversationId, mediaId, actorId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.contentType()))
                .cacheControl(CacheControl.noStore().cachePrivate())
                .header("X-Content-Type-Options", "nosniff")
                .body(file.bytes());
    }
}
