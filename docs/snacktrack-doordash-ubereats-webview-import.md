# SnackTrack: Mobile DoorDash & Uber Eats Order Import

## Goal

Import a user's historical DoorDash and Uber Eats orders into SnackTrack without relying on Gmail receipt access.

The most promising prototype is a **mobile WebView-based connector** where the user authenticates directly with DoorDash or Uber Eats and SnackTrack makes order-history requests from that authenticated web context.

> Important: DoorDash and Uber Eats do not currently provide a general public consumer API for this use case. Private web endpoints are unsupported, can change without notice, and may create platform Terms of Service, privacy, security, anti-bot, and app-store risks. Validate those issues before production deployment.

---

## 1. Preferred Architecture: Authenticated WebView

### User flow

1. User opens SnackTrack.
2. User taps **Connect DoorDash** or **Connect Uber Eats**.
3. SnackTrack opens the platform's real website inside a WebView.
4. User signs in directly with the platform.
5. The platform establishes an authenticated session inside the WebView.
6. SnackTrack detects that authentication appears complete.
7. User taps **Import Orders**.
8. JavaScript running in the authenticated web context requests order history.
9. The browser/WebView supplies applicable session cookies automatically.
10. Returned order data is sent from the WebView to React Native.
11. SnackTrack normalizes and stores the order data.

```text
SnackTrack React Native
        |
        v
Authenticated WebView
        |
        +---- DoorDash.com
        |       |
        |       +--> Order history request
        |
        +---- UberEats.com
                |
                +--> Order history request
        |
        v
Raw order JSON
        |
        v
Order normalizer
        |
        v
SnackTrack database
```

---

## 2. Do Not Extract the Session Token Unless Necessary

The initial idea was:

```text
Login
  |
  v
Extract session token
  |
  v
Store token on SnackTrack backend
  |
  v
Backend queries private API
```

A better first approach is:

```text
Login
  |
  v
Session remains inside WebView
  |
  v
Request executes from authenticated page
  |
  v
WebView receives order JSON
  |
  v
Only order data goes to SnackTrack
```

This avoids deliberately exporting and centrally storing a credential that may effectively provide authenticated account access.

An `HttpOnly` cookie does not necessarily prevent this architecture. JavaScript may be unable to read the cookie value, while the WebView/browser can still attach applicable cookies to requests made from the authenticated context.

---

## 3. React Native ↔ WebView Bridge

Use `react-native-webview`.

The native side should:

- Hold a WebView reference.
- Load the real DoorDash/Uber Eats site.
- Detect navigation/authentication state.
- Inject an importer script when appropriate.
- Receive results through `onMessage`.
- Validate messages before accepting data.

Conceptual structure:

```tsx
<WebView
  ref={webViewRef}
  source={{ uri: platformUrl }}
  javaScriptEnabled
  onNavigationStateChange={handleNavigation}
  onMessage={handleMessage}
/>
```

React Native can initiate the importer with:

```ts
webViewRef.current?.injectJavaScript(importScript);
```

The page can return data with:

```js
window.ReactNativeWebView.postMessage(
  JSON.stringify({
    type: "ORDERS_IMPORTED",
    payload: orders
  })
);
```

Do not treat arbitrary WebView messages as trusted. Validate message type, expected platform, schema, sizes, and current navigation/origin state.

---

## 4. Making Requests Inside the Authenticated Context

Conceptually:

```js
const response = await fetch("/ORDER_HISTORY_ENDPOINT", {
  method: "GET",
  credentials: "include"
});

const data = await response.json();

window.ReactNativeWebView.postMessage(
  JSON.stringify({
    type: "ORDERS_IMPORTED",
    payload: data
  })
);
```

`credentials: "include"` allows the browser to attach applicable credentials.

Prefer reproducing the same request pattern used by the platform's own frontend rather than inventing cross-origin requests.

### Same-origin matters

Ideal:

```text
Page:
https://www.doordash.com/...

Request:
/same-origin-order-endpoint
```

Potentially problematic:

```text
Page:
https://www.doordash.com/

Request:
https://different-api-domain.example/...
```

Cross-origin requests may encounter CORS, cookie scope, and `SameSite` restrictions.

---

## 5. DoorDash

DoorDash should have its own connector module.

Potential flow:

```text
DoorDash WebView
      |
      v
User authenticates
      |
      v
Detect authenticated state
      |
      v
Request order history
      |
      v
Paginate through history
      |
      v
Fetch detail where necessary
      |
      v
Normalize
```

The consumer web client may use GraphQL or other private endpoints. Do not hard-code assumptions from old community implementations without verifying the current web client.

A request may conceptually resemble:

```js
await fetch("/graphql", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    operationName: "ORDER_HISTORY_OPERATION",
    variables: {},
    query: "..."
  })
});
```

Exact operations, variables, headers, pagination, and response schemas must be discovered and maintained separately.

---

## 6. Uber Eats

Use a separate Uber Eats connector.

Conceptual flow:

```text
Uber Eats WebView
       |
       v
User authenticates
       |
       v
Authenticated web context
       |
       v
Past-orders request
       |
       v
Pagination
       |
       v
Order details if needed
       |
       v
Normalize
```

The current web client may require additional request state such as CSRF-related values. Only use values legitimately exposed to the authenticated page/session; do not attempt to bypass authentication or platform security controls.

---

## 7. Discovering the Current Web Requests

Before implementing the importer, determine what each platform's current frontend requests when the authenticated user opens their order history.

For development/research, identify:

- Request URL/path
- HTTP method
- Request body
- Non-secret required headers
- Pagination mechanism
- Response schema
- Order identifiers
- Whether itemized details are returned immediately
- Whether a second order-detail request is required

Conceptual process:

```text
Authenticated user
      |
      v
Open Orders
      |
      v
Platform frontend makes request
      |
      v
Identify relevant request/response shape
      |
      v
Implement minimum necessary importer
```

Do **not** build the discovery process around extracting or exfiltrating authentication credentials.

Because these are private interfaces, isolate endpoint-specific code so changes do not require rewriting the app.

---

## 8. Pagination

Do not assume the first response contains complete history.

Conceptually:

```js
const orders = [];

let cursor = null;

while (true) {
  const page = await getOrdersPage(cursor);

  orders.push(...page.orders);

  if (!page.nextCursor) break;

  cursor = page.nextCursor;
}
```

Support whatever mechanism each provider actually uses:

- Cursor
- Offset
- Page number
- Date window
- Continuation token

Persist provider order IDs so repeat imports can be deduplicated.

---

## 9. Order Details

History endpoints may return only summary data:

```json
{
  "orderId": "123",
  "restaurant": "Restaurant",
  "date": "...",
  "total": 31.10
}
```

SnackTrack ideally wants:

```json
{
  "provider": "doordash",
  "providerOrderId": "123",
  "restaurant": "Restaurant",
  "orderedAt": "...",
  "items": [
    {
      "name": "Chicken Burrito",
      "quantity": 1,
      "unitPrice": 14.99,
      "modifiers": []
    }
  ],
  "subtotal": 18.49,
  "deliveryFee": 2.99,
  "serviceFee": 3.21,
  "tax": 2.41,
  "tip": 4.00,
  "discounts": 0,
  "total": 31.10
}
```

If history only provides summaries:

```text
Order history
      |
      +--> Order A --> Detail request
      +--> Order B --> Detail request
      +--> Order C --> Detail request
```

Use limited concurrency/rate limiting rather than firing hundreds of detail requests simultaneously.

---

## 10. Normalized SnackTrack Model

Keep provider-specific responses outside the core application model.

```ts
interface SnackTrackOrder {
  provider: "doordash" | "ubereats";
  providerOrderId: string;

  restaurant: string;
  orderedAt: string;

  items: {
    name: string;
    quantity: number;
    unitPrice?: number;
    modifiers?: string[];
  }[];

  subtotal?: number;
  deliveryFee?: number;
  serviceFee?: number;
  tax?: number;
  tip?: number;
  discounts?: number;

  total: number;
}
```

Provider adapters transform raw responses into this structure.

---

## 11. Connector Architecture

Suggested separation:

```text
connectors/
  DoorDashConnector.ts
  UberEatsConnector.ts

webview/
  WebViewBridge.ts
  WebViewMessageSchema.ts

orders/
  OrderNormalizer.ts
  OrderRepository.ts
  OrderDeduplicator.ts
```

Conceptual interface:

```ts
interface FoodPlatformConnector {
  isAuthenticated(): Promise<boolean>;
  getOrderHistory(): Promise<SnackTrackOrder[]>;
  getOrderDetails?(orderId: string): Promise<unknown>;
}
```

Private endpoint logic stays inside the provider connector.

---

## 12. Initial Import vs Incremental Sync

### Initial import

```text
Connect
  |
  v
Authenticate
  |
  v
Retrieve all available history
  |
  v
Retrieve required details
  |
  v
Normalize
  |
  v
Save
```

### Later sync

Store the newest known order timestamp/ID.

```text
Open SnackTrack / Refresh
        |
        v
WebView session still valid?
    /             \
  yes              no
   |                |
   v                v
Query new      Ask user to
orders         sign in again
```

Do not assume arbitrary background WebView execution will be available on iOS/Android. Start with:

- Sync on app launch
- Pull to refresh
- Explicit **Sync Orders** button

Evaluate background behavior separately.

---

## 13. Session Persistence

Potential UX:

```text
DoorDash
Connected ✓
Last sync: Today

[ Sync ]
[ Disconnect ]
```

If the WebView retains its authenticated session, subsequent imports may not require another login.

When authentication expires:

```text
DoorDash connection expired.

[ Reconnect ]
```

Prefer keeping authentication state inside the device/WebView rather than copying session credentials to the SnackTrack backend.

---

## 14. Alternative: Server-Held Sessions

A second architecture is:

```text
User authenticates
      |
      v
Session credential captured
      |
      v
Encrypted server storage
      |
      v
SnackTrack backend queries platform
```

### Advantages

- Potential automatic server-side synchronization
- No need for the mobile app to be active during synchronization
- Centralized connector logic

### Major disadvantages

- SnackTrack stores high-value authentication credentials.
- Credential compromise could expose user accounts.
- Larger security/privacy burden.
- Session invalidation and reauthentication complexity.
- Greater platform-policy risk.

Treat this as a later option, not the default prototype.

---

## 15. Alternative: Temporary Import Credential

Middle ground:

```text
Authenticate
      |
      v
Temporarily use authenticated session
      |
      v
Import complete history
      |
      v
Store normalized orders
      |
      v
Discard credential/session access
```

For updates, ask the user to reconnect.

This sacrifices continuous syncing but greatly reduces persistent credential exposure.

---

## 16. Important Unknowns to Test

For **each** provider:

1. Does login work reliably inside iOS `WKWebView`?
2. Does login work reliably inside Android WebView?
3. Are MFA/passkeys/social-login flows usable?
4. Does the platform intentionally reject embedded browsers?
5. Does the authenticated WebView retain its session across app launches?
6. Can order history be requested from the same authenticated context?
7. How far back does history go?
8. What pagination mechanism is used?
9. Are item names and modifiers available?
10. Are item prices available?
11. Are subtotal, taxes, fees, discounts, and tip available?
12. Is a detail request required for every order?
13. Are there anti-bot/rate-limit controls?
14. How frequently do endpoint schemas change?
15. Are canceled/refunded orders represented?
16. Are grocery/convenience orders represented differently?
17. Does the approach comply with applicable platform terms and policies?
18. Does the implementation create iOS App Store or Google Play review concerns?

---

## 17. Security Requirements

Treat authenticated WebView sessions as sensitive.

Recommended principles:

- Never ask users to manually paste session cookies.
- Never collect DoorDash/Uber passwords in SnackTrack-controlled forms.
- User credentials should only be entered into the platform's own page.
- Do not log cookies, authorization headers, CSRF tokens, or sensitive request state.
- Avoid sending authentication credentials to SnackTrack servers.
- Validate WebView navigation/origin before executing importer code.
- Validate all messages sent from WebView to native code.
- Minimize stored raw provider responses.
- Encrypt sensitive local data.
- Provide a clear disconnect/delete-data path.
- Assume private API responses are untrusted input.

---

## 18. Product UX

Potential connection screen:

```text
Connect accounts

DoorDash
Not connected
[ Connect ]

Uber Eats
Not connected
[ Connect ]
```

After authentication:

```text
DoorDash connected ✓

Importing your orders...

2026  ███████████
2025  ███████████
2024  ███████████

327 orders imported
```

Later:

```text
DoorDash
Connected ✓
327 orders
Last synced: July 26

[ Sync Now ]
```

---

## 19. Recommended Prototype Order

### Phase 1 — Endpoint feasibility

Use test accounts and determine whether the current web clients expose enough information for SnackTrack.

Success criterion:

```text
Authenticated session
      |
      v
Order history
      |
      v
Itemized details
      |
      v
Normalized SnackTrackOrder[]
```

Do this separately for DoorDash and Uber Eats.

### Phase 2 — Mobile WebView proof of concept

Build one provider first.

Recommended milestones:

1. Open platform website in WebView.
2. Complete normal authentication.
3. Detect authenticated state.
4. Trigger one known order-history request.
5. Return JSON through `postMessage`.
6. Parse it in React Native.
7. Add pagination.
8. Add order details.
9. Normalize.
10. Persist locally/backend as appropriate.

### Phase 3 — Reliability

Test:

- iOS
- Android
- Fresh login
- Existing session
- MFA
- Expired session
- Large histories
- Canceled orders
- Refunds
- Grocery orders
- Multiple currencies/regions
- Network interruption
- Endpoint changes

### Phase 4 — Production/legal review

Before shipping, evaluate:

- DoorDash Terms of Service
- Uber/Uber Eats Terms of Service
- App Store rules
- Google Play rules
- Privacy disclosures
- Consent requirements
- Data retention/deletion
- Security implications
- Whether partnership/API access can replace private endpoints

---

## 20. Preferred Direction

For the prototype:

```text
React Native
      |
      v
Authenticated WebView
      |
      v
Platform makes authenticated requests
      |
      v
Order JSON
      |
      v
React Native bridge
      |
      v
Normalize
      |
      v
SnackTrack
```

Prefer this over:

```text
Extract session token
      |
      v
Upload token to SnackTrack
      |
      v
Store indefinitely
```

The key technical investigation is now **not how to read the user's session token**, but:

> Can SnackTrack reliably execute the required order-history and order-detail requests from the user's authenticated mobile WebView context?

If yes, this provides a potential mobile import architecture while keeping the platform session on the user's device.
