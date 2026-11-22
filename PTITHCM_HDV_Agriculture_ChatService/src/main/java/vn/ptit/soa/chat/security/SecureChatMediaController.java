package vn.ptit.soa.chat.security;

import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.ptit.soa.chat.media.ChatMediaService;

@RestController
@Profile("secure & database-learning")
@RequestMapping("/api/v1/conversations/{conversationId}/media")
public class SecureChatMediaController {
    private final ChatMediaService media;

    public SecureChatMediaController(ChatMediaService media) {
        this.media = media;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChatMediaService.UploadResult> upload(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String conversationId, @RequestPart("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .cacheControl(CacheControl.noStore())
                .body(media.uploadSecure(conversationId, jwt.getSubject(), file));
    }

    @GetMapping("/{mediaId}")
    public ResponseEntity<byte[]> download(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String conversationId, @PathVariable String mediaId) {
        ChatMediaService.DownloadResult found = media.download(conversationId, mediaId, jwt.getSubject());
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(found.contentType()))
                .cacheControl(CacheControl.noStore().cachePrivate())
                .header("X-Content-Type-Options", "nosniff")
                .body(found.bytes());
    }
}
