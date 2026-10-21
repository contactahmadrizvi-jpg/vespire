# Diagnosis Steps

## Current Issue
Products and orders are both showing as empty arrays `[]` in Firestore, even after refresh.

## Possible Causes

### 1. **Scope Issue** ⚠️ LIKELY
From the debug output:
- **Installed scopes**: `"write_orders,read_products"`
- **Requested scopes**: `"read_products,read_orders,write_orders"`
- **Missing**: `read_orders`

This explains why orders are empty - you don't have permission to read them!

### 2. **No Products in Shopify Store**
The store might not have any products yet.

### 3. **GraphQL Query Issue**
The query might be malformed or filtering incorrectly.

## How to Diagnose

### Step 1: Test GraphQL Directly
Visit this URL in your browser:
```
http://localhost:3000/api/debug/test-graphql?shop=ahmad-kwz2ciyr.myshopify.com
```

This will show:
- Whether the shop query works (basic connection test)
- Whether products query returns data
- Whether orders query returns data
- Any GraphQL errors from Shopify
- Current vs requested scopes

### Step 2: Check Shopify Admin
1. Go to: `https://ahmad-kwz2ciyr.myshopify.com/admin/products`
2. Verify you have at least 1 product (active or draft)
3. Take a screenshot if needed

### Step 3: Check App Installation Scopes
1. Go to: `https://ahmad-kwz2ciyr.myshopify.com/admin/settings/apps`
2. Find your app in the list
3. Click on it to see permissions
4. Check if `read_orders` is granted

## Solutions Based on Diagnosis

### If Missing `read_orders` Scope:

**Option A: Reinstall the App**
1. Disconnect the store from your app
2. Fix the scope request (already correct in `.env.local`)
3. Reconnect the store
4. The OAuth flow will request the correct scopes

**Option B: Update App Configuration**
1. Go to Shopify Partners Dashboard
2. Find your app
3. Go to API credentials
4. Update the scopes
5. Reinstall on the merchant store

### If No Products in Shopify:

**Add a Test Product:**
1. Go to Shopify Admin → Products
2. Click "Add product"
3. Fill in:
   - Title: "Test Product"
   - Price: $10.00
4. Save as "Active"
5. Refresh your app data

### If GraphQL Query Issue:

Check the test-graphql endpoint results for specific errors and we can adjust the queries.

## Quick Fix Commands

### Check if dev server is running:
```bash
# If not running, start it:
npm run dev
```

### Test the endpoints:
```bash
# Check current data
curl "http://localhost:3000/api/debug/check-store?shop=ahmad-kwz2ciyr.myshopify.com"

# Test GraphQL queries
curl "http://localhost:3000/api/debug/test-graphql?shop=ahmad-kwz2ciyr.myshopify.com"
```

## Expected Results After Fix

✅ **test-graphql endpoint should show:**
- Shop query: success with shop name
- Products query: count > 0 (if products exist in Shopify)
- Orders query: count >= 0 (with read_orders scope)
- No errors

✅ **check-store endpoint should show:**
- productsCount: > 0
- ordersCount: >= 0
- Field names in snake_case format

✅ **UI should display:**
- Products section with product cards
- Orders section with order details
- Correct counts in stats cards
