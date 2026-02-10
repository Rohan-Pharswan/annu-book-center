# Annu Book Store

Production-ready full-stack web application for a local bookstore + stationery business using Next.js, MongoDB Atlas, JWT auth, and role-based admin controls.

## Tech stack

- Frontend: Next.js App Router
- Backend: Next.js API Routes (`app/api`)
- Database: MongoDB Atlas + Mongoose
- Auth: JWT (HTTP-only cookie)
- Password hashing: `bcryptjs`
- Validation: `zod`
- Optional image hosting: Cloudinary

## Features implemented

- User signup/login/logout and session handling
- User profile and multiple saved addresses
- Product listing with search, category filter, pagination
- Product details with reviews and average rating
- Cart add/update/remove
- Checkout with Cash on Delivery and order placement
- Order tracking statuses: Pending, Confirmed, Shipped, Delivered, Cancelled
- Wishlist add/remove
- Session booking with status tracking
- Admin panel:
  - Product add/edit/delete, stock and price update
  - Category management
  - Order status updates
  - User listing
  - Booking approval/rejection
  - Discount creation/toggling (product/category scope)
  - Review moderation delete
  - Low stock alerts
- Security:
  - Server-side validation
  - JWT route protection
  - Admin authorization checks
  - Rate limiting on auth APIs

## Project structure

```txt
app/
  api/...
  admin/...
  products/[id]/page.js
  page.js
components/
lib/
models/
```

## Local setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Fill `.env.local` values:
- `MONGODB_URI`
- `JWT_SECRET`
- Optional Cloudinary variables

4. Run development server:
```bash
npm run dev
```

5. Open:
- `http://localhost:3000`

## MongoDB Atlas connection guide

1. Create a MongoDB Atlas cluster.
2. In Network Access, allow your IP (or `0.0.0.0/0` for controlled production usage).
3. Create a database user.
4. Copy connection string and set `MONGODB_URI` in `.env.local`.

## Make an admin user

Use MongoDB Atlas UI or a one-time script to change a user role:

```js
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } });
```

## Vercel deployment steps

1. Push this project to GitHub.
2. In Vercel, click `Add New Project` and import the repo.
3. In Vercel project settings, add environment variables from `.env.example`.
4. Deploy.
5. After deploy, test:
- signup/login
- admin role access
- product APIs
- order flow

## Production notes

- Auth token uses secure HTTP-only cookie in production.
- MongoDB connection uses cached pooling pattern.
- API layout is modular and ready for service extraction later if traffic grows.
- For scalable rate limiting, replace in-memory limiter with Redis-based limiter in production.

