package vn.ptit.soa.chat.learning;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("database-learning")
@RequestMapping("/learning/notes")
public class LearningNoteController {
    private final LearningNoteService service;
    public LearningNoteController(LearningNoteService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LearningNote create(@RequestBody NoteRequest request) { return service.create(request.content()); }

    @GetMapping("/{id}")
    public LearningNote find(@PathVariable String id) { return service.find(id); }

    public record NoteRequest(String content) {}
}
