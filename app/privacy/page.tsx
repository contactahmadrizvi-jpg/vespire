import Link from "next/link";

export default function PrivacyPolicy() {
  return <main className="mx-auto max-w-3xl space-y-6 px-6 py-14">
    <h1 className="text-3xl font-bold">Vespire Privacy Policy</h1><p>Version: October 22, 2026. Operator: Ahmad Hassan. Contact: <a className="underline" href="mailto:contactahmadrizvi@gmail.com">contactahmadrizvi@gmail.com</a>.</p>
    <h2 className="text-xl font-semibold">What we process and why</h2>
    <p>On a merchant’s instructions, Vespire displays Shopify products, recent orders and abandoned checkouts to support checkout recovery. With Shopify permissions, we process the associated customer ID, name, email, phone number, checkout items, totals, timestamps and SMS marketing consent. Account identifiers and store access credentials support authentication and the connection. We do not request customer addresses.</p>
    <p>Vespire currently provides a dashboard and customer data request downloads. It does not send SMS or email campaigns. Contact information is not proof of permission to send marketing. Any future messaging feature requires a separate consent and unsubscribe workflow.</p>
    <h2 className="text-xl font-semibold">Data use and service providers</h2>
    <p>We use customer information only to provide the stated merchant service, not to sell personal data, build advertising audiences or make decisions with legal or similarly significant effects. Our application uses Shopify and Google Firebase for store access, authentication and storage. The merchant’s deployment host processes application requests. Hosting locations, provider contracts and any additional messaging providers must be assessed before production use.</p>
    <h2 className="text-xl font-semibold">Retention and deletion</h2>
    <p>Customer order and checkout records are limited to 30 days from creation. Reads remove expired records, and scheduled cleanup removes expired cached records. Access logs expire after 90 days; customer data request records expire after 30 days. Store credentials and account linkage remain while the store is connected. Disconnecting deletes the store’s cached records and credentials. Verified Shopify customer deletion requests remove matching records; minimal deletion identifiers remain until disconnection to prevent re-import. Uninstall and shop deletion webhooks remove the shop’s stored records.</p>
    <p>Backup retention and deletion follow the configured storage provider’s backup lifecycle. The operator must document and verify that lifecycle before enabling production backups; deleted data must not be restored into live service without reapplying deletion requests.</p>
    <h2 className="text-xl font-semibold">Access and customer choices</h2>
    <p>Store data requires a verified account session and a matching store owner. Access and export actions are logged without contact values or credentials. Merchants can request access, correction or deletion at the contact address above. Customers should contact the store where they shopped; we assist the merchant with verified requests. Shopify privacy requests are available in the merchant dashboard for secure fulfillment.</p>
    <p>Production deployment requires HTTPS, restricted cloud access and encrypted storage and backups. No third-party security certification is claimed.</p>
    <Link className="underline" href="/terms">Merchant Data Processing Terms</Link>
  </main>;
}
