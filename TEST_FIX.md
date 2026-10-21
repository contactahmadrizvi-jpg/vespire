# Testing the Products/Orders Fix

## Quick Test Steps

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test the Debug Endpoint (Check Current Data)
Open in browser or use curl:
```
http://localhost:3000/api/debug/check-store?shop=ahmad-kwz2ciyr.myshopify.com
```

This will show:
- Current field names in Firestore
- Whether they are camelCase (broken) or snake_case (fixed)
- Sample product and order data

### 3. Apply the Fix (Choose ONE)

#### Option A: Use Refresh Button (Quickest)
1. Go to `http://localhost:3000/shopify/stores/ahmad-kwz2ciyr.myshopify.com`
2. Click "Refresh Data" button
3. Wait for the refresh to complete
4. Refresh the page

#### Option B: Reconnect Store (Full Reset)
1. Go to `http://localhost:3000/shopify/stores/ahmad-kwz2ciyr.myshopify.com`
2. Click "Disconnect Store"
3. Click "Connect Store" and go through OAuth flow again
4. You'll be redirected back with fresh data

### 4. Verify the Fix Worked

After refreshing or reconnecting, check:

✅ **Products Section:**
- Shows correct count (not 0)
- Product cards display with title, vendor, type
- Price is visible
- Stock quantity is visible
- Images show (if products have images)

✅ **Orders Section:**
- Shows correct count (not 0)
- Order cards display with order number
- Customer email is visible
- Total price is visible
- Financial status badge appears
- Fulfillment status badge appears (if fulfilled)
- Line items list is visible

✅ **Stats Cards at Top:**
- Products: Shows actual count
- Orders: Shows actual count
- Abandoned Carts: 0 (GraphQL doesn't support this)

### 5. Check Debug Endpoint Again
```
http://localhost:3000/api/debug/check-store?shop=ahmad-kwz2ciyr.myshopify.com
```

Verify the field names are now:
- ✅ `product_type` (not `productType`)
- ✅ `total_price` (not nested `totalPriceSet`)
- ✅ `financial_status` (not `displayFinancialStatus`)
- ✅ `created_at` (not `createdAt`)

## What If It Still Shows 0?

1. **Check if you have products in Shopify:**
   - Go to your Shopify admin: `https://ahmad-kwz2ciyr.myshopify.com/admin`
   - Check Products section
   - Make sure you have at least 1 active or draft product

2. **Check server logs:**
   - Look in the terminal where `npm run dev` is running
   - Look for lines starting with `[GraphQL]`
   - Should see: "✅ Fetched X products" and "✅ Fetched Y orders"

3. **Check for errors:**
   - Look for "❌" in the logs
   - If there are GraphQL errors, check your scopes in `.env.local`
   - Required: `SHOPIFY_SCOPES=read_products,read_orders,write_orders`

## Understanding the Fix

**Before (Broken):**
```typescript
// Firestore stored (from GraphQL):
{
  productType: "Apparel",        // ❌ UI looks for product_type
  inventoryQuantity: 10          // ❌ UI looks for inventory_quantity
}
```

**After (Fixed):**
```typescript
// Firestore now stores (transformed):
{
  product_type: "Apparel",       // ✅ Matches UI expectation
  inventory_quantity: 10         // ✅ Matches UI expectation
}
```

The transformation happens in `lib/shopify/graphql-fetch.ts` before saving to Firestore.
