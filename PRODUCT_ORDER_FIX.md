# Products and Orders Not Showing - Issue Fixed

## Problem

Products and orders were showing as **0** in the UI even though they were being fetched from Shopify successfully during OAuth callback.

## Root Cause

**Field name mismatch** between GraphQL API response format and UI expectations:

### GraphQL Returns (camelCase):
```typescript
{
  id: "...",
  title: "Product Name",
  productType: "Category",      // ❌ camelCase
  featuredImage: { url: "..." }, // ❌ nested object
  variants: {
    edges: [
      { node: { inventoryQuantity: 10 } } // ❌ nested + camelCase
    ]
  }
}
```

### UI Expects (snake_case):
```typescript
{
  id: "...",
  title: "Product Name",
  product_type: "Category",     // ✅ snake_case
  image: { src: "..." },         // ✅ flat structure
  variants: [
    { inventory_quantity: 10 }   // ✅ flat + snake_case
  ]
}
```

## Solution

Added transformation functions in `lib/shopify/graphql-fetch.ts`:

1. **`transformProduct()`** - Converts GraphQL product format to UI format:
   - `productType` → `product_type`
   - `featuredImage.url` → `image.src`
   - `variants.edges[].node` → flat array
   - `inventoryQuantity` → `inventory_quantity`

2. **`transformOrder()`** - Converts GraphQL order format to UI format:
   - `totalPriceSet.shopMoney.amount` → `total_price`
   - `displayFinancialStatus` → `financial_status`
   - `displayFulfillmentStatus` → `fulfillment_status`
   - `createdAt` → `created_at`
   - `lineItems.edges[].node` → flat array

## Files Modified

- ✅ `lib/shopify/graphql-fetch.ts` - Added transformation functions
- ✅ `app/api/debug/check-store/route.ts` - Added debug endpoint (NEW)

## How to Verify the Fix

### Option 1: Reconnect Your Store
1. Disconnect your store from the UI
2. Reconnect it (go through OAuth flow again)
3. The data will now be transformed correctly

### Option 2: Use the Refresh Button
1. Click the "Refresh Data" button on your store page
2. This will re-fetch and transform the data

### Option 3: Check with Debug Endpoint
Visit: `http://localhost:3000/api/debug/check-store?shop=ahmad-kwz2ciyr.myshopify.com`

This will show you:
- Current field names in Firestore
- Sample product and order data
- Counts of products/orders

## Expected Result

After applying the fix and refreshing/reconnecting:
- ✅ Products will display with correct counts
- ✅ Orders will display with correct counts  
- ✅ Product details (price, inventory, images) will show
- ✅ Order details (total, status, line items) will show

## Technical Details

The issue occurred because:
1. Shopify's GraphQL API uses **camelCase** field names (modern API standard)
2. Shopify's REST API uses **snake_case** field names (legacy format)
3. The UI was originally designed for REST API format
4. When we switched to GraphQL (to avoid token issues), we forgot to transform the field names

The fix ensures that regardless of which API we use internally, the UI always receives data in the expected format.
