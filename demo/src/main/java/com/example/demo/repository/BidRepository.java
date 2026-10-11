package com.example.demo.repository;

import com.example.demo.domain.Bid;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByAuction_IdOrderByPlacedAtDesc(Long auctionId);
    List<Bid> findByBidder_Id(Long bidderId);
    long countByAuction_IdAndPlacedAtAfter(Long auctionId, Instant since);
    Optional<Bid> findTopByAuction_IdOrderByAmountDesc(Long auctionId);
    Optional<Bid> findTopByAuction_IdAndIdNotOrderByAmountDesc(Long auctionId, Long excludedBidId);
    void deleteAllByAuction_Id(Long auctionId);
}
