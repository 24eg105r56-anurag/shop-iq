package com.example.demo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "purchases")
public class Purchase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal priceAtPurchase;

    @Column(nullable = false)
    private Instant purchasedAt;

    protected Purchase() {
    }

    public Purchase(User buyer, Product product) {
        this.buyer = buyer;
        this.product = product;
        this.priceAtPurchase = product.getPrice();
        this.purchasedAt = Instant.now();
    }

    public Long getId() { return id; }
    public User getBuyer() { return buyer; }
    public Product getProduct() { return product; }
    public BigDecimal getPriceAtPurchase() { return priceAtPurchase; }
    public Instant getPurchasedAt() { return purchasedAt; }
}
