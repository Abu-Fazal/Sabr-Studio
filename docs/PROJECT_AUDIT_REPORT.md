# Sabr Studio — Comprehensive Technical Repository Audit Report

> **Audit Date:** November 3, 2026  
> **Auditor Role:** Senior Full-Stack Software Engineer, Systems Architect & Security Reviewer  
> **Repository:** [Abu-Fazal/Sabr-Studio](https://github.com/Abu-Fazal/Sabr-Studio)  
> **Target Environment:** Production (`sabrstudio.in`), Vercel Serverless, Hostinger Managed Node.js  
> **Audit Status:** Verified against source code  

---

## 1. Executive Summary

This report presents an exhaustive, evidence-based architectural and code-level audit of the **Sabr Studio** repository. Sabr Studio is an editorial full-stack web platform built for a bespoke architectural design studio and furniture atelier. The application couples a public-facing editorial website and e-commerce catalogue with an administrative dashboard, custom content management system (CMS), media management pipeline, and Razorpay-powered checkout engine.

Every assertion in this report has been verified against the physical source code files, configurations, schemas, and test suites across the monorepo.

---

## 2. Repository Structure & Configuration Audit

### 2.1 Workspace Organization
The repository is structured as a clean monorepo comprising:
- **`frontend/`**: Single Page Application built with React 18, Vite 5, Tailwind CSS 3, Framer Motion, and Lenis smooth scrolling.
- **`backend/`**: RESTful API server implemented with Node.js (ESM modules), Express 4, and Mongoose 8.
- **`api/`**: Serverless entry point (`api/index.js`) adapting the Express application for Vercel Serverless Functions.
- **`scripts/`**: Operational tooling for local dual-process booting (`dev.mjs`), production building (`build.mjs`), database index synchronization (`sync-indexes.mjs`), environment secret auditing (`check-env-leaks.mjs`), and comprehensive route verification (`test-all-routes.mjs`).
- **`docs/`**: Technical documentation, architecture diagrams, screenshot capture specifications, and agent handoff logs.

### 2.2 Build & Packaging Configurations
- **Root `package.json`**:
  - Engine constraint: `node >=20`.
  - Defines unified orchestration scripts: `npm run dev`, `npm run dev:backend`, `npm run dev:frontend`, `npm run test:routes`, `npm run build`, and `npm run install:all`.
- **Frontend Configuration (`frontend/vite.config.js` & `frontend/package.json`)**:
  - Uses `@vitejs/plugin-react`.
  - Configures local development proxy forwarding `/api` and `/health` requests to `http://127.0.0.1:3000`.
  - Declares direct dependencies: `react` (^18.3.1), `react-dom` (^18.3.1), `react-router-dom` (^6.26.2), `axios` (^1.7.7), `framer-motion` (^11.5.4), `lenis` (^1.1.13), and `react-icons` (^5.3.0).
- **Backend Configuration (`backend/package.json`)**:
  - Declares `"type": "module"` for native ECMAScript Modules (ESM).
  - Production entry point: `node server.js` (long-lived managed hosting).
  - Development entry point: `nodemon dev.js` (with automatic admin bootstrap).
  - Key runtime dependencies: `express` (^4.21.0), `mongoose` (^8.6.2), `bcrypt` (^6.0.0), `jsonwebtoken` (^9.0.2), `multer` (1.4.5-lts.1), `cloudinary` (^2.5.0), `razorpay` (^2.9.4), `helmet` (^7.1.0), `cors` (^2.8.5), `express-rate-limit` (^7.4.0), `express-validator` (^7.2.0), `cookie-parser` (^1.4.6), `compression` (^1.7.4), and `pino` (^9.14.0).

---

## 3. Frontend Architecture Audit

### 3.1 Routing & Navigation (`frontend/src/app/AppRouter.jsx`)
- Built using `react-router-dom` v6 with complete route-level code splitting via `React.lazy` and `Suspense`.
- Fallback UI: A dedicated `PageFallback` component rendering animated `Skeleton` elements during route transitions.
- Global Error Boundary: The entire route tree is wrapped with `ErrorBoundary.jsx` to catch and isolate client-side rendering failures.

#### Route Inventory:
1. **Public Routes (Rendered inside `PublicLayout` with shared `Navbar` and `Footer`):**
   - `/`: Home landing page with editorial hero slider, services teaser, process steps, testimonials, and FAQ accordion.
   - `/projects`: Public architectural project portfolio with category filter tabs.
   - `/projects/:slug`: Deep-dive project case study with dynamic detail blocks.
   - `/retail`: Furniture and decor catalogue with category filters and stock availability.
   - `/retail/:slug`: Product detail view with specifications, dimensions, and cart actions.
   - `/services`: Overview of architectural and interior design services.
   - `/about`: Studio philosophy, history, and founder profile.
   - `/contact`: Inbound project enquiry form.
   - `/cart`: Dedicated full-page shopping cart view.
   - `/checkout`: Multi-step checkout screen (address selection, Razorpay integration).
   - `/orders`: Customer's past order history.
   - `/orders/:id`: Individual order tracking and details.
   - `/order-success/:orderNumber`: Post-checkout order confirmation and receipt.
   - `/account`: Customer account dashboard (profile editing, address book).
   - `/login`: Customer Google authentication portal.
   - `/register`: Redirects cleanly to `/login` (Google Sign-In automates registration on first authentication).
   - `*`: 404 Not Found fallback page.
2. **Administrative Routes (Rendered inside `AdminLayout` and gated by `ProtectedRoute`):**
   - `/admin/login`: Standalone admin credentials portal (isolated from public layout).
   - `/admin`: Dashboard statistics overview (revenue, orders, enquiries, catalogue counts).
   - `/admin/projects`: Project manager and dynamic visual block editor (`DetailBlocksEditor`).
   - `/admin/retail`: Retail product inventory manager (stock counters, pricing, toggle switches).
   - `/admin/enquiries`: Inbound client leads manager (status tracking, reply logging).
   - `/admin/orders`: Order fulfillment manager (tracking ID updates, status transitions).

### 3.2 State Management & React Context Providers
1. **`AuthContext` (`frontend/src/shared/context/AuthContext.jsx`):**
   - Manages administrator authentication state.
   - Validates session on mount via `GET /api/auth/me`.
   - Exposes `admin`, `isAuthenticated`, `login(email, password)`, `logout()`, and `checkAuth()`.
2. **`CustomerContext` (`frontend/src/shared/context/CustomerContext.jsx`):**
   - Manages retail customer state.
   - Exposes Google login handling (`loginWithGoogle(credential)`), profile updates, and address management.
3. **`CartContext` (`frontend/src/shared/context/CartContext.jsx`):**
   - Manages shopping cart state with automatic `localStorage` synchronization (`sabr_cart_v1`).
   - Canonical product identification: Compares `id`, `_id`, and `slug` as strings to prevent duplicate line items regardless of API shape.
   - Post-payment hygiene: Exposes `removePurchasedItems(purchasedIds)` to cleanly evict verified purchases while preserving unpurchased items if partial checkout occurs.
   - Slide-over drawer state: Exposes `isDrawerOpen`, `openDrawer()`, `closeDrawer()`, and `toggleDrawer()`.

---

## 4. Backend Architecture & Request Flow Audit

### 4.1 Server Entry Points & Request Handling
- **`backend/app.js`**: Core Express application setup.
  - Configures `trust proxy: 1` for accurate client IP resolution behind Vercel/Hostinger reverse proxies.
  - Security headers via `helmet()` (with tailored exceptions for CDN assets and runtime CSS injection).
  - Dynamic CORS whitelist matching `CORS_ORIGIN`, `VERCEL_URL`, and local preview origins.
  - Request body limits: 10 MB payload parsing with dedicated `rawBody` byte capture on `/orders/webhook` for cryptographic HMAC verification.
  - Active timeout guard: 30-second bounded timeout via `timeout.middleware.js`.
  - Production database fail-safe: Intercepts all `/api/*` traffic in production if MongoDB Atlas is disconnected, returning `503 Service Unavailable (DB_UNAVAILABLE)` rather than hanging or returning mock data.
- **`backend/apiHandler.js`**:
  - Centralized, isomorphic route dispatcher supporting both Express middleware invocation and serverless request wrappers.
  - Implements fine-grained rate-limit segregation, input validation chains, and role-based authentication gates.

---

## 5. Database Schema & Persistence Audit

All models are built using Mongoose 8. The database engine connects to MongoDB Atlas (`sabrstudio` database) with fail-safe guards preventing accidental execution against legacy databases like `test`.

### 5.1 Verified Data Models
1. **`Admin` (`backend/models/admin.model.js`):**
   - Collection: `admins`.
   - Fields: `name`, `email` (unique, lowercase), `password` (bcrypt hash, `select: false`), `role` (enum: `['admin']`), `status` (enum: `['active', 'disabled']`), `lastLoginAt`.
   - Pre-save hook: Salts and hashes passwords automatically when modified.
   - Instance method: `comparePassword(candidate)` for timing-safe bcrypt comparison.
2. **`Customer` (`backend/models/customer.model.js`):**
   - Collection: `customers`.
   - Fields: `name`, `email` (unique), `googleId` (unique sparse index using partial filter expression `{ googleId: { $type: 'string' } }`), `emailVerified`, `avatar`, `phone`, `role` (enum: `['customer']`), `status` (enum: `['active', 'disabled', 'deleted']`), `lastLoginAt`.
   - Subdocuments: `addresses` array embedding `addressSchema` (label, fullName, phone, house, street, landmark, city, state, pincode, country, isDefault).
3. **`Project` (`backend/models/project.model.js`):**
   - Collection: `projects`.
   - Fields: `title`, `slug` (unique, lowercase), `category`, `location`, `year`, `area`, `description`, `shortDescription`, `coverImage`, `coverImagePublicId`, `gallery`, `price`, `published` (boolean), `keywords`, `palette`, `lists`, `sections`, `imageBlocks`, `detailBlocks`, `seo`.
   - Indexes: `{ published: 1, category: 1, createdAt: -1 }`.
4. **`ProjectCategory` (`backend/models/project.model.js`):**
   - Collection: `projectcategories`.
   - Fields: `name` (unique), `slug`.
5. **`Retail` (`backend/models/retail.model.js`):**
   - Collection: Explicitly pinned to `reatils` (destination collection).
   - Fields: `title`, `slug` (unique, lowercase), `category`, `description`, `images` (`[{ url, publicId }]`), `image`, `imagePublicId`, `price` (min: 0), `availability`, `stock` (nullable integer, min: 0), `inStock` (boolean), `dimensions`, `materials`, `published` (boolean).
   - Indexes: `{ category: 1 }`, `{ published: 1, availability: 1, createdAt: -1 }`, `{ stock: 1 }`.
6. **`RetailCategory` (`backend/models/retail.model.js`):**
   - Collection: `retailcategories`.
   - Fields: `name` (unique), `slug`.
7. **`Order` (`backend/models/order.model.js`):**
   - Collection: `orders`.
   - Fields: `orderNumber` (unique index, formatted `SABR-ORD-YYYY-XXXX`), `user` (ref: `Customer`), `customer` (contact snapshot), `deliveryAddress` (full address snapshot), `items` (embedded `orderItemSchema`), `amount`, `subtotal`, `shipping`, `currency` (`'INR'`), `payment` (`{ provider, razorpayOrderId, razorpayPaymentId, razorpaySignature, verified, method, failureReason }`), `paymentStatus` (enum: `['pending', 'paid', 'failed', 'cancelled', 'refunded']`), `orderStatus` (enum: `['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled']`), `trackingId`, `idempotencyKey` (unique sparse index).
   - Indexes: `{ idempotencyKey: 1 }`, `{ user: 1 }`, `{ orderStatus: 1, createdAt: -1 }`, `{ paymentStatus: 1, createdAt: -1 }`.
8. **`Enquiry` (`backend/models/enquiry.model.js`):**
   - Collection: Explicitly pinned to `enquires`.
   - Fields: `name`, `email` (optional), `phone` (required), `projectType`, `message`, `source`, `sourceRoute`, `status` (enum: `['new', 'contacted', 'pending']`), `emailStatus` (enum: `['sent', 'failed', 'pending']`), `emailError`.
   - Indexes: `{ status: 1, createdAt: -1 }`.

---

## 6. Authentication & Authorization Audit

### 6.1 Authentication Mechanisms
- **Admin Authentication:**
  - Endpoint: `POST /api/auth/login`.
  - Rate limited strictly: 5 attempts per 15 minutes in production (`authLimiter`).
  - Passwords hashed using `bcrypt` (cost factor 10).
  - Issues signed JWT containing `{ id, role: 'admin' }`.
  - Session cookie: `token` (configurable as `COOKIE_SECURE=true`, `SameSite=lax`).
- **Customer Authentication:**
  - Endpoint: `POST /api/customer/google`.
  - Identity Token: Expects Google RS256 ID Token from Google Identity Services.
  - Server-side verification: Verified against Google's public JWKS certificates.
  - Session cookie: `sabr_customer` with 365-day TTL (`CUSTOMER_JWT_EXPIRES_IN`).

### 6.2 Authorization & Access Control
- `protect.middleware.js`: Strictly verifies admin identity; ensures `admin.status === 'active'`; rejects disabled accounts with `403 Forbidden`.
- `protectCustomer.middleware.js`: Ensures valid customer session; rejects deleted accounts (`status === 'deleted'`) with `401 Unauthorized` and disabled accounts with `403 Forbidden`.
- **RBAC Boundary:** Admin and Customer credentials run on separate cookie keys and distinct token verification pipelines. Customer tokens cannot access `/api/admin/*`, and admin credentials do not grant customer shopping identity.

---

## 7. Project CMS & Dynamic Content Blocks Audit

### 7.1 Architecture
The CMS supports an advanced block-based page builder (`backend/utils/detailBlockSpec.js`).
- Supported Block Types:
  1. `palette`: Material colors with hex/rgb values and descriptions.
  2. `keywords`: Architectural tags and spatial highlights.
  3. `lists`: Categorized items with intro paragraphs and list styling (`disc`, `decimal`, `check`, `none`).
  4. `sections`: Narrative editorial copy with custom headings and paragraphs.
  5. `imageBlocks`: Visual showcases with Cloudinary URLs, captions, subheadings, and layout styling.
- Layout Engine:
  - 2D Placement Tokens: `place: { rowId, col }` grouping blocks into desktop multi-column rows (up to 3 columns) via `groupBlocksIntoRows()`.
  - Style Whitelisting: `style` tokens (`align`, `width`, `aspect`, `padding`, `gap`, `fontSize`, `color`, `background`) sanitized against strict regular expressions and allowed token lists.

---

## 8. Media Pipeline (Multer & Cloudinary) Audit

### 8.1 Implementation & Security Controls
- **Memory Storage:** Configured via `multer.memoryStorage()`. No temporary files are written to disk, ensuring full compatibility with read-only serverless filesystems.
- **Payload Limits:** Bounded to 4 MB per request (`MAX_UPLOAD_BYTES = 4 * 1024 * 1024`).
- **Magic-Byte Inspection:** `detectImageType(buffer)` inspects initial byte signatures:
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47 0D 0A 1A 0A`
  - WebP: `RIFF .... WEBP`
  - AVIF: `.... ftyp avif|avis`
- **Destination Isolation:** Files are routed to isolated Cloudinary folders (`sabrstudio/projects` or `sabrstudio/retail`).
- **Unguessable Public IDs:** Server-generated via `randomPublicId()` (timestamp + 10 random hex bytes); client file names are completely discarded.
- **Orphan Cleanup:** `deleteAsset(publicId)` and `deleteAssets(publicIds)` provide best-effort asset garbage collection during item replacement or deletion.

---

## 9. Retail & E-Commerce Audit

### 9.1 Cart & Inventory Synchronization
- Cart state persisted in browser `localStorage` (`sabr_cart_v1`).
- Server-side price authority: Client-submitted prices are discarded during checkout. The backend retrieves the live catalog items from MongoDB, recomputes the subtotal, and validates availability.
- Atomic stock reservation: Stock is decremented atomically during checkout session creation. If payment fails or times out, stock is released back into the catalog.
- Untracked legacy products: Products with `stock: null` are treated as legacy untracked items, utilizing the boolean `inStock` / `availability` flags.

---

## 10. Payment Integration (Razorpay) Audit

### 10.1 Workflow & Verification
- **Order Initialization:** `POST /api/orders/checkout` creates an order in MongoDB with `paymentStatus: 'pending'` and initializes a Razorpay order in paise (`amount * 100`).
- **Synchronous Verification:** `POST /api/orders/verify` verifies the HMAC SHA-256 signature:
  $$\text{expected} = \text{HMAC-SHA256}(\text{key\_secret}, \text{razorpayOrderId} \parallel \text{"|"} \parallel \text{razorpayPaymentId})$$
  Executed using `crypto.timingSafeEqual()` to defend against timing attacks.
- **Asynchronous Webhooks:** `POST /api/orders/webhook` validates incoming Razorpay webhook signatures against `req.rawBody` bytes. Handles `payment.captured` and `payment.failed` idempotently.
- **Security Boundary:** Admins are explicitly forbidden from manually modifying `paymentStatus` or order `amount` via the admin dashboard (strictly enforced in `updateOrderStatusValidator` and `orderService`).

---

## 11. Testing & Quality Assurance Audit

### 11.1 Test Suites Verified in Codebase
1. **`backend/tests/project-detail-blocks.test.js`**: Unit tests verifying dynamic detail block schema persistence, style token sanitization, 2D row/column grouping, and backward compatibility.
2. **`backend/tests/project-image-blocks.test.js`**: Regression test suite verifying that image block URLs are preserved through Mongoose schema save cycles.
3. **`scripts/test-all-routes.mjs`**: Comprehensive 28 KB integration test harness exercising public endpoints, customer authentication, admin routes, checkout flows, and payment verification.

---

## 12. Security Audit & Findings

### 12.1 Verified Security Controls
- **Rate Limiting:** Granular rate limiters for authentication (`authLimiter`), checkout (`checkoutLimiter`), enquiries (`enquiryLimiter`), admin operations (`adminLimiter`), and general API traffic (`generalLimiter`).
- **Timing-Safe Password & Signature Checks:** Uses `bcrypt.compare` and `crypto.timingSafeEqual`.
- **Database Injection Defenses:** Mongoose schema enforcement and explicit type casting prevent NoSQL injection via `$gt` / `$where`.
- **HTTP Security Headers:** Helmet configured with strict frameguard, cross-origin resource policies, and DNS prefetch controls.

### 12.2 Security Findings & Observations
1. **Rate Limiting in Serverless:** Current rate limiting uses `express-rate-limit`'s in-memory store. On multi-instance serverless deployments (Vercel), counters are per-instance. *Recommendation: For strict high-volume DDoS mitigation, back rate limiters with Redis (`rate-limit-redis`).*
2. **CSP Configuration:** Content Security Policy is currently disabled in `helmet({ contentSecurityPolicy: false })` due to external CDN images (Cloudinary/Unsplash) and inline Tailwind runtime styles. *Recommendation: Implement a strict nonce-based CSP header.*
3. **Production Fail-Safe:** Verified active. Production code refuses to run against a database named `test` or missing Atlas connection parameters.

---

## 13. Audit Conclusion

The Sabr Studio repository exhibits high engineering rigor, robust defense-in-depth security principles, strict separation of identity contexts, and comprehensive error handling. All documented subsystems are verified as fully implemented and production-ready.
