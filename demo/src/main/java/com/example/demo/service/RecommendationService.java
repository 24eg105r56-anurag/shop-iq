package com.example.demo.service;

import com.example.demo.domain.Auction;
import com.example.demo.domain.Bid;
import com.example.demo.domain.Purchase;
import com.example.demo.repository.AuctionRepository;
import com.example.demo.repository.BidRepository;
import com.example.demo.repository.PurchaseRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecommendationService {
    public record Recommendation(Auction auction, int score, long bidsLast24Hours,
            boolean categoryMatch, long minutesUntilEnd) {}

    private static final Duration BID_WINDOW = Duration.ofHours(24);
    private static final Duration URGENCY_WINDOW = Duration.ofHours(2);

    private final AuctionRepository auctions;
    private final BidRepository bids;
    private final PurchaseRepository purchases;

    public RecommendationService(AuctionRepository auctions, BidRepository bids, PurchaseRepository purchases) {
        this.auctions = auctions;
        this.bids = bids;
        this.purchases = purchases;
    }

    @Transactional(readOnly = true)
    public List<Recommendation> recommend(Long userId, int limit) {
        if (limit < 1 || limit > 50) {
            throw new IllegalArgumentException("limit must be between 1 and 50");
        }
        Set<String> affinityCategories = new HashSet<>();
        if (userId != null) {
            for (Bid bid : bids.findByBidder_Id(userId)) {
                affinityCategories.add(bid.getAuction().getProduct().getCategory());
            }
            for (Purchase purchase : purchases.findByBuyer_Id(userId)) {
                affinityCategories.add(purchase.getProduct().getCategory());
            }
        }

        Instant now = Instant.now();
        Instant since = now.minus(BID_WINDOW);
        return auctions.findByStatusAndEndsAtAfter(Auction.Status.ACTIVE, now).stream()
                .map(auction -> score(auction, affinityCategories, since, now))
                .sorted(Comparator.comparingInt(Recommendation::score).reversed()
                        .thenComparing(Recommendation::minutesUntilEnd)
                        .thenComparing(recommendation -> recommendation.auction().getId()))
                .limit(limit)
                .toList();
    }

    private Recommendation score(Auction auction, Set<String> affinityCategories, Instant since, Instant now) {
        long velocity = bids.countByAuction_IdAndPlacedAtAfter(auction.getId(), since);
        boolean affinity = affinityCategories.contains(auction.getProduct().getCategory());
        long minutesLeft = Math.max(0, Duration.between(now, auction.getEndsAt()).toMinutes());

        int velocityPoints = (int) Math.min(40, velocity * 4);
        int affinityPoints = affinity ? 40 : 0;
        double hoursLeft = Duration.between(now, auction.getEndsAt()).toMillis() / 3_600_000.0;
        int urgencyPoints = hoursLeft <= URGENCY_WINDOW.toHours()
                ? (int) Math.round(30 * (1 - Math.max(0, hoursLeft) / URGENCY_WINDOW.toHours()))
                : 0;

        return new Recommendation(auction, velocityPoints + affinityPoints + urgencyPoints,
                velocity, affinity, minutesLeft);
    }
}
