# Claim Perks — prototype

A working slice of the full Claim Perks vision: search a product, see every coupon,
cashback, bank, and UPI offer that applies to it, and get the real final price —
not the sticker price.

This prototype uses a mock JSON "database" instead of MongoDB so it runs anywhere
in seconds, with no setup. The API is structured so swapping mock JSON reads for
real MongoDB queries later is a drop-in change — the routes and response shapes
don't need to change.

## What's built

- Product catalog: **132 products across 8 categories** (Electronics, Fashion, Home & Kitchen,
  Beauty, Grocery, Sports & Fitness, Books & Stationery, Toys & Baby), with category filter chips and pagination
- Offer aggregation: coupons, cashback, bank offers, UPI offers per product — generated with
  category-aware rules (electronics lean on bank card offers, fashion/beauty lean on cashback,
  grocery/books get small flat discounts) so discounts stay realistic (worst case ~30% off, not
  an unrealistic 70%+)
- Final price calculator — picks the best offer in each category and computes
  what you'd actually pay
- "Best payment method" suggestion (rule-based: whichever single offer saves the most)
- Clean UI with a signature "receipt" breakdown view, real site navigation (Home/Dashboard) and footer
- **User registration & login** — JWT + bcrypt, real password hashing, three roles: shopper, business, admin
- **User dashboard** — favorites and shopping history
- **Business dashboard** — businesses sign up, create coupon campaigns for any product, see each campaign's approval status
- **Admin dashboard** — approve/reject pending campaigns, view platform stats, view registered users
- Approved business campaigns flow live into the shopper-facing offer calculator — the loop is fully connected, not three separate demos

## What's intentionally out of scope (future roadmap)

- Real e-commerce / bank / UPI API integrations (all offer data is generated sample data)
- AI-powered personalized recommendations, price-drop prediction
- Browser extension
- A real database (MongoDB) — currently mock JSON files act as the data layer; the API is structured so swapping this in later doesn't require route changes

## Regenerating the catalog

`backend/scripts/generateCatalog.js` builds `products.json` and `offers.json` from scratch.
Run it again any time you want a fresh randomized set of prices/offers over the same 132 product names:

```bash
cd backend
node scripts/generateCatalog.js
```

## Demo accounts

An admin account is seeded automatically the first time the backend starts:

```
admin@claimperks.com / admin123
```

For the business and shopper roles, register through the app — on the sign-up
screen there's a toggle for "I'm shopping" vs "I'm a business."

**Suggested demo flow:** register a business account → create a coupon
campaign → log out → log in as admin → approve the campaign → log out → log
in (or register) as a shopper → search for that product → see the approved
campaign's discount appear in the price breakdown alongside the built-in offers.

## Running it

You'll need Node.js 18+ installed.

### 1. Backend (port 5000)

```bash
cd backend
npm install
npm start
```

Test it's working: open http://localhost:5000/api/products in your browser —
you should see a JSON list of products.

### 2. Frontend (port 5173)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the frontend proxies `/api` requests to the backend
automatically (configured in `vite.config.js`), so both need to be running.

## Project structure

```
claim-perks/
├── backend/
│   ├── data/
│   │   ├── products.json      # mock product catalog
│   │   └── offers.json        # mock offers per product (coupons, cashback, etc.)
│   ├── routes/api.js          # GET /products, GET /offers/:id, POST /calc-price
│   ├── utils/priceCalculator.js  # the core "final price" logic
│   └── server.js
└── frontend/
    └── src/
        ├── api/client.js      # axios calls to the backend
        ├── components/        # SearchBar, ProductCard, OfferReceipt, Header
        └── App.jsx
```

## API endpoints

| Method | Path | Auth? | Description |
|---|---|---|---|
| GET | `/api/products?query=phone&category=Electronics&page=1&limit=24` | No | Paginated, filterable catalog search |
| GET | `/api/categories` | No | Category names with product counts, for filter chips |
| GET | `/api/products/:id` | No | Single product |
| GET | `/api/offers/:productId` | No | All offers + calculated best price for a product |
| POST | `/api/calc-price` `{ productId }` | No | Just the price calculation |
| POST | `/api/auth/register` `{ name, email, password }` | No | Create an account, returns a JWT |
| POST | `/api/auth/login` `{ email, password }` | No | Returns a JWT |
| GET | `/api/user/me` | Yes | Current user's profile |
| GET | `/api/user/favorites` | Yes | Full product list of saved favorites |
| POST | `/api/user/favorites/:productId` | Yes | Toggle a product as favorited |
| GET | `/api/user/history` | Yes (shopper) | Last 20 products viewed, most recent first |
| POST | `/api/user/history/:productId` | Yes (shopper) | Log a product view |
| GET | `/api/business/coupons` | Yes (business) | List your own campaigns |
| POST | `/api/business/coupons` `{ productId, code, type, value, maxValue }` | Yes (business) | Create a campaign (starts "pending") |
| DELETE | `/api/business/coupons/:id` | Yes (business) | Remove your own campaign |
| GET | `/api/admin/coupons?status=pending` | Yes (admin) | List campaigns, optionally filtered by status |
| POST | `/api/admin/coupons/:id/approve` | Yes (admin) | Approve a campaign |
| POST | `/api/admin/coupons/:id/reject` | Yes (admin) | Reject a campaign |
| GET | `/api/admin/users` | Yes (admin) | List all registered users |
| GET | `/api/admin/stats` | Yes (admin) | Platform counts for the analytics cards |

Protected routes expect `Authorization: Bearer <token>`. The frontend handles
this automatically once you're logged in (token is stored in `localStorage`
and attached to every request).

**Note:** `backend/data/users.json` is a plain file the server reads/writes —
fine for a prototype, but it means passwords are only as safe as the file
itself. Don't reuse a real password when testing registration.

## Swapping in MongoDB later

`backend/data/*.json` and the two `require(...)` lines in `routes/api.js` are the
only mock-specific pieces. Replace them with Mongoose models and queries and the
rest of the API (routes, response shapes, price-calculation logic) stays the same.
