package com.example.demo.web;

import com.example.demo.domain.Purchase;
import com.example.demo.service.PurchaseService;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api")
public class PurchaseController {
    private final PurchaseService purchases;

    public PurchaseController(PurchaseService purchases) { this.purchases = purchases; }

    @PostMapping("/purchases")
    public ResponseEntity<Purchase> create(@RequestBody PurchaseService.PurchaseRequest request) {
        Purchase saved = purchases.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(saved.getId()).toUri();
        return ResponseEntity.created(location).body(saved);
    }

    @GetMapping("/users/{userId}/purchases")
    public List<Purchase> listForUser(@PathVariable Long userId) { return purchases.listForUser(userId); }
}
