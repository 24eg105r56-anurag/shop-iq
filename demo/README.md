# Collectors Market

One shared Spring Boot API and React UI can be run in either student-project theme. The theme is selected independently by the backend and frontend, so set both variables to the same value.

| Theme | `APP_THEME` / `VITE_THEME` | Seed categories |
|---|---|---|
| Artisanal Bids | `artisanal-bids` | Paintings, Sculpture, Antique Furniture, Ceramics |
| Pixel & Card Vault | `pixel-card-vault` | Trading Cards, Retro Games, Comics |

## Frontend-only demo (no Java or database required)

The standalone demo runs entirely in the browser and is the default when `VITE_DEMO_MODE` is unset or `true`. It seeds a theme-specific set of products and auctions, then saves new profiles, bids, purchases, and recommendations in that browser's local storage. It is useful for a Vercel presentation, but data is not shared between visitors or devices; authentication, payment, and fulfillment are simulated.

Profiles, saved addresses, and checkout/confirmation state are separated by theme and by browser-demo versus API mode. The footer's **Reset browser demo** action clears the current browser demo theme and starts it fresh.

Run it locally from PowerShell:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:5173`. The example file selects the Artisanal Bids theme. To use Pixel & Card Vault, set `VITE_THEME=pixel-card-vault` in `frontend/.env.local` and restart the dev server. If you previously set `VITE_DEMO_MODE=false` in a terminal or `.env.local`, change it to `true` (or remove it) and restart Vite; Vite reads environment variables when it starts. Use the **Reset browser demo** control at the bottom of the page to clear that theme's saved demo profile, bids, purchases, and address on the current browser.

Run the browser-demo adapter checks from `frontend` with `npm test`.

### Deploy the frontend to Vercel

1. Push this project to a Git provider and import the repository in Vercel.
2. Set **Root Directory** to `demo/frontend` (or `frontend` if `demo` itself is the repository root).
3. Select **Vite** as the framework. Use build command `npm run build` and output directory `dist`.
4. Add these build environment variables in Vercel:

   | Name | Value |
   |---|---|
   | `VITE_DEMO_MODE` | `true` |
   | `VITE_THEME` | `artisanal-bids` or `pixel-card-vault` |

5. Deploy or redeploy the project. No backend URL, database, or hosting configuration is needed for this browser-only variant.

The Vercel site can be visited and its flows tried without a Java server. Each visitor gets independent data saved in their own browser on that deployment's domain. Clearing browser site data or using another browser/device removes or does not carry over those records. Do not enter real personal, payment, or account information.

## Full-stack local run

Start the backend and PostgreSQL:

```powershell
$env:APP_THEME = "artisanal-bids"
docker compose -f docker-compose.yml up --build
```

Start the React frontend in a second terminal (disable frontend-only demo mode):

```powershell
cd frontend
npm install
$env:VITE_THEME = "artisanal-bids"
$env:VITE_DEMO_MODE = "false"
$env:VITE_API_BASE_URL = "http://localhost:8080"
npm run dev
```

Open `http://localhost:5173`. Use `pixel-card-vault` in both theme variables for the alternate project. For a clean database seed, remove the named `postgres-data` volume before changing theme; seed creation only happens when the database is empty. Set `FRONTEND_ORIGIN` to the deployed frontend origin when hosting the API elsewhere.

## REST API

JSON endpoints use `/api`:

| Resource | Routes |
|---|---|
| Users | `GET/POST /users`, `GET/PUT/DELETE /users/{id}` |
| Products | `GET/POST /products`, `GET/PUT/DELETE /products/{id}`; filter storefront items with `GET /products?buyNow=true` |
| Auctions | `GET/POST /auctions`, `GET/PUT/DELETE /auctions/{id}`; `GET /auctions?activeOnly=true` filters live auctions |
| Bids | `GET/POST /auctions/{id}/bids`; `GET/PUT/DELETE /auctions/bids/{bidId}` |
| Buy-now purchases | `POST /purchases` with `buyerId` and `productId`; `GET /users/{userId}/purchases` |
| Recommendations | `GET /recommendations?userId={id}&limit=10`; `GET /recommendations/hot?limit=10` |

An auction request has `productId`, `sellerId`, `startingPrice`, and `endsAt` (ISO-8601 timestamp). A bid request has `bidderId` and `amount`. Bids must exceed the persisted current highest price; bid submission locks the auction row to prevent concurrent bids from both winning. Deleting an auction also removes its bids. Products/users referenced by auctions cannot be deleted until their dependent auctions are removed.

## Recommendation score

Recommendations rank active auctions by a transparent, deterministic score:

- Up to **40 points** for bid velocity (4 points per bid in the trailing 24 hours).
- **40 points** when the auction category matches a category the user previously bid on.
- Up to **30 urgency points** for auctions ending within two hours, increasing linearly as the end time approaches.

The maximum score is 110. With a `userId`, the affinity component uses that user's prior bids and buy-now purchases. Without a `userId`, the affinity component is zero and hot auctions rank by velocity and urgency. This is a local Java inference algorithm; it uses no external AI service.

The purchase endpoint records a demo purchase for affinity and order-history behavior only; integrate a payment provider before accepting real orders.

## Frontend component slots

The responsive dashboard is under `frontend/src`. Its shared “Latest” feature highlights real buy-now inventory as two small feature tiles and one lead item; the buy buttons record a purchase through the Java API. The storefront includes category chips, live search, price/name sorting, empty states, and responsive collectible cards inspired by the supplied catalog example. Cards use a small CSS pointer-tilt and hover lift inspired by the supplied parallax example; reduced-motion preferences are respected.

Replace the hero block marked `INSERT_PREMIUM_HERO_HERE` in `frontend/src/App.jsx` with the premium hero component, and use the auction, recommendation, and storefront sections as independent drop-in regions. Theme tokens and styling are in `frontend/src/styles.css`. This project uses plain Vite/React and CSS rather than shadcn, Tailwind, TypeScript, or a motion library; the references are adapted without adding a component framework or heavy animation dependency.

## Account, bidding, and checkout demo

The header supports creating a demo collector profile or signing in to an existing profile. Create an account with any valid email address and the shared demo password `1234`; the profile is saved through `POST /api/users` in API mode or browser local storage in frontend-only mode, while the active session is kept in browser local storage. The seeded account `collector@example.test` can also be used with password `1234`. Signing out clears the local session. Passwords are not stored.

This account screen is a lightweight prototype, **not production authentication**: the password is shared and the API does not authorize requests. Do not use a real password or private account details. Add a real identity provider and server-side authorization before deployment for public or sensitive use.

Auction cards open an amount-entry dialog. The minimum bid is the current price plus $10, and a valid bid is persisted through `POST /api/auctions/{id}/bids` in API mode or to browser local storage in frontend-only mode.

Storefront and featured-product buttons open a billing-details checkout. Submitting it creates a purchase record through the API or in browser local storage, then opens a separate confirmation page with a downloadable text receipt and print option. The address can optionally be remembered on that browser. Payment choices are display-only; the page does not request card numbers, process a charge, calculate tax, or arrange shipping. These are evaluation/demo orders, not fulfillable transactions.

For separate frontend/backend hosting, set `VITE_API_BASE_URL` to the deployed API origin in the frontend's **build-time** environment (for example, the Vercel project settings), and set `FRONTEND_ORIGIN` on the backend to the exact deployed frontend origin. The frontend never needs database credentials. The demo authentication described above must be replaced with real authentication and authorization before exposing a deployed backend publicly.
