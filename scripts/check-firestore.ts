/**
 * Debug script to check Firestore data
 */

import { getAdminDb } from "../lib/firebase/admin";

async function checkFirestore() {
  try {
    console.log("🔍 Checking Firestore data...\n");
    
    const db = getAdminDb();
    const snapshot = await db.collection("shopify_installs").get();
    
    console.log(`📦 Found ${snapshot.size} store(s) in Firestore\n`);
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\n📍 Store: ${doc.id}`);
      console.log(`   - Access Token: ${data.accessToken ? "✅ Present" : "❌ Missing"}`);
      console.log(`   - Scope: ${data.scope || "N/A"}`);
      console.log(`   - Products: ${data.products?.length || 0}`);
      console.log(`   - Orders: ${data.orders?.length || 0}`);
      console.log(`   - Abandoned Checkouts: ${data.abandoned_checkouts?.length || 0}`);
      console.log(`   - Last Data Fetch: ${data.lastDataFetch || "N/A"}`);
      console.log(`   - Installed At: ${data.installedAt?.toDate?.() || "N/A"}`);
      
      // Show sample product if available
      if (data.products && data.products.length > 0) {
        console.log(`\n   📦 Sample Product:`);
        console.log(`      ${JSON.stringify(data.products[0], null, 2).split('\n').join('\n      ')}`);
      }
      
      // Show sample order if available
      if (data.orders && data.orders.length > 0) {
        console.log(`\n   📋 Sample Order:`);
        console.log(`      ${JSON.stringify(data.orders[0], null, 2).split('\n').join('\n      ')}`);
      }
    });
    
    console.log("\n✅ Check complete");
  } catch (error) {
    console.error("❌ Error checking Firestore:", error);
    throw error;
  }
}

checkFirestore();
