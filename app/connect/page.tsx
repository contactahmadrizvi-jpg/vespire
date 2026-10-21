import Link from "next/link";
import { pageUser } from "@/lib/security/access";

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  await pageUser();
  const { shop = "" } = await searchParams;
  return <main className="mx-auto max-w-xl space-y-5 px-6 py-16">
    <h1 className="text-2xl font-semibold">Connect your Shopify store</h1>
    <p>Vespire displays products, recent orders, and abandoned checkouts. When Shopify permits it, customer names, emails, phone numbers and recorded SMS consent are shown to support checkout recovery.</p>
    <p>Customer records are retained for up to 30 days. Vespire does not currently send SMS or email messages. A phone number alone does not establish marketing consent.</p>
    <form action="/api/auth" method="POST" className="space-y-5">
      <label className="block">Store domain<input name="shop" defaultValue={shop} required className="mt-2 block w-full rounded border p-3 text-black" placeholder="your-store.myshopify.com" /></label>
      <label className="flex items-start gap-3"><input className="mt-1" type="checkbox" name="privacy" value="2026-10-22" required /><span>I agree to the <Link className="underline" href="/privacy">Privacy Policy</Link> and <Link className="underline" href="/terms">Merchant Data Processing Terms</Link> and authorize processing for checkout recovery.</span></label>
      <button className="rounded bg-zinc-900 px-5 py-3 text-white">Continue to Shopify</button>
    </form>
  </main>;
}
