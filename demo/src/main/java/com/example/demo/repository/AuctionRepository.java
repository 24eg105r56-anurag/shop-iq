package com.example.demo.repository;

import com.example.demo.domain.Auction;
import java.time.Instant;
import java.util.List;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuctionRepository extends JpaRepository<Auction, Long> {
    List<Auction> findByStatusAndEndsAtAfter(Auction.Status status, Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Auction a where a.id = :id")
    java.util.Optional<Auction> findByIdForUpdate(@Param("id") Long id);
}
