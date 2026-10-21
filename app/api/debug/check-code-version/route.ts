import { NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/shopify/token-exchange";

/**
 * GET /api/debug/check-code-version
 * 
 * Check if the token exchange code includes the grant_options fix
 */
export async function GET() {
  // Read the source code to check if grant_options is present
  const functionString = exchangeCodeForToken.toString();
  
  const hasGrantOptions = functionString.includes("grant_options");
  const hasOfflineOption = functionString.includes("offline");
  
  return NextResponse.json({
    codeVersion: "v2.0",
    hasTokenExpirationFix: hasGrantOptions && hasOfflineOption,
    details: {
      hasGrantOptions,
      hasOfflineOption,
      // Show a snippet of the function to verify
      snippet: functionString.substring(
        functionString.indexOf("body: JSON.stringify"),
        functionString.indexOf("body: JSON.stringify") + 200
      ),
    },
    message: hasGrantOptions && hasOfflineOption
      ? "✅ Token expiration fix is deployed"
      : "❌ Token expiration fix is NOT deployed - old code is running",
  });
}
