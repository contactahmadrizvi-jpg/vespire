# 🔧 Shopify Scopes Fix Karna Hai

## Problem
Firestore mein scope galat save ho raha hai:
- ❌ Mil raha: `write_orders,read_products` 
- ✅ Chahiye: `read_products,read_orders,write_orders`

Missing: `read_orders` - isliye orders fetch nahi ho rahe!

## Root Cause
Shopify Partners Dashboard mein app configuration mein `read_orders` scope add nahi hai.

---

## 🎯 Solution - Step by Step

### Step 1: Shopify Partners Dashboard Open Karein
1. Ye link open karein: https://partners.shopify.com/
2. Login karein
3. **Apps** section pe click karein
4. Apni app dhundein (name se)

### Step 2: App Configuration Mein Jayen
1. App pe click karein
2. Left sidebar mein **"Configuration"** pe click karein
3. **"App setup"** section select karein

### Step 3: API Access Scopes Update Karein
1. **"API access"** section dhundein
2. **"Protected customer data access"** ke neeche checkboxes honge
3. In scopes ko **check** karein:
   - ✅ **read_products** (Product information)
   - ✅ **read_orders** (Order information) ← **YE ADD KARNA HAI**
   - ✅ **write_orders** (Edit orders)

### Step 4: Save Karein
1. Page ke bottom pe **"Save"** button pe click karein
2. Confirmation dialog aye toh **"Save"** confirm karein

---

## 🔄 Step 5: App Reinstall Karein (Important!)

Scope changes ke baad app ko **reinstall** karna zaroori hai:

### A. Old Installation Delete Karein
1. Apne Vercel app pe jayen: https://your-app.vercel.app/shopify/stores
2. Store page open karein
3. **"Disconnect Store"** button pe click karein

### B. Fresh Install Karein
1. Stores list page pe jayen
2. **"+ Connect Store"** button click karein
3. Shop domain enter karein: `ahmad-kwz2ciyr.myshopify.com`
4. OAuth flow complete karein

### C. Permissions Screen Dhyan Se Dekhein
Shopify permissions page pe ab **3 permissions** dikhne chahiye:
- ✅ Read product information
- ✅ Read order information ← **YE NAYA HOGA**
- ✅ Edit orders

**"Install app"** button click karein

---

## ✅ Verification - Check Karein Fix Kaam Kiya

### Method 1: Debug Dashboard
1. Open: https://your-app.vercel.app/debug
2. **"Run All Diagnostic Tests"** click karein
3. Check karein:
   - ✅ Installed Scopes: `read_products,read_orders,write_orders`
   - ✅ Products Count: > 0
   - ✅ Orders Count: >= 0
   - ✅ No "Non-expiring token" errors

### Method 2: Check Firestore Directly
1. Firebase Console open karein
2. Firestore Database
3. Collection: `shopify_installs`
4. Document: `ahmad-kwz2ciyr.myshopify.com`
5. Field check karein:
   - `scope`: `"read_products,read_orders,write_orders"` ✅

### Method 3: Check Store Page
1. Store detail page open karein
2. Dekhna chahiye:
   - Products count > 0
   - Orders count >= 0
   - Product cards with details
   - Order cards with details

---

## 🚨 Common Issues & Solutions

### Issue 1: "read_orders checkbox nahi mil raha"
**Solution:** 
- App type check karein - "Custom app" instead of "Public app" banana ho sakta hai
- Ya fir manually TOML file mein scopes add karein (if using Shopify CLI)

### Issue 2: "Reinstall ke baad bhi scopes wahi hain"
**Solution:**
1. Browser cache clear karein
2. Shopify Admin se app uninstall karein:
   - `https://ahmad-kwz2ciyr.myshopify.com/admin/settings/apps`
   - App dhundein
   - "Uninstall" karein
3. Phir se install karein

### Issue 3: "Products ab bhi 0 show ho rahe"
**Possible reasons:**
1. ❌ Shopify store mein products hi nahi hain
   - Solution: Shopify Admin se test product add karein
2. ❌ "Non-expiring token" error aa raha
   - Solution: Token expiration fix apply karein (already done)
3. ❌ GraphQL query fail ho rahi
   - Solution: Debug dashboard dekh ke specific error check karein

---

## 📝 Alternative Method: Shopify CLI Use Karke

Agar Shopify CLI use kar rahe ho toh:

### 1. `shopify.app.toml` file edit karein:

\`\`\`toml
scopes = "read_products,read_orders,write_orders"
\`\`\`

### 2. Deploy karein:
\`\`\`bash
shopify app deploy
\`\`\`

### 3. Reinstall prompt aayega merchant ko

---

## 🎉 Expected Final Result

Sab theek hone ke baad:

**Firestore Document:**
\`\`\`json
{
  "shop": "ahmad-kwz2ciyr.myshopify.com",
  "accessToken": "shpat_...",
  "scope": "read_products,read_orders,write_orders",  ← 3 scopes
  "products": [...],  ← Array with products
  "orders": [...],    ← Array with orders
  "expiresAt": "2027-01-20T..."
}
\`\`\`

**UI Display:**
- ✅ Products: Shows actual count and cards
- ✅ Orders: Shows actual count and details
- ✅ No errors

---

## Need Help?

Agar koi step clear nahi hai ya issue aa raha toh:
1. Screenshot share karein Shopify Partners Dashboard ka
2. Debug dashboard ka output share karein
3. Firestore document ka screenshot share karein
