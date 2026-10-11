import { useState } from "react";

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function FlowHeader({ brand, pixelTheme, onBack, actionLabel = "Back to the collection" }) {
  return (
    <header className="flow-header">
      <a className="brand" href="#" onClick={(event) => { event.preventDefault(); onBack(); }}>
        <span className="brand-mark">{pixelTheme ? "▣" : "✳"}</span>{brand}
      </a>
      <button className="flow-back" type="button" onClick={onBack}>← {actionLabel}</button>
    </header>
  );
}

export function AccountDialog({ initialMode = "signin", onClose, onAuthenticate }) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      await onAuthenticate({
        mode,
        displayName: String(form.get("displayName") || "").trim(),
        email: String(form.get("email") || "").trim().toLowerCase(),
        password: String(form.get("password") || ""),
      });
    } catch (authError) {
      setError(authError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="experience-dialog account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close sign-in">×</button>
        <p className="eyebrow">A SMALL COLLECTOR'S CLUB</p>
        <h2 id="account-title">{mode === "signup" ? "Make yourself at home." : "Welcome back."}</h2>
        <p className="flow-muted">Demo account only. Use any email and the shared demo password <strong>1234</strong>.</p>
        <div className="account-tabs" role="tablist" aria-label="Account options">
          <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "is-active" : ""} onClick={() => { setMode("signin"); setError(""); }}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "is-active" : ""} onClick={() => { setMode("signup"); setError(""); }}>Create account</button>
        </div>
        <form className="flow-form" onSubmit={submit}>
          {mode === "signup" && <label>Display name<input name="displayName" autoComplete="name" placeholder="Your name" minLength="2" maxLength="100" required /></label>}
          <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
          <label>Demo password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="1234" required /></label>
          {error && <p className="flow-error" role="alert">{error}</p>}
          <button className="flow-primary" type="submit" disabled={busy}>{busy ? "One moment…" : mode === "signup" ? "Create demo account ↗" : "Sign in ↗"}</button>
        </form>
        <p className="demo-auth-note">Demo access is not real authentication. Never reuse a real password here.</p>
      </section>
    </div>
  );
}

export function BidDialog({ auction, product, onClose, onSubmit }) {
  const minimum = Number(auction.currentHighestPrice) + 10;
  const [amount, setAmount] = useState(minimum.toFixed(2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!Number.isFinite(Number(amount)) || Number(amount) < minimum) {
      setError(`Your bid must be at least ${money(minimum)}.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit(Number(amount));
    } catch (bidError) {
      setError(bidError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="experience-dialog bid-dialog" role="dialog" aria-modal="true" aria-labelledby="bid-title">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close bid form">×</button>
        <p className="eyebrow">MAKE IT YOURS</p>
        <h2 id="bid-title">Place a bid.</h2>
        <p className="flow-muted">{product.name} · Current bid <strong>{money(auction.currentHighestPrice)}</strong></p>
        <form className="flow-form" onSubmit={submit}>
          <label>Your bid (USD)<input aria-label="Your bid" type="number" min={minimum} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
          <p className="flow-hint">Minimum next bid: {money(minimum)}. Your offer is saved to this demo auction.</p>
          {error && <p className="flow-error" role="alert">{error}</p>}
          <button className="flow-primary" type="submit" disabled={busy}>{busy ? "Submitting bid…" : "Confirm bid ↗"}</button>
        </form>
        <p className="demo-auth-note">Demo bidding only. No payment method is collected or charged.</p>
      </section>
    </div>
  );
}

export function CheckoutPage({ brand, pixelTheme, product, account, addressStorageKey, onBack, onPlaceOrder }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const savedAddress = (() => {
    try {
      return JSON.parse(localStorage.getItem(addressStorageKey) || "null") || {};
    } catch (storageError) {
      console.warn("Could not read the saved demo checkout address.", storageError);
      return {};
    }
  })();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const address = Object.fromEntries(
      ["firstName", "lastName", "email", "address", "address2", "city", "region", "postalCode", "country"]
        .map((field) => [field, String(form.get(field) || "").trim()]),
    );
    try {
      await onPlaceOrder({
        address,
        paymentMethod: String(form.get("paymentMethod") || "Demo card"),
        saveAddress: form.get("saveAddress") === "on",
      });
    } catch (orderError) {
      setError(orderError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!product) {
    return <main className={`app-shell ${pixelTheme ? "theme-pixel" : "theme-artisan"} flow-shell`}>
      <FlowHeader brand={brand} pixelTheme={pixelTheme} onBack={onBack} />
      <section className="flow-empty"><p className="eyebrow">NOTHING IN THE PARCEL</p><h1>Your checkout is waiting.</h1><button className="flow-primary" type="button" onClick={onBack}>Explore the collection ↗</button></section>
    </main>;
  }

  return (
    <main className={`app-shell ${pixelTheme ? "theme-pixel" : "theme-artisan"} flow-shell`}>
      <FlowHeader brand={brand} pixelTheme={pixelTheme} onBack={onBack} />
      <div className="checkout-intro">
        <p className="eyebrow">A GOOD FIND, ON ITS WAY</p>
        <h1>Make it yours.</h1>
        <p>Review your details, then place a demo order. No payment is collected.</p>
      </div>
      <form className="checkout-layout" onSubmit={submit}>
        <section className="checkout-card">
          <div className="checkout-section-heading"><span>01</span><div><h2>Billing & collection details</h2><p>We’ll attach these details to your demo receipt.</p></div></div>
          <div className="checkout-fields">
            <label>First name<input name="firstName" autoComplete="given-name" defaultValue={savedAddress.firstName || ""} required /></label>
            <label>Last name<input name="lastName" autoComplete="family-name" defaultValue={savedAddress.lastName || ""} required /></label>
            <label className="checkout-field-wide">Email address<input name="email" type="email" autoComplete="email" defaultValue={account?.email || savedAddress.email || ""} required /></label>
            <label className="checkout-field-wide">Address<input name="address" autoComplete="address-line1" defaultValue={savedAddress.address || ""} required /></label>
            <label className="checkout-field-wide">Address line 2 <span className="field-optional">Optional</span><input name="address2" autoComplete="address-line2" defaultValue={savedAddress.address2 || ""} /></label>
            <label>City<input name="city" autoComplete="address-level2" defaultValue={savedAddress.city || ""} required /></label>
            <label>State / region<input name="region" autoComplete="address-level1" defaultValue={savedAddress.region || ""} required /></label>
            <label>Postal code<input name="postalCode" autoComplete="postal-code" defaultValue={savedAddress.postalCode || ""} required /></label>
            <label>Country<select name="country" autoComplete="country-name" defaultValue={savedAddress.country || "United States"}><option>United States</option><option>Canada</option><option>United Kingdom</option><option>Australia</option><option>India</option></select></label>
          </div>
          <label className="save-address"><input type="checkbox" name="saveAddress" /><span>Remember this address on this device</span></label>
          <div className="checkout-section-heading payment-heading"><span>02</span><div><h2>Demo payment</h2><p>Choose a display-only payment method for the receipt.</p></div></div>
          <div className="payment-options">
            {["Demo card", "Demo wallet", "PayPal (demo)"].map((method, index) => (
              <label className="payment-option" key={method}><input type="radio" name="paymentMethod" value={method} defaultChecked={index === 0} /><span><b>{method}</b><small>{index === 0 ? "No card number is requested" : "No payment account is connected"}</small></span></label>
            ))}
          </div>
          <div className="payment-disclaimer">Prototype checkout only. Never enter card numbers or financial credentials; this demo does not process payments.</div>
          {error && <p className="flow-error" role="alert">{error}</p>}
          <button className="flow-primary checkout-submit" type="submit" disabled={busy}>{busy ? "Saving your order…" : "Place demo order ↗"}</button>
        </section>
        <aside className="order-summary">
          <p className="eyebrow">YOUR COLLECTOR'S PARCEL</p>
          <h2>Order summary</h2>
          <div className="summary-product"><div className="summary-art">{pixelTheme ? "▣" : "✳"}</div><div><b>{product.name}</b><span>{product.category}</span></div><strong>{money(product.price)}</strong></div>
          <div className="summary-line"><span>Subtotal</span><b>{money(product.price)}</b></div>
          <div className="summary-line"><span>Shipping</span><b>Complimentary</b></div>
          <div className="summary-line"><span>Tax</span><b>Not calculated in demo</b></div>
          <div className="summary-total"><span>Demo order total</span><b>{money(product.price)}</b></div>
          <p className="summary-footnote">This records a marketplace purchase for the demo account. It does not charge you.</p>
        </aside>
      </form>
    </main>
  );
}

export function OrderConfirmationPage({ brand, pixelTheme, order, onBack }) {
  if (!order) {
    return <main className={`app-shell ${pixelTheme ? "theme-pixel" : "theme-artisan"} flow-shell`}>
      <FlowHeader brand={brand} pixelTheme={pixelTheme} onBack={onBack} />
      <section className="flow-empty"><p className="eyebrow">NO ORDER TO DISPLAY</p><h1>Let’s find something wonderful.</h1><button className="flow-primary" type="button" onClick={onBack}>Return to the collection ↗</button></section>
    </main>;
  }

  const product = order.product || order.purchase?.product;
  const total = order.priceAtPurchase ?? order.purchase?.priceAtPurchase ?? product?.price ?? 0;
  const address = order.address || {};
  const orderCode = `AB-${String(order.id || "DEMO").padStart(6, "0")}`;

  function downloadReceipt() {
    const receipt = [
      brand,
      "DEMO ORDER RECEIPT",
      `Order: ${orderCode}`,
      `Date: ${new Date(order.purchasedAt || Date.now()).toLocaleString()}`,
      "",
      `Item: ${product?.name || "Collectible"}`,
      `Category: ${product?.category || "Collection"}`,
      `Total: ${money(total)}`,
      `Payment: ${order.paymentMethod || "Demo payment"} (not charged)`,
      "",
      `Ship to: ${address.firstName || ""} ${address.lastName || ""}`.trim(),
      address.address,
      address.address2,
      [address.city, address.region, address.postalCode].filter(Boolean).join(", "),
      address.country,
      address.email,
      "",
      "Demo receipt only. No payment was processed.",
    ].filter((line) => line !== undefined).join("\n");
    const url = URL.createObjectURL(new Blob([receipt], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `collectors-market-${orderCode.toLowerCase()}-receipt.txt`;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className={`app-shell ${pixelTheme ? "theme-pixel" : "theme-artisan"} flow-shell confirmation-shell`}>
      <FlowHeader brand={brand} pixelTheme={pixelTheme} onBack={onBack} actionLabel="Continue exploring" />
      <nav className="breadcrumbs" aria-label="Checkout progress"><span>Collection</span><i>›</i><span>Checkout</span><i>›</i><strong>Order confirmed</strong></nav>
      <section className="confirmation-hero">
        <span className="confirmation-check" aria-hidden="true">✓</span>
        <p className="eyebrow">A LOVELY CHOICE</p>
        <h1>Thank you for your order.</h1>
        <p>Your collectible has been added to your demo collection. Here’s your order summary.</p>
        <span className="order-number">ORDER {orderCode}</span>
        <div className="confirmation-rule" />
        <h2>Demo order saved successfully</h2>
        <p className="confirmation-payment">{order.paymentMethod || "Demo payment"} · No payment was taken</p>
      </section>
      <div className="confirmation-layout">
        <section className="receipt-items">
          <p className="eyebrow">WHAT YOU COLLECTED</p>
          <article className="receipt-product">
            <div className="summary-art receipt-art">{pixelTheme ? "▣" : "✳"}</div>
            <div><h2>{product?.name || "Collectible"}</h2><p>{product?.category || "Curated collection"}</p><span>Quantity · 1</span></div>
            <strong>{money(total)}</strong>
          </article>
          <div className="receipt-address"><div><p className="eyebrow">COLLECTION DETAILS</p><strong>{[address.firstName, address.lastName].filter(Boolean).join(" ")}</strong><span>{address.address}{address.address2 ? `, ${address.address2}` : ""}</span><span>{[address.city, address.region, address.postalCode].filter(Boolean).join(", ")}</span><span>{address.country}</span><span>{address.email}</span></div><div><p className="eyebrow">ORDER DATE</p><strong>{new Date(order.purchasedAt || Date.now()).toLocaleDateString()}</strong></div></div>
        </section>
        <aside className="confirmation-total"><p className="eyebrow">THE LITTLE DETAILS</p><h2>Order total</h2><div className="summary-line"><span>Subtotal</span><b>{money(total)}</b></div><div className="summary-line"><span>Shipping</span><b>Complimentary</b></div><div className="summary-total"><span>Total</span><b>{money(total)}</b></div><p className="summary-footnote">Order {orderCode} is saved in the marketplace. This demo does not arrange delivery or take payment.</p><button type="button" className="flow-primary" onClick={downloadReceipt}>Download receipt ↓</button><button type="button" className="receipt-print" onClick={() => window.print()}>Print this page</button></aside>
      </div>
    </main>
  );
}
