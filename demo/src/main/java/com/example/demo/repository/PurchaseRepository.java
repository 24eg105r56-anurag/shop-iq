package com.example.demo.repository;

import com.example.demo.domain.Purchase;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    List<Purchase> findByBuyer_Id(Long buyerId);
}
