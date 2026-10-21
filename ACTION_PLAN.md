# 🎯 Action Plan to Fix Token Issue

## Current Situation
✅ Code is fixed and pushed (commit `9f0404d`)  
❌ Still getting "non-expiring token" errors  
❓ Need to verify if Vercel is running the new code

## Step-by-Step Action Plan

### 1️⃣ Wait for Vercel to Deploy (2-3 minutes)
- Vercel should auto-deploy from the latest push
- Check Vercel dashboard for deployment status
- Look for deployment from commit `9f0404d`

### 2️⃣ Verify Code Version on Vercel
Visit on **Vercel** (not localhost):
```
https://your-vercel-app.vercel.app/api/debug/check-code-version
```

**Expected Response:**
```json
{
  "hasTokenExpirationFix": true,
  "message": "✅ Token expiration fix is deployed"
}
```

**If false:** Force redeploy in Vercel dashboard

### 3️⃣ Delete Old Firestore Document
The old non-expiring token is cached in Firestore. Delete it:

**Option A: Via Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `vespire-6758a`
3. Go to Firestore Database
4. Navigate to collection: `shopify_installs`
5. Find document: `ahmad-kwz2ciyr.myshopify.com`
6. Click "..." → **Delete**

**Option B: Via API** (I can create an endpoint for this)

### 4️⃣ Reconnect Store on Vercel

**Important:** Do this on **Vercel URL**, not localhost!

1. Go to: `https://your-vercel-app.vercel.app/shopify/stores`
2. Click **"+ Connect Store"**
3. Enter: `ahmad-kwz2ciyr.myshopify.com`
4. Complete OAuth flow
5. Watch Shopify permissions screen - should request:
   - ✅ Read products
   - ✅ Read orders
   - ✅ Write orders
6. Approve

### 5️⃣ Check Vercel Deployment Logs

After reconnecting, check logs to verify `grant_options` is being sent:

1. Go to Vercel Dashboard
2. Find your project
3. Click latest deployment
4. Click "Functions" tab
5. Look for `/api/auth/callback` function logs
6. Search for:
   ```
   [Token Exchange] 📝 Request body includes:
   grant_options: ["offline"]
   ```
7. Then look for:
   ```
   [Token Exchange] ✅ Token received from Shopify:
   expiresIn: 7776000
   ```

**If you see expiresIn: undefined** → Shopify is NOT respecting grant_options (possible Shopify app config issue)

### 6️⃣ Run Debug Dashboard Again

Visit: `https://your-vercel-app.vercel.app/debug`

**Expected Results:**
- ✅ All API tests pass
- ✅ No "Non-expiring token" errors
- ✅ Products and orders display

### 7️⃣ If Still Failing: Check Shopify App Configuration

The issue might be in your Shopify app setup:

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
2. Find your app
3. Go to **Configuration** → **App setup**
4. Check **API access**:
   - Must be using **Admin API access tokens**
   - Should NOT be using "Legacy API"
5. Under **API credentials**, verify scopes include:
   - ✅ `read_products`
   - ✅ `read_orders`
   - ✅ `write_orders`

## Troubleshooting Scenarios

### Scenario A: Vercel Shows Old Code
**Solution:** Force redeploy, clear build cache

### Scenario B: grant_options Sent, But No expires_in Received
**Problem:** Shopify app configuration issue  
**Solution:** 
- Check app is using Admin API (not legacy)
- Check API version is 2025-01 or later
- May need to recreate app in Partners dashboard

### Scenario C: Products/Orders Still 0
**If no "non-expiring token" error:**
- Check if products exist in Shopify admin
- Verify `read_orders` scope is granted
- Check server logs for GraphQL errors

### Scenario D: "403 Forbidden" on Products
**If scope is `write_orders,read_products`:**
- Missing `read_orders` scope
- Shopify didn't grant all requested scopes
- Need to update app scopes in Partners dashboard

## What the Logs Will Tell You

### Good Logs (Fix Working):
```
[Token Exchange] 📝 Request body includes:
  grant_options: ["offline"]
[Token Exchange] ✅ Token received from Shopify:
  expiresIn: 7776000
  hasExpiresIn: true
[Shopify OAuth] ✅ Token exchange successful for shop: ahmad-kwz2ciyr.myshopify.com
  Scopes: read_products,read_orders,write_orders
  Expires in: 7776000s (90 days)
```

### Bad Logs (Fix NOT Working):
```
[Token Exchange] ✅ Token received from Shopify:
  expiresIn: undefined
  hasExpiresIn: false
[Shopify OAuth] ⚠️ WARNING: Received non-expiring token!
  Expires in: NEVER - THIS IS BAD!
```

If you see bad logs → Shopify app configuration problem

## Next Steps After Fix

Once it's working:
1. Products and orders will display correctly
2. Token will expire in 90 days
3. You'll need to implement token refresh before expiration
4. Consider setting up monitoring/alerts for token expiration

## Need More Help?

Share with me:
1. Output from `/api/debug/check-code-version`
2. Vercel deployment logs (especially OAuth callback)
3. Screenshot of Shopify Partners app API configuration
4. Firestore document structure after reconnection
