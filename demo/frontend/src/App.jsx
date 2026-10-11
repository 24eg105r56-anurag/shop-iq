import { useCallback, useEffect, useState } from "react";
import { AccountDialog, BidDialog, CheckoutPage, OrderConfirmationPage } from "./MarketplaceFlows.jsx";
import { demoRequest, demoStorageKey } from "./marketplaceDemo.js";

const theme = (import.meta.env.VITE_THEME || "artisanal-bids").toLowerCase();
const pixelTheme = theme === "pixel-card-vault";
const demoMode = (import.meta.env.VITE_DEMO_MODE || "true").toLowerCase() !== "false";
const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
const storageScope = `${demoMode ? "browser" : "api"}:${pixelTheme ? "pixel-card-vault" : "artisanal-bids"}`;
const accountStorageKey = `collectors-market-account:${storageScope}`;
const addressStorageKey = `collectors-market-address:${storageScope}`;
const checkoutStorageKey = `collectors-market-checkout:${storageScope}`;
const orderStorageKey = `collectors-market-order:${storageScope}`;
const brand = pixelTheme ? "Pixel & Card Vault" : "Artisanal Bids";
const copy = pixelTheme
  ? {
      eyebrow: "THE COLLECTOR'S ARCADE",
      hero: "Find the pieces that take you back.",
      intro: "Rare cards, retro hardware, and stories worth keeping.",
      auctionLabel: "Live drops",
      storeLabel: "Buy it now",
      recommendationLabel: "Vault picks",
      navAuction: "Live drops",
      navStore: "The vault",
    }
  : {
      eyebrow: "OBJECTS WITH A PAST",
      hero: "Collect the extraordinary.",
      intro: "Rare works, storied objects, and a more thoughtful way to collect.",
      auctionLabel: "Curated auctions",
      storeLabel: "Available now",
      recommendationLabel: "Chosen for you",
      navAuction: "Auctions",
      navStore: "Shop",
    };

async function request(path, options) {
  if (demoMode) return demoRequest(path, options, pixelTheme);
  const response = await fetch(`${apiBase}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

function countdown(endsAt, now) {
  const remaining = Math.max(0, new Date(endsAt).getTime() - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function readStoredValue(storage, key) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (storageError) {
    console.warn(`Could not read saved marketplace data for "${key}".`, storageError);
    return null;
  }
}

function readDemoAccount() {
  const account = readStoredValue(window.localStorage, accountStorageKey);
  return account && Number.isFinite(Number(account.id)) && account.email && account.displayName
    ? { id: Number(account.id), email: account.email, displayName: account.displayName }
    : null;
}

function readPageFromLocation() {
  if (window.location.hash === "#checkout" && readStoredValue(window.sessionStorage, checkoutStorageKey)) return "checkout";
  if (window.location.hash === "#order" && readStoredValue(window.sessionStorage, orderStorageKey)) return "confirmation";
  return "market";
}

function Artwork({ product, compact = false }) {
  const mark = (product.category || "Collectible").toLowerCase();
  const symbol = mark.includes("paint") || mark.includes("comic") ? "✳" :
    mark.includes("sculpt") || mark.includes("game") ? "◈" :
      mark.includes("furniture") || mark.includes("retro") ? "⌘" : "◇";
  function tiltArtwork(event) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--tilt-x", `${x * 8}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${y * -8}deg`);
  }

  function resetArtwork(event) {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div
      className={`artwork ${compact ? "artwork--compact" : ""}`}
      onPointerMove={tiltArtwork}
      onPointerLeave={resetArtwork}
    >
      {product.imageUrl && <img
        className="artwork-photo"
        src={product.imageUrl}
        alt={product.name}
        loading="lazy"
        decoding="async"
        onError={(event) => event.currentTarget.remove()}
      />}
      <span className="artwork-symbol" aria-hidden="true">{symbol}</span>
      <small>{product.category}</small>
    </div>
  );
}

function AuctionCard({ auction, now, recommendation, onBid, bidBusy }) {
  const product = auction.product;
  const ended = new Date(auction.endsAt).getTime() <= now;
  return (
    <article className="item-card auction-card">
      <Artwork product={product} />
      <div className="card-body">
        <div className="card-meta"><span>{product.category}</span><span className={ended ? "ended" : "live-dot"}>{ended ? "Ended" : "● Live"}</span></div>
        <h3>{product.name}</h3>
        <p className="price-label">Current bid <strong>{money(auction.currentHighestPrice)}</strong></p>
        <div className="card-footer">
          <span className="timer">{ended ? "Closed" : countdown(auction.endsAt, now)}</span>
          {recommendation && <span className="score-pill">{recommendation.score} match</span>}
          {!recommendation && <button className="text-button" disabled={ended || bidBusy === auction.id} onClick={() => onBid(auction)}>
            {bidBusy === auction.id ? "Bidding…" : "Place a bid ↗"}
          </button>}
        </div>
      </div>
    </article>
  );
}

function App() {
  const [auctions, setAuctions] = useState([]);
  const [storeItems, setStoreItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => readDemoAccount());
  const [screen, setScreen] = useState(() => readPageFromLocation());
  const [checkoutProduct, setCheckoutProduct] = useState(() => readStoredValue(window.sessionStorage, checkoutStorageKey));
  const [lastOrder, setLastOrder] = useState(() => readStoredValue(window.sessionStorage, orderStorageKey));
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [bidAuction, setBidAuction] = useState(null);
  const [pendingBidAuction, setPendingBidAuction] = useState(null);
  const [pendingCheckoutProduct, setPendingCheckoutProduct] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [bidBusy, setBidBusy] = useState(null);
  const [storeCategory, setStoreCategory] = useState("All pieces");
  const [storeQuery, setStoreQuery] = useState("");
  const [storeSort, setStoreSort] = useState("featured");

  const loadDashboard = useCallback(async () => {
    try {
      const [live, items, members] = await Promise.all([
        request("/api/auctions?activeOnly=true"),
        request("/api/products?buyNow=true"),
        request("/api/users"),
      ]);
      const collector = members.find((user) => user.displayName === "Demo Collector") || members[0];
      const storedAccount = readDemoAccount();
      const account = storedAccount ? members.find((user) => user.id === storedAccount.id) : null;
      setCurrentUser(account || null);
      if (storedAccount && !account) {
        window.localStorage.removeItem(accountStorageKey);
      }
      const picks = (account || collector)
        ? await request(`/api/recommendations?userId=${(account || collector).id}&limit=3`)
        : await request("/api/recommendations/hot?limit=3");
      setAuctions(live);
      setStoreItems(items);
      setRecommendations(picks);
      setUsers(members);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    function restoreScreen() {
      setScreen(readPageFromLocation());
      setCheckoutProduct(readStoredValue(window.sessionStorage, checkoutStorageKey));
      setLastOrder(readStoredValue(window.sessionStorage, orderStorageKey));
    }
    window.addEventListener("popstate", restoreScreen);
    window.addEventListener("hashchange", restoreScreen);
    return () => {
      window.removeEventListener("popstate", restoreScreen);
      window.removeEventListener("hashchange", restoreScreen);
    };
  }, []);

  useEffect(() => {
    loadDashboard();
    const refresh = window.setInterval(loadDashboard, 30_000);
    const ticker = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(ticker);
    };
  }, [loadDashboard]);

  function navigateTo(nextScreen, payload) {
    if (nextScreen === "checkout") {
      setCheckoutProduct(payload);
      try {
        window.sessionStorage.setItem(checkoutStorageKey, JSON.stringify(payload));
        window.sessionStorage.removeItem(orderStorageKey);
      } catch (storageError) {
        console.warn("The checkout will remain available for this visit, but could not be saved for reload.", storageError);
      }
      window.history.pushState({ marketplaceScreen: "checkout" }, "", "#checkout");
    } else if (nextScreen === "confirmation") {
      setLastOrder(payload);
      try {
        window.sessionStorage.setItem(orderStorageKey, JSON.stringify(payload));
        window.sessionStorage.removeItem(checkoutStorageKey);
      } catch (storageError) {
        console.warn("The order succeeded, but its receipt could not be saved for reload.", storageError);
      }
      window.history.replaceState({ marketplaceScreen: "confirmation" }, "", "#order");
    } else {
      window.sessionStorage.removeItem(checkoutStorageKey);
      window.history.pushState({ marketplaceScreen: "market" }, "", `${window.location.pathname}${window.location.search}`);
    }
    setScreen(nextScreen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startCheckout(product) {
    if (!currentUser) {
      setPendingCheckoutProduct(product);
      setAccountDialogOpen(true);
      return;
    }
    navigateTo("checkout", product);
  }

  function startBid(auction) {
    if (!currentUser) {
      setPendingBidAuction(auction);
      setAccountDialogOpen(true);
      return;
    }
    setBidAuction(auction);
  }

  async function placeBid(auction, amount) {
    if (!currentUser) throw new Error("Sign in to place a bid.");
    setBidBusy(auction.id);
    try {
      await request(`/api/auctions/${auction.id}/bids`, {
        method: "POST",
        body: JSON.stringify({ bidderId: currentUser.id, amount }),
      });
      setBidAuction(null);
      setNotice(`Your ${money(amount)} bid on ${auction.product.name} is live.`);
      setError("");
      await loadDashboard();
    } catch (bidError) {
      throw bidError;
    } finally {
      setBidBusy(null);
    }
  }

  async function authenticate({ mode, displayName, email, password }) {
    if (password !== "1234") throw new Error("For this demo, the password is 1234.");
    const members = users.length ? users : await request("/api/users");
    let account = members.find((user) => user.email.toLowerCase() === email);
    if (mode === "signup") {
      if (!displayName || displayName.length < 2) throw new Error("Enter a display name with at least two characters.");
      if (account) throw new Error("An account with this email already exists. Try signing in instead.");
      account = await request("/api/users", {
        method: "POST",
        body: JSON.stringify({ displayName, email }),
      });
    } else if (!account) {
      throw new Error("We couldn't find that demo account. Create an account or use collector@example.test.");
    }
    const session = { id: account.id, email: account.email, displayName: account.displayName };
    try {
      window.localStorage.setItem(accountStorageKey, JSON.stringify(session));
    } catch (storageError) {
      throw new Error("Browser storage is unavailable. Enable site storage before signing in.");
    }
    setCurrentUser(session);
    setUsers(members.some((user) => user.id === account.id) ? members : [...members, account]);
    setAccountDialogOpen(false);
    setNotice(`Welcome${mode === "signup" ? " to the collection" : " back"}, ${account.displayName}.`);
    setError("");
    if (pendingCheckoutProduct) {
      navigateTo("checkout", pendingCheckoutProduct);
      setPendingCheckoutProduct(null);
    } else if (pendingBidAuction) {
      setBidAuction(pendingBidAuction);
      setPendingBidAuction(null);
    }
    await loadDashboard();
  }

  function signOut() {
    window.localStorage.removeItem(accountStorageKey);
    setCurrentUser(null);
    setNotice("You’ve signed out of this demo account.");
    setError("");
  }

  function resetBrowserDemo() {
    if (!window.confirm("Reset this theme's browser demo? This clears its saved profiles, bids, purchases, and address on this device.")) return;
    window.localStorage.removeItem(demoStorageKey(pixelTheme));
    window.localStorage.removeItem(accountStorageKey);
    window.localStorage.removeItem(addressStorageKey);
    window.sessionStorage.removeItem(checkoutStorageKey);
    window.sessionStorage.removeItem(orderStorageKey);
    window.location.reload();
  }

  async function placeOrder({ address, paymentMethod, saveAddress }) {
    if (!currentUser || !checkoutProduct) throw new Error("Sign in and select a piece before checking out.");
    try {
      const purchase = await request("/api/purchases", {
        method: "POST",
        body: JSON.stringify({ buyerId: currentUser.id, productId: checkoutProduct.id }),
      });
      const order = {
        ...purchase,
        product: checkoutProduct,
        address,
        paymentMethod,
      };
      if (saveAddress) {
        try {
          const { firstName, lastName, ...savedAddress } = address;
          window.localStorage.setItem(addressStorageKey, JSON.stringify({ ...savedAddress, firstName, lastName }));
        } catch (storageError) {
          console.warn("The purchase succeeded, but the address could not be saved on this device.", storageError);
        }
      }
      navigateTo("confirmation", order);
      setNotice("");
      setError("");
      await loadDashboard();
    } catch (orderError) {
      if (orderError instanceof TypeError) throw new Error("The order could not reach the marketplace API. Check your connection and try again.");
      throw orderError;
    }
  }

  const categories = ["All pieces", ...new Set(storeItems.map((product) => product.category))];
  const visibleProducts = storeItems
    .filter((product) => storeCategory === "All pieces" || product.category === storeCategory)
    .filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(storeQuery.trim().toLowerCase()))
    .sort((a, b) => {
      if (storeSort === "price-low") return Number(a.price) - Number(b.price);
      if (storeSort === "price-high") return Number(b.price) - Number(a.price);
      if (storeSort === "name") return a.name.localeCompare(b.name);
      return a.id - b.id;
    });

  if (screen === "checkout") {
    return <CheckoutPage
      brand={brand}
      pixelTheme={pixelTheme}
      product={checkoutProduct}
      account={currentUser}
      addressStorageKey={addressStorageKey}
      onBack={() => navigateTo("market")}
      onPlaceOrder={placeOrder}
    />;
  }

  if (screen === "confirmation") {
    return <OrderConfirmationPage
      brand={brand}
      pixelTheme={pixelTheme}
      order={lastOrder}
      onBack={() => navigateTo("market")}
    />;
  }

  return (
    <main className={`app-shell ${pixelTheme ? "theme-pixel" : "theme-artisan"}`}>
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">{pixelTheme ? "▣" : "✳"}</span>{brand}</a>
        <nav aria-label="Main navigation">
          <a href="#auctions">{copy.navAuction}</a><a href="#store">{copy.navStore}</a><a href="#recommendations">Discover</a>
        </nav>
        <div className="account-actions">
          {currentUser
            ? <><span className="account-greeting">Hello, {currentUser.displayName.split(" ")[0]}</span><button className="account-button" onClick={signOut}>Sign out</button></>
            : <button className="account-button" onClick={() => setAccountDialogOpen(true)}>Sign in <span>↗</span></button>}
        </div>
      </header>
      {accountDialogOpen && <AccountDialog onClose={() => { setAccountDialogOpen(false); setPendingBidAuction(null); setPendingCheckoutProduct(null); }} onAuthenticate={authenticate} />}
      {bidAuction && <BidDialog key={bidAuction.id} auction={bidAuction} product={bidAuction.product} onClose={() => setBidAuction(null)} onSubmit={(amount) => placeBid(bidAuction, amount)} />}

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span></span>{copy.eyebrow}</p>
          <h1>{copy.hero}</h1>
          <p className="hero-intro">{copy.intro}</p>
          <a className="primary-button" href="#auctions">Explore live auctions <span>↓</span></a>
          <div className="hero-note"><span className="avatar-stack"><i>✳</i><i>◈</i><i>⌘</i></span><span>For collectors, by collectors</span></div>
        </div>
        <div className="hero-art" aria-label="Featured collectible placeholder">
          {/* INSERT_PREMIUM_HERO_HERE */}
          <div className="hero-art-inner"><div className="sun-disc"></div><div className="sculpture-shape"></div><span className="hero-caption">THE OBJECT OF DESIRE<br /><b>01 / FEATURED LOT</b></span><span className="hero-number">01</span></div>
        </div>
      </section>

      {error && <div role="alert" className="error-banner"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
      {notice && <div role="status" className="notice-banner"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}
      <div className="ticker"><span>THE COLLECTOR'S EDIT</span><i>✳</i><span>OBJECTS WITH A STORY</span><i>✳</i><span>RARE FINDS, FOUND HERE</span><i>✳</i><span>THE COLLECTOR'S EDIT</span></div>

      <section className="latest-section" id="latest">
        <div className="latest-heading">
          <div><p className="eyebrow">{pixelTheme ? "FRESH FROM THE VAULT" : "JUST ARRIVED, WORTH A CLOSER LOOK"}</p><h2>{pixelTheme ? "The latest & the greatest" : "The latest & the loveliest"}<span>.</span></h2></div>
          <a href="#store" className="section-link">Explore the collection <span>↗</span></a>
        </div>
        {loading ? <p className="state-message">Finding the latest pieces…</p> : storeItems.length ? (
          <div className={`latest-grid ${storeItems.length < 3 ? "latest-grid--few" : ""}`}>
            <div className="latest-pair">
              {storeItems.slice(0, 2).map((product, index) => (
                <article className={`latest-tile latest-tile--small latest-tile--tone-${index + 1}`} key={product.id}>
                  <Artwork product={product} />
                  <span className="latest-badge">{index === 0 ? "COLLECTOR'S PICK" : "NEW ARRIVAL"}</span>
                  <div className="latest-copy">
                    <span>{product.category}</span>
                    <h3>{product.name}</h3>
                    <strong>{money(product.price)}</strong>
                  </div>
                  <button type="button" className="latest-quick-buy" onClick={() => startCheckout(product)}>
                    Buy now ↗
                  </button>
                </article>
              ))}
            </div>
            {storeItems[2] && (
              <article className="latest-tile latest-tile--feature latest-tile--tone-3">
                <Artwork product={storeItems[2]} />
                <span className="latest-badge">{pixelTheme ? "VAULT FIND" : "THE CURATOR'S FIND"}</span>
                <div className="latest-feature-copy">
                  <span>{storeItems[2].category} <i>·</i> AVAILABLE NOW</span>
                  <h3>{storeItems[2].name}</h3>
                  <p>{storeItems[2].description || (pixelTheme ? "A rare piece with a story worth keeping." : "A singular piece, selected for its lasting character.")}</p>
                  <div className="latest-feature-footer"><strong>{money(storeItems[2].price)}</strong><button type="button" className="latest-feature-buy" onClick={() => startCheckout(storeItems[2])}>Add to collection <span>↗</span></button></div>
                </div>
              </article>
            )}
          </div>
        ) : <p className="state-message">New pieces are being curated. Please check back soon.</p>}
      </section>

      <section className="section" id="auctions">
        <div className="section-heading"><div><p className="eyebrow">A MOMENT IN THE MAKING</p><h2>{copy.auctionLabel}<sup>0{auctions.length}</sup></h2></div><a href="#auctions" className="section-link">View all lots <span>↗</span></a></div>
        {loading ? <p className="state-message">Bringing the collection into view…</p> : auctions.length ? (
          <div className="card-grid">{auctions.slice(0, 3).map((auction) => <AuctionCard key={auction.id} auction={auction} now={now} onBid={startBid} bidBusy={bidBusy} />)}</div>
        ) : <p className="state-message">No live auctions at the moment. Check back soon.</p>}
      </section>

      <section className="recommendation-band" id="recommendations">
        <div className="recommendation-intro"><p className="eyebrow">A LITTLE ALGORITHM, A LOT OF TASTE</p><h2>{copy.recommendationLabel}<span>.</span></h2><p>Ranked by collecting momentum, what’s catching your eye, and the thrill of the final hours.</p><a className="section-link" href="#auctions">See what’s trending <span>↗</span></a></div>
        <div className="recommendation-list">
          {recommendations.length ? recommendations.slice(0, 3).map((pick, index) => (
            <div className="recommendation-row" key={pick.auction.id}>
              <span className="rank">0{index + 1}</span><Artwork product={pick.auction.product} compact />
              <div className="recommendation-details"><h3>{pick.auction.product.name}</h3><p>{pick.bidsLast24Hours} bids today{pick.categoryMatch ? " · In your orbit" : ""}</p></div>
              <div className="recommendation-score"><b>{pick.score}</b><small>score</small></div>
            </div>
          )) : <p className="state-message">Recommendations will appear when live auctions are available.</p>}
        </div>
      </section>

      <section className="section store-section" id="store">
        <div className="section-heading"><div><p className="eyebrow">NO WAITING REQUIRED</p><h2>{copy.storeLabel}<sup>{String(visibleProducts.length).padStart(2, "0")}</sup></h2></div><span className="catalog-note">Collected with intention</span></div>
        <div className="store-toolbar">
          <div className="category-filters" aria-label="Filter pieces by category">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`category-filter ${storeCategory === category ? "category-filter--active" : ""}`}
                aria-pressed={storeCategory === category}
                onClick={() => setStoreCategory(category)}
              >{category}</button>
            ))}
          </div>
          <div className="catalog-controls">
            <label className="catalog-search">
              <span className="sr-only">Search the collection</span>
              <span aria-hidden="true">⌕</span>
              <input type="search" placeholder="Search the collection" value={storeQuery} onChange={(event) => setStoreQuery(event.target.value)} />
            </label>
            <label className="catalog-sort">
              <span className="sr-only">Sort collection</span>
              <select value={storeSort} onChange={(event) => setStoreSort(event.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        </div>
        {visibleProducts.length ? <div className="card-grid store-grid">{visibleProducts.map((product, index) => (
          <article className="item-card store-card" key={product.id} style={{ "--card-order": index }}>
            <div className="store-artwork"><Artwork product={product} /><span className="store-availability">AVAILABLE NOW</span></div>
            <div className="card-body">
              <div className="card-meta"><span>{product.category}</span><span>Curated find</span></div>
              <h3>{product.name}</h3>
              <div className="card-footer"><strong>{money(product.price)}</strong><button className="text-button" onClick={() => startCheckout(product)}>Add to collection <span>↗</span></button></div>
            </div>
          </article>
        ))}</div> : <div className="empty-catalog"><span>◇</span><h3>No pieces found</h3><p>Try another search or clear the category filter.</p><button type="button" onClick={() => { setStoreCategory("All pieces"); setStoreQuery(""); }}>Clear filters</button></div>}
      </section>

      <section className="newsletter">
        <p className="eyebrow">GOOD THINGS ARE WORTH THE WAIT</p><h2>A note when something<br />worth keeping appears.</h2><form onSubmit={(event) => { event.preventDefault(); setError("Thanks for your interest — connect a mailing list provider to subscribe."); }}><input type="email" placeholder="Your email address" aria-label="Your email address" required /><button type="submit" aria-label="Subscribe">↗</button></form><small>Thoughtful updates only. Unsubscribe any time.</small>
      </section>
      <footer><a className="brand" href="#"><span className="brand-mark">{pixelTheme ? "▣" : "✳"}</span>{brand}</a><span>Made for the things we keep.</span><a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top ↑</a></footer>
      <p className="prototype-disclaimer">{demoMode ? "Frontend-only demo · Changes stay in this browser on this device." : "API-connected demo · Changes are saved by the Java backend."} Demo marketplace · Sign in with any registered email and password <strong>1234</strong>. Accounts, bids, and order records are for evaluation only; payments and authentication are simulated.{demoMode && <> <button className="reset-demo-button" type="button" onClick={resetBrowserDemo}>Reset browser demo</button></>}</p>
    </main>
  );
}

export default App;
