package com.example.demo.config;

import com.example.demo.domain.Auction;
import com.example.demo.domain.Product;
import com.example.demo.domain.User;
import com.example.demo.repository.AuctionRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataSeeder implements CommandLineRunner {
    private final UserRepository users;
    private final ProductRepository products;
    private final AuctionRepository auctions;
    private final String theme;

    public DataSeeder(UserRepository users, ProductRepository products, AuctionRepository auctions,
            @Value("${app.theme:artisanal-bids}") String theme) {
        this.users = users;
        this.products = products;
        this.auctions = auctions;
        this.theme = theme;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0 || products.count() > 0 || auctions.count() > 0) return;

        boolean pixelTheme = theme.equalsIgnoreCase("pixel-card-vault");
        User curator = users.save(new User(pixelTheme ? "Vault Curator" : "The Curator",
                pixelTheme ? "curator@pixelvault.example" : "curator@artisanal.example"));
        users.save(new User("Demo Collector", "collector@example.test"));

        String[] names = pixelTheme
                ? new String[] { "First Edition Dragon Card", "1989 Handheld Console", "Golden Age Comic #12", "Arcade Cabinet Mini" }
                : new String[] { "Evening Light, No. 4", "Bronze Garden Figure", "Walnut Heirloom Writing Desk", "Hand-carved Stoneware Vase" };
        String[] categories = pixelTheme
                ? new String[] { "Trading Cards", "Retro Games", "Comics", "Retro Games" }
                : new String[] { "Paintings", "Sculpture", "Antique Furniture", "Ceramics" };
        String[] descriptions = pixelTheme
                ? new String[] { "Graded collector card in excellent condition.", "Classic portable console, carefully preserved.", "A rare issue from a landmark comic run.", "A display-ready collectible for arcade fans." }
                : new String[] { "An original work with a quiet, luminous palette.", "A finely cast bronze from a private collection.", "A restored walnut desk with original brass fittings.", "A one-of-a-kind vessel shaped by hand." };

        Product first = products.save(new Product(names[0], categories[0], descriptions[0],
                new BigDecimal("240.00"), null, false));
        Product second = products.save(new Product(names[1], categories[1], descriptions[1],
                new BigDecimal("125.00"), null, false));
        Product third = products.save(new Product(names[2], categories[2], descriptions[2],
                new BigDecimal("390.00"), null, false));
        Product buyNow = products.save(new Product(names[3], categories[3], descriptions[3],
                new BigDecimal("89.00"), null, true));
        products.save(new Product(
                pixelTheme ? "Neo Geo Arcade Stick" : "Pair of Carved Oak Chairs",
                pixelTheme ? "Retro Games" : "Antique Furniture",
                pixelTheme ? "A well-kept arcade controller ready for a new collection." : "A graceful matched pair with a warm, aged patina.",
                new BigDecimal("165.00"), null, true));
        products.save(new Product(
                pixelTheme ? "Silver Age Comic Collection" : "No. 9, Garden Study",
                pixelTheme ? "Comics" : "Paintings",
                pixelTheme ? "A small, carefully preserved run from a beloved series." : "A framed study on paper from a quiet country garden.",
                new BigDecimal("210.00"), null, true));

        Instant now = Instant.now();
        auctions.save(new Auction(first, curator, new BigDecimal("240.00"), now.plus(100, ChronoUnit.MINUTES)));
        auctions.save(new Auction(second, curator, new BigDecimal("125.00"), now.plus(5, ChronoUnit.HOURS)));
        auctions.save(new Auction(third, curator, new BigDecimal("390.00"), now.plus(18, ChronoUnit.HOURS)));
        if (!buyNow.isBuyNow()) throw new IllegalStateException("Seed storefront item must be buy-it-now");
    }
}
