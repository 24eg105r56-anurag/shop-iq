package com.example.demo.service;

import com.example.demo.domain.Product;
import com.example.demo.repository.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ProductService {
    private final ProductRepository products;

    public ProductService(ProductRepository products) {
        this.products = products;
    }

    @Transactional(readOnly = true)
    public List<Product> list(Boolean buyNow) {
        return Boolean.TRUE.equals(buyNow) ? products.findByBuyNowTrue() : products.findAll();
    }

    @Transactional(readOnly = true)
    public Product get(Long id) { return products.findById(id).orElseThrow(() -> new ResourceNotFoundException("Product", id)); }

    public Product create(Product product) { return products.save(product); }

    public Product update(Long id, Product changes) {
        Product product = get(id);
        product.setName(changes.getName());
        product.setCategory(changes.getCategory());
        product.setDescription(changes.getDescription());
        product.setPrice(changes.getPrice());
        product.setImageUrl(changes.getImageUrl());
        product.setBuyNow(changes.isBuyNow());
        return products.save(product);
    }

    public void delete(Long id) { products.delete(get(id)); }
}
