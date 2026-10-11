package com.example.demo.repository;

import com.example.demo.domain.Product;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByBuyNowTrue();
}
