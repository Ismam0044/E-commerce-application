# E-commerce Store

A full-stack **PERN** (PostgreSQL · Express · React · Node.js) e-commerce application with TypeScript. Customers browse a product catalog, check out through a real payment provider, and get **order-scoped customer support** via live chat and video calls.

**Live demo:** [https://e-commerce-application-store.onrender.com](https://e-commerce-application-store.onrender.com)

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Running locally](#running-locally)
- [Webhooks](#webhooks)
- [Available scripts](#available-scripts)
- [Deployment](#deployment)
- [API overview](#api-overview)
- [Security notes](#security-notes)
- [Roadmap / things to improve](#roadmap--things-to-improve)

---

## Features

- **Product catalog** with category filtering and optimized, responsive images.
- **Cart** persisted in the browser (survives refresh), managed with Zustand.
- **Secure checkout** — prices are always re-validated server-side; the client never sets the price.
- **Payments** through Polar, with orders created only after a verified payment webhook.
- **Three roles** — `customer`, `support`, `admin` — driving all permissions.
- **Order-scoped support**: live chat per paid order, plus staff-initiated video calls (Stream).
- **Admin dashboard** to create/edit/delete products and upload images (ImageKit).
- **Auth** via Clerk, with users synced into the app's own database by webhook.
- **Error monitoring** with Sentry (front and back), including session replay and user context.
- **Single-image deployment** — the React app is built into the Express server and served same-origin.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, TanStack Query, Zustand, Tailwind CSS + daisyUI, lucide-react |
| Backend | Node.js 22, Express 5, TypeScript |
| Database | PostgreSQL (Neon) via Drizzle ORM + drizzle-kit |
| Validation | Zod (request bodies **and** environment variables) |
| Auth | Clerk |
| Payments | Polar |
| Chat & video | Stream (`stream-chat`, `@stream-io/video-react-sdk`) |
| Images | ImageKit |
| Monitoring | Sentry |
| Deploy | Docker (multi-stage) on Render |

---

## Architecture

This is a **monorepo** with a `backend/` (Express API) and a `frontend/` (React SPA).

- **In development** two processes run together: the Vite dev server (`5173`) and the Express API (`3001`). Vite proxies `/api` and `/webhooks` to the backend.
- **In production** a multi-stage `Dockerfile` builds the React app to static files and copies them into the backend's `public/` folder. Express then serves both the API and the SPA from a single origin, with a catch-all route returning `index.html` so client-side routing works on any URL.

Round trip for any feature:

```
React (browser)  ──HTTP request──▶  Express (Node)  ──SQL via Drizzle──▶  PostgreSQL
React (browser)  ◀──JSON response──  Express (Node)  ◀──rows────────────  PostgreSQL
```

---

## Project structure

```
.
├── backend/
│   ├── src/
│   │   ├── index.ts            # app entry: middleware order, routers, error handlers
│   │   ├── instrument.ts       # Sentry init (loaded before the app)
│   │   ├── db/                 # Drizzle connection + schema (5 tables)
│   │   ├── lib/                # env (Zod), users, roles, stream, polar, imagekit, cron
│   │   ├── middleware/         # attach Clerk user to Sentry scope
│   │   ├── controllers/        # product, checkout, order, stream, admin
│   │   ├── routes/             # thin routers mapping URLs → controllers
│   │   └── webhooks/           # clerk (user sync), polar (payment fulfillment)
│   └── scripts/seed.ts         # ~18 sample products (upsert by slug)
├── frontend/
│   └── src/
│       ├── main.jsx            # providers: Clerk, Query, Router, Sentry boundary
│       ├── App.jsx             # routes + guards
│       ├── lib/                # apiFetch, ImageKit URL/upload helpers
│       ├── store/cart.js       # Zustand cart (persisted to localStorage)
│       ├── hooks/              # one data/logic hook per page
│       ├── pages/              # one component per route
│       ├── components/         # reusable UI
│       └── utils/format.js     # price/date formatting
├── Dockerfile                  # builds frontend + backend into one image
└── package.json                # root "dev" runs both apps via concurrently
```

---

## Getting started

### Prerequisites

- **Node.js 22+** and npm
- Accounts (free tiers work): **Neon** (Postgres), **Clerk** (auth), **Polar** (payments — use sandbox), **Stream** (chat/video), **ImageKit** (images). **Sentry** is optional.

### Install

```bash
# from the project root
npm install                    # root tooling (concurrently)
npm install --prefix backend
npm install --prefix frontend
```

---

## Environment variables

Create `backend/.env` and `frontend/.env`. All values below are **placeholders** — use your own, and never commit real secrets.

### `backend/.env`

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | no (default 3001) | API port |
| `NODE_ENV` | no | `development` / `production` |
| `DATABASE_URL` | **yes** | Neon Postgres connection string |
| `FRONTEND_URL` | **yes** | Base URL of the frontend (e.g. `http://localhost:5173`) |
| `CLERK_PUBLISHABLE_KEY` | **yes** | Clerk publishable key |
| `CLERK_SECRET_KEY` | **yes** | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | for webhook | Clerk webhook signing secret |
| `POLAR_ACCESS_TOKEN` | **yes** | Polar API token |
| `POLAR_WEBHOOK_SECRET` | **yes** | Polar webhook secret |
| `POLAR_API_URL` | no (default `https://api.polar.sh`) | Use the sandbox URL for testing |
| `POLAR_CHECKOUT_PRODUCT_ID` | **yes** | Polar product UUID to charge against |
| `STREAM_API_KEY` | **yes** | Stream API key |
| `STREAM_API_SECRET` | **yes** | Stream API secret |
| `IMAGEKIT_PUBLIC_KEY` | **yes** | ImageKit public key |
| `IMAGEKIT_PRIVATE_KEY` | **yes** | ImageKit private key (starts with `private_`) |
| `IMAGEKIT_URL_ENDPOINT` | **yes** | ImageKit URL endpoint |
| `SENTRY_DSN` | no | Backend Sentry DSN |

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
FRONTEND_URL=http://localhost:5173

CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

POLAR_ACCESS_TOKEN=polar_xxx
POLAR_WEBHOOK_SECRET=xxx
POLAR_API_URL=https://sandbox-api.polar.sh
POLAR_CHECKOUT_PRODUCT_ID=00000000-0000-0000-0000-000000000000

STREAM_API_KEY=xxx
STREAM_API_SECRET=xxx

IMAGEKIT_PUBLIC_KEY=public_xxx
IMAGEKIT_PRIVATE_KEY=private_xxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/yourid

SENTRY_DSN=
```

### `frontend/.env`

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_API_URL=http://localhost:3001
VITE_SENTRY_DSN=
```

> In production, `VITE_API_URL` is left empty so the browser calls `/api` on the same origin the app is served from. `VITE_CLERK_PUBLISHABLE_KEY` is passed as a Docker build argument.

---

## Database

The schema (`backend/src/db/schema.ts`) defines five tables: `users`, `products`, `checkout_sessions`, `orders`, `order_items`. Money is stored as **integer cents**. Foreign keys use `cascade` where children should follow the parent, and `restrict` to protect order history from product deletion.

```bash
cd backend
npm run db:push    # create tables from the schema
npm run db:seed    # insert sample products
```

---

## Running locally

```bash
# from the project root — runs backend (3001) and frontend (5173) together
npm run dev
```

Open **http://localhost:5173**.

---

## Webhooks

Webhooks need a publicly reachable URL. Locally, expose the backend (port `3001`) with a tunnel (e.g. ngrok), then configure:

- **Clerk** → `POST <public-url>/webhooks/clerk` → copy signing secret to `CLERK_WEBHOOK_SECRET`. Keeps the local `users` table in sync (upsert on create/update, delete on delete).
- **Polar** → `POST <public-url>/webhooks/polar` → copy secret to `POLAR_WEBHOOK_SECRET`. On `order.paid`, converts a checkout session into a paid order inside a transaction (with idempotency checks).

> Webhook routes are registered **before** `express.json()` and read the raw body, because signature verification requires the exact bytes that were signed.

---

## Available scripts

| Command | Where | Description |
| --- | --- | --- |
| `npm run dev` | root | Run backend + frontend together |
| `npm run dev` | backend | Backend only (tsx watch, with Sentry) |
| `npm run build` | backend | Compile TypeScript to `dist/` |
| `npm run start` | backend | Run the compiled server |
| `npm run db:push` | backend | Apply the schema to the database |
| `npm run db:seed` | backend | Seed sample products |
| `npm run dev` | frontend | Vite dev server |
| `npm run build` | frontend | Bundle the SPA to `dist/` |
| `npm run lint` | frontend | ESLint |

---

## Deployment

Deployed as a **single Docker image on Render**:

1. **Stage 1** builds the React app (`frontend/dist`).
2. **Stage 2** compiles the TypeScript backend (`dist`).
3. **Stage 3** is a slim runtime that installs production deps, copies the compiled backend and the frontend build (as `public/`), and runs `node dist/index.js`.

Set all backend env vars in Render's dashboard, and pass `VITE_CLERK_PUBLISHABLE_KEY` as a build argument. The database is Neon Postgres. A `node-cron` job pings `/health` every 14 minutes to keep the instance warm.

---

## API overview

`Auth` = requires a valid Clerk token in the `Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/products` | – | List active products (`?category=` optional) |
| GET | `/api/products/categories` | – | Distinct category list |
| GET | `/api/products/:slug` | – | One product by slug |
| GET | `/api/me` | ✔ | Current user's local row (includes role) |
| POST | `/api/checkout` | ✔ | Create a checkout session, returns Polar URL |
| GET | `/api/orders` | ✔ | Own orders (all orders for staff) |
| GET | `/api/orders/:id` | ✔ | One order + items (owner or staff) |
| POST | `/api/orders/:id/stream-channel` | ✔ | Ensure support chat channel (paid orders) |
| POST | `/api/orders/:id/video-invite` | ✔ staff | Post a video-call invite into chat |
| POST | `/api/stream/token` | ✔ | Mint a scoped Stream token |
| GET | `/api/admin/imagekit/auth` | ✔ admin | Signed ImageKit upload credentials |
| GET | `/api/admin/products` | ✔ admin | All products (incl. inactive) |
| POST | `/api/admin/products` | ✔ admin | Create a product |
| PATCH | `/api/admin/products/:id` | ✔ admin | Update a product (partial) |
| DELETE | `/api/admin/products/:id` | ✔ admin | Delete (409 if it's on an order) |
| POST | `/webhooks/clerk` | signed | Sync users from Clerk |
| POST | `/webhooks/polar` | signed | Fulfill orders on payment |
| GET | `/health` | – | Liveness check |

---

## Security notes

- **Prices are re-validated server-side** at checkout from the database; the client only sends product ids and quantities.
- **Orders are created by the signed payment webhook**, not by the browser redirect, and fulfillment runs in a **transaction** with **idempotency** checks to prevent duplicate orders.
- **Webhook signatures** are verified using the raw request body.
- **Stream tokens** are minted server-side so the Stream secret never reaches the browser.
- **Authorization** is enforced on the backend (`requireAdmin`, role checks) — frontend guards are for UX only.
- **Secrets** must live only in untracked `.env` files (and the host's dashboard). Do not commit real credentials; if any were ever committed, **rotate them**.

---

Built with the PERN stack, TypeScript, and a set of managed services for auth, payments, chat/video, images, and monitoring.
