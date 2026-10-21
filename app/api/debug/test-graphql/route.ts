// Diagnostic endpoints are disabled to prevent customer data and credential exposure.
export async function GET() { return new Response(null, { status: 404 }); }
export async function POST() { return new Response(null, { status: 404 }); }
