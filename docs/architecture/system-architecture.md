# System Architecture — Sabr Studio

The diagram below illustrates the high-level architecture of Sabr Studio, detailing the separation between public clients, the administrative panel, the dual-deployment backend layer, the database tier, and external integrations.

```mermaid
graph TD
    subgraph ClientLayer["Client Layer (Browser)"]
        PublicUser["Public Visitors / Shoppers<br/>(React 18 + Tailwind + Lenis)"]
        AdminUser["Store Administrator<br/>(Admin Dashboard + CMS)"]
    end

    subgraph CDN["Edge & CDN Infrastructure"]
        VercelEdge["Vercel Global Edge Network<br/>(Static Assets & Caching)"]
        CloudinaryCDN["Cloudinary CDN<br/>(Optimized Media Assets)"]
    end

    subgraph Hosting["Dual Hosting Architecture"]
        subgraph VercelSetup["Vercel Serverless Architecture"]
            VercelStatic["Frontend Static Build<br/>(dist/ — Immutable HTML/JS/CSS)"]
            VercelFunction["API Serverless Function<br/>(api/index.js -> Express App)"]
        end

        subgraph HostingerSetup["Hostinger Long-Lived Node Process"]
            HostingerNode["Express Server (server.js)<br/>(API + SPA Static Serving)"]
        end
    end

    subgraph BackendCore["Backend Application Core (Node.js ESM)"]
        MiddlewareStack["Middleware Pipeline<br/>(Helmet, CORS, Rate Limiters, Timeout)"]
        APIRouter["API Handler Router<br/>(apiHandler.js Route Dispatcher)"]
        
        subgraph AuthDomain["Identity & Authorization"]
            AdminAuth["Admin Auth Service<br/>(JWT Cookie / Bearer, bcrypt)"]
            CustomerAuth["Customer Auth Service<br/>(Google Sign-In RS256 JWKS)"]
        end

        subgraph CoreServices["Domain Business Services"]
            ProjectService["Project CMS Service<br/>(DetailBlocks Normalization)"]
            RetailService["Retail & Inventory Service<br/>(Stock Locking & Derivation)"]
            OrderService["Order & Checkout Service<br/>(Server Totals & Snapshots)"]
            EnquiryService["Enquiry Service<br/>(Validation & Lead Tracking)"]
            UploadService["Media Upload Service<br/>(Magic-Byte Inspection)"]
        end
    end

    subgraph DataLayer["Persistence Layer"]
        MongoDBAtlas[("MongoDB Atlas Primary<br/>(sabrstudio database)")]
        DevFallback[("In-Memory Fallback Storage<br/>(Non-Production / Preview Only)")]
    end

    subgraph ExternalServices["Third-Party Cloud APIs"]
        GoogleJWKS["Google OAuth 2.0 / JWKS<br/>(Token Signature Verification)"]
        RazorpayAPI["Razorpay Payment Gateway<br/>(Order API & Webhook HMAC)"]
        CloudinaryAPI["Cloudinary Media API<br/>(Streaming Upload & Invalidation)"]
        EmailJSAPI["EmailJS REST API<br/>(Order & Enquiry Notifications)"]
    end

    %% Client Interactions
    PublicUser -->|HTTPS GET Assets| VercelEdge
    PublicUser -->|HTTPS API Requests| VercelFunction
    PublicUser -->|Fallback / Standalone| HostingerNode
    AdminUser -->|Protected Dashboard Requests| VercelFunction
    AdminUser -->|Protected Dashboard Requests| HostingerNode

    %% Edge Serving
    VercelEdge --> VercelStatic
    CloudinaryCDN -.->|Render Images| PublicUser

    %% Backend Flow
    VercelFunction --> MiddlewareStack
    HostingerNode --> MiddlewareStack
    MiddlewareStack --> APIRouter

    APIRouter --> AuthDomain
    APIRouter --> CoreServices

    %% External Auth & Verification
    CustomerAuth -->|Fetch Public Keys| GoogleJWKS
    OrderService -->|Create Orders & Webhooks| RazorpayAPI
    UploadService -->|Stream Image Buffers| CloudinaryAPI
    EnquiryService -->|Trigger Notifications| EmailJSAPI

    %% Persistence
    CoreServices -->|Mongoose Queries| MongoDBAtlas
    CoreServices -.->|Development Only| DevFallback
```

---

### Architectural Characteristics

1. **Separation of Concerns:** The public client interface, administrative CMS, and API handler are strictly separated. The API functions as a headless service consumed by both public shopping interfaces and protected admin modules.
2. **Dual-Deployment Resilience:** The application is architected to execute either as serverless lambdas on Vercel (`api/index.js`) or as a monolithic stateful Node.js process on managed hosting platforms like Hostinger (`backend/server.js`).
3. **Defense in Depth:** Request headers are scrutinized via Helmet, origin-gated via CORS policies, guarded by module-specific rate limiters (login, enquiry, checkout, admin), and protected by body payload verification.
4. **Isolated Identity Tracks:** Store shoppers authenticate exclusively via Google Sign-In with server-side public key verification; administrators authenticate via bcrypt credentials and HTTP-only JWT cookies.
