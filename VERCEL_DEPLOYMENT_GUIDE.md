# 🚀 Vercel Deployment & Verification Guide

## Current Status

✅ **Code is fixed and pushed to GitHub**
- Token expiration fix: `grant_options: ["offline"]` ✅
- Field transformation fix: camelCase → snake_case ✅
- All changes committed and pushed to `origin/main` ✅

## Step 1: Verify Vercel Deployment

### Check Vercel Dashboard:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your `vespire` project
3. Check the latest deployment
4. Make sure the deployment:
   - ✅ Shows commit: `4071d90` or later
   - ✅ Status is "Ready" (green)
   - ✅ No build errors

### Force Redeploy (if needed):
If Vercel didn't auto-deploy:
1. Go to your project in Vercel Dashboard
2. Click "Deployments" tab
3. Find the latest deployment
4. Click "..." menu → "Redeploy"
5. Wait for deployment to complete

## Step 2: Verify Code Version on Vercel

Visit this endpoint on your Vercel deployment:
```
https://your-app.vercel.app/api/debug/check-code-version
```

Expected response:
```json
{
  "codeVersion": "v2.0",
  "hasTokenExpirationFix": true,
  "details": {
    "hasGrantOptions": true,
    "hasOfflineOption": true,
    "snippet": "body: JSON.stringify({\n      client_id: SHOPIFY_API_KEY(),\n      client_secret: SHOPIFY_API_SECRET(),\n      code,\n      // Request expiring offline tokens..."
  },
  "message": "✅ Token expiration fix is deployed"
}
```

If you see `"hasTokenExpirationFix": false`, Vercel is running old code!

## Step 3: Clear Build Cache (if needed)

If the code version check shows old code:

### Option A: Via Vercel Dashboard
1. Go to Project Settings
2. Scroll to "Advanced" section
3. Click "Clear Build Cache"
4. Redeploy

### Option B: Force Fresh Build
Add this to your commit and push:
```bash
# In your project root
touch .vercel-clear-cache
git add .vercel-clear-cache
git commit -m "Force Vercel cache clear"
git push
```

## Step 4: Reconnect Store on Vercel

Once the code version check passes:

1. **Disconnect your store:**
   - Go to: `https://your-app.vercel.app/shopify/stores/ahmad-kwz2ciyr.myshopify.com`
   - Click "Disconnect Store"

2. **Reconnect your store:**
   - Go to: `https://your-app.vercel.app/shopify/stores`
   - Click "+ Connect Store"
   - Enter: `ahmad-kwz2ciyr.myshopify.com`
   - Complete OAuth flow
   - **Make sure Shopify shows these scopes:**
     - ✅ Read products
     - ✅ Read orders  
     - ✅ Write orders

3. **Verify on debug dashboard:**
   - Go to: `https://your-app.vercel.app/debug`
   - Click "Run All Diagnostic Tests"
   - Should see:
     - ✅ No "Non-expiring token" errors
     - ✅ Shop query succeeds
     - ✅ Products query succeeds
     - ✅ Orders query succeeds

## Step 5: Check Server Logs

If still having issues, check Vercel deployment logs:

1. Go to Vercel Dashboard
2. Click your deployment
3. Click "Functions" tab
4. Look for errors during OAuth callback
5. Search for logs containing:
   - `[Shopify OAuth] Token exchange`
   - `grant_options`
   - `expires_in`

Expected logs:
```
[Shopify OAuth] Token exchange successful for shop: ahmad-kwz2ciyr.myshopify.com. 
Scopes: read_products,read_orders,write_orders, Expires in: 7776000s
```

## Troubleshooting

### Issue: "Non-expiring token" error persists

**Cause**: Old token still in Firestore from before the fix

**Solution**:
1. Verify code version endpoint shows `hasTokenExpirationFix: true`
2. Delete the store document from Firestore:
   ```
   Collection: shopify_installs
   Document: ahmad-kwz2ciyr.myshopify.com
   Action: DELETE
   ```
3. Reconnect the store (will create new document with new token)

### Issue: Products/Orders still show 0

**Possible causes**:
1. ❌ No products in your Shopify store
2. ❌ Missing `read_orders` scope
3. ❌ GraphQL query issue

**Solution**: Run debug dashboard and check specific errors

### Issue: Vercel shows old code

**Solution**:
1. Check git: `git log --oneline -1` should show commit `4071d90` or later
2. Check GitHub: Verify latest code is on `main` branch
3. Force redeploy on Vercel
4. Clear build cache
5. Check environment variables are set correctly

## Expected Final State

After successful deployment and reconnection:

### Firestore Document:
```json
{
  "shop": "ahmad-kwz2ciyr.myshopify.com",
  "accessToken": "shpat_...",
  "scope": "read_products,read_orders,write_orders",
  "expiresAt": "2027-01-20T00:00:00.000Z",
  "products": [ /* array of products */ ],
  "orders": [ /* array of orders */ ],
  "lastDataFetch": "2026-10-22T00:00:00.000Z"
}
```

### UI Display:
- ✅ Products count > 0
- ✅ Orders count >= 0
- ✅ Product cards with images, prices
- ✅ Order cards with customer info
- ✅ No error messages

### Debug Dashboard:
- ✅ All API tests pass
- ✅ No "Non-expiring token" errors
- ✅ Correct scopes installed
- ✅ Products and orders fetched successfully

## Quick Commands

```bash
# Check current commit
git log --oneline -1

# Push latest changes
git push origin main

# Check if code has grant_options
grep -n "grant_options" lib/shopify/token-exchange.ts

# Force clear .next cache locally
rm -rf .next
npm run build
```

## Need Help?

If none of this works:
1. Share the output of `/api/debug/check-code-version`
2. Share Vercel deployment logs from the OAuth callback
3. Share the debug dashboard results after reconnection
4. Check Firestore for the store document structure
