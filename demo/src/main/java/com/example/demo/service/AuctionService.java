package com.example.demo.service;

import com.example.demo.domain.Auction;
import com.example.demo.domain.Bid;
import com.example.demo.domain.Product;
import com.example.demo.domain.User;
import com.example.demo.repository.AuctionRepository;
import com.example.demo.repository.BidRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuctionService {
    public record AuctionRequest(Long productId, Long sellerId, BigDecimal startingPrice, Instant endsAt) {}
    public record BidRequest(Long bidderId, BigDecimal amount) {}

    private final AuctionRepository auctions;
    private final BidRepository bids;
    private final ProductRepository products;
    private final UserRepository users;

    public AuctionService(AuctionRepository auctions, BidRepository bids, ProductRepository products, UserRepository users) {
        this.auctions = auctions;
        this.bids = bids;
        this.products = products;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<Auction> list(boolean activeOnly) {
        return activeOnly
                ? auctions.findByStatusAndEndsAtAfter(Auction.Status.ACTIVE, Instant.now())
                : auctions.findAll();
    }

    @Transactional(readOnly = true)
    public Auction get(Long id) { return auctions.findById(id).orElseThrow(() -> new ResourceNotFoundException("Auction", id)); }

    public Auction create(AuctionRequest request) {
        validateAuctionRequest(request);
        return auctions.save(new Auction(product(request.productId()), user(request.sellerId()),
                request.startingPrice(), request.endsAt()));
    }

    public Auction update(Long id, AuctionRequest request) {
        validateAuctionRequest(request);
        Auction auction = get(id);
        if (!bids.findByAuction_IdOrderByPlacedAtDesc(id).isEmpty()) {
            throw new IllegalStateException("An auction with bids cannot change product, seller, or starting price");
        }
        auction.setProduct(product(request.productId()));
        auction.setSeller(user(request.sellerId()));
        auction.setStartingPrice(request.startingPrice());
        auction.setCurrentHighestPrice(request.startingPrice());
        auction.setEndsAt(request.endsAt());
        auction.setStatus(request.endsAt().isAfter(Instant.now()) ? Auction.Status.ACTIVE : Auction.Status.ENDED);
        return auctions.save(auction);
    }

    public void delete(Long id) {
        Auction auction = get(id);
        bids.deleteAllByAuction_Id(id);
        auctions.delete(auction);
    }

    public Bid placeBid(Long auctionId, BidRequest request) {
        if (request.amount() == null || request.amount().signum() <= 0) {
            throw new IllegalArgumentException("Bid amount must be greater than zero");
        }
        Auction auction = auctions.findByIdForUpdate(auctionId)
                .orElseThrow(() -> new ResourceNotFoundException("Auction", auctionId));
        refreshStatus(auction);
        if (auction.getStatus() != Auction.Status.ACTIVE) {
            throw new IllegalStateException("This auction has ended");
        }
        if (request.amount().compareTo(auction.getCurrentHighestPrice()) <= 0) {
            throw new IllegalArgumentException("Bid must be higher than the current highest price");
        }
        User bidder = user(request.bidderId());
        auction.setCurrentHighestPrice(request.amount());
        bids.save(new Bid(auction, bidder, request.amount()));
        auctions.save(auction);
        return bids.findTopByAuction_IdOrderByAmountDesc(auctionId).orElseThrow();
    }

    @Transactional(readOnly = true)
    public List<Bid> listBids(Long auctionId) {
        get(auctionId);
        return bids.findByAuction_IdOrderByPlacedAtDesc(auctionId);
    }

    @Transactional(readOnly = true)
    public Bid getBid(Long id) { return bids.findById(id).orElseThrow(() -> new ResourceNotFoundException("Bid", id)); }

    public Bid updateBid(Long id, BidRequest request) {
        Bid bid = getBid(id);
        Auction auction = auctions.findByIdForUpdate(bid.getAuction().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Auction", bid.getAuction().getId()));
        if (request.amount() == null || request.amount().signum() <= 0) {
            throw new IllegalArgumentException("Bid amount must be greater than zero");
        }
        BigDecimal otherHighest = bids.findTopByAuction_IdAndIdNotOrderByAmountDesc(auction.getId(), id)
                .map(Bid::getAmount).orElse(auction.getStartingPrice());
        if (request.amount().compareTo(otherHighest) <= 0) {
            throw new IllegalArgumentException("Bid must be higher than all other bids and the starting price");
        }
        bid.setBidder(user(request.bidderId()));
        bid.setAmount(request.amount());
        auction.setCurrentHighestPrice(request.amount());
        return bids.save(bid);
    }

    public void deleteBid(Long id) {
        Bid bid = getBid(id);
        Auction auction = auctions.findByIdForUpdate(bid.getAuction().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Auction", bid.getAuction().getId()));
        bids.delete(bid);
        auction.setCurrentHighestPrice(bids.findTopByAuction_IdAndIdNotOrderByAmountDesc(auction.getId(), id)
                .map(Bid::getAmount).orElse(auction.getStartingPrice()));
    }

    private void validateAuctionRequest(AuctionRequest request) {
        if (request.productId() == null || request.sellerId() == null || request.startingPrice() == null
                || request.startingPrice().signum() <= 0 || request.endsAt() == null) {
            throw new IllegalArgumentException("productId, sellerId, positive startingPrice, and endsAt are required");
        }
    }

    private Product product(Long id) {
        return products.findById(id).orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    private User user(Long id) {
        if (id == null) throw new IllegalArgumentException("bidderId or sellerId is required");
        return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    private void refreshStatus(Auction auction) {
        if (!auction.getEndsAt().isAfter(Instant.now())) {
            auction.setStatus(Auction.Status.ENDED);
        }
    }
}
