# Request Lifecycle — Sabr Studio

The diagram below traces the end-to-end lifecycle of an HTTP request traversing the Sabr Studio application stack: from the client browser through network proxies, security middleware, authentication gates, validation chains, business controllers, persistence layers, and client response handling.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / Browser (Axios)
    participant Proxy as Reverse Proxy (Vercel / Hostinger)
    participant CoreApp as Express App (app.js)
    participant SecMW as Security Middleware (Helmet, CORS, Limiter)
    participant AuthMW as Auth Middleware (protect / protectCustomer)
    participant ValMW as Validation Chain (express-validator)
    participant Ctrl as Domain Controller (e.g. orderController)
    participant Svc as Business Service (e.g. orderService)
    participant DB as Persistence Tier (MongoDB / Atlas)
    participant Ext as Third-Party Service (Razorpay / Cloudinary)

    Client->>Proxy: HTTP Request (Method + Path + Headers + Cookies)
    Note over Proxy: Proxy inspects Host, passes Client IP<br/>trust proxy = 1
    Proxy->>CoreApp: Forwarded Request
    
    rect rgb(240, 245, 255)
        Note over CoreApp, SecMW: Stage 1: Ingress Security & Sanitization
        CoreApp->>SecMW: Execute Security Pipeline
        SecMW->>SecMW: Apply Helmet security headers
        SecMW->>SecMW: Evaluate CORS whitelist (CORS_ORIGIN)
        SecMW->>SecMW: Check Rate Limit (authLimiter / checkoutLimiter / generalLimiter)
        SecMW->>SecMW: Attach Request ID & enforce 30s timeout guard
        SecMW->>CoreApp: Ingress Approved
    end

    rect rgb(245, 255, 245)
        Note over CoreApp, AuthMW: Stage 2: Authentication & Context Extraction
        CoreApp->>AuthMW: Execute Identity Verification
        alt Public Endpoint
            AuthMW-->>CoreApp: Bypass (No auth required)
        else Admin Endpoint
            AuthMW->>AuthMW: Extract token (HTTP-only cookie or Bearer)
            AuthMW->>AuthMW: Verify JWT signature & expiration (24h/7d)
            AuthMW->>DB: Fetch Admin record & verify status === 'active'
            AuthMW-->>CoreApp: Attach req.admin context
        else Customer Endpoint
            AuthMW->>AuthMW: Extract sabr_customer cookie
            AuthMW->>AuthMW: Verify customer JWT signature & expiration
            AuthMW->>DB: Fetch Customer record & verify status !== 'deleted'
            AuthMW-->>CoreApp: Attach req.customer context
        end
    end

    rect rgb(255, 250, 240)
        Note over CoreApp, ValMW: Stage 3: Input Validation & Sanitization
        CoreApp->>ValMW: Execute express-validator rules
        alt Validation Fails
            ValMW-->>Client: 400 Bad Request (Formatted Field Errors)
        else Validation Passes
            ValMW->>Ctrl: Dispatch to Handler
        end
    end

    rect rgb(250, 240, 255)
        Note over Ctrl, Ext: Stage 4: Business Logic & Persistence Execution
        Ctrl->>Svc: Invoke Domain Business Method
        alt Interacts with Third-Party
            Svc->>Ext: Invoke API (e.g., Razorpay Order Creation)
            Ext-->>Svc: Return External Transaction Payload
        end
        Svc->>DB: Execute Query / Mutation (Mongoose with strict schema)
        DB-->>Svc: Persisted Document Result
        Svc-->>Ctrl: Return Normalized Domain Model
    end

    rect rgb(240, 255, 250)
        Note over Ctrl, Client: Stage 5: Response Delivery & Client Handling
        Ctrl-->>CoreApp: Format Standard Envelope { success: true, data: ... }
        CoreApp-->>Client: 200/201 HTTP Response
        Client->>Client: Axios interceptor unpacks response.data
    end
```

---

### Key Lifecycle Principles

1. **Standardized Response Envelope:** Every response adheres strictly to `{ success: boolean, data?: any, message?: string, errors?: Array<{ field, message }> }`.
2. **Context Enrichment:** Middleware attaches immutable identity contexts (`req.admin` or `req.customer`) ensuring downstream controllers never parse raw tokens or trust client-supplied user identifiers.
3. **Database Fail-Safe:** In production, if MongoDB Atlas is disconnected or reconnecting, the database guard immediately intercepts incoming API requests and returns a clean `503 Service Unavailable (DB_UNAVAILABLE)` rather than hanging or silently falling back to mock fixtures.
