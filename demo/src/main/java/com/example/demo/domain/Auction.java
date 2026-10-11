package com.example.demo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "auctions")
public class Auction {
    public enum Status { ACTIVE, ENDED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @NotNull
    @DecimalMin("0.01")
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal startingPrice;

    @NotNull
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal currentHighestPrice;

    @NotNull
    @Column(nullable = false)
    private Instant endsAt;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.ACTIVE;

    protected Auction() {
    }

    public Auction(Product product, User seller, BigDecimal startingPrice, Instant endsAt) {
        this.product = product;
        this.seller = seller;
        this.startingPrice = startingPrice;
        this.currentHighestPrice = startingPrice;
        this.endsAt = endsAt;
        this.status = endsAt.isAfter(Instant.now()) ? Status.ACTIVE : Status.ENDED;
    }

    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public User getSeller() { return seller; }
    public void setSeller(User seller) { this.seller = seller; }
    public BigDecimal getStartingPrice() { return startingPrice; }
    public void setStartingPrice(BigDecimal startingPrice) { this.startingPrice = startingPrice; }
    public BigDecimal getCurrentHighestPrice() { return currentHighestPrice; }
    public void setCurrentHighestPrice(BigDecimal currentHighestPrice) { this.currentHighestPrice = currentHighestPrice; }
    public Instant getEndsAt() { return endsAt; }
    public void setEndsAt(Instant endsAt) { this.endsAt = endsAt; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
}
