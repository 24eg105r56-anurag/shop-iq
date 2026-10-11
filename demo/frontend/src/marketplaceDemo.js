const DATA_VERSION = 1;

export function demoStorageKey(pixelTheme) {
  return `collectors-market-demo-data:${pixelTheme ? "pixel-card-vault" : "artisanal-bids"}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function seedMarketplace(pixelTheme) {
  const now = Date.now();
  const curator = {
    id: 1,
    displayName: pixelTheme ? "Vault Curator" : "The Curator",
    email: pixelTheme ? "curator@pixelvault.example" : "curator@artisanal.example",
  };
  const collector = {
    id: 2,
    displayName: "Demo Collector",
    email: "collector@example.test",
  };
  const auctionProducts = pixelTheme
    ? [
        { name: "First Edition Dragon Card", category: "Trading Cards", description: "A graded collector card in excellent condition.", price: 240 },
        { name: "1989 Handheld Console", category: "Retro Games", description: "Classic portable hardware, carefully preserved.", price: 125 },
        { name: "Golden Age Comic #12", category: "Comics", description: "A rare issue from a landmark comic run.", price: 390 },
      ]
    : [
        { name: "Evening Light, No. 4", category: "Paintings", description: "An original work with a quiet, luminous palette.", price: 240 },
        { name: "Bronze Garden Figure", category: "Sculpture", description: "A finely cast bronze from a private collection.", price: 125 },
        { name: "Walnut Heirloom Writing Desk", category: "Antique Furniture", description: "A restored walnut desk with original brass fittings.", price: 390 },
      ];
  const shopProducts = pixelTheme
    ? [
        { name: "Arcade Cabinet Mini", category: "Retro Games", description: "A display-ready collectible for arcade fans.", price: 89 },
        { name: "Neo Geo Arcade Stick", category: "Retro Games", description: "A well-kept arcade controller ready for a new collection.", price: 165 },
        { name: "Silver Age Comic Collection", category: "Comics", description: "A small, carefully preserved run from a beloved series.", price: 210 },
      ]
    : [
        { name: "Hand-carved Stoneware Vase", category: "Ceramics", description: "A one-of-a-kind vessel shaped by hand.", price: 89 },
        { name: "Pair of Carved Oak Chairs", category: "Antique Furniture", description: "A graceful matched pair with a warm, aged patina.", price: 165 },
        { name: "No. 9, Garden Study", category: "Paintings", description: "A framed study on paper from a quiet country garden.", price: 210 },
      ];
  const products = [...auctionProducts, ...shopProducts].map((product, index) => ({
    id: index + 1,
    ...product,
    price: Number(product.price).toFixed(2),
    imageUrl: null,
    buyNow: index >= auctionProducts.length,
  }));
  const auctions = auctionProducts.map((product, index) => ({
    id: index + 1,
    product: products[index],
    seller: curator,
    startingPrice: Number(product.price).toFixed(2),
    currentHighestPrice: Number(product.price).toFixed(2),
    endsAt: new Date(now + [100, 300, 1080][index] * 60_000).toISOString(),
    status: "ACTIVE",
  }));

  return {
    version: DATA_VERSION,
    theme: pixelTheme ? "pixel-card-vault" : "artisanal-bids",
    nextUserId: 3,
    nextBidId: 1,
    nextPurchaseId: 1,
    users: [curator, collector],
    products,
    auctions,
    bids: [],
    purchases: [],
  };
}

function readDatabase(pixelTheme) {
  const storageKey = demoStorageKey(pixelTheme);
  let stored;
  try {
    stored = window.localStorage.getItem(storageKey);
  } catch (error) {
    throw new Error("Browser storage is unavailable. Enable site storage to use the frontend-only demo.");
  }
  if (!stored) {
    const data = seedMarketplace(pixelTheme);
    saveDatabase(data, pixelTheme);
    return data;
  }
  try {
    const data = JSON.parse(stored);
    const expectedTheme = pixelTheme ? "pixel-card-vault" : "artisanal-bids";
    if (data.version !== DATA_VERSION || data.theme !== expectedTheme) {
      throw new Error(`Your saved ${expectedTheme} demo data uses a different version. Clear this site's ${storageKey} storage key to start fresh.`);
    }
    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Saved demo data could not be read. Clear this site's ${storageKey} storage key to start fresh.`);
    }
    throw error;
  }
}

function saveDatabase(data, pixelTheme) {
  try {
    window.localStorage.setItem(demoStorageKey(pixelTheme), JSON.stringify(data));
  } catch (error) {
    throw new Error("The browser could not save the demo change. Enable site storage and try again.");
  }
}

function bidCountLastDay(data, auctionId, now) {
  const cutoff = now - 24 * 60 * 60 * 1000;
  return data.bids.filter((bid) =>
    bid.auction.id === auctionId && new Date(bid.placedAt).getTime() >= cutoff
  ).length;
}

function getRecommendations(data, userId, limit) {
  const now = Date.now();
  const affinityCategories = new Set();
  if (userId) {
    data.bids
      .filter((bid) => bid.bidder.id === userId)
      .forEach((bid) => affinityCategories.add(bid.auction.product.category));
    data.purchases
      .filter((purchase) => purchase.buyer.id === userId)
      .forEach((purchase) => affinityCategories.add(purchase.product.category));
  }

  return data.auctions
    .filter((auction) => auction.status === "ACTIVE" && new Date(auction.endsAt).getTime() > now)
    .map((auction) => {
      const bidsLast24Hours = bidCountLastDay(data, auction.id, now);
      const categoryMatch = affinityCategories.has(auction.product.category);
      const minutesRemaining = Math.max(0, (new Date(auction.endsAt).getTime() - now) / 60_000);
      const velocityScore = Math.min(40, bidsLast24Hours * 4);
      const affinityScore = categoryMatch ? 40 : 0;
      const hoursRemaining = (new Date(auction.endsAt).getTime() - now) / 3_600_000;
      const urgencyScore = hoursRemaining <= 2 ? Math.round(30 * (1 - Math.max(0, hoursRemaining) / 2)) : 0;
      return {
        auction,
        bidsLast24Hours,
        categoryMatch,
        score: velocityScore + affinityScore + urgencyScore,
        minutesUntilEnd: Math.floor(minutesRemaining),
      };
    })
    .sort((a, b) => b.score - a.score || a.minutesUntilEnd - b.minutesUntilEnd || a.auction.id - b.auction.id)
    .slice(0, limit);
}

function matches(path, expression) {
  return path.match(expression);
}

export async function demoRequest(path, options = {}, pixelTheme = false) {
  const url = new URL(path, window.location.origin);
  const method = (options.method || "GET").toUpperCase();
  const pathname = url.pathname.replace(/^\/api/, "");
  const data = readDatabase(pixelTheme);
  let result;
  let changed = false;

  if (method === "GET" && pathname === "/users") {
    result = data.users;
  } else if (method === "POST" && pathname === "/users") {
    const body = JSON.parse(options.body || "{}");
    const email = String(body.email || "").trim().toLowerCase();
    const displayName = String(body.displayName || "").trim();
    if (!email || !displayName) throw new Error("A display name and email address are required.");
    if (data.users.some((user) => user.email.toLowerCase() === email)) {
      throw new Error("An account with this email already exists. Try signing in instead.");
    }
    result = { id: data.nextUserId++, displayName, email };
    data.users.push(result);
    changed = true;
  } else if (method === "GET" && pathname === "/auctions") {
    result = url.searchParams.get("activeOnly") === "true"
      ? data.auctions.filter((auction) => auction.status === "ACTIVE" && new Date(auction.endsAt).getTime() > Date.now())
      : data.auctions;
  } else if (method === "GET" && pathname === "/products") {
    result = url.searchParams.get("buyNow") === "true"
      ? data.products.filter((product) => product.buyNow)
      : data.products;
  } else if (method === "GET" && pathname === "/recommendations/hot") {
    result = getRecommendations(data, null, Number(url.searchParams.get("limit")) || 10);
  } else if (method === "GET" && pathname === "/recommendations") {
    result = getRecommendations(data, Number(url.searchParams.get("userId")) || null, Number(url.searchParams.get("limit")) || 10);
  } else {
    const bidMatch = matches(pathname, /^\/auctions\/(\d+)\/bids$/);
    const purchaseMatch = matches(pathname, /^\/purchases$/);
    const purchasesMatch = matches(pathname, /^\/users\/(\d+)\/purchases$/);

    if (method === "POST" && bidMatch) {
      const auction = data.auctions.find((item) => item.id === Number(bidMatch[1]));
      if (!auction) throw new Error("Auction not found.");
      if (auction.status !== "ACTIVE" || new Date(auction.endsAt).getTime() <= Date.now()) {
        auction.status = "ENDED";
        throw new Error("This auction has ended.");
      }
      const body = JSON.parse(options.body || "{}");
      const bidder = data.users.find((user) => user.id === Number(body.bidderId));
      if (!bidder) throw new Error("Bidder not found.");
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= Number(auction.currentHighestPrice)) {
        throw new Error("Bid must be higher than the current highest price.");
      }
      auction.currentHighestPrice = amount.toFixed(2);
      result = {
        id: data.nextBidId++,
        auction,
        bidder,
        amount: amount.toFixed(2),
        placedAt: new Date().toISOString(),
      };
      data.bids.push(result);
      changed = true;
    } else if (method === "POST" && purchaseMatch) {
      const body = JSON.parse(options.body || "{}");
      const buyer = data.users.find((user) => user.id === Number(body.buyerId));
      const product = data.products.find((item) => item.id === Number(body.productId));
      if (!buyer) throw new Error("Buyer not found.");
      if (!product || !product.buyNow) throw new Error("This piece is not available for buy-it-now.");
      result = {
        id: data.nextPurchaseId++,
        buyer,
        product,
        priceAtPurchase: product.price,
        purchasedAt: new Date().toISOString(),
      };
      data.purchases.push(result);
      changed = true;
    } else if (method === "GET" && purchasesMatch) {
      const userId = Number(purchasesMatch[1]);
      if (!data.users.some((user) => user.id === userId)) throw new Error("User not found.");
      result = data.purchases.filter((purchase) => purchase.buyer.id === userId);
    } else {
      throw new Error(`The frontend-only demo does not implement ${method} ${pathname}.`);
    }
  }

  if (changed) saveDatabase(data, pixelTheme);
  return clone(result);
}
