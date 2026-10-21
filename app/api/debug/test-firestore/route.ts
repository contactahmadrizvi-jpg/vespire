import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * GET /api/debug/test-firestore
 * 
 * Test if Firestore connection is working
 */
export async function GET() {
  try {
    console.log("🔥 Testing Firestore connection...");
    
    const db = getAdminDb();
    
    // Try to write test data
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: "Firestore connection test"
    };
    
    console.log("📝 Writing test document...");
    await db.collection("test_collection").doc("test_doc").set(testData);
    console.log("✅ Test document written successfully");
    
    // Try to read it back
    console.log("📖 Reading test document...");
    const doc = await db.collection("test_collection").doc("test_doc").get();
    console.log("✅ Test document read successfully");
    
    // Try to list collections
    console.log("📋 Listing collections...");
    const collections = await db.listCollections();
    const collectionNames = collections.map(col => col.id);
    console.log("✅ Collections found:", collectionNames);
    
    // Clean up test data
    await db.collection("test_collection").doc("test_doc").delete();
    console.log("🗑️ Test document deleted");
    
    return NextResponse.json({
      success: true,
      message: "✅ Firestore connection is working!",
      details: {
        canWrite: true,
        canRead: true,
        canList: true,
        existingCollections: collectionNames,
        testData: doc.data(),
      }
    });
    
  } catch (error) {
    console.error("❌ Firestore test failed:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack,
      message: "❌ Firestore connection failed!"
    }, { status: 500 });
  }
}
