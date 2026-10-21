import { timingSafeEqual } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { storeCollection } from "@/lib/security/access";
import { pruneStore } from "@/lib/security/retention";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || received.length !== expected.length || !timingSafeEqual(received, expected)) return new Response(null, { status: 401 });
  const db = getAdminDb();
  const stores = await db.collection(storeCollection()).select().get();
  for (const doc of stores.docs) await pruneStore(doc.id);
  for (const suffix of ["audit", "privacy_requests"]) {
    while (true) {
      const expired = await db.collection(`${storeCollection()}_${suffix}`).where("expiresAt", "<=", new Date()).limit(200).get();
      if (expired.empty) break;
      const batch = db.batch();
      for (const doc of expired.docs) batch.delete(doc.ref);
      await batch.commit();
    }
  }
  return Response.json({ success: true });
}
