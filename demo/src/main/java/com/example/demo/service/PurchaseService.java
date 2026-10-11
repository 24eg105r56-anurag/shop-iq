package com.example.demo.service;

import com.example.demo.domain.Product;
import com.example.demo.domain.Purchase;
import com.example.demo.domain.User;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.PurchaseRepository;
import com.example.demo.repository.UserRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PurchaseService {
    public record PurchaseRequest(Long buyerId, Long productId) {}

    private final PurchaseRepository purchases;
    private final ProductRepository products;
    private final UserRepository users;

    public PurchaseService(PurchaseRepository purchases, ProductRepository products, UserRepository users) {
        this.purchases = purchases;
        this.products = products;
        this.users = users;
    }

    public Purchase create(PurchaseRequest request) {
        if (request.buyerId() == null || request.productId() == null) {
            throw new IllegalArgumentException("buyerId and productId are required");
        }
        User buyer = users.findById(request.buyerId())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.buyerId()));
        Product product = products.findById(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", request.productId()));
        if (!product.isBuyNow()) {
            throw new IllegalStateException("This product is not available for buy-it-now purchase");
        }
        return purchases.save(new Purchase(buyer, product));
    }

    @Transactional(readOnly = true)
    public List<Purchase> listForUser(Long userId) {
        if (!users.existsById(userId)) throw new ResourceNotFoundException("User", userId);
        return purchases.findByBuyer_Id(userId);
    }
}
