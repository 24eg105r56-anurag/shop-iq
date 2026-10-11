package com.example.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.example.demo.domain.Auction;
import com.example.demo.domain.Bid;
import com.example.demo.domain.Product;
import com.example.demo.domain.User;
import com.example.demo.repository.AuctionRepository;
import com.example.demo.repository.BidRepository;
import com.example.demo.repository.PurchaseRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {
    @Mock
    private AuctionRepository auctions;
    @Mock
    private BidRepository bids;
    @Mock
    private PurchaseRepository purchases;
    @InjectMocks
    private RecommendationService recommendations;

    @Test
    void combinesRecentBidVelocityAffinityAndUrgency() {
        User seller = new User("Seller", "seller@example.test");
        User bidder = new User("Bidder", "bidder@example.test");
        Product candidateProduct = product("Paintings");
        Product previouslyBidProduct = product("Paintings");
        Auction candidate = new Auction(candidateProduct, seller, new BigDecimal("100.00"),
                Instant.now().plus(1, ChronoUnit.HOURS));
        Auction previous = new Auction(previouslyBidProduct, seller, new BigDecimal("80.00"),
                Instant.now().plus(1, ChronoUnit.DAYS));
        Bid previousBid = new Bid(previous, bidder, new BigDecimal("90.00"));

        when(bids.findByBidder_Id(42L)).thenReturn(List.of(previousBid));
        when(purchases.findByBuyer_Id(42L)).thenReturn(List.of());
        when(auctions.findByStatusAndEndsAtAfter(any(), any())).thenReturn(List.of(candidate));
        when(bids.countByAuction_IdAndPlacedAtAfter(any(), any())).thenReturn(2L);

        RecommendationService.Recommendation result = recommendations.recommend(42L, 5).get(0);

        assertThat(result.bidsLast24Hours()).isEqualTo(2);
        assertThat(result.categoryMatch()).isTrue();
        assertThat(result.score()).isBetween(62, 63);
        assertThat(result.minutesUntilEnd()).isBetween(59L, 60L);
    }

    @Test
    void capsVelocityPointsAndDoesNotAwardUrgencyBeyondTwoHours() {
        Auction candidate = new Auction(product("Comics"), new User("Seller", "seller@example.test"),
                new BigDecimal("50.00"), Instant.now().plus(3, ChronoUnit.HOURS));
        when(auctions.findByStatusAndEndsAtAfter(any(), any())).thenReturn(List.of(candidate));
        when(bids.countByAuction_IdAndPlacedAtAfter(any(), any())).thenReturn(20L);

        RecommendationService.Recommendation result = recommendations.recommend(null, 10).get(0);

        assertThat(result.score()).isEqualTo(40);
        assertThat(result.categoryMatch()).isFalse();
    }

    @Test
    void usesPriorPurchasesToEstablishCategoryAffinity() {
        User buyer = new User("Buyer", "buyer@example.test");
        Auction candidate = new Auction(product("Sculpture"), new User("Seller", "seller@example.test"),
                new BigDecimal("50.00"), Instant.now().plus(3, ChronoUnit.HOURS));
        when(auctions.findByStatusAndEndsAtAfter(any(), any())).thenReturn(List.of(candidate));
        when(bids.findByBidder_Id(17L)).thenReturn(List.of());
        when(purchases.findByBuyer_Id(17L)).thenReturn(List.of(
                new com.example.demo.domain.Purchase(buyer, product("Sculpture"))));
        when(bids.countByAuction_IdAndPlacedAtAfter(any(), any())).thenReturn(0L);

        RecommendationService.Recommendation result = recommendations.recommend(17L, 10).get(0);

        assertThat(result.categoryMatch()).isTrue();
        assertThat(result.score()).isEqualTo(40);
    }

    private Product product(String category) {
        return new Product("Collectible", category, "", new BigDecimal("100.00"), null, false);
    }
}
