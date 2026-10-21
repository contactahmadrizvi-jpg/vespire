# 🔧 Shopify Token Expiration Fix

## The Real Problem

All API calls were failing with:
```
[API] Non-expiring access tokens are no longer accepted for the Admin API. 
Start using expiring offline tokens
```

**Root Cause**: Shopify deprecated non-expiring access tokens. As of API version 2025-01, all apps must use **expiring offline tokens**.

## What I Fixed

### 1. Updated Token Exchange (`lib/shopify/token-exchange.ts`)
Added `grant_options: ["offline"]` to request expiring tokens:

```typescript
body: JSON.stringify({
  client_id: SHOPIFY_API_KEY(),
  client_secret: SHOPIFY_API_SECRET(),
  code,
  grant_options: ["offline"], // ✅ NEW: Request expiring tokens
})
```

### 2. Updated Data Model
Added support for storing token expiration:

```typescript
export interface ShopifyAccessTokenResponse {
  access_token: string;
  scope: string;
  expires_in?: number; // ✅ NEW: Seconds until expiration
}

export interface ShopCredential {
  shop: string;
  accessToken: string;
  scope: string;
  expiresAt?: string; // ✅ NEW: ISO date when token expires
  installedAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}
```

### 3. Updated Firestore Storage
Now stores expiration time:

```typescript
if (expiresIn) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  data.expiresAt = expiresAt.toISOString();
}
```

## How to Apply the Fix

### Step 1: Disconnect Current Store
1. Go to your store page: `http://localhost:3000/shopify/stores/ahmad-kwz2ciyr.myshopify.com`
2. Click **"Disconnect Store"** button
3. Confirm disconnection

### Step 2: Reconnect with New Token Flow
1. Click **"+ Connect Store"** button
2. Enter shop domain: `ahmad-kwz2ciyr.myshopify.com`
3. Complete the OAuth flow
4. **Important**: Make sure to grant ALL requested permissions:
   - ✅ `read_products`
   - ✅ `read_orders`
   - ✅ `write_orders`

### Step 3: Verify Fix
1. After reconnecting, check the store page
2. You should now see:
   - ✅ Products count > 0 (if you have products in Shopify)
   - ✅ Orders count >= 0
   - ✅ Product cards with details
   - ✅ Order cards with details

### Step 4: Check Debug Dashboard
Visit `http://localhost:3000/debug` and run tests:
- ✅ Shop Query: Should succeed
- ✅ Products Query: Should return products
- ✅ Orders Query: Should succeed (no permission errors)
- ✅ No more "Non-expiring access tokens" errors

## Token Expiration Details

### When Do Tokens Expire?
Shopify's expiring offline tokens typically last **90 days** (expires_in: 7776000 seconds).

### What Happens When Token Expires?
Your app will need to handle token refresh. Currently, the token expiration is stored but not automatically refreshed.

### Future Enhancement: Token Refresh
You'll need to add a token refresh mechanism before the 90-day expiration. Options:
1. **Manual refresh**: Ask merchant to reconnect before expiration
2. **Automatic refresh**: Implement token refresh flow (requires session tokens)
3. **Email notification**: Notify merchant when token is about to expire

For now, the 90-day window gives you plenty of time to implement a refresh strategy.

## Files Modified

- ✅ `lib/shopify/token-exchange.ts` - Request expiring tokens
- ✅ `app/api/auth/callback/route.ts` - Store expiration time
- ✅ Data models updated to support expiration

## Expected Debug Output After Fix

```json
{
  "shop": "ahmad-kwz2ciyr.myshopify.com",
  "hasAccessToken": true,
  "scope": "read_products,read_orders,write_orders",
  "productsCount": 5,
  "ordersCount": 2,
  "expiresAt": "2027-01-20T00:00:00.000Z",
  "tests": {
    "shop": { "success": true },
    "products": { "success": true, "count": 5 },
    "orders": { "success": true, "count": 2 }
  }
}
```

## Troubleshooting

### If you still see "Non-expiring token" errors:
- Make sure you've **disconnected and reconnected** the store
- The fix only applies to **new OAuth flows**, not existing tokens

### If products/orders still show 0:
- Check if you have products in Shopify admin
- Check if all scopes were granted (especially `read_orders`)
- Run the debug dashboard to see specific errors

### If you get scope errors:
- Make sure `.env.local` has: `SHOPIFY_SCOPES=read_products,read_orders,write_orders`
- Disconnect and reconnect to request new scopes

## References

- [Shopify: Expiring Offline Tokens](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/offline-access-tokens)
- [Shopify: Token Exchange](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)
