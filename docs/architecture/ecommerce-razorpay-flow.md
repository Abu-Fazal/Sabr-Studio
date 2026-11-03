# E-Commerce & Razorpay Payment Lifecycle — Sabr Studio

The diagram below details the entire commerce flow from cart curation to server-side price validation, atomic stock reservation, Razorpay order generation, HMAC signature verification, and asynchronous webhook handling.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Shopper (Browser)
    participant Cart as Cart Context (sabr_cart_v1)
    participant API as Express API (/api/orders/*)
    participant OrderSvc as Order Service
    participant RetailSvc as Retail Service (Inventory)
    participant DB as MongoDB Atlas
    participant RZP as Razorpay Gateway
    participant Webhook as Razorpay Webhook Ingress

    Customer->>Cart: Add Product to Cart
    Note over Cart: Persists in localStorage<br/>Key: sabr_cart_v1
    Customer->>API: POST /api/orders/checkout<br/>(Header: Idempotency-Key, Cookie: sabr_customer)
    
    rect rgb(240, 245, 255)
        Note over API, OrderSvc: Step 1: Idempotency & Catalog Verification
        API->>OrderSvc: createCheckoutSession(body, customerCtx, idempotencyKey)
        OrderSvc->>DB: Check for existing order with idempotencyKey
        alt Idempotent Duplicate Found
            DB-->>OrderSvc: Existing Pending Order
            OrderSvc-->>Customer: Return Cached Order Session (No Double Charge)
        end
        OrderSvc->>RetailSvc: Fetch Live Catalog Items (by slug / id)
        RetailSvc-->>OrderSvc: Live Products (Database unitPrice, availability, stock)
        Note over OrderSvc: Discard client-submitted prices<br/>Calculate subtotal server-side
    end

    rect rgb(255, 245, 240)
        Note over OrderSvc, RetailSvc: Step 2: Atomic Stock Reservation
        OrderSvc->>RetailSvc: reserveStock(orderItems)
        RetailSvc->>DB: Atomically decrement stock ($inc: -qty) if stock >= qty
        alt Insufficient Stock
            RetailSvc-->>OrderSvc: Reservation Failed (out_of_stock)
            OrderSvc-->>Customer: 409 Conflict ("Item is out of stock")
        else Stock Reserved
            RetailSvc-->>OrderSvc: Reservation Confirmed
        end
    end

    rect rgb(245, 255, 245)
        Note over OrderSvc, RZP: Step 3: Razorpay Gateway Order Creation
        OrderSvc->>RZP: orders.create({ amount: paise, currency: 'INR', receipt })
        RZP-->>OrderSvc: Razorpay Order ID (rzp_order_xxx)
        OrderSvc->>DB: Save Order (status: pending, paymentStatus: pending)
        OrderSvc-->>Customer: 200 OK (razorpayOrderId, keyId, amountPaise)
    end

    Customer->>Customer: Launch Razorpay Standard Checkout Modal
    Customer->>RZP: Complete Payment (UPI / Card / NetBanking)
    RZP-->>Customer: Payment Response (razorpay_payment_id, signature)

    rect rgb(255, 250, 240)
        Note over Customer, DB: Step 4: Synchronous Server-Side Verification
        Customer->>API: POST /api/orders/verify<br/>(orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature)
        API->>OrderSvc: verifyPayment(body, customerCtx)
        Note over OrderSvc: Compute HMAC SHA-256:<br/>expected = crypto.createHmac(secret)<br/>.update(orderId + '|' + paymentId)<br/>Compare with crypto.timingSafeEqual()
        alt Signature Mismatch
            OrderSvc->>DB: Update paymentStatus = 'failed'
            OrderSvc->>RetailSvc: releaseStock() (Return inventory)
            OrderSvc-->>Customer: 400 Bad Request ("Signature verification failed")
        else Signature Verified
            OrderSvc->>DB: Update paymentStatus = 'paid', orderStatus = 'confirmed'
            OrderSvc-->>Customer: 200 OK (Payment Verified, Order Confirmed)
            Customer->>Cart: removePurchasedItems(purchasedIds)
        end
    end

    rect rgb(250, 240, 255)
        Note over Webhook, DB: Step 5: Asynchronous Fallback Webhook Handling
        RZP->>Webhook: POST /api/orders/webhook (payment.captured / payment.failed)
        Webhook->>OrderSvc: handleWebhook(rawBody, signatureHeader)
        Note over OrderSvc: Verify x-razorpay-signature against rawBody bytes
        OrderSvc->>DB: Update Order paymentStatus to 'paid' (idempotent, never downgrades)
        Webhook-->>RZP: 200 OK
    end
```

---

### Core Financial & Inventory Safeguards

1. **Client Price Zero-Trust:** All prices, discounts, and currency calculations are strictly performed against the database snapshot. Client-sent prices are only checked to detect cart price changes (`priceChanges` warnings).
2. **Idempotency Keys:** Protects shoppers against accidental duplicate charges caused by network timeouts or impatient double-clicks.
3. **Atomic Stock Locking:** Inventory is reserved prior to generating the Razorpay payment session. If checkout aborts or the payment fails signature checks, the reserved stock is automatically returned to the catalog.
4. **Dual Verification Channels:** Both frontend callback verification and backend server-to-server webhooks update the order state. Paid status is strictly final and can never be reversed or downgraded by webhook replays.
