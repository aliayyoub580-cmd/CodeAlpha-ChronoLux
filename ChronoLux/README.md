# ChronoLux — Premium Watch Boutique

ChronoLux is a polished e-commerce demo showcasing a premium watch store experience. This repository contains a simple Node/Express backend and a static frontend that together demonstrate product listing, filtering, cart flow, and admin management for products and orders.

**Live demo (local)**: start the backend and open `http://localhost:5000` in your browser.

**Video preview**

<video controls width="840" poster="public/men%20watches/hero-luxury-men.jpg">
  <source src="public/ChronoLux.mp4" type="video/mp4">
  Your browser does not support the video tag. You can download the demo: [Download demo video](public/ChronoLux.mp4)
</video>

---

**Quick Overview**
- **Purpose**: Showcase a small e-commerce storefront with product browsing, filtering, and cart features.
- **Frontend**: Static HTML/CSS/JS in the `frontend/` folder.
- **Backend**: Node.js + Express in the `backend/` folder with a lightweight DB adapter and seed utilities.
- **Assets**: Product images and media live in the `public/` folder (the demo video is `public/ChronoLux.mp4`).

**Highlights**
- Product grid with filtering, sorting and search
- Add-to-cart flow persisted to `localStorage`
- Product detail pages with image gallery
- Admin pages for product and order management (example controllers included)

**Folder structure (top-level)**
- `backend/` — Express API, routes, controllers, DB adapter
- `frontend/` — HTML, CSS, JS (product rendering and UI)
- `public/` — static assets (images, video, etc.)

**Quick Start (Local)**
1. Install dependencies and run the backend

```bash
cd backend
npm install
npm run dev
```

2. Open the frontend in your browser (served by the backend static middleware):

```
http://localhost:5000
```

3. Shop — products are seeded automatically when the API initializes. The demo video is accessible at `http://localhost:5000/public/ChronoLux.mp4`.

**Developer Notes**
- Product seed data is sourced from `frontend/js/data.js` and synced into the backend on startup.
- Static assets are served from `/public` via `express.static` in `backend/server.js`.
- Cart is client-side (stored in `localStorage`) — use the browser DevTools Application > Local Storage to inspect `chronolux_cart`.

**Known details**
- The demo uses image paths with URL-encoded spaces (e.g. `men%20watches`) to match the `public/` folder layout.
- If you move the `public/ChronoLux.mp4` file, update the path in this README accordingly.

**Contributing**
Contributions welcome. Open an issue or PR with suggested improvements.

**License & Credits**
This project is provided as-is for demo and educational purposes. Credit to the original author and photographer assets if used beyond development.

---

If you want a smaller poster image, a trimmed version of the video, or a GitHub-friendly animated GIF for the README preview, I can generate or add those next.
# ChronoLux

ChronoLux is a premium dark-luxury e-commerce watch store built with HTML, CSS, vanilla JavaScript, Node.js, Express.js, and MongoDB.

## Project Structure

- `frontend/` - static website pages, styles, and browser logic
- `backend/` - REST API, authentication, models, and order processing
- `public/` - provided watch images used by the frontend and API seed data

## Frontend Pages

- Home
- Shop
- Product Details
- Cart
- Checkout
- Login
- Register
- Dashboard
- Order Success

## Backend Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `POST /api/orders`
- `GET /api/orders/my-orders`
- `GET /api/orders/:id`

## Setup

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Start the API:

```bash
npm run dev
```

3. Open `frontend/index.html` in a browser or run it with Live Server.

## Notes

- Guest cart data is stored in `localStorage` under `chronolux_cart`.
- Auth token is stored in `localStorage` under `chronolux_token`.
- The backend seeds sample products from the bundled watch image paths when the database is empty.
