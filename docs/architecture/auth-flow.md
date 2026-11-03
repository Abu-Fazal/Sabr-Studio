# Authentication & Authorization Architecture — Sabr Studio

The diagram below maps the dual-track authentication and access control architecture of Sabr Studio, illustrating how Admin and Customer identities are kept strictly separate without permission leaks.

```mermaid
flowchart TD
    subgraph ClientRequests["Client Request Ingress"]
        ReqAdmin["Admin Portal Request<br/>(/api/admin/*)"]
        ReqCustomer["Customer Store Request<br/>(/api/customer/*, /api/orders/*)"]
        ReqPublic["Public Browse Request<br/>(/api/projects, /api/retail)"]
    end

    subgraph AuthGates["Authentication Middleware Layer"]
        GateAdmin{"protect.middleware.js<br/>Token Extraction"}
        GateCustomer{"protectCustomer.middleware.js<br/>Token Extraction"}
    end

    subgraph AdminValidation["Admin Credential Pipeline"]
        CheckAdminCookie{"Extract Cookie / Header<br/>(token / admin_token / Bearer)"}
        VerifyAdminJWT{"Verify JWT Signature<br/>(JWT_SECRET)"}
        LoadAdminDB[("Query Admin Model<br/>findById(decoded.id)")]
        CheckAdminStatus{"admin.status === 'active'?"}
    end

    subgraph CustomerValidation["Customer Identity Pipeline"]
        CheckCustCookie{"Extract Cookie / Header<br/>(sabr_customer / Bearer)"}
        VerifyCustJWT{"Verify JWT Signature<br/>(JWT_SECRET)"}
        LoadCustDB[("Query Customer Model<br/>findById(decoded.id)")]
        CheckCustStatus{"Customer Status Check"}
    end

    subgraph Handlers["Downstream Handlers"]
        AdminAction["Execute Admin Action<br/>(req.admin context available)"]
        CustomerAction["Execute Customer Action<br/>(req.customer context available)"]
        PublicAction["Execute Public Handler<br/>(No Identity Context)"]
    end

    subgraph Rejection["Rejection & Error Responses"]
        Err401["401 Unauthorized<br/>(Missing, Invalid, or Expired Token)"]
        Err403["403 Forbidden<br/>(Account Disabled or Permission Denied)"]
    end

    %% Public Flow
    ReqPublic --> PublicAction

    %% Admin Flow
    ReqAdmin --> GateAdmin
    GateAdmin --> CheckAdminCookie
    CheckAdminCookie -->|Missing| Err401
    CheckAdminCookie -->|Found| VerifyAdminJWT
    VerifyAdminJWT -->|Invalid / Expired| Err401
    VerifyAdminJWT -->|Valid| LoadAdminDB
    LoadAdminDB -->|Not Found| Err401
    LoadAdminDB -->|Found| CheckAdminStatus
    CheckAdminStatus -->|disabled| Err403
    CheckAdminStatus -->|active| AdminAction

    %% Customer Flow
    ReqCustomer --> GateCustomer
    GateCustomer --> CheckCustCookie
    CheckCustCookie -->|Missing| Err401
    CheckCustCookie -->|Found| VerifyCustJWT
    VerifyCustJWT -->|Invalid / Expired| Err401
    VerifyCustJWT -->|Valid| LoadCustDB
    LoadCustDB -->|Not Found| Err401
    LoadCustDB -->|Found| CheckCustStatus
    CheckCustStatus -->|deleted| Err401
    CheckCustStatus -->|disabled| Err403
    CheckCustStatus -->|active| CustomerAction
```

---

### Comparison of Identity Systems

| Dimension | Admin Identity | Customer Identity |
|---|---|---|
| **Identity Provider** | Local Database (`Admin` collection) | Google OAuth 2.0 (Google Identity Services) |
| **Credential Type** | Email + bcrypt password hash | Google ID Token (RS256 signed JWT) |
| **Verification Logic** | `bcrypt.compare()` against salted hash | Cryptographic verification via Google JWKS |
| **Session Transport** | HTTP-only cookie (`token`, `admin_token`, `jwt`) | HTTP-only cookie (`sabr_customer`) |
| **Session Lifetime** | 24 Hours / 7 Days (`JWT_EXPIRES_IN`) | 365 Days (`CUSTOMER_JWT_EXPIRES_IN`) |
| **Bootstrap Strategy** | Automated first-run seed from env vars | Automatic just-in-time creation on initial login |
| **Deactivation Handling** | `status: 'disabled'` yields `403 Forbidden` | `status: 'deleted'` yields `401 Unauthorized` |
