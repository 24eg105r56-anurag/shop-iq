package com.example.demo.web;

import com.example.demo.service.RecommendationService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {
    private final RecommendationService recommendations;

    public RecommendationController(RecommendationService recommendations) { this.recommendations = recommendations; }

    @GetMapping
    public List<RecommendationService.Recommendation> recommend(
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "10") int limit) {
        return recommendations.recommend(userId, limit);
    }

    @GetMapping("/hot")
    public List<RecommendationService.Recommendation> hot(@RequestParam(defaultValue = "10") int limit) {
        return recommendations.recommend(null, limit);
    }
}
