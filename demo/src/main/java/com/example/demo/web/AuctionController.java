package com.example.demo.web;

import com.example.demo.domain.Auction;
import com.example.demo.domain.Bid;
import com.example.demo.service.AuctionService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/auctions")
public class AuctionController {
    private final AuctionService auctions;

    public AuctionController(AuctionService auctions) { this.auctions = auctions; }

    @GetMapping
    public List<Auction> list(@RequestParam(defaultValue = "false") boolean activeOnly) {
        return auctions.list(activeOnly);
    }

    @GetMapping("/{id}")
    public Auction get(@PathVariable Long id) { return auctions.get(id); }

    @PostMapping
    public ResponseEntity<Auction> create(@Valid @RequestBody AuctionService.AuctionRequest request) {
        Auction saved = auctions.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(saved.getId()).toUri();
        return ResponseEntity.created(location).body(saved);
    }

    @PutMapping("/{id}")
    public Auction update(@PathVariable Long id, @Valid @RequestBody AuctionService.AuctionRequest request) {
        return auctions.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        auctions.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/bids")
    public List<Bid> listBids(@PathVariable Long id) { return auctions.listBids(id); }

    @PostMapping("/{id}/bids")
    public ResponseEntity<Bid> createBid(@PathVariable Long id, @Valid @RequestBody AuctionService.BidRequest request) {
        Bid saved = auctions.placeBid(id, request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{bidId}")
                .buildAndExpand(saved.getId()).toUri();
        return ResponseEntity.created(location).body(saved);
    }

    @GetMapping("/bids/{bidId}")
    public Bid getBid(@PathVariable Long bidId) { return auctions.getBid(bidId); }

    @PutMapping("/bids/{bidId}")
    public Bid updateBid(@PathVariable Long bidId, @Valid @RequestBody AuctionService.BidRequest request) {
        return auctions.updateBid(bidId, request);
    }

    @DeleteMapping("/bids/{bidId}")
    public ResponseEntity<Void> deleteBid(@PathVariable Long bidId) {
        auctions.deleteBid(bidId);
        return ResponseEntity.noContent().build();
    }
}
