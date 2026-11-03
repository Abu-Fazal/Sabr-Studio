# Production Deployment Architecture — Sabr Studio

The diagram below illustrates the dual production deployment strategy supported by the codebase: Vercel Serverless Architecture (Static Edge + Serverless Node) versus Hostinger Managed Node.js Architecture (Same-Domain Monolithic Hosting).

```mermaid
flowchart TB
    subgraph InternetTraffic["Internet User Traffic"]
        UserBrowser["Visitor Browser / Client Device"]
    end

    subgraph DNSLayer["DNS & Domain Layer"]
        Domain["sabrstudio.in / www.sabrstudio.in"]
    end

    UserBrowser -->|HTTPS :443| Domain

    subgraph DeploymentOptionA["Option 1: Vercel Serverless (Primary Production)"]
        VercelCDN["Vercel Global Edge Network"]
        VercelStatic["Frontend Static Asset Storage<br/>(frontend/dist — HTML, CSS, JS, Fonts)<br/>Cache: public, max-age=31536000, immutable"]
        VercelRouter["Vercel Routing Engine (vercel.json)"]
        VercelFunction["Serverless Lambda Function<br/>(api/index.js -> backend/app.js)<br/>Read-only filesystem, warm DB caching"]
        
        Domain -.->|Route to Vercel| VercelCDN
        VercelCDN --> VercelRouter
        VercelRouter -->|Static Paths: /assets/*, /icons/*| VercelStatic
        VercelRouter -->|API Paths: /api/*, /health| VercelFunction
        VercelRouter -->|SPA Deep Links: /*| VercelStatic
    end

    subgraph DeploymentOptionB["Option 2: Hostinger Managed Node (Alternative / Fallback)"]
        HostingerProxy["Hostinger Reverse Proxy / Nginx<br/>(SSL Termination & Port Forwarding)"]
        HostingerApp["Long-Lived Node Process (backend/server.js)<br/>(Listens on process.env.PORT)"]
        ExpressStatic["Express Static Middleware<br/>(Serves ../frontend/dist when SERVE_FRONTEND=true)"]
        ExpressAPI["Express API Pipeline<br/>(Handles /api/* routes via apiHandler)"]
        ExpressFallback["Express SPA Wildcard Handler<br/>(app.get('*') sends index.html)"]

        Domain -.->|Route to Hostinger| HostingerProxy
        HostingerProxy --> HostingerApp
        HostingerApp --> ExpressStatic
        HostingerApp --> ExpressAPI
        HostingerApp --> ExpressFallback
    end

    subgraph CloudServices["Shared Cloud Backing Services"]
        MongoAtlas[("MongoDB Atlas Primary<br/>(M0/M10 Cluster in AWS Mumbai)")]
        CloudinaryMedia[("Cloudinary Asset Bucket<br/>(Image Delivery CDN)")]
        RazorpayGateway["Razorpay Payments Engine"]
    end

    VercelFunction -->|Mongoose Pool| MongoAtlas
    VercelFunction -->|API / Stream| CloudinaryMedia
    VercelFunction -->|Order APIs| RazorpayGateway

    HostingerApp -->|Mongoose Pool| MongoAtlas
    HostingerApp -->|API / Stream| CloudinaryMedia
    HostingerApp -->|Order APIs| RazorpayGateway
```

---

### Comparison of Deployment Modes

| Characteristic | Vercel Deployment | Hostinger Deployment |
|---|---|---|
| **Frontend Delivery** | Global Edge CDN (`frontend/dist`) | Express `express.static` (`frontend/dist`) |
| **API Execution** | Ephemeral serverless lambdas (`api/index.js`) | Long-lived persistent Node.js daemon (`backend/server.js`) |
| **Process Model** | Auto-scaled per-request function invocations | Single continuous event loop listening on dynamic port |
| **Filesystem Status** | Read-only (enforces Multer memory storage) | Writable local disk (memory storage still preferred) |
| **Database Connection** | Cached on `globalThis.__sabrMongo` | Persistent single connection maintained across restarts |
| **Deep Link Routing** | Managed by `vercel.json` rewrite to `/index.html` | Managed by Express wildcard `app.get('*')` |
| **Activation Flag** | Default behavior when `VERCEL` env is set | Enabled explicitly via `SERVE_FRONTEND=true` |
